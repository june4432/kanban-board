import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Card, Priority } from '@/types';

export class CardRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new card
   */
  create(data: {
    columnId: string;
    title: string;
    description?: string;
    priority?: Priority;
    assignees?: string[];
    labels?: string[];
    milestoneId?: string;
    dueDate?: Date;
  }): Card {
    const id = uuidv4();

    const transaction = this.db.transaction(() => {
      // Get max position in column
      const positionStmt = this.db.prepare(`
        SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?
      `);
      const { max_pos } = positionStmt.get(data.columnId) as any;
      const position = max_pos + 1;

      // Create card
      const cardStmt = this.db.prepare(`
        INSERT INTO cards (id, column_id, title, description, priority, position, due_date, milestone_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      cardStmt.run(
        id,
        data.columnId,
        data.title,
        data.description || '',
        data.priority || 'medium',
        position,
        data.dueDate?.toISOString() || null,
        data.milestoneId || null
      );

      // Add assignees
      if (data.assignees && data.assignees.length > 0) {
        const assigneeStmt = this.db.prepare(`
          INSERT INTO card_assignees (card_id, user_id) VALUES (?, ?)
        `);

        for (const userId of data.assignees) {
          assigneeStmt.run(id, userId);
        }
      }

      // Add labels
      if (data.labels && data.labels.length > 0) {
        const labelStmt = this.db.prepare(`
          INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)
        `);

        for (const labelId of data.labels) {
          labelStmt.run(id, labelId);
        }
      }
    });

    transaction();

    return this.findById(id)!;
  }

  /**
   * Find card by ID
   */
  findById(cardId: string): Card | null {
    const stmt = this.db.prepare('SELECT * FROM cards WHERE id = ?');
    const card = stmt.get(cardId) as any;

    if (!card) return null;

    return this.mapToCard(card);
  }

  /**
   * Update card
   */
  update(cardId: string, data: Partial<Card>): Card | null {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.dueDate !== undefined) {
      fields.push('due_date = ?');
      values.push(data.dueDate ? data.dueDate.toISOString() : null);
    }
    if (data.milestone !== undefined) {
      fields.push('milestone_id = ?');
      values.push(data.milestone ? data.milestone.id : null);
    }

    values.push(cardId);

    const stmt = this.db.prepare(`
      UPDATE cards
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Update assignees if provided
    if (data.assignees !== undefined) {
      this.updateAssignees(cardId, data.assignees);
    }

    // Update labels if provided
    if (data.labels !== undefined) {
      this.updateLabels(cardId, data.labels.map((l) => l.id));
    }

    return this.findById(cardId);
  }

  /**
   * Delete card
   */
  delete(cardId: string): boolean {
    const card = this.findById(cardId);
    if (!card) return false;

    const transaction = this.db.transaction(() => {
      // Delete card (cascades to card_assignees and card_labels)
      const deleteStmt = this.db.prepare('DELETE FROM cards WHERE id = ?');
      deleteStmt.run(cardId);

      // Reorder remaining cards in column
      this.reorderColumn(card.columnId);
    });

    transaction();

    return true;
  }

  /**
   * Move card to different column or position
   */
  moveCard(cardId: string, destColumnId: string, destPosition: number): boolean {
    const card = this.findById(cardId);
    if (!card) return false;

    const transaction = this.db.transaction(() => {
      const sourceColumnId = card.columnId;

      if (sourceColumnId === destColumnId) {
        // Same column - reorder
        this.reorderWithinColumn(sourceColumnId, cardId, destPosition);
      } else {
        // Different column - check WIP limit
        const wipStmt = this.db.prepare(`
          SELECT wip_limit,
                 (SELECT COUNT(*) FROM cards WHERE column_id = ?) as card_count
          FROM columns
          WHERE id = ?
        `);

        const wipCheck = wipStmt.get(destColumnId, destColumnId) as any;

        if (wipCheck.wip_limit > 0 && wipCheck.card_count >= wipCheck.wip_limit) {
          throw new Error(`WIP limit (${wipCheck.wip_limit}) reached for this column`);
        }

        // Move card to new column
        const moveStmt = this.db.prepare(`
          UPDATE cards SET column_id = ?, position = ? WHERE id = ?
        `);
        moveStmt.run(destColumnId, destPosition, cardId);

        // Reorder source column
        this.reorderColumn(sourceColumnId);

        // Reorder destination column
        this.reorderColumn(destColumnId);
      }
    });

    try {
      transaction();
      return true;
    } catch (error) {
      console.error('Move card error:', error);
      return false;
    }
  }

  /**
   * Reorder cards within the same column
   */
  private reorderWithinColumn(columnId: string, cardId: string, newPosition: number): void {
    // Get all cards in column
    const stmt = this.db.prepare(`
      SELECT id, position FROM cards
      WHERE column_id = ?
      ORDER BY position ASC
    `);

    const cards = stmt.all(columnId) as any[];
    const currentIndex = cards.findIndex((c) => c.id === cardId);

    if (currentIndex === -1) return;

    // Remove card from its current position
    const [movedCard] = cards.splice(currentIndex, 1);

    // Insert at new position
    cards.splice(newPosition, 0, movedCard);

    // Update all positions
    const updateStmt = this.db.prepare('UPDATE cards SET position = ? WHERE id = ?');

    for (let i = 0; i < cards.length; i++) {
      updateStmt.run(i, cards[i].id);
    }
  }

  /**
   * Reorder all cards in a column sequentially
   */
  private reorderColumn(columnId: string): void {
    const stmt = this.db.prepare(`
      SELECT id FROM cards
      WHERE column_id = ?
      ORDER BY position ASC
    `);

    const cards = stmt.all(columnId) as any[];

    const updateStmt = this.db.prepare('UPDATE cards SET position = ? WHERE id = ?');

    for (let i = 0; i < cards.length; i++) {
      updateStmt.run(i, cards[i].id);
    }
  }

  /**
   * Update card assignees
   */
  private updateAssignees(cardId: string, userIds: string[]): void {
    // Delete existing assignees
    const deleteStmt = this.db.prepare('DELETE FROM card_assignees WHERE card_id = ?');
    deleteStmt.run(cardId);

    // Add new assignees
    if (userIds.length > 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO card_assignees (card_id, user_id) VALUES (?, ?)
      `);

      for (const userId of userIds) {
        insertStmt.run(cardId, userId);
      }
    }
  }

  /**
   * Update card labels
   */
  private updateLabels(cardId: string, labelIds: string[]): void {
    // Delete existing labels
    const deleteStmt = this.db.prepare('DELETE FROM card_labels WHERE card_id = ?');
    deleteStmt.run(cardId);

    // Add new labels
    if (labelIds.length > 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)
      `);

      for (const labelId of labelIds) {
        insertStmt.run(cardId, labelId);
      }
    }
  }

  /**
   * Add assignee to card
   */
  addAssignee(cardId: string, userId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO card_assignees (card_id, user_id) VALUES (?, ?)
      `);

      stmt.run(cardId, userId);
      return true;
    } catch (error) {
      // Already assigned
      return false;
    }
  }

  /**
   * Remove assignee from card
   */
  removeAssignee(cardId: string, userId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?
    `);

    const result = stmt.run(cardId, userId);
    return result.changes > 0;
  }

  /**
   * Add label to card
   */
  addLabel(cardId: string, labelId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)
      `);

      stmt.run(cardId, labelId);
      return true;
    } catch (error) {
      // Already has label
      return false;
    }
  }

  /**
   * Remove label from card
   */
  removeLabel(cardId: string, labelId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM card_labels WHERE card_id = ? AND label_id = ?
    `);

    const result = stmt.run(cardId, labelId);
    return result.changes > 0;
  }

  /**
   * Map database row to Card type
   */
  private mapToCard(row: any): Card {
    // Get assignees
    const assigneesStmt = this.db.prepare(`
      SELECT user_id FROM card_assignees WHERE card_id = ?
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
    let milestone = undefined;
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
}
