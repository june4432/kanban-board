/**
 * Database Migration Runner
 *
 * Runs all SQL migration files in lib/migrations/ in sequential order
 */

import { getDatabase } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    const db = getDatabase();
    const migrationsDir = path.join(process.cwd(), 'lib', 'migrations');

    // Get all .sql files in migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order (001_, 002_, etc.)

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    // Create migrations tracking table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Check which migrations have been applied
    const appliedMigrations = db.prepare('SELECT filename FROM migrations').all() as Array<{ filename: string }>;
    const appliedSet = new Set(appliedMigrations.map(m => m.filename));

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`📝 Applying ${file}...`);

      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Execute migration in a transaction
      const transaction = db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file);
      });

      transaction();

      console.log(`✅ Applied ${file}`);
      appliedCount++;
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`📊 Migration Summary:`);
    console.log(`   Total migrations: ${files.length}`);
    console.log(`   Applied: ${appliedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('─'.repeat(50));

    console.log('\n✨ Database migrations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };
