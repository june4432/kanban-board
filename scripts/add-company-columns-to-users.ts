/**
 * Migration: Add company_id and company_role columns to users table
 */

import 'dotenv/config';
import { query } from '../lib/postgres';

async function migrate() {
  console.log('Adding company columns to users table...');

  try {
    // Check if company_id column exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'company_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Columns already exist. Skipping.');
      process.exit(0);
      return;
    }

    // Add company_id column (nullable - users can exist without company initially)
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS company_id VARCHAR(36) REFERENCES companies(id) ON DELETE SET NULL
    `);
    console.log('Added company_id column.');

    // Add company_role column
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS company_role VARCHAR(20) DEFAULT 'member'
      CHECK (company_role IN ('owner', 'admin', 'member'))
    `);
    console.log('Added company_role column.');

    // Create index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)
    `);
    console.log('Index created.');

    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
