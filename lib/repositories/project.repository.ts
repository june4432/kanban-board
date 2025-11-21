import { v4 as uuidv4 } from 'uuid';
import { Project } from '@/types';
import { query, queryOne, queryAll, withTransaction } from '@/lib/postgres';

// Default IDs for backward compatibility
const DEFAULT_COMPANY_ID = 'company-default';
const DEFAULT_ORG_ID = 'org-default';

export class ProjectRepository {
  constructor() { }

  /**
   * Create a new project with initial board setup
   */
  async create(data: {
    id?: string;
    name: string;
    description?: string;
    ownerId: string;
    color?: string;
    isPublic?: boolean;
    companyId?: string;
    organizationId?: string;
    columns?: Array<{ title: string; wipLimit: number }>;
  }): Promise<Project> {
    const projectId = data.id || uuidv4();
    const boardId = uuidv4();
    const companyId = data.companyId || DEFAULT_COMPANY_ID;
    const organizationId = data.organizationId || DEFAULT_ORG_ID;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    await withTransaction(async (client) => {
      // Create project
      await client.query(`
        INSERT INTO projects (id, company_id, organization_id, name, slug, description, owner_id, color, visibility, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      `, [
        projectId,
        companyId,
        organizationId,
        data.name,
        `${slug}-${Date.now()}`,
        data.description || null,
        data.ownerId,
        data.color || '#3b82f6',
        data.isPublic ? 'public' : 'private'
      ]);

      // Add owner as member
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, 'owner')
      `, [projectId, data.ownerId]);

      // Create board
      await client.query(`
        INSERT INTO boards (id, project_id, name, type)
        VALUES ($1, $2, 'Main Board', 'kanban')
      `, [boardId, projectId]);

      // Create columns
      const columns = data.columns || [
        { title: 'Backlog', wipLimit: 10 },
        { title: 'To Do', wipLimit: 5 },
        { title: 'In Progress', wipLimit: 3 },
        { title: 'Done', wipLimit: 0 },
      ];

      for (let index = 0; index < columns.length; index++) {
        const col = columns[index];
        if (!col) continue;
        const columnId = uuidv4();
        await client.query(`
          INSERT INTO columns (id, board_id, title, wip_limit, position)
          VALUES ($1, $2, $3, $4, $5)
        `, [columnId, boardId, col.title, col.wipLimit, index]);
      }
    });

    return (await this.findById(projectId))!;
  }

  /**
   * Find project by ID with members
   */
  async findById(projectId: string): Promise<Project | null> {
    // Support both new 'id' and legacy 'project_id' columns
    const project = await queryOne(`
      SELECT * FROM projects WHERE id = $1
    `, [projectId]);

    if (!project) return null;

    // Get members
    const members = await queryAll(`
      SELECT u.id, u.name, u.email, u.avatar_url as avatar, pm.role, pm.joined_at
      FROM users u
      INNER JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY u.name
    `, [projectId]);

    // Get pending join requests (from invitations table)
    const requests = await queryAll(`
      SELECT i.*, u.id as user_id, u.name, u.email, u.avatar_url as avatar
      FROM invitations i
      LEFT JOIN users u ON i.email = u.email
      WHERE i.project_id = $1 AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `, [projectId]);

    return {
      projectId: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.owner_id,
      color: project.color,
      isPublic: project.visibility === 'public',
      companyId: project.company_id,
      organizationId: project.organization_id,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      members: members.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        role: m.role,
      })),
      pendingRequests: requests
        .filter((r: any) => r.user_id) // Only include requests with valid users
        .map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          projectId: r.project_id,
          message: r.message || '',
          status: r.status,
          createdAt: new Date(r.created_at),
          user: {
            id: r.user_id,
            name: r.name || 'Unknown',
            email: r.email,
            avatar: r.avatar || '',
          },
        })),
    };
  }

  /**
   * Get all projects
   */
  async findAll(): Promise<Project[]> {
    const projectIds = await queryAll(`
      SELECT id FROM projects WHERE status = 'active' ORDER BY created_at DESC
    `);

    const projects = await Promise.all(
      projectIds.map((row: any) => this.findById(row.id))
    );

    return projects.filter((p): p is Project => p !== null);
  }

  /**
   * Get projects by user ID (as owner or member)
   */
  async findByUserId(userId: string): Promise<Project[]> {
    const projectIds = await queryAll(`
      SELECT DISTINCT p.id, p.created_at
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE (p.owner_id = $1 OR pm.user_id = $2) AND p.status = 'active'
      ORDER BY p.created_at DESC
    `, [userId, userId]);

    const projects = await Promise.all(
      projectIds.map((row: any) => this.findById(row.id))
    );

    return projects.filter((p): p is Project => p !== null);
  }

  /**
   * Get projects by company
   */
  async findByCompany(companyId: string): Promise<Project[]> {
    const projectIds = await queryAll(`
      SELECT id FROM projects WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC
    `, [companyId]);

    const projects = await Promise.all(
      projectIds.map((row: any) => this.findById(row.id))
    );

    return projects.filter((p): p is Project => p !== null);
  }

  /**
   * Get projects by organization
   */
  async findByOrganization(organizationId: string): Promise<Project[]> {
    const projectIds = await queryAll(`
      SELECT id FROM projects WHERE organization_id = $1 AND status = 'active' ORDER BY created_at DESC
    `, [organizationId]);

    const projects = await Promise.all(
      projectIds.map((row: any) => this.findById(row.id))
    );

    return projects.filter((p): p is Project => p !== null);
  }

  /**
   * Get public projects
   */
  async findPublicProjects(): Promise<Project[]> {
    const projectIds = await queryAll(`
      SELECT id FROM projects WHERE visibility = 'public' AND status = 'active' ORDER BY created_at DESC
    `);

    const projects = await Promise.all(
      projectIds.map((row: any) => this.findById(row.id))
    );

    return projects.filter((p): p is Project => p !== null);
  }

  /**
   * Update project
   */
  async update(projectId: string, data: Partial<{
    name: string;
    description: string;
    color: string;
    isPublic: boolean;
    status: string;
  }>): Promise<Project | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.color !== undefined) {
      fields.push(`color = $${idx++}`);
      values.push(data.color);
    }
    if (data.isPublic !== undefined) {
      fields.push(`visibility = $${idx++}`);
      values.push(data.isPublic ? 'public' : 'private');
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(projectId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId);

    await query(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = $${idx}
    `, values);

    return this.findById(projectId);
  }

  /**
   * Delete project (soft delete)
   */
  async delete(projectId: string): Promise<boolean> {
    const result = await query(`
      UPDATE projects SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [projectId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Add member to project
   */
  async addMember(projectId: string, userId: string, role: string = 'member', invitedBy?: string): Promise<void> {
    await query(`
      INSERT INTO project_members (project_id, user_id, role, invited_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
    `, [projectId, userId, role, invitedBy]);
  }

  /**
   * Remove member from project
   */
  async removeMember(projectId: string, userId: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM project_members WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Update member role
   */
  async updateMemberRole(projectId: string, userId: string, role: string): Promise<boolean> {
    const result = await query(`
      UPDATE project_members SET role = $3 WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId, role]);
    return (result as any).rowCount > 0;
  }

  /**
   * Check if user is member of project
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const result = await queryOne(`
      SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);
    return !!result;
  }

  /**
   * Get user's role in project
   */
  async getUserRole(projectId: string, userId: string): Promise<string | null> {
    const result = await queryOne(`
      SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);
    return result?.role || null;
  }

  /**
   * Create join request (invitation)
   */
  async createJoinRequest(data: {
    projectId: string;
    email: string;
    invitedBy: string;
    message?: string;
    role?: string;
  }): Promise<void> {
    const project = await this.findById(data.projectId);
    if (!project) throw new Error('Project not found');

    const token = uuidv4();
    await query(`
      INSERT INTO invitations (id, company_id, email, project_id, role, token, invited_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    `, [
      uuidv4(),
      project.companyId || DEFAULT_COMPANY_ID,
      data.email,
      data.projectId,
      data.role || 'member',
      token,
      data.invitedBy
    ]);
  }

  /**
   * Get pending join requests for project
   */
  async getJoinRequests(projectId: string): Promise<any[]> {
    return queryAll(`
      SELECT i.*, u.id as user_id, u.name, u.avatar_url as avatar
      FROM invitations i
      LEFT JOIN users u ON i.email = u.email
      WHERE i.project_id = $1 AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `, [projectId]);
  }

  /**
   * Accept join request
   */
  async acceptJoinRequest(requestId: string): Promise<void> {
    const request = await queryOne(`
      SELECT * FROM invitations WHERE id = $1
    `, [requestId]);

    if (!request) throw new Error('Request not found');

    // Find user by email
    const user = await queryOne(`
      SELECT id FROM users WHERE email = $1
    `, [request.email]);

    if (user) {
      // Add user as member
      await this.addMember(request.project_id, user.id, request.role, request.invited_by);
    }

    // Update invitation status
    await query(`
      UPDATE invitations SET status = 'accepted' WHERE id = $1
    `, [requestId]);
  }

  /**
   * Reject join request
   */
  async rejectJoinRequest(requestId: string): Promise<void> {
    await query(`
      UPDATE invitations SET status = 'rejected' WHERE id = $1
    `, [requestId]);
  }
}
