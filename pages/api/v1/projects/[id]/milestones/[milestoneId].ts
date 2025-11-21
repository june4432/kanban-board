/**
 * API v1: Project Milestone
 * PATCH /api/v1/projects/:id/milestones/:milestoneId - Update a milestone
 * DELETE /api/v1/projects/:id/milestones/:milestoneId - Delete a milestone
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

// Validation schema for updating a milestone
const UpdateMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(100, 'Milestone name is too long').optional(),
  dueDate: z.string().refine((val) => {
    // Accept YYYY-MM-DD format or ISO datetime
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val) && !isNaN(Date.parse(val));
  }, 'Invalid date format (must be YYYY-MM-DD or ISO 8601 datetime)').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
}).refine((data) => data.name !== undefined || data.dueDate !== undefined || data.description !== undefined, {
  message: 'At least one field must be provided for update',
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');
  const milestoneId = validateId(req.query.milestoneId, 'milestoneId');

  if (req.method === 'PATCH') {
    return await handlePatch(req, res, projectId, milestoneId);
  } else if (req.method === 'DELETE') {
    return await handleDelete(req, res, projectId, milestoneId);
  } else {
    return sendMethodNotAllowed(res, ['PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * PATCH /api/v1/projects/:id/milestones/:milestoneId
 * Update a milestone
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, projectId: string, milestoneId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  // Validate request body
  const body = validateBody(req, UpdateMilestoneSchema);

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

  // Check if milestone exists
  const existingMilestone = board.milestones?.find((m) => m.id === milestoneId);

  if (!existingMilestone) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Milestone not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Update milestone
  const updatedMilestone = await boards.updateMilestone(milestoneId, {
    name: body.name,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    description: body.description,
  });

  if (!updatedMilestone) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Failed to update milestone',
      500,
      undefined,
      req.requestId
    );
  }

  sendSuccess(
    res,
    {
      milestone: updatedMilestone,
      message: 'Milestone updated successfully',
    },
    200,
    req.requestId
  );
}

/**
 * DELETE /api/v1/projects/:id/milestones/:milestoneId
 * Delete a milestone
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, projectId: string, milestoneId: string) {
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

  // Check if milestone exists
  const existingMilestone = board.milestones?.find((m) => m.id === milestoneId);

  if (!existingMilestone) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Milestone not found',
      404,
      undefined,
      req.requestId
    );
  }

  // Delete milestone
  const deleted = await boards.deleteMilestone(milestoneId);

  if (!deleted) {
    return sendError(
      res,
      ApiErrorCode.INTERNAL_ERROR,
      'Failed to delete milestone',
      500,
      undefined,
      req.requestId
    );
  }

  sendSuccess(
    res,
    {
      message: 'Milestone deleted successfully',
    },
    200,
    req.requestId
  );
}

export default withErrorHandler(requireAuth(handler));
