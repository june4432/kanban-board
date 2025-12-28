/**
 * API v1: Card Attachments Collection
 * GET    /api/v1/cards/:id/attachments - List attachments
 * POST   /api/v1/cards/:id/attachments - Create attachment
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
  const card = await queryOne('SELECT id FROM cards WHERE id = $1', [cardId]);
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
 * GET /api/v1/cards/:id/attachments
 * List all attachments for a card
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const attachments = await queryAll(`
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
    WHERE ca.card_id = $1
    ORDER BY ca.created_at DESC
  `, [cardId]);

  sendSuccess(res, { attachments }, 200, req.requestId);
}

/**
 * POST /api/v1/cards/:id/attachments
 * Create a new attachment
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, cardId: string) {
  const { fileName, fileType, fileSize, fileUrl } = req.body;
  const userId = req.user!.id;

  if (!fileName || !fileUrl) {
    return sendValidationError(res, 'fileName and fileUrl are required', undefined, req.requestId);
  }

  const attachmentId = uuidv4();
  const now = new Date().toISOString();

  await query(`
    INSERT INTO card_attachments (id, card_id, user_id, file_name, file_type, file_size, file_url, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [attachmentId, cardId, userId, fileName, fileType || null, fileSize || null, fileUrl, now]);

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
    WHERE ca.id = $1
  `, [attachmentId]);

  sendCreated(res, { attachment }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
