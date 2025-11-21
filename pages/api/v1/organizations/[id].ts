/**
 * API v1: Organization Resource
 * GET    /api/v1/organizations/:id - Get organization details
 * PATCH  /api/v1/organizations/:id - Update organization
 * DELETE /api/v1/organizations/:id - Delete organization
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendNoContent,
  sendMethodNotAllowed,
  sendNotFound,
  sendForbidden,
} from '@/lib/api-v1/utils/response';
import { validateBody, validateId, validators } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const updateOrganizationSchema = z.object({
  name: validators.name.optional(),
  description: validators.description,
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const orgId = validateId(req.query.id, 'organizationId');

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res, orgId);
    case 'PATCH':
      return await handlePatch(req, res, orgId);
    case 'DELETE':
      return await handleDelete(req, res, orgId);
    default:
      return sendMethodNotAllowed(res, ['GET', 'PATCH', 'DELETE'], req.requestId);
  }
}

/**
 * Check if user has permission to perform action on organization
 */
async function checkOrganizationAccess(
  req: ApiRequest,
  res: NextApiResponse,
  orgId: string,
  requiredRole?: 'owner' | 'admin'
): Promise<boolean> {
  if (!req.user) {
    sendForbidden(res, 'User not authenticated', req.requestId);
    return false;
  }

  const { organizations } = getRepositories();

  const isMember = await organizations.isMember(orgId, req.user.id);
  if (!isMember) {
    sendForbidden(
      res,
      'Access denied. You are not a member of this organization.',
      req.requestId
    );
    return false;
  }

  if (requiredRole) {
    const userRole = await organizations.getUserRole(orgId, req.user.id);
    if (requiredRole === 'owner' && userRole !== 'owner') {
      sendForbidden(
        res,
        'Access denied. Only organization owner can perform this action.',
        req.requestId
      );
      return false;
    }

    if (requiredRole === 'admin' && !['owner', 'admin'].includes(userRole || '')) {
      sendForbidden(
        res,
        'Access denied. Admin privileges required.',
        req.requestId
      );
      return false;
    }
  }

  return true;
}

/**
 * GET /api/v1/organizations/:id
 * Get organization details
 */
async function handleGet(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!(await checkOrganizationAccess(req, res, orgId))) return;

  const { organizations } = getRepositories();
  const org = await organizations.findById(orgId);

  if (!org) {
    return sendNotFound(res, 'Organization', req.requestId);
  }

  // Get members
  const members = await organizations.getMembers(orgId);

  // Get stats
  const stats = await organizations.getStats(orgId);

  sendSuccess(res, { ...org, members, stats }, 200, req.requestId);
}

/**
 * PATCH /api/v1/organizations/:id
 * Update organization (requires admin or owner)
 */
async function handlePatch(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!(await checkOrganizationAccess(req, res, orgId, 'admin'))) return;

  const updates = validateBody(req, updateOrganizationSchema);
  const { organizations } = getRepositories();

  const updatedOrg = await organizations.update(orgId, updates);

  if (!updatedOrg) {
    return sendNotFound(res, 'Organization', req.requestId);
  }

  sendSuccess(res, updatedOrg, 200, req.requestId);
}

/**
 * DELETE /api/v1/organizations/:id
 * Delete organization (requires owner)
 */
async function handleDelete(req: ApiRequest, res: NextApiResponse, orgId: string) {
  if (!(await checkOrganizationAccess(req, res, orgId, 'owner'))) return;

  const { organizations } = getRepositories();
  const deleted = await organizations.delete(orgId);

  if (!deleted) {
    return sendNotFound(res, 'Organization', req.requestId);
  }

  sendNoContent(res);
}

export default withErrorHandler(requireAuth(handler));
