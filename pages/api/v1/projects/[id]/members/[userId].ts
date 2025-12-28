/**
 * API v1: Project Member Management
 * DELETE /api/v1/projects/[id]/members/[userId] - Remove member from project
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

  switch (req.method) {
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      return sendMethodNotAllowed(res, ['DELETE'], req.requestId);
  }
}

/**
 * DELETE /api/v1/projects/[id]/members/[userId]
 * Remove member from project (owner only)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId, userId: memberIdToRemove } = req.query;
  const currentUserId = req.user!.id;

  if (typeof projectId !== 'string' || typeof memberIdToRemove !== 'string') {
    return sendNotFound(res, 'Project or member not found', req.requestId);
  }

  const { projects } = getRepositories();
  const project = await projects.findById(projectId);

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Only owner can remove members
  if (project.ownerId !== currentUserId) {
    return sendForbidden(res, 'Only project owner can remove members', req.requestId);
  }

  // Check if member exists
  const memberExists = project.members?.some(m => m.id === memberIdToRemove);
  if (!memberExists) {
    return sendNotFound(res, 'Member not found in this project', req.requestId);
  }

  // Cannot remove owner
  if (project.ownerId === memberIdToRemove) {
    return sendValidationError(
      res,
      'Cannot remove project owner',
      [{ field: 'userId', message: 'Project owner cannot be removed' }],
      req.requestId
    );
  }

  // Remove member
  await projects.removeMember(projectId, memberIdToRemove);

  // Get updated project
  const updatedProject = await projects.findById(projectId);

  sendSuccess(res, { 
    message: 'Member removed successfully',
    project: updatedProject 
  }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
