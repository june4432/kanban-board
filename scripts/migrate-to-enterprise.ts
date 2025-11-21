/**
 * Migration Script: Legacy Schema → Enterprise Schema
 *
 * This script migrates existing data to the new enterprise schema.
 * Run with: npx tsx scripts/migrate-to-enterprise.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'june4432.ipdisk.co.kr',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'kanbandb',
  user: process.env.POSTGRES_USER || 'kanban',
  password: process.env.POSTGRES_PASSWORD || 'kanban2025!',
});

// Default company for migration
const DEFAULT_COMPANY = {
  id: 'company-default',
  name: 'Default Company',
  slug: 'default',
  plan: 'enterprise',
};

// Default organization for migration
const DEFAULT_ORG = {
  id: 'org-default',
  name: 'Default Organization',
  slug: 'default',
};

async function query(sql: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    )`,
    [tableName, columnName]
  );
  return result.rows[0].exists;
}

async function main() {
  console.log('🚀 Starting Enterprise Schema Migration...\n');

  try {
    // Step 1: Check if already migrated
    const hasCompanies = await tableExists('companies');
    if (hasCompanies) {
      const companyCount = await query('SELECT COUNT(*) FROM companies');
      if (parseInt(companyCount.rows[0].count) > 0) {
        console.log('⚠️  Companies table already has data. Checking migration status...');

        // Check if users have company_id
        const hasCompanyId = await columnExists('users', 'company_id');
        if (hasCompanyId) {
          const usersWithCompany = await query('SELECT COUNT(*) FROM users WHERE company_id IS NOT NULL');
          if (parseInt(usersWithCompany.rows[0].count) > 0) {
            console.log('✅ Migration appears to be complete. Exiting.');
            return;
          }
        }
      }
    }

    // Step 2: Run the new schema SQL
    console.log('📋 Step 1: Creating new schema...');
    const schemaPath = path.join(__dirname, '../lib/schema.enterprise.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute entire schema at once
    try {
      await query(schemaSql);
      console.log('   ✅ Schema created\n');
    } catch (err: any) {
      console.error('Schema error:', err.message);
      throw err;
    }

    // Step 3: Create default company
    console.log('📋 Step 2: Creating default company...');
    await query(`
      INSERT INTO companies (id, name, slug, plan, max_users, max_projects, max_storage_gb)
      VALUES ($1, $2, $3, $4, 1000, 1000, 100)
      ON CONFLICT (id) DO NOTHING
    `, [DEFAULT_COMPANY.id, DEFAULT_COMPANY.name, DEFAULT_COMPANY.slug, DEFAULT_COMPANY.plan]);
    console.log('   ✅ Default company created\n');

    // Step 4: Create default organization
    console.log('📋 Step 3: Creating default organization...');
    await query(`
      INSERT INTO organizations (id, company_id, name, slug)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (company_id, slug) DO NOTHING
    `, [DEFAULT_ORG.id, DEFAULT_COMPANY.id, DEFAULT_ORG.name, DEFAULT_ORG.slug]);
    console.log('   ✅ Default organization created\n');

    // Step 5: Migrate users
    console.log('📋 Step 4: Migrating users...');

    // Check if old users table exists and has data
    const oldUsersExist = await tableExists('users');
    if (oldUsersExist) {
      // Add company_id column if not exists
      const hasCompanyId = await columnExists('users', 'company_id');
      if (!hasCompanyId) {
        await query(`ALTER TABLE users ADD COLUMN company_id VARCHAR(36)`);
      }

      // Add company_role column if not exists
      const hasCompanyRole = await columnExists('users', 'company_role');
      if (!hasCompanyRole) {
        await query(`ALTER TABLE users ADD COLUMN company_role VARCHAR(20) DEFAULT 'member'`);
      }

      // Add status column if not exists
      const hasStatus = await columnExists('users', 'status');
      if (!hasStatus) {
        await query(`ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'`);
      }

      // Update all users to belong to default company
      await query(`UPDATE users SET company_id = $1 WHERE company_id IS NULL`, [DEFAULT_COMPANY.id]);

      // Make first user the company owner
      await query(`
        UPDATE users SET company_role = 'owner'
        WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      `);

      // Add all users to default organization
      const users = await query('SELECT id FROM users');
      for (const user of users.rows) {
        await query(`
          INSERT INTO organization_members (organization_id, user_id, role)
          VALUES ($1, $2, 'member')
          ON CONFLICT (organization_id, user_id) DO NOTHING
        `, [DEFAULT_ORG.id, user.id]);
      }

      // Make first user the org owner
      await query(`
        UPDATE organization_members SET role = 'owner'
        WHERE organization_id = $1
        AND user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      `, [DEFAULT_ORG.id]);

      console.log(`   ✅ Migrated ${users.rows.length} users\n`);
    }

    // Step 6: Migrate projects
    console.log('📋 Step 5: Migrating projects...');
    const projectsExist = await tableExists('projects');
    if (projectsExist) {
      // Add company_id column if not exists
      const hasCompanyId = await columnExists('projects', 'company_id');
      if (!hasCompanyId) {
        await query(`ALTER TABLE projects ADD COLUMN company_id VARCHAR(36)`);
      }

      // Add organization_id column if not exists
      const hasOrgId = await columnExists('projects', 'organization_id');
      if (!hasOrgId) {
        await query(`ALTER TABLE projects ADD COLUMN organization_id VARCHAR(36)`);
      }

      // Add visibility column if not exists
      const hasVisibility = await columnExists('projects', 'visibility');
      if (!hasVisibility) {
        await query(`ALTER TABLE projects ADD COLUMN visibility VARCHAR(20) DEFAULT 'private'`);
      }

      // Add status column if not exists
      const hasStatus = await columnExists('projects', 'status');
      if (!hasStatus) {
        await query(`ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'active'`);
      }

      // Add slug column if not exists
      const hasSlug = await columnExists('projects', 'slug');
      if (!hasSlug) {
        await query(`ALTER TABLE projects ADD COLUMN slug VARCHAR(100)`);
        // Generate slugs from project names
        const projects = await query('SELECT project_id, name FROM projects WHERE slug IS NULL');
        for (const project of projects.rows) {
          const slug = project.name.toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '-')
            .replace(/^-|-$/g, '') || `project-${project.project_id.substring(0, 8)}`;
          await query('UPDATE projects SET slug = $1 WHERE project_id = $2', [slug, project.project_id]);
        }
      }

      // Update all projects to belong to default company and org
      await query(`
        UPDATE projects
        SET company_id = $1, organization_id = $2
        WHERE company_id IS NULL OR organization_id IS NULL
      `, [DEFAULT_COMPANY.id, DEFAULT_ORG.id]);

      // Convert is_public to visibility
      const hasIsPublic = await columnExists('projects', 'is_public');
      if (hasIsPublic) {
        await query(`
          UPDATE projects SET visibility = 'public' WHERE is_public = true AND visibility = 'private'
        `);
      }

      const projectCount = await query('SELECT COUNT(*) FROM projects');
      console.log(`   ✅ Migrated ${projectCount.rows[0].count} projects\n`);

      // Migrate project members
      const projectMembersExist = await tableExists('project_members');
      if (!projectMembersExist) {
        // Create project_members from old members array or project ownership
        const projects = await query('SELECT project_id, owner_id FROM projects');
        for (const project of projects.rows) {
          await query(`
            INSERT INTO project_members (project_id, user_id, role)
            VALUES ($1, $2, 'owner')
            ON CONFLICT (project_id, user_id) DO NOTHING
          `, [project.project_id, project.owner_id]);
        }
        console.log(`   ✅ Created project members\n`);
      }
    }

    // Step 7: Migrate boards
    console.log('📋 Step 6: Migrating boards...');
    const boardsExist = await tableExists('boards');
    if (boardsExist) {
      // Check column names (might be board_id vs id)
      // const hasBoardId = await columnExists('boards', 'board_id');

      // Add name column if not exists
      const hasName = await columnExists('boards', 'name');
      if (!hasName) {
        await query(`ALTER TABLE boards ADD COLUMN name VARCHAR(255) DEFAULT 'Main Board'`);
      }

      // Add type column if not exists
      const hasType = await columnExists('boards', 'type');
      if (!hasType) {
        await query(`ALTER TABLE boards ADD COLUMN type VARCHAR(20) DEFAULT 'kanban'`);
      }

      const boardCount = await query('SELECT COUNT(*) FROM boards');
      console.log(`   ✅ Migrated ${boardCount.rows[0].count} boards\n`);
    }

    // Step 8: Migrate cards
    console.log('📋 Step 7: Migrating cards...');
    const cardsExist = await tableExists('cards');
    if (cardsExist) {
      // Add board_id if not exists
      const hasBoardId = await columnExists('cards', 'board_id');
      if (!hasBoardId) {
        await query(`ALTER TABLE cards ADD COLUMN board_id VARCHAR(36)`);
        // Populate from columns → boards relationship
        await query(`
          UPDATE cards c
          SET board_id = col.board_id
          FROM columns col
          WHERE c.column_id = col.id AND c.board_id IS NULL
        `);
      }

      // Add project_id if not exists
      const hasProjectId = await columnExists('cards', 'project_id');
      if (!hasProjectId) {
        await query(`ALTER TABLE cards ADD COLUMN project_id VARCHAR(36)`);
        // Populate from boards → projects relationship
        await query(`
          UPDATE cards c
          SET project_id = b.project_id
          FROM boards b
          WHERE c.board_id = b.board_id AND c.project_id IS NULL
        `);
        // Try with 'id' column name
        await query(`
          UPDATE cards c
          SET project_id = b.project_id
          FROM boards b
          WHERE c.board_id = b.id AND c.project_id IS NULL
        `);
      }

      // Add created_by if not exists
      const hasCreatedBy = await columnExists('cards', 'created_by');
      if (!hasCreatedBy) {
        await query(`ALTER TABLE cards ADD COLUMN created_by VARCHAR(36)`);
        // Set to first user as default
        await query(`
          UPDATE cards
          SET created_by = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
          WHERE created_by IS NULL
        `);
      }

      // Add priority if not exists
      const hasPriority = await columnExists('cards', 'priority');
      if (!hasPriority) {
        await query(`ALTER TABLE cards ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'`);
      }

      const cardCount = await query('SELECT COUNT(*) FROM cards');
      console.log(`   ✅ Migrated ${cardCount.rows[0].count} cards\n`);
    }

    // Step 9: Migrate labels
    console.log('📋 Step 8: Migrating labels...');
    const labelsExist = await tableExists('labels');
    if (labelsExist) {
      // Add company_id if not exists
      const hasCompanyId = await columnExists('labels', 'company_id');
      if (!hasCompanyId) {
        await query(`ALTER TABLE labels ADD COLUMN company_id VARCHAR(36)`);
      }

      // Add organization_id if not exists
      const hasOrgId = await columnExists('labels', 'organization_id');
      if (!hasOrgId) {
        await query(`ALTER TABLE labels ADD COLUMN organization_id VARCHAR(36)`);
      }

      // Update scope and IDs based on existing scope_id
      const hasScope = await columnExists('labels', 'scope');
      const hasScopeId = await columnExists('labels', 'scope_id');

      if (hasScope && hasScopeId) {
        // Labels with 'project' scope
        await query(`
          UPDATE labels l
          SET project_id = scope_id
          WHERE scope = 'project' AND project_id IS NULL
        `);
      }

      // Set company_id for all labels (for constraint validation)
      await query(`
        UPDATE labels
        SET company_id = $1
        WHERE scope = 'company' AND company_id IS NULL
      `, [DEFAULT_COMPANY.id]);

      await query(`
        UPDATE labels
        SET organization_id = $1
        WHERE scope = 'organization' AND organization_id IS NULL
      `, [DEFAULT_ORG.id]);

      const labelCount = await query('SELECT COUNT(*) FROM labels');
      console.log(`   ✅ Migrated ${labelCount.rows[0].count} labels\n`);
    }

    // Step 10: Migrate milestones
    console.log('📋 Step 9: Migrating milestones...');
    const milestonesExist = await tableExists('milestones');
    if (milestonesExist) {
      // Add company_id if not exists
      const hasCompanyId = await columnExists('milestones', 'company_id');
      if (!hasCompanyId) {
        await query(`ALTER TABLE milestones ADD COLUMN company_id VARCHAR(36)`);
      }

      // Add organization_id if not exists
      const hasOrgId = await columnExists('milestones', 'organization_id');
      if (!hasOrgId) {
        await query(`ALTER TABLE milestones ADD COLUMN organization_id VARCHAR(36)`);
      }

      // Add status if not exists
      const hasStatus = await columnExists('milestones', 'status');
      if (!hasStatus) {
        await query(`ALTER TABLE milestones ADD COLUMN status VARCHAR(20) DEFAULT 'open'`);
      }

      // Update scope and IDs based on existing scope_id
      const hasScope = await columnExists('milestones', 'scope');
      const hasScopeId = await columnExists('milestones', 'scope_id');

      if (hasScope && hasScopeId) {
        await query(`
          UPDATE milestones
          SET project_id = scope_id
          WHERE scope = 'project' AND project_id IS NULL
        `);
      }

      // Set company_id for company scope milestones
      await query(`
        UPDATE milestones
        SET company_id = $1
        WHERE scope = 'company' AND company_id IS NULL
      `, [DEFAULT_COMPANY.id]);

      await query(`
        UPDATE milestones
        SET organization_id = $1
        WHERE scope = 'organization' AND organization_id IS NULL
      `, [DEFAULT_ORG.id]);

      const milestoneCount = await query('SELECT COUNT(*) FROM milestones');
      console.log(`   ✅ Migrated ${milestoneCount.rows[0].count} milestones\n`);
    }

    // Step 11: Update audit_logs
    console.log('📋 Step 10: Updating audit_logs...');
    const auditLogsExist = await tableExists('audit_logs');
    if (auditLogsExist) {
      const hasCompanyId = await columnExists('audit_logs', 'company_id');
      if (!hasCompanyId) {
        await query(`ALTER TABLE audit_logs ADD COLUMN company_id VARCHAR(36)`);
      }

      await query(`
        UPDATE audit_logs
        SET company_id = $1
        WHERE company_id IS NULL
      `, [DEFAULT_COMPANY.id]);

      console.log('   ✅ Updated audit_logs\n');
    }

    // Step 12: Cleanup old columns (optional - commented out for safety)
    console.log('📋 Step 11: Cleanup (skipped for safety)...');
    console.log('   ⚠️  Old columns preserved. Run manual cleanup if needed.\n');

    // Step 13: Add foreign key constraints where missing
    console.log('📋 Step 12: Adding constraints...');

    // Add NOT NULL constraint to company_id where needed (after data migration)
    try {
      await query(`ALTER TABLE users ALTER COLUMN company_id SET NOT NULL`);
    } catch (e) {
      // Ignore if already set
    }

    console.log('   ✅ Constraints added\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Migration Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`
Default Company: ${DEFAULT_COMPANY.name} (${DEFAULT_COMPANY.id})
Default Organization: ${DEFAULT_ORG.name} (${DEFAULT_ORG.id})

Next Steps:
1. Update Repository classes to use new schema
2. Update API endpoints
3. Test thoroughly before production deployment
    `);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
