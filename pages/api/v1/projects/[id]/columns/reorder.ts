/**
 * API v1: Reorder Project Columns
 * PUT /api/v1/projects/[id]/columns/reorder - Reorder columns
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
    case 'PUT':
      return await handlePut(req, res);
    default:
      return sendMethodNotAllowed(res, ['PUT'], req.requestId);
  }
}

/**
 * PUT /api/v1/projects/[id]/columns/reorder
 * Reorder columns in the project's board
 */
async function handlePut(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const userId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  const { projects, boards } = getRepositories();

  // Check project exists and user has access
  const project = await projects.findById(projectId);
  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  const isMember = await projects.isMember(projectId, userId);
  if (!isMember && project.ownerId !== userId) {
    return sendForbidden(res, 'Access denied. You are not a member of this project.', req.requestId);
  }

  const { columnIds } = req.body;

  if (!Array.isArray(columnIds)) {
    return sendValidationError(
      res,
      'columnIds must be an array',
      [{ field: 'columnIds', message: 'Must be an array of column IDs' }],
      req.requestId
    );
  }

  // Get board ID
  const boardId = await boards.getBoardIdByProjectId(projectId);
  if (!boardId) {
    return sendNotFound(res, 'Board not found', req.requestId);
  }

  // Reorder columns
  await boards.reorderColumns(boardId, columnIds);

  // Return updated board
  const board = await boards.findByProjectId(projectId);

  sendSuccess(res, { board }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
