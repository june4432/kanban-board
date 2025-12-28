import { v4 as uuidv4 } from 'uuid';
import { Card, Priority, Label, Milestone } from '@/types';
import { query, queryOne, queryAll, withTransaction } from '@/lib/postgres';
import { QueryOptions } from '@/lib/api-v1/utils/filter';

export interface CardUpdateInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
  milestone?: Milestone;
  assignees?: string[];
  labels?: string[] | Label[];
  tags?: string[];
}

export class CardRepository {
  // Constructor no longer needs db instance
  constructor() { }

  /**
   * Find all cards with advanced filtering, sorting, and pagination
   */
  async findAll(options: QueryOptions & { projectId: string }): Promise<{ cards: Card[]; total: number }> {
    const { filters, sort, pagination, projectId } = options;
    const values: any[] = [projectId];
    let whereClause = 'WHERE p.id = $1';
    let paramIndex = 2;

    // 1. Apply Filters
    if (filters.status) {
      // Assuming status maps to column titles or IDs? 
      // For now, let's assume status filtering is done via columnId if provided, 
      // or we might need to join columns and filter by title.
      // The current API uses columnId for filtering.
      // If 'status' filter is passed, we might need to map it.
      // Let's support columnId directly in filters if added to FilterOptions, 
      // or assume 'status' means column title.
      // The previous code filtered by columnId.
      // Let's check if FilterOptions has columnId. It doesn't.
      // But we can add it or use 'status' as column title.
    }

    if (filters.search) {
      whereClause += ` AND (
        c.search_vector @@ plainto_tsquery('english', $${paramIndex})
        OR c.title ILIKE $${paramIndex} 
        OR c.description ILIKE $${paramIndex}
      )`;
      values.push(filters.search); // For plainto_tsquery
      // For ILIKE, we might need separate params or reuse.
      // To be safe and simple with parameterized queries:
      // We can use the same value for all.
      // Actually, for ILIKE we need %...%
      // Let's refine the search query.
      // Using search_vector is best for full text.
      // Fallback to ILIKE for partial matches if needed.
      // Let's stick to search_vector for "Advanced Search" as requested.
      // But for user friendliness, partial match on title is often expected.

      // Let's use a combined approach:
      // values.push(filters.search);
      // whereClause += ` AND (c.search_vector @@ plainto_tsquery('english', $${paramIndex}))`;
      // paramIndex++;
    }

    // ... (Implementation details for other filters)
    // Since I need to replace the WHOLE file and I want to get it right, 
    // I will implement a robust query builder.

    let queryText = `
      SELECT c.*,
             col.title as column_title,
             col.board_id,
             p.id as project_id
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      JOIN projects p ON b.project_id = p.id
    `;

    // Re-building the query logic properly
    const conditions: string[] = ['p.id = $1'];
    const queryValues: any[] = [projectId];
    let pIdx = 2;

    if (filters.search) {
      conditions.push(`c.search_vector @@ plainto_tsquery('english', $${pIdx})`);
      queryValues.push(filters.search);
      pIdx++;
    }

    if (filters.priority && filters.priority.length > 0) {
      conditions.push(`c.priority = ANY($${pIdx})`);
      queryValues.push(filters.priority);
      pIdx++;
    }

    if (filters.assignee && filters.assignee.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM card_assignees ca 
        WHERE ca.card_id = c.id AND ca.user_id = ANY($${pIdx})
      )`);
      queryValues.push(filters.assignee);
      pIdx++;
    }

    if (filters.tags && filters.tags.length > 0) {
      // Assuming tags are labels? Or actual tags?
      // The schema has 'labels' table.
      conditions.push(`EXISTS (
        SELECT 1 FROM card_labels cl
        JOIN labels l ON cl.label_id = l.id
        WHERE cl.card_id = c.id AND l.name = ANY($${pIdx})
      )`);
      queryValues.push(filters.tags);
      pIdx++;
    }

    if (filters.dueDate) {
      if (filters.dueDate.gte) {
        conditions.push(`c.due_date >= $${pIdx}`);
        queryValues.push(filters.dueDate.gte);
        pIdx++;
      }
      if (filters.dueDate.lte) {
        conditions.push(`c.due_date <= $${pIdx}`);
        queryValues.push(filters.dueDate.lte);
        pIdx++;
      }
    }

    const whereSql = 'WHERE ' + conditions.join(' AND ');

    // Sorting
    let sortSql = sort.map(s => {
      const field = s.field === 'createdAt' ? 'created_at' :
        s.field === 'dueDate' ? 'due_date' :
          s.field; // validate field names to prevent injection
      // Whitelist allowed sort fields
      const allowed = ['created_at', 'updated_at', 'due_date', 'priority', 'title', 'position'];
      if (!allowed.includes(field)) return 'c.created_at DESC';
      return `c.${field} ${s.direction}`;
    }).join(', ');

    if (!sortSql) {
      sortSql = 'c.created_at DESC';
    }

    // Pagination
    const limit = pagination.pageSize;
    const offset = (pagination.page - 1) * limit;

    const sql = `
      ${queryText}
      ${whereSql}
      ORDER BY ${sortSql}
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      ${whereSql}
    `;

    const [rows, countResult] = await Promise.all([
      queryAll(sql, [...queryValues, limit, offset]),
      queryOne(countSql, queryValues)
    ]);

    const cards = await Promise.all(rows.map(row => this.mapToCard(row)));

    return {
      cards,
      total: parseInt(countResult?.total || '0', 10)
    };
  }

  /**
   * Create a new card
   */
  async create(data: {
    columnId: string;
    title: string;
    description?: string;
    priority?: Priority;
    assignees?: string[];
    labels?: string[];
    milestoneId?: string;
    dueDate?: Date;
    createdBy: string;
  }): Promise<Card> {
    const id = uuidv4();

    return await withTransaction(async (client) => {
      // Get board_id and project_id from column
      const columnResult = await client.query(
        'SELECT col.board_id, b.project_id FROM columns col JOIN boards b ON col.board_id = b.id WHERE col.id = $1',
        [data.columnId]
      );
      if (columnResult.rows.length === 0) {
        throw new Error('Column not found');
      }
      const { board_id: boardId, project_id: projectId } = columnResult.rows[0];

      // Get max position
      const posResult = await client.query(
        'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = $1',
        [data.columnId]
      );
      const position = posResult.rows[0].max_pos + 1;

      // Insert card
      await client.query(`
        INSERT INTO cards (id, column_id, board_id, project_id, title, description, priority, position, due_date, milestone_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        id,
        data.columnId,
        boardId,
        projectId,
        data.title,
        data.description || '',
        data.priority || 'medium',
        position,
        data.dueDate || null,
        data.milestoneId || null,
        data.createdBy
      ]);

      // Add assignees
      if (data.assignees && data.assignees.length > 0) {
        for (const userId of data.assignees) {
          await client.query(
            'INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2)',
            [id, userId]
          );
        }
      }

      // Add labels
      if (data.labels && data.labels.length > 0) {
        for (const labelId of data.labels) {
          await client.query(
            'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)',
            [id, labelId]
          );
        }
      }

      // Query within the same transaction to get the created card
      const cardResult = await client.query('SELECT * FROM cards WHERE id = $1', [id]);
      if (cardResult.rows.length === 0) {
        throw new Error('Failed to create card');
      }

      // Get assignees within transaction
      const assigneesResult = await client.query(
        'SELECT user_id FROM card_assignees WHERE card_id = $1',
        [id]
      );

      // Get labels within transaction
      const labelsResult = await client.query(
        'SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.label_id WHERE cl.card_id = $1',
        [id]
      );

      const row = cardResult.rows[0];
      return {
        id: row.id,
        columnId: row.column_id,
        boardId: row.board_id,
        projectId: row.project_id,
        title: row.title,
        description: row.description || '',
        position: row.position,
        priority: row.priority || 'medium',
        startDate: row.start_date,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        estimatedHours: row.estimated_hours,
        actualHours: row.actual_hours,
        storyPoints: row.story_points,
        milestoneId: row.milestone_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignees: assigneesResult.rows.map((r: { user_id: string }) => r.user_id),
        labels: labelsResult.rows.map((l: any) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
        checklist: [],
        comments: [],
        attachments: [],
      } as Card;
    });
  }

  /**
   * Find card by ID
   */
  async findById(cardId: string): Promise<Card | null> {
    const row = await queryOne('SELECT * FROM cards WHERE id = $1', [cardId]);
    if (!row) return null;
    return this.mapToCard(row);
  }

  /**
   * Update card
   */
  async update(cardId: string, data: CardUpdateInput): Promise<Card | null> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(data.priority);
    }
    if (data.dueDate !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.dueDate);
    }
    if (data.milestone !== undefined) {
      fields.push(`milestone_id = $${idx++}`);
      values.push(data.milestone ? data.milestone.id : null);
    }

    values.push(cardId);

    await query(`
      UPDATE cards
      SET ${fields.join(', ')}
      WHERE id = $${idx}
    `, values);

    // Update assignees
    if (data.assignees !== undefined) {
      await this.updateAssignees(cardId, data.assignees);
    }

    // Update labels
    if (data.labels !== undefined) {
      const labelIds = typeof data.labels[0] === 'string'
        ? data.labels as string[]
        : (data.labels as Label[]).map((l) => l.id);
      await this.updateLabels(cardId, labelIds);
    }

    return this.findById(cardId);
  }

  /**
   * Delete card
   */
  async delete(cardId: string): Promise<boolean> {
    const card = await this.findById(cardId);
    if (!card) return false;

    await withTransaction(async (client) => {
      await client.query('DELETE FROM cards WHERE id = $1', [cardId]);
      // Reorder logic would go here
    });

    return true;
  }

  /**
   * Move card to different column or position
   */
  async moveCard(cardId: string, destColumnId: string, destPosition: number): Promise<boolean> {
    const card = await this.findById(cardId);
    if (!card) return false;

    return await withTransaction(async (client) => {
      const sourceColumnId = card.columnId;

      if (sourceColumnId === destColumnId) {
        // Same column - reorder
        await this.reorderWithinColumn(client, sourceColumnId, cardId, destPosition);
      } else {
        // Different column - check WIP limit
        const wipResult = await client.query(`
          SELECT wip_limit,
                 (SELECT COUNT(*) FROM cards WHERE column_id = $1) as card_count
          FROM columns
          WHERE id = $2
        `, [destColumnId, destColumnId]);

        const wipCheck = wipResult.rows[0];

        if (wipCheck.wip_limit > 0 && parseInt(wipCheck.card_count) >= wipCheck.wip_limit) {
          throw new Error(`WIP limit (${wipCheck.wip_limit}) reached for this column`);
        }

        // Move card to new column
        await client.query(`
          UPDATE cards SET column_id = $1, position = $2 WHERE id = $3
        `, [destColumnId, destPosition, cardId]);

        // Reorder source column
        await this.reorderColumn(client, sourceColumnId);

        // Reorder destination column
        await this.reorderColumn(client, destColumnId);
      }
      return true;
    });
  }

  /**
   * Reorder cards within the same column
   */
  private async reorderWithinColumn(client: any, columnId: string, cardId: string, newPosition: number): Promise<void> {
    // Get all cards in column
    const result = await client.query(`
      SELECT id, position FROM cards
      WHERE column_id = $1
      ORDER BY position ASC
    `, [columnId]);

    const cards = result.rows;
    const currentIndex = cards.findIndex((c: any) => c.id === cardId);

    if (currentIndex === -1) return;

    // Remove card from its current position
    const [movedCard] = cards.splice(currentIndex, 1);

    // Insert at new position
    cards.splice(newPosition, 0, movedCard);

    // Update all positions
    for (let i = 0; i < cards.length; i++) {
      await client.query('UPDATE cards SET position = $1 WHERE id = $2', [i, cards[i].id]);
    }
  }

  /**
   * Reorder all cards in a column sequentially
   */
  private async reorderColumn(client: any, columnId: string): Promise<void> {
    const result = await client.query(`
      SELECT id FROM cards
      WHERE column_id = $1
      ORDER BY position ASC
    `, [columnId]);

    const cards = result.rows;

    for (let i = 0; i < cards.length; i++) {
      await client.query('UPDATE cards SET position = $1 WHERE id = $2', [i, cards[i].id]);
    }
  }

  /**
   * Add assignee to card
   */
  async addAssignee(cardId: string, userId: string): Promise<boolean> {
    try {
      await query(`
        INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2)
      `, [cardId, userId]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove assignee from card
   */
  async removeAssignee(cardId: string, userId: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM card_assignees WHERE card_id = $1 AND user_id = $2
    `, [cardId, userId]);
    return (result as any).rowCount > 0;
  }

  /**
   * Add label to card
   */
  async addLabel(cardId: string, labelId: string): Promise<boolean> {
    try {
      await query(`
        INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)
      `, [cardId, labelId]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove label from card
   */
  async removeLabel(cardId: string, labelId: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2
    `, [cardId, labelId]);
    return (result as any).rowCount > 0;
  }

  private async updateAssignees(cardId: string, userIds: string[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM card_assignees WHERE card_id = $1', [cardId]);
      for (const userId of userIds) {
        await client.query(
          'INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2)',
          [cardId, userId]
        );
      }
    });
  }

  private async updateLabels(cardId: string, labelIds: string[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('DELETE FROM card_labels WHERE card_id = $1', [cardId]);
      for (const labelId of labelIds) {
        await client.query(
          'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)',
          [cardId, labelId]
        );
      }
    });
  }

  private async mapToCard(row: any): Promise<Card> {
    // Fetch related data
    const assignees = await queryAll('SELECT user_id FROM card_assignees WHERE card_id = $1', [row.id]);
    const labels = await queryAll(`
      SELECT l.* FROM labels l
      JOIN card_labels cl ON l.id = cl.label_id
      WHERE cl.card_id = $1
    `, [row.id]);

    let milestone = undefined;
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
}
