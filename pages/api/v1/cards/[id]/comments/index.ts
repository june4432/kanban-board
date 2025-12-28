/**
 * API v1: Card Comments Collection
 * GET    /api/v1/cards/:id/comments - List comments
 * POST   /api/v1/cards/:id/comments - Create comment
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendCreated,
  sendMethodNotAllowed,
  sendNotFound,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { query, queryOne, queryAll } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();
  const cardId = req.query.id as string;

  // Verify card exists
  const card = await queryOne('SELECT id, column_id FROM cards WHERE id = $1', [cardId]);
  if (!card) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res, cardId);
    case 'POST':
      return await handlePost(req, res, cardId);
    default:
      return sendMethodNotAllowed(res, ['GET', 'POST'], req.requestId);
  }
}

/**
 * GET /api/v1/cards/:id/comments
 * List all comments for a card
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const comments = await queryAll(`
    SELECT
      cc.id,
      cc.card_id as "cardId",
      cc.user_id as "userId",
      cc.content,
      cc.created_at as "createdAt",
      cc.updated_at as "updatedAt",
      u.name as "userName",
      u.avatar_url as "userAvatar"
    FROM card_comments cc
    LEFT JOIN users u ON u.id = cc.user_id
    WHERE cc.card_id = $1
    ORDER BY cc.created_at ASC
  `, [cardId]);

  sendSuccess(res, { comments }, 200, req.requestId);
}

/**
 * POST /api/v1/cards/:id/comments
 * Create a new comment
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return sendValidationError(res, 'Comment content is required', undefined, req.requestId);
  }

  const commentId = uuidv4();
  const now = new Date().toISOString();

  await query(`
    INSERT INTO card_comments (id, card_id, user_id, content, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [commentId, cardId, userId, content.trim(), now, now]);

  const comment = await queryOne(`
    SELECT
      cc.id,
      cc.card_id as "cardId",
      cc.user_id as "userId",
      cc.content,
      cc.created_at as "createdAt",
      cc.updated_at as "updatedAt",
      u.name as "userName",
      u.avatar_url as "userAvatar"
    FROM card_comments cc
    LEFT JOIN users u ON u.id = cc.user_id
    WHERE cc.id = $1
  `, [commentId]);

  sendCreated(res, { comment }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
