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
import { queryOne } from '@/lib/postgres';

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
    const keyPrefix = apiKey.substring(0, 15); // 'sk_live_' or 'sk_test_' + few chars
    
    // Hash the API key for comparison
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Validate API key with PostgreSQL
    const apiKeyRecord = await queryOne<{
      id: string;
      user_id: string;
      scopes: string;
      is_active: boolean;
      expires_at: string | null;
    }>(
      `SELECT id, user_id, scopes, is_active, expires_at 
       FROM api_keys 
       WHERE key_hash = $1 AND key_prefix = $2`,
      [keyHash, keyPrefix.substring(0, 10)]
    );

    if (apiKeyRecord && apiKeyRecord.is_active) {
      // Check expiration
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        sendUnauthorized(res, 'API key has expired', req.requestId);
        return false;
      }

      // Fetch user details
      const user = await queryOne<{
        id: string;
        name: string;
        email: string;
        avatar_url: string;
      }>(
        'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
        [apiKeyRecord.user_id]
      );

      if (!user) {
        sendUnauthorized(res, 'User not found', req.requestId);
        return false;
      }

      // Attach user to request
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_url,
      };

      // Parse and attach API key scopes
      const scopes = typeof apiKeyRecord.scopes === 'string' 
        ? JSON.parse(apiKeyRecord.scopes) 
        : apiKeyRecord.scopes;
      req.apiKeyScopes = Array.isArray(scopes) ? scopes : [];
      req.isApiKeyAuth = true;

      // Update usage stats (fire and forget)
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      queryOne(
        `UPDATE api_keys SET last_used_at = NOW(), last_used_ip = $1 WHERE id = $2`,
        [ipAddress || null, apiKeyRecord.id]
      ).catch(console.error);

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

  const projectRepo = new ProjectRepository();

  const project = await projectRepo.findById(projectId);
  if (!project) {
    sendNotFound(res, 'Project', req.requestId);
    return null;
  }

  const isMember = await projectRepo.isMember(projectId, req.user.id);
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

  // Get project ID from card (PostgreSQL)
  const sql = `
    SELECT b.project_id
    FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN boards b ON col.board_id = b.id
    WHERE c.id = $1
  `;

  const result = await queryOne<{ project_id: string }>(sql, [cardId]);

  if (!result) {
    sendNotFound(res, 'Card', req.requestId);
    return null;
  }

  const projectId = result.project_id;
  const projectRepo = new ProjectRepository();

  const isMember = await projectRepo.isMember(projectId, req.user.id);
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
