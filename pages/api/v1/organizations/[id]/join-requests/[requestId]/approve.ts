/**
 * API v1: Approve Join Request
 * POST /api/v1/organizations/:id/join-requests/:requestId/approve
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendForbidden,
  sendNotFound,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const approveRequestSchema = z.object({
  role: z.enum(['member', 'viewer', 'editor', 'admin']).default('member'),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }

  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const orgId = validateId(req.query.id, 'organizationId');
  const requestId = validateId(req.query.requestId, 'requestId');

  const { organizations } = getRepositories();

  // Check if user is admin or owner
  const userRole = await organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(userRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required to approve requests.',
      req.requestId
    );
  }

  const data = validateBody(req, approveRequestSchema);

  // Approve the request
  const approved = await organizations.approveJoinRequest(requestId, data.role);

  if (!approved) {
    return sendNotFound(res, 'Join request', req.requestId);
  }

  const request = await organizations.getJoinRequest(requestId);
  sendSuccess(res, request, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
