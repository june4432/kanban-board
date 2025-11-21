/**
 * Card Attachments API
 * GET /api/cards/[cardId]/attachments - 카드의 모든 첨부파일 조회
 * POST /api/cards/[cardId]/attachments - 파일 업로드
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireCardAccess } from '@/lib/auth-helpers';
import { getRepositories } from '@/lib/repositories';
import { parseFormData } from '@/lib/file-upload';
import { ValidationError } from '@/lib/errors';
import { logEvent } from '@/lib/logger';
import { AuditLogService } from '@/lib/services/audit-log.service';

// Next.js body parser 비활성화 (formidable 사용)
export const config = {
  api: {
    bodyParser: false,
  },
};

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
  if (!auth) return;

  const { session, projectId } = auth;
  const { attachments } = getRepositories();
  const auditLogService = new AuditLogService();

  switch (req.method) {
    case 'GET': {
      // 카드의 모든 첨부파일 조회
      const files = await attachments.findByCardId(cardId);

      return res.status(200).json({ attachments: files });
    }

    case 'POST': {
      // 파일 업로드
      const { files: uploadedFiles } = await parseFormData(req);

      if (uploadedFiles.length === 0) {
        throw new ValidationError('No files uploaded');
      }

      // 파일 메타데이터 저장
      const savedAttachments = await Promise.all(uploadedFiles.map(async (file) => {
        return await attachments.create({
          cardId,
          userId: session.user.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          storagePath: file.storagePath,
        });
      }));


      // 감사 로그 기록
      await Promise.all(savedAttachments.map(async (attachment) => {
        await auditLogService.log({
          userId: session.user.id,
          userName: session.user.name || 'Unknown',
          action: 'create',
          resourceType: 'card',
          resourceId: cardId,
          projectId,
          changes: [
            {
              field: 'attachment',
              oldValue: null,
              newValue: attachment.originalName,
            },
          ],
          ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        });
      }));

      // 이벤트 로깅
      logEvent('attachments.uploaded', {
        cardId,
        userId: session.user.id,
        projectId,
        count: savedAttachments.length,
        files: savedAttachments.map(a => a.originalName),
      });

      // WebSocket 이벤트 전송
      const socketRes = res as NextApiResponseWithSocket;
      if (socketRes.socket?.server?.io) {
        socketRes.socket.server.io.to(`project-${projectId}`).emit('attachments-uploaded', {
          cardId,
          attachments: savedAttachments,
          user: { id: session.user.id, name: session.user.name || '알 수 없는 사용자' },
          timestamp: Date.now(),
        });
      }

      return res.status(201).json({ attachments: savedAttachments });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
