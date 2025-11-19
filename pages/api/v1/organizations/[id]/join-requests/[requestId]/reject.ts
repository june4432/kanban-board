/**
 * API v1: Reject Join Request
 * POST /api/v1/organizations/:id/join-requests/:requestId/reject
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
import { validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

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
  const userRole = organizations.getUserRole(orgId, req.user.id);
  if (!['owner', 'admin'].includes(userRole || '')) {
    return sendForbidden(
      res,
      'Access denied. Admin privileges required to reject requests.',
      req.requestId
    );
  }

  // Reject the request
  const rejected = organizations.rejectJoinRequest(requestId);

  if (!rejected) {
    return sendNotFound(res, 'Join request', req.requestId);
  }

  const request = organizations.getJoinRequest(requestId);
  sendSuccess(res, request, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
