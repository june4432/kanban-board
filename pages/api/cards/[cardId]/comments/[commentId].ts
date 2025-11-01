/**
 * Single Comment API
 * PUT /api/cards/[cardId]/comments/[commentId] - 댓글 수정
 * DELETE /api/cards/[cardId]/comments/[commentId] - 댓글 삭제
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireAuth } from '@/lib/auth-helpers';
import { CommentRepository } from '@/lib/repositories/comment.repository';
import { getDatabase } from '@/lib/database';
import { commentUpdateSchema, validate } from '@/lib/validation';
import { logEvent } from '@/lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

type NextApiResponseWithSocket = NextApiResponse & {
  socket?: { server?: any };
};

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { cardId, commentId } = req.query;

  if (typeof cardId !== 'string' || typeof commentId !== 'string') {
    throw new ValidationError('Invalid card or comment ID format');
  }

  // 인증 확인
  const session = await requireAuth(req, res);
  if (!session) return;

  const db = getDatabase();
  const commentRepo = new CommentRepository(db);

  // 댓글 조회
  const comment = commentRepo.findById(commentId);
  if (!comment) {
    throw new NotFoundError('Comment');
  }

  // 댓글 작성자만 수정/삭제 가능
  if (comment.userId !== session.user.id) {
    throw new ForbiddenError('You can only modify your own comments');
  }

  if (req.method === 'PUT') {
    // 댓글 수정
    const validatedData = validate(commentUpdateSchema, req.body);

    const updatedComment = commentRepo.update(commentId, validatedData.content);

    if (!updatedComment) {
      throw new NotFoundError('Comment');
    }

    // 이벤트 로깅
    logEvent('comment.updated', {
      commentId,
      cardId,
      userId: session.user.id,
    });

    // WebSocket 알림
    const socketRes = res as NextApiResponseWithSocket;
    if (socketRes.socket?.server?.io) {
      socketRes.socket.server.io.emit('comment-updated', {
        comment: updatedComment,
        cardId,
      });
    }

    return res.status(200).json({ comment: updatedComment });
  }

  if (req.method === 'DELETE') {
    // 댓글 삭제 (Soft delete)
    const deleted = commentRepo.softDelete(commentId);

    if (!deleted) {
      throw new NotFoundError('Comment');
    }

    // 이벤트 로깅
    logEvent('comment.deleted', {
      commentId,
      cardId,
      userId: session.user.id,
    });

    // WebSocket 알림
    const socketResDelete = res as NextApiResponseWithSocket;
    if (socketResDelete.socket?.server?.io) {
      socketResDelete.socket.server.io.emit('comment-deleted', {
        commentId,
        cardId,
      });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
});
