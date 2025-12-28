/**
 * API v1: User Search
 * GET /api/v1/users/search?q=query - Search users by email or name
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { queryAll } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }
}

/**
 * GET /api/v1/users/search?q=query
 * Search users by email or name (excludes current user)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const { q, limit = '10' } = req.query;

  if (!q || typeof q !== 'string') {
    return sendValidationError(res, 'Search query is required', undefined, req.requestId);
  }

  const searchQuery = q.trim();
  if (searchQuery.length < 2) {
    return sendValidationError(res, 'Search query must be at least 2 characters', undefined, req.requestId);
  }

  const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50);

  const users = await queryAll(`
    SELECT id, email, name, avatar_url as avatar
    FROM users
    WHERE (email ILIKE $1 OR name ILIKE $1)
    AND id != $2
    LIMIT $3
  `, [`%${searchQuery}%`, req.user!.id, limitNum]);

  sendSuccess(res, { users }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
