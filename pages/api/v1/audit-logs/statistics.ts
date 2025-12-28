/**
 * API v1: Audit Log Statistics
 * GET /api/v1/audit-logs/statistics?projectId=xxx&days=30 - Get audit statistics
 *
 * Query params:
 * - projectId: Required - project to get statistics for
 * - days: Number of days to analyze (default 30, max 365)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendMethodNotAllowed,
  sendValidationError,
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
 * GET /api/v1/audit-logs/statistics
 * Get audit log statistics for a project
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  const { projectId, days = '30' } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return sendValidationError(res, 'projectId is required', undefined, req.requestId);
  }

  const parsedDays = Math.min(parseInt(days as string) || 30, 365);

  // Verify user is a project member
  const { projects } = getRepositories();
  const project = await projects.findById(projectId);

  if (!project) {
    return sendValidationError(res, 'Project not found', undefined, req.requestId);
  }

  const isMember = project.members.some(m => m.id === userId) || project.ownerId === userId;
  if (!isMember) {
    return sendForbidden(res, 'You must be a project member to view statistics', req.requestId);
  }

  // Get statistics
  const statistics = await auditLogService.getStatistics(projectId, parsedDays);

  sendSuccess(res, {
    projectId,
    period: {
      days: parsedDays,
      startDate: new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    ...statistics,
  }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
