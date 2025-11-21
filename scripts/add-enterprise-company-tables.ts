/**
 * Migration: Add enterprise company tables and columns
 * Creates companies table and adds company_id/company_role to users
 */

import 'dotenv/config';
import { query } from '../lib/postgres';

async function migrate() {
  console.log('Starting enterprise company migration...');

  try {
    // 1. Create companies table if not exists
    console.log('1. Creating companies table...');
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        plan VARCHAR(50) NOT NULL DEFAULT 'free'
          CHECK (plan IN ('free', 'starter', 'business', 'enterprise')),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Companies table created/verified.');

    // 2. Add company_id column to users (nullable)
    console.log('2. Adding company_id to users table...');
    const companyIdCheck = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'company_id'
    `);

    if (companyIdCheck.rows.length === 0) {
      await query(`
        ALTER TABLE users
        ADD COLUMN company_id VARCHAR(36) REFERENCES companies(id) ON DELETE SET NULL
      `);
      console.log('   company_id column added.');
    } else {
      console.log('   company_id column already exists.');
    }

    // 3. Add company_role column to users
    console.log('3. Adding company_role to users table...');
    const companyRoleCheck = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'company_role'
    `);

    if (companyRoleCheck.rows.length === 0) {
      await query(`
        ALTER TABLE users
        ADD COLUMN company_role VARCHAR(20) DEFAULT 'member'
      `);
      console.log('   company_role column added.');
    } else {
      console.log('   company_role column already exists.');
    }

    // 4. Create indexes
    console.log('4. Creating indexes...');
    await query(`CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)`);
    console.log('   Indexes created.');

    console.log('\nMigration completed successfully!');
    console.log('You can now run the application and create companies.');

  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
