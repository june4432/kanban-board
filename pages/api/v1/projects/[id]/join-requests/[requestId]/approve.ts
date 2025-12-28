/**
 * API v1: Approve Project Join Request
 * POST /api/v1/projects/[id]/join-requests/[requestId]/approve
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

// WebSocket server extension type
type ApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: {
      io: any;
    };
  };
};

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'POST':
      return await handlePost(req, res);
    default:
      return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }
}

/**
 * POST /api/v1/projects/[id]/join-requests/[requestId]/approve
 * Approve a join request (owner only)
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId, requestId } = req.query;
  const userId = req.user!.id;

  if (typeof projectId !== 'string' || typeof requestId !== 'string') {
    return sendNotFound(res, 'Project or request not found', req.requestId);
  }

  const { projects, users } = getRepositories();
  const project = await projects.findById(projectId);

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Only owner can approve
  if (project.ownerId !== userId) {
    return sendForbidden(res, 'Only project owner can approve join requests', req.requestId);
  }

  const request = project.pendingRequests?.find(r => r.id === requestId);
  if (!request) {
    return sendNotFound(res, 'Join request not found', req.requestId);
  }

  // Accept the join request
  await projects.acceptJoinRequest(requestId);

  // Get updated project
  const updatedProject = await projects.findById(projectId);
  const requestUser = await users.findById(request.userId);

  // Emit WebSocket event
  const socketRes = res as ApiResponseWithSocket;
  if (socketRes.socket?.server?.io) {
    socketRes.socket.server.io.emit('project-join-response', {
      projectId,
      requestId,
      action: 'approve',
      project: updatedProject,
      user: requestUser,
      message: `"${updatedProject?.name}" 프로젝트 참여가 승인되었습니다!`,
    });
  }

  sendSuccess(res, { 
    message: 'Join request approved',
    project: updatedProject 
  }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
