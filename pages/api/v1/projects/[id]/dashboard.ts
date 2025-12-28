/**
 * API v1: Project Dashboard
 * GET /api/v1/projects/[id]/dashboard - Get project dashboard statistics
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
import { DashboardService } from '@/lib/services/dashboard.service';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = req.requestId || uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET'], req.requestId);
  }
}

/**
 * GET /api/v1/projects/[id]/dashboard
 * Get project dashboard statistics
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;

  if (typeof projectId !== 'string') {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Verify project exists and user has access
  const { projects } = getRepositories();
  const project = await projects.findById(projectId);

  if (!project) {
    return sendNotFound(res, 'Project not found', req.requestId);
  }

  // Check if user is owner or member
  const userId = req.user!.id;
  const isOwner = project.ownerId === userId;
  const isMember = project.members.some(m => m.id === userId);

  if (!isOwner && !isMember && !project.isPublic) {
    return sendForbidden(res, 'You do not have access to this project', req.requestId);
  }

  // Get dashboard statistics
  const dashboardService = new DashboardService();
  const stats = await dashboardService.getProjectDashboard(projectId);

  sendSuccess(res, { dashboard: stats }, 200, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
