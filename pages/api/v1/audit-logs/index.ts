/**
 * API v1: Audit Logs Collection
 * GET /api/v1/audit-logs - List audit logs with filters
 *
 * Query params:
 * - projectId: Filter by project
 * - userId: Filter by user
 * - resourceType: Filter by resource type (card, project, member, comment)
 * - action: Filter by action (create, update, delete, move)
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { AuditLogService } from '@/lib/services/audit-log.service';
import { v4 as uuidv4 } from 'uuid';
import { getRepositories } from '@/lib/repositories';

const auditLogService = new AuditLogService();

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }

  return await handleGet(req, res);
}

/**
 * GET /api/v1/audit-logs
 * List audit logs with filters
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  const {
    projectId,
    userId: filterUserId,
    resourceType,
    action,
    startDate,
    endDate,
    limit = '50',
    offset = '0',
  } = req.query;

  const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
  const parsedOffset = parseInt(offset as string) || 0;

  // If projectId is specified, verify user is a member
  if (projectId && typeof projectId === 'string') {
    const { projects } = getRepositories();
    const project = await projects.findById(projectId);

    if (!project) {
      return sendForbidden(res, 'Project not found', req.requestId);
    }

    const isMember = project.members.some(m => m.id === userId) || project.ownerId === userId;
    if (!isMember) {
      return sendForbidden(res, 'You must be a project member to view audit logs', req.requestId);
    }

    // Get project logs
    const logs = await auditLogService.getProjectLogs(projectId, parsedLimit, parsedOffset);

    // Apply additional filters
    let filteredLogs = logs;

    if (filterUserId && typeof filterUserId === 'string') {
      filteredLogs = filteredLogs.filter(log => log.userId === filterUserId);
    }

    if (resourceType && typeof resourceType === 'string') {
      filteredLogs = filteredLogs.filter(log => log.resourceType === resourceType);
    }

    if (action && typeof action === 'string') {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.createdAt) >= start);
    }

    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.createdAt) <= end);
    }

    return sendSuccess(res, {
      logs: filteredLogs,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: filteredLogs.length,
      },
    }, 200, req.requestId);
  }

  // Without projectId, return user's own activity logs
  const logs = await auditLogService.getUserActivity(userId, parsedLimit);

  return sendSuccess(res, {
    logs,
    pagination: {
      limit: parsedLimit,
      offset: parsedOffset,
      total: logs.length,
    },
  }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
