/**
 * API v1: Organization Members
 * GET    /api/v1/organizations/:id/members - List members
 * POST   /api/v1/organizations/:id/members - Add member
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendCreated,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'editor', 'viewer', 'member']).default('member'),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const orgId = validateId(req.query.id, 'organizationId');

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res, orgId);
    case 'POST':
      return await handlePost(req, res, orgId);
    default:
      return sendMethodNotAllowed(res, ['GET', 'POST'], req.requestId);
  }
}

/**
 * GET /api/v1/organizations/:id/members
 * List organization members
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations } = getRepositories();

  // Check membership
  const isMember = organizations.isMember(orgId, req.user.id);
  if (!isMember) {
    return sendForbidden(
      res,
      'Access denied. You are not a member of this organization.',
      req.requestId
    );
  }

  const members = organizations.getMembers(orgId);
  sendSuccess(res, members, 200, req.requestId);
}

/**
 * POST /api/v1/organizations/:id/members
 * Add member to organization (requires admin or owner)
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations, users } = getRepositories();

  // Check if user is admin or owner
  const userRole = organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(userRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required to add members.',
      req.requestId
    );
  }

  const data = validateBody(req, addMemberSchema);

  // Check if user exists
  const targetUser = users.findById(data.userId);
  if (!targetUser) {
    return sendValidationError(
      res,
      'User not found',
      [{ field: 'userId', message: 'Invalid user ID' }],
      req.requestId
    );
  }

  // Check if already a member
  const isAlreadyMember = organizations.isMember(orgId, data.userId);
  if (isAlreadyMember) {
    return sendValidationError(
      res,
      'User is already a member of this organization',
      [{ field: 'userId', message: 'User already exists in organization' }],
      req.requestId
    );
  }

  // Add member
  organizations.addMember(orgId, data.userId, data.role);

  // Return updated member list
  const members = organizations.getMembers(orgId);
  const newMember = members.find((m) => m.userId === data.userId);

  sendCreated(res, newMember, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
