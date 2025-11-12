/**
 * API v1: Card Resource
 * GET    /api/v1/cards/:id - Get card details
 * PATCH  /api/v1/cards/:id - Update card
 * DELETE /api/v1/cards/:id - Delete card
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireCardAccess } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendNoContent,
  sendMethodNotAllowed,
  sendNotFound,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateId,
  updateCardSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const cardId = validateId(req.query.id, 'cardId');

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res, cardId);
    case 'PATCH':
      return await handlePatch(req, res, cardId);
    case 'DELETE':
      return await handleDelete(req, res, cardId);
    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * GET /api/v1/cards/:id
 * Get card details
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const accessCheck = await requireCardAccess(req, res, cardId);
  if (!accessCheck) return;

  const { cards } = getRepositories();
  const card = cards.findById(cardId);

  if (!card) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  sendSuccess(res, card, 200, req.requestId);
}

/**
 * PATCH /api/v1/cards/:id
 * Update card
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const accessCheck = await requireCardAccess(req, res, cardId);
  if (!accessCheck) return;

  const updates = validateBody(req, updateCardSchema);
  const { cards } = getRepositories();

  // Convert date strings to Date objects
  const updatesWithDates = {
    ...updates,
    dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
  };

  const updatedCard = cards.update(cardId, updatesWithDates);

  if (!updatedCard) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  sendSuccess(res, updatedCard, 200, req.requestId);
}

/**
 * DELETE /api/v1/cards/:id
 * Delete card
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const accessCheck = await requireCardAccess(req, res, cardId);
  if (!accessCheck) return;

  const { cards } = getRepositories();
  const deleted = cards.delete(cardId);

  if (!deleted) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  sendNoContent(res);
}

export default withErrorHandler(requireAuth(handler));
