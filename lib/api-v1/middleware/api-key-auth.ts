import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/database';
import { ApiKeyService } from '@/lib/services/api-key.service';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

/**
 * API Key Authentication Middleware
 *
 * Supports two authentication methods:
 * 1. Session-based (NextAuth) - for browser clients
 * 2. API Key (Bearer token) - for external systems, CLI, MCP, etc.
 *
 * Authorization header format: "Bearer sk_live_..."
 */

export interface ApiKeyAuthContext {
  userId: string;
  apiKeyId: string;
  scopes: string[];
  method: 'api-key';
}

export interface SessionAuthContext {
  userId: string;
  method: 'session';
}

export type AuthContext = ApiKeyAuthContext | SessionAuthContext;

// Extend NextApiRequest to include auth context
declare module 'next' {
  interface NextApiRequest {
    auth?: AuthContext;
  }
}

/**
 * Extract API key from Authorization header
 */
function extractApiKey(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer sk_live_..." format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Authenticate request using API key
 */
export async function authenticateWithApiKey(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ApiKeyAuthContext | null> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return null;
  }

  const db = getDatabase();
  const apiKeyService = new ApiKeyService(db);

  // Validate API key
  const validation = apiKeyService.validateApiKey(apiKey);

  if (!validation.valid || !validation.apiKey) {
    throw new UnauthorizedError(validation.reason || 'Invalid API key');
  }

  const { apiKey: keyRecord } = validation;

  // Update last used timestamp (async, non-blocking)
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
  apiKeyService.updateLastUsed(keyRecord.id, ipAddress);

  // Log usage (async, non-blocking)
  const method = req.method || 'GET';
  const endpoint = req.url || '/';
  apiKeyService.logUsage(
    keyRecord.id,
    method,
    endpoint,
    200, // Will be updated with actual status in response
    ipAddress,
    req.headers['user-agent']
  );

  // Parse scopes
  const scopes = keyRecord.scopes.split(',').map(s => s.trim());

  return {
    userId: keyRecord.userId,
    apiKeyId: keyRecord.id,
    scopes,
    method: 'api-key',
  };
}

/**
 * Check if API key has required scope
 */
export function requireScope(
  auth: AuthContext,
  requiredScope: 'read' | 'write' | 'admin'
): void {
  // Session-based auth has all permissions
  if (auth.method === 'session') {
    return;
  }

  // API key must have required scope
  const hasScope = auth.scopes.includes(requiredScope) || auth.scopes.includes('admin');

  if (!hasScope) {
    throw new ForbiddenError(`Requires '${requiredScope}' permission`);
  }
}

/**
 * Middleware: Authenticate request (optional)
 *
 * Tries API key first, falls back to session auth
 * Does not require authentication - just adds auth context if present
 */
export async function optionalAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthContext | null> {
  // Try API key authentication first
  try {
    const apiKeyAuth = await authenticateWithApiKey(req, res);
    if (apiKeyAuth) {
      req.auth = apiKeyAuth;
      return apiKeyAuth;
    }
  } catch (error) {
    // API key auth failed - continue to session auth
    console.error('API key auth failed:', error);
  }

  // Try session authentication (NextAuth)
  // This would integrate with existing session-based auth
  // For now, return null if no API key
  return null;
}

/**
 * Middleware: Require authentication
 *
 * Throws UnauthorizedError if no valid authentication found
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthContext> {
  const auth = await optionalAuth(req, res);

  if (!auth) {
    throw new UnauthorizedError('Authentication required');
  }

  return auth;
}

/**
 * Middleware: Require specific scope
 *
 * Authenticates and checks for required permission level
 */
export async function requireAuthWithScope(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredScope: 'read' | 'write' | 'admin'
): Promise<AuthContext> {
  const auth = await requireAuth(req, res);
  requireScope(auth, requiredScope);
  return auth;
}

/**
 * Higher-order function: Wrap API route with API key authentication
 *
 * Usage:
 * export default withApiKeyAuth(async (req, res) => {
 *   const userId = req.auth!.userId;
 *   // ... your API logic
 * }, { scope: 'write' });
 */
export function withApiKeyAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options?: {
    scope?: 'read' | 'write' | 'admin';
    optional?: boolean;
  }
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (options?.optional) {
        await optionalAuth(req, res);
      } else {
        const scope = options?.scope || 'read';
        await requireAuthWithScope(req, res, scope);
      }

      await handler(req, res);
    } catch (error: any) {
      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({ error: error.message });
      }
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * Utility: Get user ID from auth context
 */
export function getUserId(req: NextApiRequest): string {
  if (!req.auth) {
    throw new UnauthorizedError('Not authenticated');
  }
  return req.auth.userId;
}

/**
 * Utility: Check if request is authenticated with API key
 */
export function isApiKeyAuth(req: NextApiRequest): boolean {
  return req.auth?.method === 'api-key';
}

/**
 * Utility: Check if request is authenticated with session
 */
export function isSessionAuth(req: NextApiRequest): boolean {
  return req.auth?.method === 'session';
}
