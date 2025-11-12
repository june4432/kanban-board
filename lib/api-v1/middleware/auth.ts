/**
 * Authentication Middleware for API v1
 * Supports both session-based and API key authentication
 */

import { NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ApiRequest, AuthSession } from '../types';
import { sendUnauthorized, sendForbidden, sendNotFound } from '../utils/response';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { getDatabase } from '@/lib/database';
import { ApiKeyService } from '@/lib/services/api-key.service';

/**
 * Authenticate user from session OR API key
 * Adds user to request object if authenticated
 */
export async function authenticate(
  req: ApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  // Try API Key authentication first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);

    const db = getDatabase();
    const apiKeyService = new ApiKeyService(db);

    const validationResult = apiKeyService.validateApiKey(apiKey);

    if (validationResult.valid && validationResult.apiKey) {
      // API Key is valid - fetch user details
      const userId = validationResult.apiKey.userId;

      const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE id = ?').get(userId) as {
        id: string;
        name: string;
        email: string;
        avatar: string;
      } | undefined;

      if (!user) {
        sendUnauthorized(res, 'User not found', req.requestId);
        return false;
      }

      // Attach user to request
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar,
      };

      // Parse and attach API key scopes
      const scopes = validationResult.apiKey.scopes.split(',').map(s => s.trim());
      req.apiKeyScopes = scopes;
      req.isApiKeyAuth = true;

      // Update usage stats
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      apiKeyService.updateLastUsed(validationResult.apiKey.id, ipAddress);

      return true;
    }
  }

  // Fall back to session authentication
  const session = (await getServerSession(req, res, authOptions)) as AuthSession | null;

  if (!session?.user?.id) {
    sendUnauthorized(res, 'Authentication required', req.requestId);
    return false;
  }

  // Attach user to request
  req.user = session.user;

  return true;
}

/**
 * Middleware: Require authentication
 */
export function requireAuth(handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: ApiRequest, res: NextApiResponse) => {
    const isAuthenticated = await authenticate(req, res);
    if (!isAuthenticated) return;

    return handler(req, res);
  };
}

/**
 * Check if user is project member
 */
export async function requireProjectMember(
  req: ApiRequest,
  res: NextApiResponse,
  projectId: string
): Promise<{ isOwner: boolean; isMember: boolean } | null> {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required', req.requestId);
    return null;
  }

  const db = getDatabase();
  const projectRepo = new ProjectRepository(db);

  const project = projectRepo.findById(projectId);
  if (!project) {
    sendNotFound(res, 'Project', req.requestId);
    return null;
  }

  const isMember = projectRepo.isMember(projectId, req.user.id);
  if (!isMember) {
    sendForbidden(
      res,
      'Access denied. You are not a member of this project.',
      req.requestId
    );
    return null;
  }

  const isOwner = project.ownerId === req.user.id;

  return { isOwner, isMember };
}

/**
 * Check if user is project owner
 */
export async function requireProjectOwner(
  req: ApiRequest,
  res: NextApiResponse,
  projectId: string
): Promise<boolean> {
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return false;

  if (!membershipCheck.isOwner) {
    sendForbidden(
      res,
      'Access denied. Only project owner can perform this action.',
      req.requestId
    );
    return false;
  }

  return true;
}

/**
 * Check card access (user must be member of card's project)
 */
export async function requireCardAccess(
  req: ApiRequest,
  res: NextApiResponse,
  cardId: string
): Promise<{ projectId: string } | null> {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required', req.requestId);
    return null;
  }

  const db = getDatabase();

  // Get project ID from card
  const query = `
    SELECT b.project_id
    FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN boards b ON col.board_id = b.board_id
    WHERE c.id = ?
  `;

  const result = db.prepare(query).get(cardId) as { project_id: string } | undefined;

  if (!result) {
    sendNotFound(res, 'Card', req.requestId);
    return null;
  }

  const projectId = result.project_id;
  const projectRepo = new ProjectRepository(db);

  const isMember = projectRepo.isMember(projectId, req.user.id);
  if (!isMember) {
    sendForbidden(
      res,
      'Access denied. You are not a member of this project.',
      req.requestId
    );
    return null;
  }

  return { projectId };
}

/**
 * Check if API key has required scope
 * Session authentication bypasses scope checks
 */
export function requireScope(
  requiredScope: 'read' | 'write' | 'admin'
): (handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>) => (req: ApiRequest, res: NextApiResponse) => Promise<void> {
  return (handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: ApiRequest, res: NextApiResponse) => {
      // Session authentication bypasses scope checks
      if (!req.isApiKeyAuth) {
        return handler(req, res);
      }

      // Check if API key has required scope
      const scopes = req.apiKeyScopes || [];

      // 'admin' scope includes all permissions
      if (scopes.includes('admin')) {
        return handler(req, res);
      }

      // 'write' scope includes 'read'
      if (requiredScope === 'read' && (scopes.includes('read') || scopes.includes('write'))) {
        return handler(req, res);
      }

      // Check for exact scope match
      if (scopes.includes(requiredScope)) {
        return handler(req, res);
      }

      // Insufficient permissions
      return sendForbidden(
        res,
        `Insufficient permissions. Required scope: ${requiredScope}`,
        req.requestId
      );
    };
  };
}

/**
 * Automatically check scope based on HTTP method
 * GET = read, POST/PATCH/PUT/DELETE = write
 */
export function autoRequireScope(handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: ApiRequest, res: NextApiResponse) => {
    // Session authentication bypasses scope checks
    if (!req.isApiKeyAuth) {
      return handler(req, res);
    }

    // Determine required scope based on HTTP method
    const method = req.method?.toUpperCase();
    const requiredScope = method === 'GET' ? 'read' : 'write';

    // Check scope
    const scopes = req.apiKeyScopes || [];

    // 'admin' scope includes all permissions
    if (scopes.includes('admin')) {
      return handler(req, res);
    }

    // 'write' scope includes 'read'
    if (requiredScope === 'read' && (scopes.includes('read') || scopes.includes('write'))) {
      return handler(req, res);
    }

    // Check for exact scope match
    if (scopes.includes(requiredScope)) {
      return handler(req, res);
    }

    // Insufficient permissions
    return sendForbidden(
      res,
      `Insufficient permissions. Required scope: ${requiredScope}. Available scopes: ${scopes.join(', ')}`,
      req.requestId
    );
  };
}
