/**
 * API v1: Project Column
 * PATCH /api/v1/projects/:id/columns/:columnId - Update column properties (e.g., WIP limit)
 */

import { NextApiResponse } from 'next';
import { ApiRequest, ApiErrorCode } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireProjectMember } from '@/lib/api-v1/middleware/auth';
import { sendSuccess, sendMethodNotAllowed, sendError } from '@/lib/api-v1/utils/response';
import { validateId, validateBody } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schema for updating a column
const UpdateColumnSchema = z.object({
  wipLimit: z.number().int().min(0, 'WIP limit must be non-negative').optional(),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');
  const columnId = validateId(req.query.columnId, 'columnId');

  if (req.method !== 'PATCH') {
    return sendMethodNotAllowed(res, ['PATCH'], req.requestId);
  }

  return await handlePatch(req, res, projectId, columnId);
}

/**
 * PATCH /api/v1/projects/:id/columns/:columnId
 * Update column properties (e.g., WIP limit)
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, projectId: string, columnId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  // Validate request body
  const body = validateBody(req, UpdateColumnSchema);

  const { boards } = getRepositories();

  // Get current board
  const board = boards.findByProjectId(projectId);

  if (!board) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Board not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Find the column
  const column = board.columns.find((col) => col.id === columnId);

  if (!column) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Column not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Update column properties
  boards.updateColumn(columnId, {
    wipLimit: body.wipLimit,
  });

  // Fetch updated board to return
  const updatedBoard = boards.findByProjectId(projectId);
  const updatedColumn = updatedBoard?.columns.find((col) => col.id === columnId);

  sendSuccess(
    res,
    {
      column: updatedColumn,
      message: 'Column updated successfully',
    },
    200,
    req.requestId
  );
}

export default withErrorHandler(requireAuth(handler));
