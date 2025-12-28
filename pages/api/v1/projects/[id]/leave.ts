/**
 * API v1: Leave Project
 * DELETE /api/v1/projects/:id/leave - Leave project
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
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();
  const projectId = req.query.id as string;
  const userId = req.user!.id;

  if (req.method !== 'DELETE') {
    return sendMethodNotAllowed(res, ['DELETE'], req.requestId);
  }

  const { projects } = getRepositories();

  // Verify project exists
  const project = await projects.findById(projectId);
  if (!project) {
    return sendNotFound(res, 'Project', req.requestId);
  }

  // Check if user is a member
  const isMember = project.members.some(m => m.id === userId);
  if (!isMember) {
    return sendForbidden(res, 'You are not a member of this project', req.requestId);
  }

  // Owner cannot leave
  if (project.ownerId === userId) {
    return sendValidationError(
      res,
      'Project owner cannot leave. Transfer ownership or delete the project instead.',
      undefined,
      req.requestId
    );
  }

  // Remove member
  const removed = await projects.removeMember(projectId, userId);
  if (!removed) {
    return sendValidationError(res, 'Failed to leave project', undefined, req.requestId);
  }

  // Return updated project
  const updatedProject = await projects.findById(projectId);

  sendSuccess(res, {
    message: 'Successfully left the project',
    project: updatedProject,
  }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
