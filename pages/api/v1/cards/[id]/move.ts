/**
 * API v1: Move Card
 * POST /api/v1/cards/:id/move - Move card to different column
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireCardAccess } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendNotFound,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateId,
  moveCardSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const cardId = validateId(req.query.id, 'cardId');

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }

  return await handlePost(req, res, cardId);
}

/**
 * POST /api/v1/cards/:id/move
 * Move card to different column
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const accessCheck = await requireCardAccess(req, res, cardId);
  if (!accessCheck) return;

  const { columnId, position } = validateBody(req, moveCardSchema);
  const { cards, boards } = getRepositories();

  const card = await cards.findById(cardId);
  if (!card) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  // Get board to validate column
  const board = await boards.findByProjectId(accessCheck.projectId);
  if (!board) {
    return sendValidationError(
      res,
      'Board not found',
      undefined,
      req.requestId
    );
  }

  const targetColumn = board.columns.find((col) => col.id === columnId);
  if (!targetColumn) {
    return sendValidationError(
      res,
      'Target column not found',
      [{ field: 'columnId', message: 'Invalid column ID' }],
      req.requestId
    );
  }

  // Check WIP limit (if moving to different column)
  if (card.columnId !== columnId) {
    if (targetColumn.wipLimit > 0 && targetColumn.cards.length >= targetColumn.wipLimit) {
      return sendValidationError(
        res,
        `WIP limit exceeded: ${targetColumn.title} column has a maximum of ${targetColumn.wipLimit} cards`,
        [
          {
            field: 'columnId',
            message: `Column ${targetColumn.title} is at capacity (${targetColumn.wipLimit} cards)`,
          },
        ],
        req.requestId
      );
    }
  }

  // Move card
  const success = await cards.moveCard(cardId, columnId, position ?? 0);

  if (!success) {
    return sendValidationError(res, 'Failed to move card', undefined, req.requestId);
  }

  // Fetch updated card
  const movedCard = await cards.findById(cardId);
  if (!movedCard) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  sendSuccess(res, movedCard, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
