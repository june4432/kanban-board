/**
 * API v1: Users Collection
 * GET /api/v1/users - List all users (for admin operations like inviting to organizations)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import { sendSuccess, sendMethodNotAllowed } from '@/lib/api-v1/utils/response';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }
}

/**
 * GET /api/v1/users
 * List all users (for inviting to organizations)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const { users } = getRepositories();

  // Get all users, excluding sensitive information
  const allUsers = users.findAll().map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }));

  sendSuccess(res, allUsers, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
