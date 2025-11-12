/**
 * Organization Repository
 * Multi-tenancy support
 */

import type Database from 'better-sqlite3';

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
  constructor(private db: Database.Database) {}

  /**
   * Find organization by ID
   */
  findById(id: string): Organization | undefined {
    const row = this.db
      .prepare(
        `SELECT
          id, name, slug, description, plan, settings,
          created_at as createdAt, updated_at as updatedAt
        FROM organizations WHERE id = ?`
      )
      .get(id) as any;

    if (!row) return undefined;

    return {
      ...row,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find organization by slug
   */
  findBySlug(slug: string): Organization | undefined {
    const row = this.db
      .prepare(
        `SELECT
          id, name, slug, description, plan, settings,
          created_at as createdAt, updated_at as updatedAt
        FROM organizations WHERE slug = ?`
      )
      .get(slug) as any;

    if (!row) return undefined;

    return {
      ...row,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find all organizations user belongs to
   */
  findByUserId(userId: string): OrganizationWithMembers[] {
    const rows = this.db
      .prepare(
        `SELECT
          o.id, o.name, o.slug, o.description, o.plan, o.settings,
          o.created_at as createdAt, o.updated_at as updatedAt,
          om.role as userRole
        FROM organizations o
        JOIN organization_members om ON o.id = om.organization_id
        WHERE om.user_id = ?
        ORDER BY o.name`
      )
      .all(userId) as any[];

    return rows.map((row) => {
      const org = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        plan: row.plan,
        settings: JSON.parse(row.settings || '{}'),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        members: [],
      };

      // Get all members for this organization
      const members = this.getMembers(row.id);
      return { ...org, members };
    });
  }

  /**
   * Get all members of an organization
   */
  getMembers(organizationId: string): Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    joinedAt: Date;
  }> {
    const rows = this.db
      .prepare(
        `SELECT
          om.user_id as userId,
          u.name as userName,
          u.email as userEmail,
          om.role,
          om.joined_at as joinedAt
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = ?
        ORDER BY om.joined_at`
      )
      .all(organizationId) as any[];

    return rows.map((row) => ({
      ...row,
      joinedAt: new Date(row.joinedAt),
    }));
  }

  /**
   * Check if user is member of organization
   */
  isMember(organizationId: string, userId: string): boolean {
    const result = this.db
      .prepare(
        'SELECT 1 FROM organization_members WHERE organization_id = ? AND user_id = ?'
      )
      .get(organizationId, userId);

    return !!result;
  }

  /**
   * Get user's role in organization
   */
  getUserRole(organizationId: string, userId: string): string | null {
    const result = this.db
      .prepare(
        'SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?'
      )
      .get(organizationId, userId) as { role: string } | undefined;

    return result?.role || null;
  }

  /**
   * Create new organization
   */
  create(data: {
    name: string;
    slug: string;
    description?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    ownerId: string;
  }): Organization {
    const id = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO organizations (id, name, slug, description, plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.name,
        data.slug,
        data.description || '',
        data.plan || 'free',
        now,
        now
      );

    // Add owner as member
    this.addMember(id, data.ownerId, 'owner');

    return this.findById(id)!;
  }

  /**
   * Update organization
   */
  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      plan: 'free' | 'pro' | 'enterprise';
      settings: Record<string, any>;
    }>
  ): Organization | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.plan !== undefined) {
      updates.push('plan = ?');
      values.push(data.plan);
    }

    if (data.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(data.settings));
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db
      .prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);

    return this.findById(id);
  }

  /**
   * Delete organization
   */
  delete(id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM organizations WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Add member to organization
   */
  addMember(
    organizationId: string,
    userId: string,
    role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member' = 'member'
  ): void {
    this.db
      .prepare(
        `INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (?, ?, ?)`
      )
      .run(organizationId, userId, role);
  }

  /**
   * Update member role
   */
  updateMemberRole(
    organizationId: string,
    userId: string,
    role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member'
  ): void {
    this.db
      .prepare(
        `UPDATE organization_members SET role = ?
        WHERE organization_id = ? AND user_id = ?`
      )
      .run(role, organizationId, userId);
  }

  /**
   * Remove member from organization
   */
  removeMember(organizationId: string, userId: string): boolean {
    const result = this.db
      .prepare(
        `DELETE FROM organization_members
        WHERE organization_id = ? AND user_id = ?`
      )
      .run(organizationId, userId);

    return result.changes > 0;
  }

  /**
   * Get organization statistics
   */
  getStats(organizationId: string): {
    memberCount: number;
    projectCount: number;
    plan: string;
  } {
    const memberCount = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ?'
      )
      .get(organizationId) as { count: number };

    const projectCount = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM projects WHERE organization_id = ?'
      )
      .get(organizationId) as { count: number };

    const org = this.findById(organizationId);

    return {
      memberCount: memberCount.count,
      projectCount: projectCount.count,
      plan: org?.plan || 'free',
    };
  }
}
