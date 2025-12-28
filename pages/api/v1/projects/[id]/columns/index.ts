/**
 * API v1: Project Columns
 * POST /api/v1/projects/[id]/columns - Create new column
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendCreated,
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
    case 'POST':
      return await handlePost(req, res);
    default:
      return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }
}

/**
 * POST /api/v1/projects/[id]/columns
 * Create a new column in the project's board
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
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

  // Get board ID
  const boardId = await boards.getBoardIdByProjectId(projectId);
  if (!boardId) {
    return sendNotFound(res, 'Board not found for this project', req.requestId);
  }

  const { title, wipLimit } = req.body;

  if (!title) {
    return sendValidationError(
      res,
      'Column title is required',
      [{ field: 'title', message: 'Title is required' }],
      req.requestId
    );
  }

  // Create column
  const column = await boards.createColumn(boardId, {
    title,
    wipLimit: wipLimit || 0,
  });

  // Return updated board
  const board = await boards.findByProjectId(projectId);

  sendCreated(res, { column, board }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
