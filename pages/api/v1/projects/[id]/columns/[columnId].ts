/**
 * API v1: Project Column
 * PATCH /api/v1/projects/:id/columns/:columnId - Update column properties (e.g., WIP limit)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
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
  const body = validateBody(req.body, UpdateColumnSchema);

  const { boards } = getRepositories();

  // Get current board
  const board = boards.findByProjectId(projectId);

  if (!board) {
    return sendError(
      res,
      'Board not found',
      'NOT_FOUND',
      404,
      req.requestId
    );
  }

  // Find the column
  const columnIndex = board.columns.findIndex((col) => col.id === columnId);

  if (columnIndex === -1) {
    return sendError(
      res,
      'Column not found',
      'NOT_FOUND',
      404,
      req.requestId
    );
  }

  // Update column properties
  const updatedColumn = {
    ...board.columns[columnIndex],
    ...(body.wipLimit !== undefined && { wipLimit: body.wipLimit }),
  };

  // Update board with modified column
  const updatedColumns = [...board.columns];
  updatedColumns[columnIndex] = updatedColumn;

  const updatedBoard = {
    ...board,
    columns: updatedColumns,
  };

  boards.save(updatedBoard);

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
