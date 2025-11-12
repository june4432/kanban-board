/**
 * SQLite Database Adapter
 * Wraps better-sqlite3 to implement DatabaseAdapter interface
 */

import Database from 'better-sqlite3';
import { DatabaseAdapter, QueryResult } from '../database-adapter';
import { getDatabase } from '../database';

export class SqliteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(sql);
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all();

    return {
      rows: rows as any[],
      rowCount: (rows as any[]).length,
    };
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const stmt = this.db.prepare(sql);
    const row = params.length > 0 ? stmt.get(...params) : stmt.get();

    return row || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; changes?: number }> {
    const stmt = this.db.prepare(sql);
    const result = params.length > 0 ? stmt.run(...params) : stmt.run();

    return {
      lastInsertId: result.lastInsertRowid,
      changes: result.changes,
    };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction((callback: any) => callback());
    return transaction(fn);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /**
   * Get the raw SQLite database instance for legacy code
   * @deprecated Use adapter methods instead
   */
  getRawDatabase(): Database.Database {
    return this.db;
  }
}
