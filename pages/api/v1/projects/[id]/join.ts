/**
 * API v1: Project Join Request
 * POST /api/v1/projects/[id]/join - Request to join a project
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendCreated,
  sendMethodNotAllowed,
  sendNotFound,
  sendValidationError,
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
 * POST /api/v1/projects/[id]/join
 * Request to join a public project
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const { message } = req.body;
  const userId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  const { projects, users } = getRepositories();

  const project = await projects.findById(projectId);
  const user = await users.findById(userId);

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  if (!user) {
    return sendNotFound(res, 'User not found', req.requestId);
  }

  // Check if project is public
  if (!project.isPublic) {
    return sendForbidden(res, 'This project is not public', req.requestId);
  }

  // Check if already a member
  if (await projects.isMember(projectId, userId)) {
    return sendValidationError(res, 'You are already a member of this project', undefined, req.requestId);
  }

  // Check for existing pending request
  const existingRequests = project.pendingRequests?.filter(
    (r) => r.userId === userId && r.status === 'pending'
  );
  if (existingRequests && existingRequests.length > 0) {
    return sendValidationError(res, 'Join request already exists', undefined, req.requestId);
  }

  // Create join request
  await projects.createJoinRequest({
    projectId,
    email: user.email,
    invitedBy: userId, // Self-invite for join requests
    message: message || '',
  });

  // Get the created request
  const updatedProject = await projects.findById(projectId);
  const newRequest = updatedProject?.pendingRequests?.find(
    r => r.userId === userId && r.status === 'pending'
  );

  // Emit WebSocket event
  const socketRes = res as ApiResponseWithSocket;
  if (socketRes.socket?.server?.io) {
    socketRes.socket.server.io.emit('project-join-request', {
      projectId,
      request: newRequest,
      user,
      project,
    });
  }

  sendCreated(res, { request: newRequest }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
