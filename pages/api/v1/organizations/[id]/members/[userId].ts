/**
 * API v1: Organization Member Resource
 * PATCH  /api/v1/organizations/:id/members/:userId - Update member role
 * DELETE /api/v1/organizations/:id/members/:userId - Remove member
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendNoContent,
  sendMethodNotAllowed,
  sendForbidden,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'editor', 'viewer', 'member']),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const orgId = validateId(req.query.id, 'organizationId');
  const userId = validateId(req.query.userId, 'userId');

  switch (req.method) {
    case 'PATCH':
      return await handlePatch(req, res, orgId, userId);
    case 'DELETE':
      return await handleDelete(req, res, orgId, userId);
    default:
      return sendMethodNotAllowed(res, ['PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * PATCH /api/v1/organizations/:id/members/:userId
 * Update member role (requires admin or owner)
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, orgId: string, userId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations } = getRepositories();

  // Check if current user is admin or owner
  const currentUserRole = await organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(currentUserRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required.',
      req.requestId
    );
  }

  const data = validateBody(req, updateMemberSchema);

  // Cannot change owner role
  const targetMemberRole = await organizations.getUserRole(orgId, userId);
  if (targetMemberRole === 'owner') {
    return sendValidationError(
      res,
      'Cannot modify owner role',
      [{ field: 'userId', message: 'Owner role cannot be changed' }],
      req.requestId
    );
  }

  // Update member role
  await organizations.updateMemberRole(orgId, userId, data.role);

  // Return updated member info
  const members = await organizations.getMembers(orgId);
  const updatedMember = members.find((m) => m.userId === userId);

  sendSuccess(res, updatedMember, 200, req.requestId);
}

/**
 * DELETE /api/v1/organizations/:id/members/:userId
 * Remove member from organization (requires admin or owner)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, orgId: string, userId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations } = getRepositories();

  // Check if current user is admin or owner
  const currentUserRole = await organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(currentUserRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required to remove members.',
      req.requestId
    );
  }

  // Cannot remove owner
  const targetMemberRole = await organizations.getUserRole(orgId, userId);
  if (targetMemberRole === 'owner') {
    return sendValidationError(
      res,
      'Cannot remove organization owner',
      [{ field: 'userId', message: 'Owner cannot be removed from organization' }],
      req.requestId
    );
  }

  // Cannot remove yourself
  if (userId === req.user.id) {
    return sendValidationError(
      res,
      'Cannot remove yourself',
      [{ field: 'userId', message: 'Use leave endpoint to leave organization' }],
      req.requestId
    );
  }

  // Remove member
  await organizations.removeMember(orgId, userId);

  sendNoContent(res);
}

export default withErrorHandler(requireAuth(handler));
