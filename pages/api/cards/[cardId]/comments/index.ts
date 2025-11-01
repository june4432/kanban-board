/**
 * Comments API
 * GET /api/cards/[cardId]/comments - 카드의 모든 댓글 조회
 * POST /api/cards/[cardId]/comments - 새 댓글 생성
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireCardAccess } from '@/lib/auth-helpers';
import { CommentRepository } from '@/lib/repositories/comment.repository';
import { getDatabase } from '@/lib/database';
import { commentSchema, validate } from '@/lib/validation';
import { logEvent } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';

type NextApiResponseWithSocket = NextApiResponse & {
  socket?: { server?: any };
};

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { cardId } = req.query;

  if (typeof cardId !== 'string') {
    throw new ValidationError('Invalid card ID format');
  }

  // 카드 접근 권한 확인
  const auth = await requireCardAccess(req, res, cardId);
  if (!auth) return;

  const { session, projectId } = auth;
  const db = getDatabase();
  const commentRepo = new CommentRepository(db);

  if (req.method === 'GET') {
    // 댓글 목록 조회
    const comments = commentRepo.findByCardId(cardId);

    return res.status(200).json({ comments });
  }

  if (req.method === 'POST') {
    // 댓글 생성
    const validatedData = validate(commentSchema, req.body);

    const comment = commentRepo.create({
      cardId,
      userId: session.user.id,
      content: validatedData.content,
      parentId: validatedData.parentId,
    });

    // 이벤트 로깅
    logEvent('comment.created', {
      commentId: comment.id,
      cardId,
      userId: session.user.id,
      projectId,
      isReply: !!validatedData.parentId,
    });

    // WebSocket으로 실시간 알림
    const socketRes = res as NextApiResponseWithSocket;
    if (socketRes.socket?.server?.io) {
      socketRes.socket.server.io.to(`project-${projectId}`).emit('comment-created', {
        comment,
        cardId,
        projectId,
      });
    }

    return res.status(201).json({ comment });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
});
