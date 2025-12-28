/**
 * API v1: Project Member Invite
 * POST /api/v1/projects/:id/members/invite - Directly add a user as project member
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendCreated,
  sendMethodNotAllowed,
  sendValidationError,
  sendNotFound,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { queryOne, query } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }

  return await handlePost(req, res);
}

/**
 * POST /api/v1/projects/:id/members/invite
 * Directly add a user as project member (owner only)
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const currentUserId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendValidationError(res, 'Invalid project ID', undefined, req.requestId);
  }

  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return sendValidationError(res, 'User ID is required', undefined, req.requestId);
  }

  // Check project ownership
  const project = await queryOne<{ owner_id: string }>('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  if (project.owner_id !== currentUserId) {
    return sendForbidden(res, 'Only project owner can invite members', req.requestId);
  }

  // Check if user exists
  const userToInvite = await queryOne<{ id: string; email: string; name: string }>('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  if (!userToInvite) {
    return sendNotFound(res, 'User not found', req.requestId);
  }

  // Check if already a member
  const existingMember = await queryOne(`
    SELECT project_id FROM project_members WHERE project_id = $1 AND user_id = $2
  `, [projectId, userId]);

  if (existingMember) {
    return sendValidationError(res, 'User is already a member of this project', undefined, req.requestId);
  }

  // Add as member
  await query(`
    INSERT INTO project_members (project_id, user_id, role, joined_at)
    VALUES ($1, $2, 'member', NOW())
  `, [projectId, userId]);

  // Get the new member info
  const newMember = await queryOne(`
    SELECT
      pm.user_id as id,
      pm.role,
      pm.joined_at as "joinedAt",
      u.email,
      u.name,
      u.avatar_url as avatar
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = $1 AND pm.user_id = $2
  `, [projectId, userId]);

  sendCreated(res, { 
    message: 'User invited successfully',
    member: newMember 
  }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
