/**
 * API v1: Organization Join Requests
 * GET  /api/v1/organizations/:id/join-requests - List join requests
 * POST /api/v1/organizations/:id/join-requests - Create join request
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

const createJoinRequestSchema = z.object({
  message: z.string().optional(),
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
 * GET /api/v1/organizations/:id/join-requests
 * List join requests (requires admin or owner)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations } = getRepositories();

  // Check if user is admin or owner
  const userRole = organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(userRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required.',
      req.requestId
    );
  }

  const status = req.query.status as string | undefined;
  const requests = organizations.getJoinRequests(orgId, status);

  sendSuccess(res, requests, 200, req.requestId);
}

/**
 * POST /api/v1/organizations/:id/join-requests
 * Create join request
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { organizations } = getRepositories();

  // Check if organization exists
  const org = organizations.findById(orgId);
  if (!org) {
    return sendValidationError(
      res,
      'Organization not found',
      [{ field: 'organizationId', message: 'Organization does not exist' }],
      req.requestId
    );
  }

  // Check if already a member
  if (organizations.isMember(orgId, req.user.id)) {
    return sendValidationError(
      res,
      'Already a member of this organization',
      [{ field: 'userId', message: 'User is already a member' }],
      req.requestId
    );
  }

  // Check if already has pending request
  if (organizations.hasPendingRequest(orgId, req.user.id)) {
    return sendValidationError(
      res,
      'Join request already pending',
      [{ field: 'userId', message: 'You already have a pending request' }],
      req.requestId
    );
  }

  const data = validateBody(req, createJoinRequestSchema);

  const joinRequest = organizations.createJoinRequest(
    orgId,
    req.user.id,
    data.message
  );

  sendCreated(res, joinRequest, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
