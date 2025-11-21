/**
 * API v1: Get Project Board
 * GET /api/v1/projects/:id/board - Get project board with columns and cards
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireProjectMember } from '@/lib/api-v1/middleware/auth';
import { sendSuccess, sendMethodNotAllowed } from '@/lib/api-v1/utils/response';
import { validateId } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }

  return await handleGet(req, res, projectId);
}

/**
 * GET /api/v1/projects/:id/board
 * Get project board with all columns and cards
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, projectId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  const { boards } = getRepositories();

  // Get board for project
  const board = await boards.findByProjectId(projectId);

  if (!board) {
    // If no board exists, return empty board structure
    return sendSuccess(res, {
      projectId,
      columns: [],
      cards: []
    }, 200, req.requestId);
  }

  sendSuccess(res, board, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
