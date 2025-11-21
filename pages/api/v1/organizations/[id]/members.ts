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
  sendForbidden,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  userEmail: z.string().email('Invalid email address').optional(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer', 'member']).default('member'),
}).refine((data) => data.userId || data.userEmail, {
  message: 'Either userId or userEmail must be provided',
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
  const isMember = await organizations.isMember(orgId, req.user.id);
  if (!isMember) {
    return sendForbidden(
      res,
      'Access denied. You are not a member of this organization.',
      req.requestId
    );
  }

  const members = await organizations.getMembers(orgId);
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
  const userRole = await organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(userRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required to add members.',
      req.requestId
    );
  }

  const data = validateBody(req, addMemberSchema);

  // Find user by userId or userEmail
  let targetUser;
  let targetUserId: string;

  if (data.userId) {
    targetUser = await users.findById(data.userId);
    if (!targetUser) {
      return sendValidationError(
        res,
        'User not found',
        [{ field: 'userId', message: 'Invalid user ID' }],
        req.requestId
      );
    }
    targetUserId = data.userId;
  } else if (data.userEmail) {
    targetUser = await users.findByEmail(data.userEmail);
    if (!targetUser) {
      return sendValidationError(
        res,
        'User not found',
        [{ field: 'userEmail', message: 'User with this email does not exist' }],
        req.requestId
      );
    }
    targetUserId = targetUser.id;
  } else {
    return sendValidationError(
      res,
      'Either userId or userEmail must be provided',
      [{ field: 'userId', message: 'Missing user identifier' }],
      req.requestId
    );
  }

  // Check if already a member
  const isAlreadyMember = await organizations.isMember(orgId, targetUserId);
  if (isAlreadyMember) {
    return sendValidationError(
      res,
      'User is already a member of this organization',
      [{ field: 'userId', message: 'User already exists in organization' }],
      req.requestId
    );
  }

  // Add member
  await organizations.addMember(orgId, targetUserId, data.role);

  // Return updated member list
  const members = await organizations.getMembers(orgId);
  const newMember = members.find((m) => m.userId === targetUserId);

  sendCreated(res, newMember, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
