/**
 * PostgreSQL Database Adapter
 * Uses pg library to implement DatabaseAdapter interface
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter, QueryResult } from '../database-adapter';
import { getPool } from '../postgres';

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool;
  private transactionClient: PoolClient | null = null;

  constructor() {
    this.pool = getPool();
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    const pgSql = this.convertPlaceholders(sql);
    const client = this.transactionClient || this.pool;
    const result = await client.query(pgSql, params);

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; changes?: number }> {
    const pgSql = this.convertPlaceholders(sql);

    // Try to extract RETURNING clause or add one for INSERT statements
    let modifiedSql = pgSql;
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      // Add RETURNING clause to get the inserted ID
      modifiedSql = `${pgSql} RETURNING *`;
    }

    const client = this.transactionClient || this.pool;
    const result = await client.query(modifiedSql, params);

    return {
      lastInsertId: result.rows[0]?.id,
      changes: result.rowCount || 0,
    };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    this.transactionClient = client;

    try {
      await client.query('BEGIN');
      const result = await fn();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      this.transactionClient = null;
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
   */
  private convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => {
      index++;
      return `$${index}`;
    });
  }

  /**
   * Get the raw PostgreSQL pool for advanced operations
   * @deprecated Use adapter methods instead
   */
  getRawPool(): Pool {
    return this.pool;
  }
}
