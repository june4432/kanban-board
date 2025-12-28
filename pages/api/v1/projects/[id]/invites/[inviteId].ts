/**
 * API v1: Project Invite Management
 * DELETE /api/v1/projects/[id]/invites/[inviteId] - Deactivate invitation (owner only)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { queryOne, query } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      return sendMethodNotAllowed(res, ['DELETE'], req.requestId);
  }
}

/**
 * DELETE /api/v1/projects/[id]/invites/[inviteId]
 * Deactivate an invitation (owner only)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId, inviteId } = req.query;
  const userId = req.user!.id;

  if (typeof projectId !== 'string' || typeof inviteId !== 'string') {
    return sendNotFound(res, 'Project or invitation not found', req.requestId);
  }

  // Check project ownership
  const project = await queryOne<{ owner_id: string }>(
    'SELECT owner_id FROM projects WHERE id = $1',
    [projectId]
  );

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  if (project.owner_id !== userId) {
    return sendForbidden(res, 'Only project owner can manage invitations', req.requestId);
  }

  // Check invitation exists and belongs to this project
  const invitation = await queryOne(`
    SELECT * FROM invitations
    WHERE id = $1 AND project_id = $2
  `, [inviteId, projectId]);

  if (!invitation) {
    return sendNotFound(res, 'Invitation not found', req.requestId);
  }

  // Deactivate (set status to cancelled)
  await query(`
    UPDATE invitations
    SET status = 'cancelled'
    WHERE id = $1
  `, [inviteId]);

  sendSuccess(res, { message: 'Invitation deactivated successfully' }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
