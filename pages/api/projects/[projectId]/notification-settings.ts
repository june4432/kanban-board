/**
 * Project Notification Settings API
 * GET /api/projects/[projectId]/notification-settings - 프로젝트 알림 설정 조회
 * PUT /api/projects/[projectId]/notification-settings - 프로젝트 알림 설정 업데이트
 * DELETE /api/projects/[projectId]/notification-settings - 프로젝트 알림 설정 삭제 (전역 설정으로 복원)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/error-handler';
import { requireProjectMember } from '@/lib/auth-helpers';
import { getRepositories } from '@/lib/repositories';
import { notificationSettingsSchema, validate } from '@/lib/validation';
import { ValidationError } from '@/lib/errors';
import { logEvent } from '@/lib/logger';

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    throw new ValidationError('Invalid project ID format');
  }

  // 프로젝트 멤버 권한 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return;

  const { session } = auth;
  const { notificationSettings } = getRepositories();

  switch (req.method) {
    case 'GET': {
      // 프로젝트 알림 설정 조회
      const settings = notificationSettings.getProjectSettings(session.user.id, projectId);

      return res.status(200).json({ settings });
    }

    case 'PUT': {
      // 프로젝트 알림 설정 업데이트
      const validatedInput = validate(notificationSettingsSchema, req.body);

      const updatedSettings = notificationSettings.updateProjectSettings(
        session.user.id,
        projectId,
        validatedInput
      );

      // 이벤트 로깅
      logEvent('notification-settings.updated', {
        userId: session.user.id,
        projectId,
        scope: 'project',
        changes: Object.keys(validatedInput),
      });

      return res.status(200).json({ settings: updatedSettings });
    }

    case 'DELETE': {
      // 프로젝트 알림 설정 삭제 (전역 설정으로 복원)
      const deleted = notificationSettings.deleteProjectSettings(session.user.id, projectId);

      if (deleted) {
        // 이벤트 로깅
        logEvent('notification-settings.reset', {
          userId: session.user.id,
          projectId,
        });

        return res.status(200).json({
          success: true,
          message: 'Project notification settings reset to global settings',
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'No project-specific settings found',
        });
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
