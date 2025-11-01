/**
 * Single Attachment API
 * GET /api/cards/[cardId]/attachments/[attachmentId] - 파일 다운로드
 * DELETE /api/cards/[cardId]/attachments/[attachmentId] - 파일 삭제
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireCardAccess } from '@/lib/auth-helpers';
import { getRepositories } from '@/lib/repositories';
import { deleteFile, fileExists, UPLOAD_DIR } from '@/lib/file-upload';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { logEvent } from '@/lib/logger';
import { AuditLogService } from '@/lib/services/audit-log.service';
import { getDatabase } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { cardId, attachmentId } = req.query;

  if (typeof cardId !== 'string' || typeof attachmentId !== 'string') {
    throw new ValidationError('Invalid card ID or attachment ID format');
  }

  // 인증 및 카드 접근 권한 확인
  const auth = await requireCardAccess(req, res, cardId);
  if (!auth) return;

  const { session, projectId } = auth;
  const { attachments } = getRepositories();
  const db = getDatabase();
  const auditLogService = new AuditLogService(db);

  // 첨부파일 조회
  const attachment = attachments.findById(attachmentId);

  if (!attachment) {
    throw new NotFoundError('Attachment');
  }

  // 첨부파일이 해당 카드에 속하는지 확인
  if (attachment.cardId !== cardId) {
    throw new ForbiddenError('Attachment does not belong to this card');
  }

  switch (req.method) {
    case 'GET': {
      // 파일 다운로드
      const filePath = path.join(UPLOAD_DIR, attachment.filename);

      if (!fileExists(attachment.filename)) {
        throw new NotFoundError('File not found on disk');
      }

      // 파일 스트림으로 전송
      const stat = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);

      fileStream.pipe(res);

      // 이벤트 로깅
      logEvent('attachment.downloaded', {
        attachmentId,
        cardId,
        userId: session.user.id,
        projectId,
        filename: attachment.originalName,
      });

      break;
    }

    case 'DELETE': {
      // 삭제 권한 확인: 업로더 본인 또는 프로젝트 오너만
      const { projects } = getRepositories();
      const project = projects.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      const isOwner = project.ownerId === session.user.id;
      const isUploader = attachment.userId === session.user.id;

      if (!isOwner && !isUploader) {
        throw new ForbiddenError('Only the uploader or project owner can delete this attachment');
      }

      // 파일 시스템에서 삭제
      try {
        deleteFile(attachment.filename);
      } catch (error) {
        // 파일이 이미 삭제되었어도 DB에서는 삭제 진행
        console.warn(`Failed to delete file: ${attachment.filename}`, error);
      }

      // DB에서 삭제
      const deleted = attachments.delete(attachmentId);

      if (!deleted) {
        throw new NotFoundError('Attachment');
      }

      // 감사 로그 기록
      auditLogService.log({
        userId: session.user.id,
        userName: session.user.name || 'Unknown',
        action: 'delete',
        resourceType: 'card',
        resourceId: cardId,
        projectId,
        changes: [
          {
            field: 'attachment',
            oldValue: attachment.originalName,
            newValue: null,
          },
        ],
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      // 이벤트 로깅
      logEvent('attachment.deleted', {
        attachmentId,
        cardId,
        userId: session.user.id,
        projectId,
        filename: attachment.originalName,
      });

      // WebSocket 이벤트 전송
      const socketRes = res as NextApiResponseWithSocket;
      if (socketRes.socket?.server?.io) {
        socketRes.socket.server.io.to(`project-${projectId}`).emit('attachment-deleted', {
          attachmentId,
          cardId,
          userId: session.user.id,
          timestamp: Date.now(),
        });
      }

      return res.status(200).json({ success: true });
    }

    default:
      res.setHeader('Allow', ['GET', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
