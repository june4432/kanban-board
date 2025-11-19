import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Get or create database connection (Singleton pattern)
 */
export function getDatabase(): Database.Database {
  // Check if PostgreSQL is configured
  if (process.env.DATABASE_TYPE === 'postgres') {
    console.warn('⚠️  Warning: DATABASE_TYPE is set to "postgres" but repositories are using SQLite.');
    console.warn('⚠️  Temporarily using SQLite until PostgreSQL repositories are implemented.');
    console.warn('⚠️  To use PostgreSQL, update DATABASE_TYPE to "sqlite" or wait for repository migration.');
  }

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

  // Run base schema
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✓ Database schema initialized');
  } else {
    console.warn('schema.sql not found, skipping initialization');
  }

  // Run migrations in order
  const migrationsDir = path.join(process.cwd(), 'lib', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensures 001, 002, etc. run in order

    migrationFiles.forEach(file => {
      const migrationPath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf-8');
      try {
        db.exec(migration);
        console.log(`✓ Migration applied: ${file}`);
      } catch (error: any) {
        // Ignore errors for already applied migrations
        if (!error.message.includes('duplicate column name')) {
          console.warn(`⚠ Migration ${file}: ${error.message}`);
        }
      }
    });
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
