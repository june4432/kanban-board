import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Get or create database connection (Singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'kanban.db');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    console.log(`Database connected: ${dbPath}`);
  }

  return db;
}

/**
 * Initialize database schema
 */
export function initDatabase(): void {
  const db = getDatabase();
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized');
  } else {
    console.warn('schema.sql not found, skipping initialization');
  }
}

/**
 * Execute a function within a transaction
 */
export function withTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getDatabase();

  try {
    db.exec('BEGIN TRANSACTION');
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}
