/**
 * Audit Logs API
 * GET /api/audit-logs?projectId=xxx - 프로젝트 감사 로그 조회
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireProjectMember } from '@/lib/auth-helpers';
import { AuditLogService } from '@/lib/services/audit-log.service';
import { ValidationError } from '@/lib/errors';

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { projectId, limit, offset } = req.query;

  if (typeof projectId !== 'string') {
    throw new ValidationError('Project ID is required');
  }

  // 프로젝트 멤버 권한 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return;

  const auditLogService = new AuditLogService();

  const logs = await auditLogService.getProjectLogs(
    projectId,
    limit ? parseInt(limit as string) : 50,
    offset ? parseInt(offset as string) : 0
  );

  return res.status(200).json({ logs });
});
