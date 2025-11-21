/**
 * API v1: Project Label
 * PATCH /api/v1/projects/:id/labels/:labelId - Update a label
 * DELETE /api/v1/projects/:id/labels/:labelId - Delete a label
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

// Validation schema for updating a label
const UpdateLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50, 'Label name is too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex like #FF5733)').optional(),
}).refine((data) => data.name !== undefined || data.color !== undefined, {
  message: 'At least one field must be provided for update',
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');
  const labelId = validateId(req.query.labelId, 'labelId');

  if (req.method === 'PATCH') {
    return await handlePatch(req, res, projectId, labelId);
  } else if (req.method === 'DELETE') {
    return await handleDelete(req, res, projectId, labelId);
  } else {
    return sendMethodNotAllowed(res, ['PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * PATCH /api/v1/projects/:id/labels/:labelId
 * Update a label
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, projectId: string, labelId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  // Validate request body
  const body = validateBody(req, UpdateLabelSchema);

  const { boards } = getRepositories();

  // Get current board
  const board = await boards.findByProjectId(projectId);

  if (!board) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Board not found for this project',
      404,
      undefined,
      req.requestId
    );
  }

  // Check if label exists
  const existingLabel = board.labels?.find((l) => l.id === labelId);

  if (!existingLabel) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Label not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Update label
  const updatedLabel = await boards.updateLabel(labelId, {
    name: body.name,
    color: body.color,
  });

  if (!updatedLabel) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Failed to update label',
      500,
      undefined,
      req.requestId
    );
  }

  sendSuccess(
    res,
    {
      label: updatedLabel,
      message: 'Label updated successfully',
    },
    200,
    req.requestId
  );
}

/**
 * DELETE /api/v1/projects/:id/labels/:labelId
 * Delete a label
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, projectId: string, labelId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  const { boards } = getRepositories();

  // Get current board
  const board = await boards.findByProjectId(projectId);

  if (!board) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Board not found for this project',
      404,
      undefined,
      req.requestId
    );
  }

  // Check if label exists
  const existingLabel = board.labels?.find((l) => l.id === labelId);

  if (!existingLabel) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Label not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Delete label
  const deleted = await boards.deleteLabel(labelId);

  if (!deleted) {
    return sendError(
      res,
      ApiErrorCode.INTERNAL_ERROR,
      'Failed to delete label',
      500,
      undefined,
      req.requestId
    );
  }

  sendSuccess(
    res,
    {
      message: 'Label deleted successfully',
    },
    200,
    req.requestId
  );
}

export default withErrorHandler(requireAuth(handler));
