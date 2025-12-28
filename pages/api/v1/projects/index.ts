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
  sendCreated,
  sendMethodNotAllowed,
  sendPaginated,
  sendUnauthorized,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateQuery,
  createProjectSchema,
  projectFiltersSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { getAccessibleProjectIds } from '@/lib/api-v1/utils/project-access';
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

  let allProjects = await projects.findAll();

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

  // Filter by user access (direct membership, group-based, or public)
  if (req.user) {
    // Get all project IDs the user can access (direct + group-based)
    const accessibleIds = await getAccessibleProjectIds(req.user.id);
    const accessibleIdSet = new Set(accessibleIds);

    allProjects = allProjects.filter(
      (p) =>
        accessibleIdSet.has(p.projectId) || // Direct or group-based access
        p.isPublic // Public projects
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
    return sendUnauthorized(res, 'Authentication required to create projects', req.requestId);
  }

  const newProject = await projects.create({
    name: data.name,
    description: data.description,
    ownerId: req.user.id,
    color: data.color || '#3b82f6',
    isPublic: data.isPublic || false,
    organizationId: data.organizationId,
  });

  sendCreated(res, newProject, req.requestId);
}

// Export with auth and error handling
export default withErrorHandler(requireAuth(handler));
