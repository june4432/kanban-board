/**
 * API v1: Companies Collection
 * GET    /api/v1/companies - List user's companies
 * POST   /api/v1/companies - Create new company
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
import { query, queryOne } from '@/lib/postgres';
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
 * GET /api/v1/companies
 * List companies where user is a member
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  console.log('[Companies API] Fetching companies for user:', userId, 'email:', req.user!.email);

  const result = await query(`
    SELECT c.id, c.name, c.slug, c.domain, c.plan, c.settings,
      c.created_at as "createdAt", c.updated_at as "updatedAt",
      u.company_role as role
    FROM companies c
    JOIN users u ON u.company_id = c.id
    WHERE u.id = $1
    ORDER BY c.name
  `, [userId]);

  console.log('[Companies API] Query result:', result.rows.length, 'companies found');
  if (result.rows.length === 0) {
    // Debug: check if user exists and has company_id
    const userCheck = await query('SELECT id, email, company_id FROM users WHERE id = $1', [userId]);
    console.log('[Companies API] User check:', userCheck.rows[0]);
  }

  sendSuccess(res, { companies: result.rows }, 200, req.requestId);
}

/**
 * POST /api/v1/companies
 * Create a new company
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const userId = req.user!.id;
  const { name, domain, plan = 'free' } = req.body;

  if (!name) {
    return sendValidationError(res, '회사 이름은 필수입니다.', undefined, req.requestId);
  }

  // Auto-generate slug if not provided
  const slug = req.body.slug || 
    name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 
    `company-${Date.now()}`;

  // Check if slug is already taken
  const existing = await queryOne(
    'SELECT id FROM companies WHERE slug = $1',
    [slug]
  );

  if (existing) {
    return sendValidationError(res, '이미 사용 중인 슬러그입니다.', undefined, req.requestId);
  }

  const companyId = uuidv4();
  const now = new Date().toISOString();

  // Create company
  await query(`
    INSERT INTO companies (id, name, slug, domain, plan, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [companyId, name, slug, domain || null, plan, now, now]);

  // Update user to belong to this company as owner
  await query(`
    UPDATE users SET company_id = $1, company_role = 'owner' WHERE id = $2
  `, [companyId, userId]);

  const company = await queryOne(`
    SELECT id, name, slug, domain, plan, settings,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM companies WHERE id = $1
  `, [companyId]);

  sendCreated(res, { company }, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
