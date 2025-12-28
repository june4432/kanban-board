/**
 * API v1: Project Invites
 * GET  /api/v1/projects/[id]/invites - List invitations (owner only)
 * POST /api/v1/projects/[id]/invites - Create invitation link (owner only)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendCreated,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { queryOne, queryAll, query } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET', 'POST'], req.requestId);
  }
}

/**
 * GET /api/v1/projects/[id]/invites
 * List pending invitations for a project (owner only)
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const userId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
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
    return sendForbidden(res, 'Only project owner can view invitations', req.requestId);
  }

  const invitations = await queryAll(`
    SELECT
      i.*,
      u.name as created_by_name
    FROM invitations i
    LEFT JOIN users u ON i.invited_by = u.id
    WHERE i.project_id = $1
    AND i.status = 'pending'
    ORDER BY i.created_at DESC
  `, [projectId]);

  sendSuccess(res, { invitations }, 200, req.requestId);
}

/**
 * POST /api/v1/projects/[id]/invites
 * Create an invitation link (owner only)
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const { expiresIn, role = 'member' } = req.body;
  const userId = req.user!.id;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
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
    return sendForbidden(res, 'Only project owner can create invitations', req.requestId);
  }

  const id = uuidv4();
  const inviteToken = uuidv4();
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  await query(`
    INSERT INTO invitations (id, project_id, token, invited_by, expires_at, role, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
  `, [id, projectId, inviteToken, userId, expiresAt, role]);

  const invitation = await queryOne(`
    SELECT * FROM invitations WHERE id = $1
  `, [id]);

  const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${inviteToken}`;

  sendCreated(res, { invitation, inviteUrl }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
