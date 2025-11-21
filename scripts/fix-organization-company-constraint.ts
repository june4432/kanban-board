/**
 * Migration: Make company_id nullable in organizations table
 */

import 'dotenv/config';
import { query } from '../lib/postgres';

async function migrate() {
  console.log('Fixing company_id constraint in organizations table...');

  try {
    // Check if company_id column exists
    const checkResult = await query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'company_id'
    `);

    if (checkResult.rows.length === 0) {
      console.log('Column "company_id" does not exist. Nothing to fix.');
      process.exit(0);
      return;
    }

    console.log('Current company_id column:', checkResult.rows[0]);

    // Drop NOT NULL constraint by altering column
    await query(`
      ALTER TABLE organizations
      ALTER COLUMN company_id DROP NOT NULL
    `);

    console.log('Successfully made company_id nullable.');

    // Set default value to NULL for existing rows without company
    await query(`
      UPDATE organizations SET company_id = NULL WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)
    `);

    console.log('Updated existing rows.');

  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Column or constraint does not exist. Skipping.');
    } else {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

migrate();
