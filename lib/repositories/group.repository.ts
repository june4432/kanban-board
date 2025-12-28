/**
 * Group Repository
 * Flexible group-based permission management - PostgreSQL version
 */

import { query, queryOne, queryAll } from '@/lib/postgres';

export interface Group {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string;
    role: string;
    joinedAt: Date;
  }>;
}

export interface ProjectGroup {
  id: string;
  projectId: string;
  groupId: string;
  permission: 'view' | 'edit' | 'admin';
  createdAt: Date;
}

export class GroupRepository {
  constructor() { }

  /**
   * Find group by ID
   */
  async findById(id: string): Promise<Group | undefined> {
    const row = await queryOne(
      `SELECT id, company_id as "companyId", name, description, color,
        created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
      FROM groups WHERE id = $1`,
      [id]
    );

    if (!row) return undefined;

    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find group with members
   */
  async findByIdWithMembers(id: string): Promise<GroupWithMembers | undefined> {
    const group = await this.findById(id);
    if (!group) return undefined;

    const members = await this.getMembers(id);

    return {
      ...group,
      members,
    };
  }

  /**
   * Find all groups in a company
   */
  async findByCompanyId(companyId: string): Promise<GroupWithMembers[]> {
    const rows = await queryAll(
      `SELECT id, company_id as "companyId", name, description, color,
        created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
      FROM groups WHERE company_id = $1
      ORDER BY name`,
      [companyId]
    );

    const results: GroupWithMembers[] = [];
    for (const row of rows) {
      const members = await this.getMembers(row.id);
      results.push({
        id: row.id,
        companyId: row.companyId,
        name: row.name,
        description: row.description,
        color: row.color,
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        members,
      });
    }

    return results;
  }

  /**
   * Find all groups user belongs to
   */
  async findByUserId(userId: string): Promise<GroupWithMembers[]> {
    const rows = await queryAll(
      `SELECT g.id, g.company_id as "companyId", g.name, g.description, g.color,
        g.created_by as "createdBy", g.created_at as "createdAt", g.updated_at as "updatedAt",
        gm.role as "userRole"
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY g.name`,
      [userId]
    );

    const results: GroupWithMembers[] = [];
    for (const row of rows) {
      const members = await this.getMembers(row.id);
      results.push({
        id: row.id,
        companyId: row.companyId,
        name: row.name,
        description: row.description,
        color: row.color,
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        members,
      });
    }

    return results;
  }

  /**
   * Get all members of a group
   */
  async getMembers(groupId: string): Promise<Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string;
    role: string;
    joinedAt: Date;
  }>> {
    const rows = await queryAll(
      `SELECT gm.id, gm.user_id as "userId", u.name as "userName", u.email as "userEmail",
        u.avatar as "userAvatar", gm.role, gm.joined_at as "joinedAt"
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at`,
      [groupId]
    );

    return rows.map((row: any) => ({
      ...row,
      userAvatar: row.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.userName)}`,
      joinedAt: new Date(row.joinedAt),
    }));
  }

  /**
   * Check if user is member of group
   */
  async isMember(groupId: string, userId: string): Promise<boolean> {
    const result = await queryOne(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return !!result;
  }

  /**
   * Get user's role in group
   */
  async getUserRole(groupId: string, userId: string): Promise<string | null> {
    const result = await queryOne(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return result?.role || null;
  }

  /**
   * Create new group
   */
  async create(data: {
    name: string;
    description?: string;
    color?: string;
    createdBy: string;
    companyId: string;
  }): Promise<Group> {
    const id = `grp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO groups (id, company_id, name, description, color, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, data.companyId, data.name, data.description || '', data.color || '#6366f1', data.createdBy, now, now]
    );

    // Add creator as admin
    await this.addMember(id, data.createdBy, 'admin');

    return (await this.findById(id))!;
  }

  /**
   * Update group
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
    }>
  ): Promise<Group | undefined> {
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

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await query(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete group
   */
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM groups WHERE id = $1', [id]);
    return (result as any).rowCount > 0;
  }

  /**
   * Add member to group
   */
  async addMember(
    groupId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<void> {
    const id = `gm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await query(
      `INSERT INTO group_members (id, group_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (group_id, user_id) DO NOTHING`,
      [id, groupId, userId, role, new Date().toISOString()]
    );
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    groupId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await query(
      `UPDATE group_members SET role = $1
      WHERE group_id = $2 AND user_id = $3`,
      [role, groupId, userId]
    );
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    return (result as any).rowCount > 0;
  }

  /**
   * Get group statistics
   */
  async getStats(groupId: string): Promise<{
    memberCount: number;
    projectCount: number;
  }> {
    const memberCount = await queryOne(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = $1',
      [groupId]
    );

    const projectCount = await queryOne(
      'SELECT COUNT(*) as count FROM project_groups WHERE group_id = $1',
      [groupId]
    );

    return {
      memberCount: parseInt(memberCount?.count || '0'),
      projectCount: parseInt(projectCount?.count || '0'),
    };
  }

  // ==================== Project-Group Relations ====================

  /**
   * Link a group to a project with specific permission
   */
  async linkToProject(
    projectId: string,
    groupId: string,
    permission: 'view' | 'edit' | 'admin' = 'view'
  ): Promise<ProjectGroup> {
    const id = `pg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO project_groups (id, project_id, group_id, permission, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id, group_id) DO UPDATE SET permission = $4`,
      [id, projectId, groupId, permission, now]
    );

    const result = await queryOne(
      `SELECT id, project_id as "projectId", group_id as "groupId", permission, created_at as "createdAt"
      FROM project_groups WHERE project_id = $1 AND group_id = $2`,
      [projectId, groupId]
    );

    return {
      ...result,
      createdAt: new Date(result.createdAt),
    };
  }

  /**
   * Unlink a group from a project
   */
  async unlinkFromProject(projectId: string, groupId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM project_groups WHERE project_id = $1 AND group_id = $2`,
      [projectId, groupId]
    );
    return (result as any).rowCount > 0;
  }

  /**
   * Get all groups linked to a project
   */
  async getProjectGroups(projectId: string): Promise<Array<{
    group: GroupWithMembers;
    permission: string;
  }>> {
    const rows = await queryAll(
      `SELECT pg.permission, g.id, g.company_id as "companyId", g.name, g.description, g.color,
        g.created_by as "createdBy", g.created_at as "createdAt", g.updated_at as "updatedAt"
      FROM project_groups pg
      JOIN groups g ON pg.group_id = g.id
      WHERE pg.project_id = $1
      ORDER BY g.name`,
      [projectId]
    );

    const results: Array<{ group: GroupWithMembers; permission: string }> = [];
    for (const row of rows) {
      const members = await this.getMembers(row.id);
      results.push({
        permission: row.permission,
        group: {
          id: row.id,
          companyId: row.companyId,
          name: row.name,
          description: row.description,
          color: row.color,
          createdBy: row.createdBy,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          members,
        },
      });
    }

    return results;
  }

  /**
   * Get all projects a group has access to
   */
  async getGroupProjects(groupId: string): Promise<Array<{
    projectId: string;
    projectName: string;
    permission: string;
  }>> {
    const rows = await queryAll(
      `SELECT pg.permission, p.id as "projectId", p.name as "projectName"
      FROM project_groups pg
      JOIN projects p ON pg.project_id = p.id
      WHERE pg.group_id = $1
      ORDER BY p.name`,
      [groupId]
    );

    return rows;
  }

  /**
   * Check if user has access to project through any group
   * Returns the highest permission level along with group info
   */
  async getUserProjectPermission(
    projectId: string,
    userId: string
  ): Promise<{ permission: 'admin' | 'edit' | 'view'; groupId: string; groupName: string } | null> {
    const result = await queryOne(
      `SELECT
        pg.permission,
        pg.group_id as "groupId",
        g.name as "groupName",
        CASE
          WHEN pg.permission = 'admin' THEN 3
          WHEN pg.permission = 'edit' THEN 2
          WHEN pg.permission = 'view' THEN 1
          ELSE 0
        END as permission_level
      FROM project_groups pg
      JOIN group_members gm ON pg.group_id = gm.group_id
      JOIN groups g ON pg.group_id = g.id
      WHERE pg.project_id = $1 AND gm.user_id = $2
      ORDER BY permission_level DESC
      LIMIT 1`,
      [projectId, userId]
    );

    if (!result) return null;

    return {
      permission: result.permission,
      groupId: result.groupId,
      groupName: result.groupName,
    };
  }

  /**
   * Get all project IDs that a user can access through groups
   */
  async getAccessibleProjectIds(userId: string): Promise<string[]> {
    const rows = await queryAll(
      `SELECT DISTINCT pg.project_id as "projectId"
      FROM project_groups pg
      JOIN group_members gm ON pg.group_id = gm.group_id
      WHERE gm.user_id = $1`,
      [userId]
    );

    return rows.map(row => row.projectId);
  }

  /**
   * Get all users who have access to a project through groups
   */
  async getProjectGroupMembers(projectId: string): Promise<Array<{
    userId: string;
    userName: string;
    userEmail: string;
    permission: string;
    groupId: string;
    groupName: string;
  }>> {
    const rows = await queryAll(
      `SELECT DISTINCT ON (u.id)
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        pg.permission,
        g.id as "groupId",
        g.name as "groupName"
      FROM project_groups pg
      JOIN group_members gm ON pg.group_id = gm.group_id
      JOIN groups g ON pg.group_id = g.id
      JOIN users u ON gm.user_id = u.id
      WHERE pg.project_id = $1
      ORDER BY u.id, CASE
        WHEN pg.permission = 'admin' THEN 1
        WHEN pg.permission = 'edit' THEN 2
        WHEN pg.permission = 'view' THEN 3
      END`,
      [projectId]
    );

    return rows;
  }
}
