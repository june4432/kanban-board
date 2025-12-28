/**
 * API v1: Card Attachment Resource
 * GET    /api/v1/cards/:id/attachments/:attachmentId - Get attachment
 * DELETE /api/v1/cards/:id/attachments/:attachmentId - Delete attachment
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
} from '@/lib/api-v1/utils/response';
import { query, queryOne } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();
  const cardId = req.query.id as string;
  const attachmentId = req.query.attachmentId as string;

  // Verify card exists
  const card = await queryOne('SELECT id FROM cards WHERE id = $1', [cardId]);
  if (!card) {
    return sendNotFound(res, 'Card', req.requestId);
  }

  // Verify attachment exists
  const attachment = await queryOne(`
    SELECT
      ca.id,
      ca.card_id as "cardId",
      ca.user_id as "userId",
      ca.file_name as "fileName",
      ca.file_type as "fileType",
      ca.file_size as "fileSize",
      ca.file_url as "fileUrl",
      ca.created_at as "createdAt",
      u.name as "userName"
    FROM card_attachments ca
    LEFT JOIN users u ON u.id = ca.user_id
    WHERE ca.id = $1 AND ca.card_id = $2
  `, [attachmentId, cardId]);

  if (!attachment) {
    return sendNotFound(res, 'Attachment', req.requestId);
  }

  switch (req.method) {
    case 'GET':
      return sendSuccess(res, { attachment }, 200, req.requestId);
    case 'DELETE':
      return await handleDelete(req, res, attachment);
    default:
      return sendMethodNotAllowed(res, ['GET', 'DELETE'], req.requestId);
  }
}

/**
 * DELETE /api/v1/cards/:id/attachments/:attachmentId
 * Delete an attachment (only by uploader)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, attachment: any) {
  const userId = req.user!.id;

  // Only uploader can delete
  if (attachment.userId !== userId) {
    return sendForbidden(res, 'You can only delete your own attachments', req.requestId);
  }

  await query('DELETE FROM card_attachments WHERE id = $1', [attachment.id]);

  sendSuccess(res, { message: 'Attachment deleted successfully' }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
