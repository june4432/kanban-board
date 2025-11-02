import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectJoinRequest } from '@/types';

export class ProjectRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new project with initial board setup
   */
  create(data: {
    projectId?: string;  // Optional: for migration purposes
    name: string;
    description?: string;
    ownerId: string;
    color?: string;
    isPublic?: boolean;
    columns?: Array<{ title: string; wipLimit: number }>;
  }): Project {
    const projectId = data.projectId || `project-${Date.now()}`;
    const boardId = `board-${projectId}`;

    const transaction = this.db.transaction(() => {
      // Create project
      const projectStmt = this.db.prepare(`
        INSERT INTO projects (project_id, name, description, owner_id, color, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      projectStmt.run(
        projectId,
        data.name,
        data.description || null,
        data.ownerId,
        data.color || '#3b82f6',
        data.isPublic ? 1 : 0
      );

      // Add owner as member
      const memberStmt = this.db.prepare(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES (?, ?, 'owner')
      `);

      memberStmt.run(projectId, data.ownerId);

      // Create board
      const boardStmt = this.db.prepare(`
        INSERT INTO boards (board_id, project_id)
        VALUES (?, ?)
      `);

      boardStmt.run(boardId, projectId);

      // Create columns (use custom columns if provided, otherwise use defaults)
      const columnStmt = this.db.prepare(`
        INSERT INTO columns (id, board_id, title, wip_limit, position)
        VALUES (?, ?, ?, ?, ?)
      `);

      const columns = data.columns || [
        { title: 'Backlog', wipLimit: 10 },
        { title: 'To Do', wipLimit: 5 },
        { title: 'In Progress', wipLimit: 3 },
        { title: 'Done', wipLimit: 0 },
      ];

      columns.forEach((col, index) => {
        const columnId = `${boardId}-${col.title.toLowerCase().replace(/\s+/g, '-')}`;
        columnStmt.run(
          columnId,
          boardId,
          col.title,
          col.wipLimit,
          index
        );
      });
    });

    transaction();

    return this.findById(projectId)!;
  }

  /**
   * Find project by ID with members and join requests
   */
  findById(projectId: string): Project | null {
    const projectStmt = this.db.prepare(`
      SELECT * FROM projects WHERE project_id = ?
    `);

    const project = projectStmt.get(projectId) as any;
    if (!project) return null;

    // Get members
    const membersStmt = this.db.prepare(`
      SELECT u.*, pm.role, pm.joined_at
      FROM users u
      INNER JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY u.name
    `);

    const members = membersStmt.all(projectId) as any[];

    // Get pending join requests
    const requestsStmt = this.db.prepare(`
      SELECT jr.*, u.id as user_id, u.name, u.email, u.avatar
      FROM project_join_requests jr
      INNER JOIN users u ON jr.user_id = u.id
      WHERE jr.project_id = ? AND jr.status = 'pending'
      ORDER BY jr.created_at DESC
    `);

    const requests = requestsStmt.all(projectId) as any[];

    return {
      projectId: project.project_id,
      name: project.name,
      description: project.description,
      ownerId: project.owner_id,
      color: project.color,
      isPublic: Boolean(project.is_public),
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        role: m.role,
      })),
      pendingRequests: requests.map((r) => ({
        id: r.id,
        userId: r.user_id,
        projectId: r.project_id,
        message: r.message,
        status: r.status,
        createdAt: new Date(r.created_at),
        user: {
          id: r.user_id,
          name: r.name,
          email: r.email,
          avatar: r.avatar,
        },
      })),
    };
  }

  /**
   * Get all projects
   */
  findAll(): Project[] {
    const stmt = this.db.prepare(`
      SELECT project_id FROM projects ORDER BY created_at DESC
    `);

    const projectIds = stmt.all() as any[];

    return projectIds
      .map((row) => this.findById(row.project_id))
      .filter((p) => p !== null) as Project[];
  }

  /**
   * Get projects by user ID (as owner or member)
   */
  findByUserId(userId: string): Project[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT p.project_id
      FROM projects p
      LEFT JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.owner_id = ? OR pm.user_id = ?
      ORDER BY p.created_at DESC
    `);

    const projectIds = stmt.all(userId, userId) as any[];

    return projectIds
      .map((row) => this.findById(row.project_id))
      .filter((p) => p !== null) as Project[];
  }

  /**
   * Get public projects
   */
  findPublicProjects(): Project[] {
    const stmt = this.db.prepare(`
      SELECT project_id FROM projects WHERE is_public = 1 ORDER BY created_at DESC
    `);

    const projectIds = stmt.all() as any[];

    return projectIds
      .map((row) => this.findById(row.project_id))
      .filter((p) => p !== null) as Project[];
  }

  /**
   * Update project
   */
  update(
    projectId: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      isPublic: boolean;
    }>
  ): Project | null {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }
    if (data.isPublic !== undefined) {
      fields.push('is_public = ?');
      values.push(data.isPublic ? 1 : 0);
    }

    values.push(projectId);

    const stmt = this.db.prepare(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE project_id = ?
    `);

    stmt.run(...values);

    return this.findById(projectId);
  }

  /**
   * Delete project (cascades to board, columns, cards)
   */
  delete(projectId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE project_id = ?');
    const result = stmt.run(projectId);

    return result.changes > 0;
  }

  /**
   * Add member to project
   */
  addMember(projectId: string, userId: string, role: 'owner' | 'member' = 'member'): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES (?, ?, ?)
      `);

      stmt.run(projectId, userId, role);
      return true;
    } catch (error) {
      // Unique constraint violation (already a member)
      return false;
    }
  }

  /**
   * Remove member from project
   */
  removeMember(projectId: string, userId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM project_members
      WHERE project_id = ? AND user_id = ?
    `);

    const result = stmt.run(projectId, userId);
    return result.changes > 0;
  }

  /**
   * Check if user is member of project
   */
  isMember(projectId: string, userId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM project_members
      WHERE project_id = ? AND user_id = ?
    `);

    return stmt.get(projectId, userId) !== undefined;
  }

  /**
   * Create join request
   */
  createJoinRequest(data: {
    projectId: string;
    userId: string;
    message?: string;
  }): ProjectJoinRequest {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO project_join_requests (id, project_id, user_id, message, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    stmt.run(id, data.projectId, data.userId, data.message || null);

    // Get the created request with user info
    const getStmt = this.db.prepare(`
      SELECT jr.*, u.id as user_id, u.name, u.email, u.avatar
      FROM project_join_requests jr
      INNER JOIN users u ON jr.user_id = u.id
      WHERE jr.id = ?
    `);

    const row = getStmt.get(id) as any;

    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      message: row.message,
      status: row.status,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email,
        avatar: row.avatar,
      },
    };
  }

  /**
   * Approve join request
   */
  approveJoinRequest(requestId: string): boolean {
    const transaction = this.db.transaction(() => {
      // Get request details
      const getStmt = this.db.prepare(`
        SELECT project_id, user_id FROM project_join_requests
        WHERE id = ? AND status = 'pending'
      `);

      const request = getStmt.get(requestId) as any;
      if (!request) return false;

      // Update request status
      const updateStmt = this.db.prepare(`
        UPDATE project_join_requests
        SET status = 'approved'
        WHERE id = ?
      `);

      updateStmt.run(requestId);

      // Add user as member
      this.addMember(request.project_id, request.user_id, 'member');

      return true;
    });

    return transaction();
  }

  /**
   * Reject join request
   */
  rejectJoinRequest(requestId: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE project_join_requests
      SET status = 'rejected'
      WHERE id = ? AND status = 'pending'
    `);

    const result = stmt.run(requestId);
    return result.changes > 0;
  }

  /**
   * Get join requests for a project
   */
  getJoinRequests(projectId: string): ProjectJoinRequest[] {
    const stmt = this.db.prepare(`
      SELECT jr.*, u.id as user_id, u.name, u.email, u.avatar
      FROM project_join_requests jr
      INNER JOIN users u ON jr.user_id = u.id
      WHERE jr.project_id = ? AND jr.status = 'pending'
      ORDER BY jr.created_at DESC
    `);

    const rows = stmt.all(projectId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      projectId: r.project_id,
      message: r.message,
      status: r.status,
      createdAt: new Date(r.created_at),
      user: {
        id: r.user_id,
        name: r.name,
        email: r.email,
        avatar: r.avatar,
      },
    }));
  }
}
