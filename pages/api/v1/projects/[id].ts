/**
 * API v1: Project Resource
 * GET    /api/v1/projects/:id - Get project details
 * PATCH  /api/v1/projects/:id - Update project
 * DELETE /api/v1/projects/:id - Delete project
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireProjectOwner, requireProjectMember } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendNoContent,
  sendMethodNotAllowed,
  sendNotFound,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateId,
  updateProjectSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res, projectId);
    case 'PATCH':
      return await handlePatch(req, res, projectId);
    case 'DELETE':
      return await handleDelete(req, res, projectId);
    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * GET /api/v1/projects/:id
 * Get project details (requires project membership)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, projectId: string) {
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  const { projects } = getRepositories();
  const project = projects.findById(projectId);

  if (!project) {
    return sendNotFound(res, 'Project', req.requestId);
  }

  sendSuccess(res, project, 200, req.requestId);
}

/**
 * PATCH /api/v1/projects/:id
 * Update project (requires owner permission)
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, projectId: string) {
  const isOwner = await requireProjectOwner(req, res, projectId);
  if (!isOwner) return;

  const updates = validateBody(req, updateProjectSchema);
  const { projects } = getRepositories();

  const updatedProject = projects.update(projectId, updates);

  if (!updatedProject) {
    return sendNotFound(res, 'Project', req.requestId);
  }

  sendSuccess(res, updatedProject, 200, req.requestId);
}

/**
 * DELETE /api/v1/projects/:id
 * Delete project (requires owner permission)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, projectId: string) {
  const isOwner = await requireProjectOwner(req, res, projectId);
  if (!isOwner) return;

  const { projects } = getRepositories();
  const deleted = projects.delete(projectId);

  if (!deleted) {
    return sendNotFound(res, 'Project', req.requestId);
  }

  sendNoContent(res);
}

export default withErrorHandler(requireAuth(handler));
