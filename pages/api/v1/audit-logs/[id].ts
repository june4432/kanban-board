/**
 * API v1: Audit Log Resource
 * GET /api/v1/audit-logs/:id - Get single audit log entry
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
import { queryOne } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getRepositories } from '@/lib/repositories';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();
  const logId = req.query.id as string;

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }

  return await handleGet(req, res, logId);
}

/**
 * GET /api/v1/audit-logs/:id
 * Get single audit log entry
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, logId: string) {
  const userId = req.user!.id;

  // Get the audit log entry
  const row = await queryOne(`
    SELECT * FROM audit_logs WHERE id = $1
  `, [logId]);

  if (!row) {
    return sendNotFound(res, 'Audit log', req.requestId);
  }

  // If this log belongs to a project, verify user is a member
  if (row.project_id) {
    const { projects } = getRepositories();
    const project = await projects.findById(row.project_id);

    if (project) {
      const isMember = project.members.some(m => m.id === userId) || project.ownerId === userId;
      if (!isMember) {
        return sendForbidden(res, 'You must be a project member to view this audit log', req.requestId);
      }
    }
  } else {
    // If no project, only the user themselves can view their own logs
    if (row.user_id !== userId) {
      return sendForbidden(res, 'You can only view your own audit logs', req.requestId);
    }
  }

  const log = {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    projectId: row.project_id,
    changes: row.changes ? JSON.parse(row.changes) : undefined,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };

  sendSuccess(res, { log }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
