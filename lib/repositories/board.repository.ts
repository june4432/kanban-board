import { v4 as uuidv4 } from 'uuid';
import { Board, Column, Card, Label, Milestone, Priority } from '@/types';
import { query, queryOne, queryAll, withTransaction } from '@/lib/postgres';

export class BoardRepository {
  private static projectColumnsCache: Set<string> | null = null;
  private static boardColumnsCache: Set<string> | null = null;

  constructor() { }

  private async getTableColumns(tableName: string): Promise<Set<string>> {
    const rows = await queryAll<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async getProjectPk(): Promise<'id' | 'project_id'> {
    if (!BoardRepository.projectColumnsCache) {
      BoardRepository.projectColumnsCache = await this.getTableColumns('projects');
    }
    return BoardRepository.projectColumnsCache.has('id') ? 'id' : 'project_id';
  }

  private async getBoardPk(): Promise<'id' | 'board_id'> {
    if (!BoardRepository.boardColumnsCache) {
      BoardRepository.boardColumnsCache = await this.getTableColumns('boards');
    }
    return BoardRepository.boardColumnsCache.has('id') ? 'id' : 'board_id';
  }

  /**
   * Get board by project ID with all related data
   */
  async findByProjectId(projectId: string): Promise<Board | null> {
    const boardPk = await this.getBoardPk();

    // Get board (new schema uses 'id', old used 'board_id')
    const board = await queryOne('SELECT * FROM boards WHERE project_id = $1', [projectId]);
    if (!board) return null;

    const boardId = board[boardPk];

    // Get columns
    const columns = await this.getColumns(boardId);

    // Get labels (hierarchical: company -> organization -> project)
    const labels = await this.getLabels(projectId);

    // Get milestones (hierarchical: company -> organization -> project)
    const milestones = await this.getMilestones(projectId);

    return {
      boardId: boardId,
      projectId: projectId,
      columns,
      labels,
      milestones,
    };
  }

  /**
   * Get columns with cards for a board
   */
  private async getColumns(boardId: string): Promise<Column[]> {
    const columns = await queryAll(`
      SELECT * FROM columns
      WHERE board_id = $1
      ORDER BY position ASC
    `, [boardId]);

    const columnsWithCards = await Promise.all(columns.map(async (col: any) => ({
      id: col.id,
      title: col.title,
      wipLimit: col.wip_limit,
      position: col.position,
      cards: await this.getCardsForColumn(col.id),
    })));

    return columnsWithCards;
  }

  /**
   * Get cards for a column
   */
  private async getCardsForColumn(columnId: string): Promise<Card[]> {
    const cards = await queryAll(`
      SELECT * FROM cards
      WHERE column_id = $1
      ORDER BY position ASC
    `, [columnId]);

    return Promise.all(cards.map((card: any) => this.mapToCard(card)));
  }

  /**
   * Map database row to Card with assignees, labels, and milestone
   */
  private async mapToCard(row: any): Promise<Card> {
    // Get assignees
    const assignees = await queryAll(`
      SELECT user_id FROM card_assignees
      WHERE card_id = $1
    `, [row.id]);

    // Get labels
    const labels = await queryAll(`
      SELECT l.* FROM labels l
      INNER JOIN card_labels cl ON l.id = cl.label_id
      WHERE cl.card_id = $1
    `, [row.id]);

    // Get milestone
    let milestone: Milestone | undefined = undefined;
    if (row.milestone_id) {
      const m = await queryOne('SELECT * FROM milestones WHERE id = $1', [row.milestone_id]);
      if (m) {
        milestone = {
          id: m.id,
          name: m.name,
          dueDate: new Date(m.due_date),
          description: m.description,
        };
      }
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      assignees: assignees.map((a: any) => a.user_id),
      milestone,
      priority: row.priority as Priority,
      labels: labels.map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      columnId: row.column_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      position: row.position,
    };
  }

  /**
   * Get labels for a project (hierarchical: company -> project)
   */
  private async getLabels(projectId: string): Promise<Label[]> {
    const projectPk = await this.getProjectPk();

    // Get project info
    const project = await queryOne(`
      SELECT ${projectPk} as id, company_id
      FROM projects WHERE ${projectPk} = $1
    `, [projectId]);

    if (!project) return [];

    // Get labels from company and project levels
    const labels = await queryAll(`
      SELECT * FROM labels
      WHERE
        (scope = 'company' AND company_id = $1) OR
        (scope = 'project' AND project_id = $2)
      ORDER BY scope, name ASC
    `, [project.company_id, projectId]);

    return labels.map((l: any) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    }));
  }

  /**
   * Get milestones for a project (hierarchical: company -> project)
   */
  private async getMilestones(projectId: string): Promise<Milestone[]> {
    const projectPk = await this.getProjectPk();

    // Get project info
    const project = await queryOne(`
      SELECT ${projectPk} as id, company_id
      FROM projects WHERE ${projectPk} = $1
    `, [projectId]);

    if (!project) return [];

    // Get milestones from company and project levels
    const milestones = await queryAll(`
      SELECT * FROM milestones
      WHERE
        (scope = 'company' AND company_id = $1) OR
        (scope = 'project' AND project_id = $2)
      ORDER BY scope, due_date ASC
    `, [project.company_id, projectId]);

    return milestones.map((m: any) => ({
      id: m.id,
      name: m.name,
      dueDate: m.due_date ? new Date(m.due_date) : new Date(),
      description: m.description,
    }));
  }

  /**
   * Create a label with scope support
   */
  async createLabel(
    projectId: string,
    data: { name: string; color: string; scope?: 'company' | 'project' }
  ): Promise<Label> {
    const projectPk = await this.getProjectPk();
    const id = uuidv4();
    const scope = data.scope || 'project';

    // Get project info for hierarchy IDs
    const project = await queryOne(`
      SELECT ${projectPk} as id, company_id
      FROM projects WHERE ${projectPk} = $1
    `, [projectId]);

    if (!project) throw new Error('Project not found');

    await query(`
      INSERT INTO labels (id, scope, company_id, project_id, name, color)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      scope,
      scope === 'company' ? project.company_id : null,
      scope === 'project' ? projectId : null,
      data.name,
      data.color
    ]);

    return { id, name: data.name, color: data.color };
  }

  /**
   * Update a label
   */
  async updateLabel(labelId: string, data: { name?: string; color?: string }): Promise<Label | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push(`color = $${idx++}`);
      values.push(data.color);
    }

    if (fields.length === 0) {
      const label = await queryOne('SELECT * FROM labels WHERE id = $1', [labelId]);
      return label ? { id: label.id, name: label.name, color: label.color } : null;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(labelId);

    await query(`
      UPDATE labels SET ${fields.join(', ')} WHERE id = $${idx}
    `, values);

    const label = await queryOne('SELECT * FROM labels WHERE id = $1', [labelId]);
    return label ? { id: label.id, name: label.name, color: label.color } : null;
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId: string): Promise<boolean> {
    const result = await query('DELETE FROM labels WHERE id = $1', [labelId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Create a milestone with scope support
   */
  async createMilestone(
    projectId: string,
    data: { name: string; dueDate: Date; description?: string; scope?: 'company' | 'project' }
  ): Promise<Milestone> {
    const projectPk = await this.getProjectPk();
    const id = uuidv4();
    const scope = data.scope || 'project';

    // Get project info for hierarchy IDs
    const project = await queryOne(`
      SELECT ${projectPk} as id, company_id
      FROM projects WHERE ${projectPk} = $1
    `, [projectId]);

    if (!project) throw new Error('Project not found');

    await query(`
      INSERT INTO milestones (id, scope, company_id, project_id, name, description, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      scope,
      scope === 'company' ? project.company_id : null,
      scope === 'project' ? projectId : null,
      data.name,
      data.description || null,
      data.dueDate
    ]);

    return { id, name: data.name, dueDate: data.dueDate, description: data.description };
  }

  /**
   * Update a milestone
   */
  async updateMilestone(
    milestoneId: string,
    data: { name?: string; dueDate?: Date; description?: string }
  ): Promise<Milestone | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.dueDate !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.dueDate);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (fields.length === 0) {
      const m = await queryOne('SELECT * FROM milestones WHERE id = $1', [milestoneId]);
      return m ? { id: m.id, name: m.name, dueDate: new Date(m.due_date), description: m.description } : null;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(milestoneId);

    await query(`
      UPDATE milestones SET ${fields.join(', ')} WHERE id = $${idx}
    `, values);

    const m = await queryOne('SELECT * FROM milestones WHERE id = $1', [milestoneId]);
    return m ? { id: m.id, name: m.name, dueDate: new Date(m.due_date), description: m.description } : null;
  }

  /**
   * Delete a milestone
   */
  async deleteMilestone(milestoneId: string): Promise<boolean> {
    const result = await query('DELETE FROM milestones WHERE id = $1', [milestoneId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Create column
   */
  async createColumn(boardId: string, data: { title: string; wipLimit?: number }): Promise<Column> {
    const id = uuidv4();

    // Get max position
    const maxPos = await queryOne(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM columns WHERE board_id = $1',
      [boardId]
    );

    const position = (maxPos?.max_pos ?? -1) + 1;

    await query(`
      INSERT INTO columns (id, board_id, title, wip_limit, position)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, boardId, data.title, data.wipLimit || 0, position]);

    return { id, title: data.title, wipLimit: data.wipLimit || 0, position, cards: [] };
  }

  /**
   * Update column
   */
  async updateColumn(columnId: string, data: { title?: string; wipLimit?: number }): Promise<Column | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.wipLimit !== undefined) {
      fields.push(`wip_limit = $${idx++}`);
      values.push(data.wipLimit);
    }

    if (fields.length === 0) {
      const col = await queryOne('SELECT * FROM columns WHERE id = $1', [columnId]);
      if (!col) return null;
      return { id: col.id, title: col.title, wipLimit: col.wip_limit, position: col.position, cards: [] };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(columnId);

    await query(`
      UPDATE columns SET ${fields.join(', ')} WHERE id = $${idx}
    `, values);

    const col = await queryOne('SELECT * FROM columns WHERE id = $1', [columnId]);
    if (!col) return null;
    return { id: col.id, title: col.title, wipLimit: col.wip_limit, position: col.position, cards: [] };
  }

  /**
   * Delete column
   */
  async deleteColumn(columnId: string): Promise<boolean> {
    const result = await query('DELETE FROM columns WHERE id = $1', [columnId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Reorder columns
   */
  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    await withTransaction(async (client) => {
      for (let i = 0; i < columnIds.length; i++) {
        await client.query(
          'UPDATE columns SET position = $1 WHERE id = $2 AND board_id = $3',
          [i, columnIds[i], boardId]
        );
      }
    });
  }

  /**
   * Get board ID by project ID
   */
  async getBoardIdByProjectId(projectId: string): Promise<string | null> {
    const boardPk = await this.getBoardPk();
    const board = await queryOne(`SELECT ${boardPk} as id FROM boards WHERE project_id = $1`, [projectId]);
    return board?.id || null;
  }

  /**
   * Get column by ID
   */
  async getColumnById(columnId: string): Promise<Column | null> {
    const col = await queryOne('SELECT * FROM columns WHERE id = $1', [columnId]);
    if (!col) return null;
    return { id: col.id, title: col.title, wipLimit: col.wip_limit, position: col.position, cards: [] };
  }
}
