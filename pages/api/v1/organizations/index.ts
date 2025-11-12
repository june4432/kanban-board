/**
 * API v1: Organizations Collection
 * GET  /api/v1/organizations - List user's organizations
 * POST /api/v1/organizations - Create new organization
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth } from '@/lib/api-v1/middleware/auth';
import {
  sendSuccess,
  sendCreated,
  sendMethodNotAllowed,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import { validateBody, validators } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: validators.name,
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(), // Make slug optional - will auto-generate from name if not provided
  description: validators.description,
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
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
 * GET /api/v1/organizations
 * List all organizations user belongs to
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  if (!req.user) {
    return sendValidationError(res, 'User not authenticated', undefined, req.requestId);
  }

  const { organizations } = getRepositories();
  const userOrgs = organizations.findByUserId(req.user.id);

  sendSuccess(res, userOrgs, 200, req.requestId);
}

/**
 * POST /api/v1/organizations
 * Create new organization
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  if (!req.user) {
    return sendValidationError(res, 'User not authenticated', undefined, req.requestId);
  }

  const data = validateBody(req, createOrganizationSchema);
  const { organizations } = getRepositories();

  // Auto-generate slug from name if not provided
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Check if slug already exists
  const existingOrg = organizations.findBySlug(slug);
  if (existingOrg) {
    return sendValidationError(
      res,
      'Organization slug already exists',
      [{ field: 'slug', message: 'This slug is already taken' }],
      req.requestId
    );
  }

  const newOrg = organizations.create({
    name: data.name,
    slug: slug,
    description: data.description,
    plan: data.plan || 'free',
    ownerId: req.user.id,
  });

  sendCreated(res, newOrg, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
