/**
 * Database Adapter Abstraction Layer
 * Provides a unified interface for SQLite and PostgreSQL
 */

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface DatabaseAdapter {
  /**
   * Execute a query and return all results
   */
  query(sql: string, params?: any[]): Promise<QueryResult>;

  /**
   * Execute a query and return a single result
   */
  queryOne(sql: string, params?: any[]): Promise<any | null>;

  /**
   * Execute a modification query (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: any[]): Promise<{ lastInsertId?: any; changes?: number }>;

  /**
   * Execute multiple queries in a transaction
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;
}

/**
 * Get the appropriate database adapter based on DATABASE_TYPE environment variable
 */
export async function getDatabaseAdapter(): Promise<DatabaseAdapter> {
  const databaseType = process.env.DATABASE_TYPE || 'sqlite';

  if (databaseType === 'postgres') {
    const { PostgresAdapter } = await import('./adapters/postgres.adapter');
    return new PostgresAdapter();
  } else {
    const { SqliteAdapter } = await import('./adapters/sqlite.adapter');
    return new SqliteAdapter();
  }
}
