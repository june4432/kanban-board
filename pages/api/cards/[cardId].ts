import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireCardAccess } from '@/lib/auth-helpers';
import { withErrorHandler } from '@/lib/error-handler';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { cardUpdateSchema, validate } from '@/lib/validation';
import { logEvent } from '@/lib/logger';
import { AuditLogService, extractChanges } from '@/lib/services/audit-log.service';
import { getDatabase } from '@/lib/database';
import type { Card } from '@/types';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { cardId } = req.query;

  if (typeof cardId !== 'string') {
    throw new ValidationError('Invalid card ID format');
  }

  // 인증 및 카드 접근 권한 확인
  const auth = await requireCardAccess(req, res, cardId);
  if (!auth) return; // 이미 에러 응답 전송됨

  const { session, projectId } = auth;
  const { cards } = getRepositories();
  const db = getDatabase();
  const auditLogService = new AuditLogService(db);

  switch (req.method) {
    case 'PUT': {
      // 입력 검증
      const validatedUpdates = validate(cardUpdateSchema, req.body);

      // 기존 카드 정보 저장 (변경사항 추적용)
      const oldCard = cards.findById(cardId);

      // 카드 업데이트
      const updatedCard = cards.update(cardId, validatedUpdates as Partial<Card>);

      if (!updatedCard) {
        throw new NotFoundError('Card');
      }

      // 감사 로그 기록
      const changes = extractChanges(oldCard, updatedCard, ['title', 'description', 'priority', 'dueDate']);
      if (changes.length > 0) {
        auditLogService.log({
          userId: session.user.id,
          userName: session.user.name || 'Unknown',
          action: 'update',
          resourceType: 'card',
          resourceId: cardId,
          projectId,
          changes,
          ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        });
      }

      // 이벤트 로깅
      logEvent('card.updated', {
        cardId: cardId,
        userId: session.user.id,
        projectId,
        changes: Object.keys(validatedUpdates),
      });

      // WebSocket 이벤트 전송
      const socketRes = res as NextApiResponseWithSocket;
      if (socketRes.socket?.server?.io) {
        const eventData = {
          card: updatedCard,
          user: { id: session.user.id, name: session.user.name || '알 수 없는 사용자' },
          projectId,
          timestamp: Date.now(),
        };
        socketRes.socket.server.io.to(`project-${projectId}`).emit('card-updated', eventData);
      }

      return res.status(200).json({ card: updatedCard });
    }

    case 'DELETE': {
      // 카드 삭제
      const deleted = cards.delete(cardId);

      if (!deleted) {
        throw new NotFoundError('Card');
      }

      // 감사 로그 기록
      auditLogService.log({
        userId: session.user.id,
        userName: session.user.name || 'Unknown',
        action: 'delete',
        resourceType: 'card',
        resourceId: cardId,
        projectId,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      // 이벤트 로깅
      logEvent('card.deleted', {
        cardId: cardId,
        userId: session.user.id,
        projectId,
      });

      // WebSocket 이벤트 전송
      const socketResDelete = res as NextApiResponseWithSocket;
      if (socketResDelete.socket?.server?.io) {
        socketResDelete.socket.server.io.to(`project-${projectId}`).emit('card-deleted', {
          cardId: cardId,
          projectId,
          userId: session.user.id,
        });
      }

      return res.status(200).json({ success: true });
    }

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
