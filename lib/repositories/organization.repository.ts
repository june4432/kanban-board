/**
 * Organization Repository
 * Multi-tenancy support - PostgreSQL version
 */

import { query, queryOne, queryAll } from '@/lib/postgres';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
  joinedAt: Date;
}

export interface OrganizationWithMembers extends Organization {
  members: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    joinedAt: Date;
  }>;
}

export class OrganizationRepository {
  constructor() { }

  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<Organization | undefined> {
    const row = await queryOne(
      `SELECT id, name, slug, description, plan, settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM organizations WHERE id = $1`,
      [id]
    );

    if (!row) return undefined;

    return {
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings || '{}') : (row.settings || {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | undefined> {
    const row = await queryOne(
      `SELECT id, name, slug, description, plan, settings,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM organizations WHERE slug = $1`,
      [slug]
    );

    if (!row) return undefined;

    return {
      ...row,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings || '{}') : (row.settings || {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find all organizations user belongs to
   */
  async findByUserId(userId: string): Promise<OrganizationWithMembers[]> {
    const rows = await queryAll(
      `SELECT o.id, o.name, o.slug, o.description, o.plan, o.settings,
        o.created_at as "createdAt", o.updated_at as "updatedAt",
        om.role as "userRole"
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1
      ORDER BY o.name`,
      [userId]
    );

    const results: OrganizationWithMembers[] = [];
    for (const row of rows) {
      const members = await this.getMembers(row.id);
      results.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings || '{}') : (row.settings || {}),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        members,
      });
    }

    return results;
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: string): Promise<Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    joinedAt: Date;
  }>> {
    const rows = await queryAll(
      `SELECT om.user_id as "userId", u.name as "userName", u.email as "userEmail",
        om.role, om.joined_at as "joinedAt"
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY om.joined_at`,
      [organizationId]
    );

    return rows.map((row: any) => ({
      ...row,
      joinedAt: new Date(row.joinedAt),
    }));
  }

  /**
   * Find organization member by user ID
   */
  async findMember(organizationId: string, userId: string): Promise<{ role: string; joinedAt: Date } | undefined> {
    const row = await queryOne(
      `SELECT role, joined_at as "joinedAt"
      FROM organization_members
      WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );

    if (!row) return undefined;

    return {
      role: row.role,
      joinedAt: new Date(row.joinedAt),
    };
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await queryOne(
      'SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [organizationId, userId]
    );
    return !!result;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<string | null> {
    const result = await queryOne(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [organizationId, userId]
    );
    return result?.role || null;
  }

  /**
   * Create new organization
   */
  async create(data: {
    name: string;
    slug: string;
    description?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    ownerId: string;
    companyId?: string;
  }): Promise<Organization> {
    const id = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO organizations (id, name, slug, description, plan, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, data.name, data.slug, data.description || '', data.plan || 'free', data.companyId || null, now, now]
    );

    // Add owner as member
    await this.addMember(id, data.ownerId, 'owner');

    return (await this.findById(id))!;
  }

  /**
   * Update organization
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      plan: 'free' | 'pro' | 'enterprise';
      settings: Record<string, any>;
    }>
  ): Promise<Organization | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.plan !== undefined) {
      updates.push(`plan = $${paramIndex++}`);
      values.push(data.plan);
    }

    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(data.settings));
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM organizations WHERE id = $1', [id]);
    return (result as any).rowCount > 0;
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member' = 'member'
  ): Promise<void> {
    await query(
      `INSERT INTO organization_members (organization_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, $4)`,
      [organizationId, userId, role, new Date().toISOString()]
    );
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member'
  ): Promise<void> {
    await query(
      `UPDATE organization_members SET role = $1
      WHERE organization_id = $2 AND user_id = $3`,
      [role, organizationId, userId]
    );
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
    return (result as any).rowCount > 0;
  }

  /**
   * Get organization statistics
   */
  async getStats(organizationId: string): Promise<{
    memberCount: number;
    projectCount: number;
    plan: string;
  }> {
    const memberCount = await queryOne(
      'SELECT COUNT(*) as count FROM organization_members WHERE organization_id = $1',
      [organizationId]
    );

    const projectCount = await queryOne(
      'SELECT COUNT(*) as count FROM projects WHERE organization_id = $1',
      [organizationId]
    );

    const org = await this.findById(organizationId);

    return {
      memberCount: parseInt(memberCount?.count || '0'),
      projectCount: parseInt(projectCount?.count || '0'),
      plan: org?.plan || 'free',
    };
  }

  /**
   * Create organization join request
   */
  async createJoinRequest(organizationId: string, userId: string, message?: string): Promise<any> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO organization_join_requests (id, organization_id, user_id, message, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [id, organizationId, userId, message || null, now, now]
    );

    return this.getJoinRequest(id);
  }

  /**
   * Get join request by ID
   */
  async getJoinRequest(requestId: string): Promise<any> {
    const row = await queryOne(
      `SELECT r.id, r.organization_id as "organizationId", r.user_id as "userId",
        r.status, r.message, r.created_at as "createdAt", r.updated_at as "updatedAt",
        u.name as "userName", u.email as "userEmail",
        o.name as "organizationName"
      FROM organization_join_requests r
      JOIN users u ON r.user_id = u.id
      JOIN organizations o ON r.organization_id = o.id
      WHERE r.id = $1`,
      [requestId]
    );

    if (!row) return null;

    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Get all join requests for an organization
   */
  async getJoinRequests(organizationId: string, status?: string): Promise<any[]> {
    let sql = `
      SELECT r.id, r.organization_id as "organizationId", r.user_id as "userId",
        r.status, r.message, r.created_at as "createdAt", r.updated_at as "updatedAt",
        u.name as "userName", u.email as "userEmail"
      FROM organization_join_requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.organization_id = $1
    `;

    const params: any[] = [organizationId];

    if (status) {
      sql += ' AND r.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const rows = await queryAll(sql, params);

    return rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get user's join requests
   */
  async getUserJoinRequests(userId: string): Promise<any[]> {
    const rows = await queryAll(
      `SELECT r.id, r.organization_id as "organizationId", r.user_id as "userId",
        r.status, r.message, r.created_at as "createdAt", r.updated_at as "updatedAt",
        o.name as "organizationName", o.slug as "organizationSlug"
      FROM organization_join_requests r
      JOIN organizations o ON r.organization_id = o.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC`,
      [userId]
    );

    return rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Approve join request
   */
  async approveJoinRequest(requestId: string, role: string = 'member'): Promise<boolean> {
    const request = await this.getJoinRequest(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Add user as member
    await this.addMember(request.organizationId, request.userId, role as any);

    // Update request status
    await query(
      `UPDATE organization_join_requests SET status = 'approved', updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), requestId]
    );

    return true;
  }

  /**
   * Reject join request
   */
  async rejectJoinRequest(requestId: string): Promise<boolean> {
    const request = await this.getJoinRequest(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    await query(
      `UPDATE organization_join_requests SET status = 'rejected', updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), requestId]
    );

    return true;
  }

  /**
   * Check if user has pending request
   */
  async hasPendingRequest(organizationId: string, userId: string): Promise<boolean> {
    const result = await queryOne(
      `SELECT 1 FROM organization_join_requests
      WHERE organization_id = $1 AND user_id = $2 AND status = 'pending'`,
      [organizationId, userId]
    );
    return !!result;
  }
}
