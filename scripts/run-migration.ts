import { readFileSync } from 'fs';
import { Pool } from 'pg';
import * as path from 'path';
import { getPostgresConfig } from './_postgres-config';

async function runMigration() {
  const pool = new Pool(getPostgresConfig());

  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, 'migration-phase2-kanban-features.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
