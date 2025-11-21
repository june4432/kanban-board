/**
 * Audit Log Statistics API
 * GET /api/audit-logs/statistics?projectId=xxx&days=30 - 감사 로그 통계
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

  const { projectId, days } = req.query;

  if (typeof projectId !== 'string') {
    throw new ValidationError('Project ID is required');
  }

  // 프로젝트 멤버 권한 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return;

  const auditLogService = new AuditLogService();

  const statistics = await auditLogService.getStatistics(
    projectId,
    days ? parseInt(days as string) : 30
  );

  return res.status(200).json(statistics);
});
