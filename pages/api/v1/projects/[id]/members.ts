/**
 * API v1: Project Members
 * POST   /api/v1/projects/:id/members - Add member to project
 * DELETE /api/v1/projects/:id/members/:userId - Remove member from project
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
  sendNotFound,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');

  switch (req.method) {
    case 'POST':
      return await handlePost(req, res, projectId);
    case 'DELETE':
      return await handleDelete(req, res, projectId);
    default:
      return sendMethodNotAllowed(res, ['POST', 'DELETE'], req.requestId);
  }
}

/**
 * POST /api/v1/projects/:id/members
 * Add member to project (requires owner or admin)
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, projectId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { projects, users, organizations } = getRepositories();

  // Get project
  const project = await projects.findById(projectId);
  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Check if user is owner
  if (project.ownerId !== req.user.id) {
    return sendForbidden(
      res,
      'Access denied. Only project owner can add members.',
      req.requestId
    );
  }

  const data = validateBody(req, addMemberSchema);

  // Check if target user exists
  const targetUser = await users.findById(data.userId);
  if (!targetUser) {
    return sendValidationError(
      res,
      'User not found',
      [{ field: 'userId', message: 'Invalid user ID' }],
      req.requestId
    );
  }

  // Check if user is in the same organization
  if (project.organizationId) {
    const isOrgMember = organizations.isMember(project.organizationId, data.userId);
    if (!isOrgMember) {
      return sendValidationError(
        res,
        'User is not a member of the project organization',
        [{ field: 'userId', message: 'User must be a member of the organization first' }],
        req.requestId
      );
    }
  }

  // Check if already a member
  const isAlreadyMember = project.members?.some(m => m.id === data.userId);
  if (isAlreadyMember) {
    return sendValidationError(
      res,
      'User is already a member of this project',
      [{ field: 'userId', message: 'User already exists in project' }],
      req.requestId
    );
  }

  // Add member to project
  await projects.addMember(projectId, data.userId);

  // Get updated project
  const updatedProject = await projects.findById(projectId);
  const newMember = updatedProject?.members?.find(m => m.id === data.userId);

  sendCreated(res, newMember, req.requestId);
}

/**
 * DELETE /api/v1/projects/:id/members/:userId
 * Remove member from project (requires owner)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, projectId: string) {
  if (!req.user) {
    return sendForbidden(res, 'User not authenticated', req.requestId);
  }

  const { projects } = getRepositories();

  // Get project
  const project = await projects.findById(projectId);
  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Check if user is owner
  if (project.ownerId !== req.user.id) {
    return sendForbidden(
      res,
      'Access denied. Only project owner can remove members.',
      req.requestId
    );
  }

  const userIdToRemove = validateId(req.query.userId, 'userId');

  // Check if member exists
  const memberExists = project.members?.some(m => m.id === userIdToRemove);
  if (!memberExists) {
    return sendNotFound(res, 'Member not found in this project', req.requestId);
  }

  // Cannot remove owner
  if (project.ownerId === userIdToRemove) {
    return sendValidationError(
      res,
      'Cannot remove project owner',
      [{ field: 'userId', message: 'Project owner cannot be removed' }],
      req.requestId
    );
  }

  // Remove member
  await projects.removeMember(projectId, userIdToRemove);

  sendSuccess(res, { message: 'Member removed successfully' }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
