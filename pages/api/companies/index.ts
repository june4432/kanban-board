/**
 * API: Companies
 * GET  /api/companies - List user's companies
 * POST /api/companies - Create new company
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query, queryOne } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, userId);
    case 'POST':
      return handlePost(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(_req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    console.log('[Companies GET] userId:', userId);

    // Get companies where user is a member
    const result = await query(`
      SELECT c.id, c.name, c.slug, c.domain, c.plan, c.settings,
        c.created_at as "createdAt", c.updated_at as "updatedAt",
        u.company_role as role
      FROM companies c
      JOIN users u ON u.company_id = c.id
      WHERE u.id = $1
      ORDER BY c.name
    `, [userId]);

    console.log('[Companies GET] result:', result.rows);
    res.status(200).json({ companies: result.rows });
  } catch (error: any) {
    console.error('Failed to fetch companies:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    console.log('[Companies POST] userId:', userId);
    console.log('[Companies POST] body:', req.body);
    const { name, domain, plan = 'free' } = req.body;

    if (!name) {
      return res.status(400).json({ error: '회사 이름은 필수입니다.' });
    }

    // Auto-generate slug if not provided
    const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || `company-${Date.now()}`;
    console.log('[Companies POST] generated slug:', slug);

    // Check if slug is already taken
    const existing = await queryOne(
      'SELECT id FROM companies WHERE slug = $1',
      [slug]
    );

    if (existing) {
      return res.status(400).json({ error: '이미 사용 중인 슬러그입니다.' });
    }

    const companyId = uuidv4();
    const now = new Date().toISOString();

    // Create company
    await query(`
      INSERT INTO companies (id, name, slug, domain, plan, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [companyId, name, slug, domain || null, plan, now, now]);

    // Update user to belong to this company as owner
    const updateResult = await query(`
      UPDATE users SET company_id = $1, company_role = 'owner' WHERE id = $2
    `, [companyId, userId]);
    console.log('[Companies POST] user update result rowCount:', updateResult.rowCount);

    const company = await queryOne(`
      SELECT id, name, slug, domain, plan, settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM companies WHERE id = $1
    `, [companyId]);

    res.status(201).json({ company });
  } catch (error: any) {
    console.error('Failed to create company:', error);
    res.status(500).json({ error: error.message });
  }
}
