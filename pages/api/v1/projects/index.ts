/**
 * API v1: Projects Collection
 * GET    /api/v1/projects - List projects
 * POST   /api/v1/projects - Create project
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendCreated,
  sendMethodNotAllowed,
  sendPaginated,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateQuery,
  createProjectSchema,
  projectFiltersSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  // Generate request ID for tracking
  req.requestId = uuidv4();

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
 * GET /api/v1/projects
 * List projects with optional filters and pagination
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const filters = validateQuery(req, projectFiltersSchema);
  const { projects } = getRepositories();

  let allProjects = projects.findAll();

  // Apply filters
  if (filters.ownerId) {
    allProjects = allProjects.filter((p) => p.ownerId === filters.ownerId);
  }

  if (filters.isPublic !== undefined) {
    allProjects = allProjects.filter((p) => p.isPublic === filters.isPublic);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    allProjects = allProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by user membership (only show projects user has access to)
  if (req.user) {
    allProjects = allProjects.filter(
      (p) =>
        p.ownerId === req.user!.id ||
        p.members.some((m) => m.id === req.user!.id) ||
        p.isPublic
    );
  } else {
    // Not authenticated, only show public projects
    allProjects = allProjects.filter((p) => p.isPublic);
  }

  // Sorting
  if (filters.sort) {
    const [field, order] = filters.sort.startsWith('-')
      ? [filters.sort.slice(1), 'desc']
      : [filters.sort, 'asc'];

    allProjects.sort((a, b) => {
      let aVal = (a as any)[field];
      let bVal = (b as any)[field];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (order === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  }

  // Pagination
  const total = allProjects.length;
  const totalPages = Math.ceil(total / filters.pageSize);
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedProjects = allProjects.slice(startIndex, endIndex);

  sendPaginated(
    res,
    {
      items: paginatedProjects,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages,
    },
    req.requestId
  );
}

/**
 * POST /api/v1/projects
 * Create a new project
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const data = validateBody(req, createProjectSchema);
  const { projects } = getRepositories();

  // User must be authenticated to create projects
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to create projects',
      },
    });
  }

  const newProject = projects.create({
    name: data.name,
    description: data.description,
    ownerId: req.user.id,
    color: data.color || '#3b82f6',
    isPublic: data.isPublic || false,
  });

  sendCreated(res, newProject, req.requestId);
}

// Export with auth and error handling
export default withErrorHandler(requireAuth(handler));
