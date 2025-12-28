/**
 * API v1: Current User Profile
 * GET /api/v1/users/me - Get current user profile
 * PATCH /api/v1/users/me - Update current user profile
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendValidationError,
  sendNotFound,
} from '@/lib/api-v1/utils/response';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'PATCH':
      return await handlePatch(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH'], req.requestId);
  }
}

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  const { users } = getRepositories();

  const user = await users.findById(userId);

  if (!user) {
    return sendNotFound(res, 'User not found', req.requestId);
  }

  // 비밀번호 제외하고 반환
  const { password, ...userWithoutPassword } = user as any;

  sendSuccess(res, { user: userWithoutPassword }, 200, req.requestId);
}

/**
 * PATCH /api/v1/users/me
 * Update current user profile
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  const { name, avatar } = req.body;
  const { users } = getRepositories();

  // 유효성 검사
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return sendValidationError(res, 'Name must be a non-empty string', undefined, req.requestId);
  }

  if (avatar !== undefined && typeof avatar !== 'string') {
    return sendValidationError(res, 'Avatar must be a string', undefined, req.requestId);
  }

  // 업데이트할 데이터 준비
  const updateData: { name?: string; avatar?: string } = {};
  if (name !== undefined) updateData.name = name.trim();
  if (avatar !== undefined) updateData.avatar = avatar;

  if (Object.keys(updateData).length === 0) {
    return sendValidationError(res, 'No valid fields to update', undefined, req.requestId);
  }

  const updatedUser = await users.update(userId, updateData);

  if (!updatedUser) {
    return sendValidationError(res, 'Failed to update user', undefined, req.requestId);
  }

  // 비밀번호 제외하고 반환
  const { password, ...userWithoutPassword } = updatedUser as any;

  sendSuccess(res, { user: userWithoutPassword }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
