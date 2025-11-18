/**
 * API v1: Project Labels
 * POST /api/v1/projects/:id/labels - Create a new label for the project
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

// Validation schema for creating a label
const CreateLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50, 'Label name is too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex like #FF5733)'),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }

  return await handlePost(req, res, projectId);
}

/**
 * POST /api/v1/projects/:id/labels
 * Create a new label for the project
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, projectId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  // Validate request body
  const body = validateBody(req.body, CreateLabelSchema);

  const { boards } = getRepositories();

  // Get current board
  const board = boards.findByProjectId(projectId);

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

  // Check if label with same name already exists
  const existingLabel = board.labels?.find(
    (l) => l.name.toLowerCase() === body.name.toLowerCase()
  );

  if (existingLabel) {
    return sendSuccess(
      res,
      {
        label: existingLabel,
        message: 'Label already exists',
      },
      200,
      req.requestId
    );
  }

  // Create new label
  const newLabel = boards.createLabel(board.boardId, {
    name: body.name,
    color: body.color,
  });

  sendSuccess(
    res,
    {
      label: newLabel,
      message: 'Label created successfully',
    },
    201,
    req.requestId
  );
}

export default withErrorHandler(requireAuth(handler));
