/**
 * User Global Notification Settings API
 * GET /api/users/me/notification-settings - 전역 알림 설정 조회
 * PUT /api/users/me/notification-settings - 전역 알림 설정 업데이트
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { withErrorHandler } from '@/lib/error-handler';
import { UnauthorizedError } from '@/lib/errors';
import { getRepositories } from '@/lib/repositories';
import { notificationSettingsSchema, validate } from '@/lib/validation';
import { logEvent } from '@/lib/logger';
import type { AuthSession } from '@/lib/auth-helpers';

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  // 인증 확인
  const session = await getSession({ req }) as AuthSession | null;

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { notificationSettings } = getRepositories();

  switch (req.method) {
    case 'GET': {
      // 전역 알림 설정 조회
      const settings = await notificationSettings.getGlobalSettings(session.user.id);

      return res.status(200).json({ settings });
    }

    case 'PUT': {
      // 전역 알림 설정 업데이트
      const validatedInput = validate(notificationSettingsSchema, req.body);

      const updatedSettings = await notificationSettings.updateGlobalSettings(
        session.user.id,
        validatedInput
      );

      // 이벤트 로깅
      logEvent('notification-settings.updated', {
        userId: session.user.id,
        scope: 'global',
        changes: Object.keys(validatedInput),
      });

      return res.status(200).json({ settings: updatedSettings });
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
