/**
 * Migration: Add plan column to organizations table
 */

import 'dotenv/config';
import { query } from '../lib/postgres';

async function migrate() {
  console.log('Adding plan column to organizations table...');

  try {
    // Check if column exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'plan'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Column "plan" already exists. Skipping.');
      return;
    }

    // Add the plan column
    await query(`
      ALTER TABLE organizations
      ADD COLUMN plan VARCHAR(50) NOT NULL DEFAULT 'free'
      CHECK(plan IN ('free', 'pro', 'enterprise'))
    `);

    console.log('Successfully added plan column to organizations table.');

    // Create index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan)
    `);

    console.log('Index created.');

  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
