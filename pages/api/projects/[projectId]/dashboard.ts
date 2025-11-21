/**
 * Project Dashboard API
 * GET /api/projects/[projectId]/dashboard - 프로젝트 대시보드 통계
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireProjectMember } from '@/lib/auth-helpers';
import { ValidationError } from '@/lib/errors';
import { DashboardService } from '@/lib/services/dashboard.service';
import { getDatabaseAdapter } from '@/lib/database-adapter';

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    throw new ValidationError('Invalid project ID format');
  }

  // 프로젝트 멤버 권한 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return;

  const db = await getDatabaseAdapter();
  const dashboardService = new DashboardService(db);

  // 대시보드 통계 조회
  const stats = await dashboardService.getProjectDashboard(projectId);

  return res.status(200).json({ dashboard: stats });
});
