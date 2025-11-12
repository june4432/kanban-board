/**
 * Migration Script: Add Organizations
 *
 * This script:
 * 1. Runs the SQL migration
 * 2. Creates a default organization for each existing user
 * 3. Assigns all existing projects to their owner's organization
 * 4. Makes each user an owner of their organization
 */

import { getDatabase } from '../lib/database';
import fs from 'fs';
import path from 'path';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function migrate() {
  const db = getDatabase();

  console.log('🚀 Starting Organizations migration...\n');

  try {
    // Step 1: Check if migration already completed
    console.log('🔍 Step 1: Checking migration status...');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'").get();

    if (tables) {
      console.log('⚠️  Organizations table already exists. Checking if migration completed...\n');
    } else {
      // Run SQL migration
      console.log('📝 Running SQL migration...');
      const sqlPath = path.join(__dirname, '../lib/migrations/001_add_organizations.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      db.exec(sql);
      console.log('✅ SQL migration completed\n');
    }

    // Step 2: Get all users
    console.log('👥 Step 2: Getting all users...');
    const users = db.prepare('SELECT id, name, email FROM users').all() as Array<{
      id: string;
      name: string;
      email: string;
    }>;
    console.log(`Found ${users.length} users\n`);

    // Step 3: Create organization for each user
    console.log('🏢 Step 3: Creating organizations for users...');
    const createOrgStmt = db.prepare(`
      INSERT INTO organizations (id, name, slug, description, plan)
      VALUES (?, ?, ?, ?, ?)
    `);

    const addMemberStmt = db.prepare(`
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (?, ?, 'owner')
    `);

    const userOrgMap = new Map<string, string>();

    for (const user of users) {
      const orgId = `org-${user.id}`;
      const orgName = `${user.name}'s Organization`;
      const slug = generateSlug(user.email.split('@')[0] || user.name);

      try {
        createOrgStmt.run(
          orgId,
          orgName,
          slug,
          `Default organization for ${user.name}`,
          'free'
        );

        addMemberStmt.run(orgId, user.id);
        userOrgMap.set(user.id, orgId);

        console.log(`  ✓ Created organization "${orgName}" (${slug}) for ${user.email}`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`  ⚠ Organization already exists for ${user.email}, skipping...`);
          // Try to find existing org
          const existingOrg = db
            .prepare('SELECT id FROM organizations WHERE slug = ?')
            .get(slug) as { id: string } | undefined;
          if (existingOrg) {
            userOrgMap.set(user.id, existingOrg.id);
          }
        } else {
          throw error;
        }
      }
    }
    console.log(`\n✅ Created ${userOrgMap.size} organizations\n`);

    // Step 4: Assign projects to organizations
    console.log('📦 Step 4: Assigning projects to organizations...');
    const projects = db.prepare('SELECT project_id, owner_id FROM projects').all() as Array<{
      project_id: string;
      owner_id: string;
    }>;

    const updateProjectStmt = db.prepare(`
      UPDATE projects SET organization_id = ? WHERE project_id = ?
    `);

    let assignedCount = 0;
    for (const project of projects) {
      const orgId = userOrgMap.get(project.owner_id);
      if (orgId) {
        updateProjectStmt.run(orgId, project.project_id);
        assignedCount++;
      } else {
        console.log(`  ⚠ No organization found for project ${project.project_id} (owner: ${project.owner_id})`);
      }
    }

    console.log(`✅ Assigned ${assignedCount}/${projects.length} projects to organizations\n`);

    // Step 5: Summary
    console.log('📊 Migration Summary:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Organizations created: ${userOrgMap.size}`);
    console.log(`  - Projects migrated: ${assignedCount}/${projects.length}`);
    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrate };
