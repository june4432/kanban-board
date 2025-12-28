/**
 * API v1: Project Join Requests List
 * GET /api/v1/projects/[id]/join-requests - List pending join requests (owner only)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { getRepositories } from '@/lib/repositories';
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
 * GET /api/v1/projects/[id]/join-requests
 * List pending join requests for a project (owner only)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const userId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  const { projects } = getRepositories();
  const project = await projects.findById(projectId);

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Only owner can view join requests
  if (project.ownerId !== userId) {
    return sendForbidden(res, 'Only project owner can view join requests', req.requestId);
  }

  const pendingRequests = project.pendingRequests?.filter(r => r.status === 'pending') || [];

  sendSuccess(res, { requests: pendingRequests }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
