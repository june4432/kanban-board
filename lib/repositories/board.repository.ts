import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Board, Column, Card, Label, Milestone, Priority } from '@/types';

export class BoardRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get board by project ID with all related data
   */
  findByProjectId(projectId: string): Board | null {
    // Get board
    const boardStmt = this.db.prepare(`
      SELECT * FROM boards WHERE project_id = ?
    `);

    const board = boardStmt.get(projectId) as any;
    if (!board) return null;

    // Get columns
    const columns = this.getColumns(board.board_id);

    // Get labels
    const labels = this.getLabels(board.board_id);

    // Get milestones
    const milestones = this.getMilestones(board.board_id);

    return {
      boardId: board.board_id,
      projectId: board.project_id,
      columns,
      labels,
      milestones,
    };
  }

  /**
   * Get columns with cards for a board
   */
  private getColumns(boardId: string): Column[] {
    const stmt = this.db.prepare(`
      SELECT * FROM columns
      WHERE board_id = ?
      ORDER BY position ASC
    `);

    const columns = stmt.all(boardId) as any[];

    return columns.map((col) => ({
      id: col.id,
      title: col.title,
      wipLimit: col.wip_limit,
      position: col.position,
      cards: this.getCardsForColumn(col.id),
    }));
  }

  /**
   * Get cards for a column
   */
  private getCardsForColumn(columnId: string): Card[] {
    const stmt = this.db.prepare(`
      SELECT * FROM cards
      WHERE column_id = ?
      ORDER BY position ASC
    `);

    const cards = stmt.all(columnId) as any[];

    return cards.map((card) => this.mapToCard(card));
  }

  /**
   * Map database row to Card with assignees, labels, and milestone
   */
  private mapToCard(row: any): Card {
    // Get assignees
    const assigneesStmt = this.db.prepare(`
      SELECT user_id FROM card_assignees
      WHERE card_id = ?
    `);

    const assignees = assigneesStmt.all(row.id) as any[];

    // Get labels
    const labelsStmt = this.db.prepare(`
      SELECT l.* FROM labels l
      INNER JOIN card_labels cl ON l.id = cl.label_id
      WHERE cl.card_id = ?
    `);

    const labels = labelsStmt.all(row.id) as any[];

    // Get milestone
    let milestone: Milestone | undefined = undefined;
    if (row.milestone_id) {
      const milestoneStmt = this.db.prepare(`
        SELECT * FROM milestones WHERE id = ?
      `);

      const m = milestoneStmt.get(row.milestone_id) as any;
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
      assignees: assignees.map((a) => a.user_id),
      milestone,
      priority: row.priority as Priority,
      labels: labels.map((l) => ({
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
   * Get labels for a board
   */
  private getLabels(boardId: string): Label[] {
    const stmt = this.db.prepare(`
      SELECT * FROM labels WHERE board_id = ?
    `);

    const labels = stmt.all(boardId) as any[];

    return labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    }));
  }

  /**
   * Get milestones for a board
   */
  private getMilestones(boardId: string): Milestone[] {
    const stmt = this.db.prepare(`
      SELECT * FROM milestones WHERE board_id = ?
    `);

    const milestones = stmt.all(boardId) as any[];

    return milestones.map((m) => ({
      id: m.id,
      name: m.name,
      dueDate: new Date(m.due_date),
      description: m.description,
    }));
  }

  /**
   * Create a label
   */
  createLabel(boardId: string, data: { name: string; color: string }): Label {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO labels (id, board_id, name, color)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, boardId, data.name, data.color);

    return {
      id,
      name: data.name,
      color: data.color,
    };
  }

  /**
   * Update a label
   */
  updateLabel(labelId: string, data: { name?: string; color?: string }): Label | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }

    if (fields.length === 0) return null;

    values.push(labelId);

    const stmt = this.db.prepare(`
      UPDATE labels
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const getStmt = this.db.prepare('SELECT * FROM labels WHERE id = ?');
    const label = getStmt.get(labelId) as any;

    return {
      id: label.id,
      name: label.name,
      color: label.color,
    };
  }

  /**
   * Delete a label
   */
  deleteLabel(labelId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM labels WHERE id = ?');
    const result = stmt.run(labelId);

    return result.changes > 0;
  }

  /**
   * Create a milestone
   */
  createMilestone(
    boardId: string,
    data: { name: string; dueDate: Date; description?: string }
  ): Milestone {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO milestones (id, board_id, name, due_date, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, boardId, data.name, data.dueDate.toISOString(), data.description || null);

    return {
      id,
      name: data.name,
      dueDate: data.dueDate,
      description: data.description,
    };
  }

  /**
   * Update a milestone
   */
  updateMilestone(
    milestoneId: string,
    data: { name?: string; dueDate?: Date; description?: string }
  ): Milestone | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.dueDate !== undefined) {
      fields.push('due_date = ?');
      values.push(data.dueDate.toISOString());
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }

    if (fields.length === 0) return null;

    values.push(milestoneId);

    const stmt = this.db.prepare(`
      UPDATE milestones
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const getStmt = this.db.prepare('SELECT * FROM milestones WHERE id = ?');
    const milestone = getStmt.get(milestoneId) as any;

    return {
      id: milestone.id,
      name: milestone.name,
      dueDate: new Date(milestone.due_date),
      description: milestone.description,
    };
  }

  /**
   * Delete a milestone
   */
  deleteMilestone(milestoneId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM milestones WHERE id = ?');
    const result = stmt.run(milestoneId);

    return result.changes > 0;
  }

  /**
   * Update column
   */
  updateColumn(columnId: string, data: { title?: string; wipLimit?: number }): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.wipLimit !== undefined) {
      fields.push('wip_limit = ?');
      values.push(data.wipLimit);
    }

    if (fields.length === 0) return false;

    values.push(columnId);

    const stmt = this.db.prepare(`
      UPDATE columns
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Create a new column
   */
  createColumn(boardId: string, data: { title: string; wipLimit: number }): Column {
    const id = uuidv4();

    // Get the highest position for this board
    const posStmt = this.db.prepare(`
      SELECT MAX(position) as max_pos FROM columns WHERE board_id = ?
    `);
    const posResult = posStmt.get(boardId) as any;
    const position = (posResult?.max_pos ?? -1) + 1;

    const stmt = this.db.prepare(`
      INSERT INTO columns (id, board_id, title, wip_limit, position)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, boardId, data.title, data.wipLimit, position);

    return {
      id,
      title: data.title,
      wipLimit: data.wipLimit,
      position,
      cards: [],
    };
  }

  /**
   * Delete a column (only if it has no cards)
   */
  deleteColumn(columnId: string): { success: boolean; error?: string } {
    // Check if column has cards
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM cards WHERE column_id = ?
    `);
    const result = checkStmt.get(columnId) as any;

    if (result.count > 0) {
      return {
        success: false,
        error: 'Cannot delete column with cards. Please move or delete all cards first.',
      };
    }

    // Delete the column
    const deleteStmt = this.db.prepare('DELETE FROM columns WHERE id = ?');
    const deleteResult = deleteStmt.run(columnId);

    return {
      success: deleteResult.changes > 0,
    };
  }

  /**
   * Reorder columns
   */
  reorderColumns(columnUpdates: { id: string; position: number }[]): boolean {
    const stmt = this.db.prepare(`
      UPDATE columns SET position = ? WHERE id = ?
    `);

    const transaction = this.db.transaction(() => {
      for (const update of columnUpdates) {
        stmt.run(update.position, update.id);
      }
    });

    try {
      transaction();
      return true;
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      return false;
    }
  }

  /**
   * Get board ID from project ID
   */
  getBoardIdByProjectId(projectId: string): string | null {
    const stmt = this.db.prepare(`
      SELECT board_id FROM boards WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as any;
    return result?.board_id || null;
  }
}
