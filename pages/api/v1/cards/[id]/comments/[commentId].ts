/**
 * API v1: Card Comment Resource
 * GET    /api/v1/cards/:id/comments/:commentId - Get comment
 * PATCH  /api/v1/cards/:id/comments/:commentId - Update comment
 * DELETE /api/v1/cards/:id/comments/:commentId - Delete comment
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { query, queryOne } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();
  const cardId = req.query.id as string;
  const commentId = req.query.commentId as string;

  // Verify card exists
  const card = await queryOne('SELECT id FROM cards WHERE id = $1', [cardId]);
  if (!card) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  // Verify comment exists
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
    WHERE cc.id = $1 AND cc.card_id = $2
  `, [commentId, cardId]);

  if (!comment) {
    return sendNotFound(res, 'Comment', req.requestId);
  }

  switch (req.method) {
    case 'GET':
      return sendSuccess(res, { comment }, 200, req.requestId);
    case 'PATCH':
      return await handlePatch(req, res, comment);
    case 'DELETE':
      return await handleDelete(req, res, comment);
    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * PATCH /api/v1/cards/:id/comments/:commentId
 * Update a comment (only by author)
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, comment: any) {
  const userId = req.user!.id;

  // Only author can update
  if (comment.userId !== userId) {
    return sendForbidden(res, 'You can only edit your own comments', req.requestId);
  }

  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return sendValidationError(res, 'Comment content is required', undefined, req.requestId);
  }

  const now = new Date().toISOString();

  await query(`
    UPDATE card_comments
    SET content = $1, updated_at = $2
    WHERE id = $3
  `, [content.trim(), now, comment.id]);

  const updatedComment = await queryOne(`
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
  `, [comment.id]);

  sendSuccess(res, { comment: updatedComment }, 200, req.requestId);
}

/**
 * DELETE /api/v1/cards/:id/comments/:commentId
 * Delete a comment (only by author)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, comment: any) {
  const userId = req.user!.id;

  // Only author can delete
  if (comment.userId !== userId) {
    return sendForbidden(res, 'You can only delete your own comments', req.requestId);
  }

  await query('DELETE FROM card_comments WHERE id = $1', [comment.id]);

  sendSuccess(res, { message: 'Comment deleted successfully' }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
