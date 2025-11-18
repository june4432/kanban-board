/**
 * Data Migration Script: SQLite → PostgreSQL
 *
 * This script:
 * 1. Connects to both SQLite and PostgreSQL
 * 2. Creates PostgreSQL schema
 * 3. Migrates all data from SQLite to PostgreSQL
 * 4. Validates data integrity
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../lib/database';
import { query, withTransaction } from '../lib/postgres';
import fs from 'fs';
import path from 'path';

interface MigrationStats {
  users: number;
  organizations: number;
  organizationMembers: number;
  projects: number;
  projectMembers: number;
  boards: number;
  columns: number;
  milestones: number;
  cards: number;
  labels: number;
  comments: number;
  attachments: number;
  auditLogs: number;
}

async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL migration...\n');

  const stats: MigrationStats = {
    users: 0,
    organizations: 0,
    organizationMembers: 0,
    projects: 0,
    projectMembers: 0,
    boards: 0,
    columns: 0,
    milestones: 0,
    cards: 0,
    labels: 0,
    comments: 0,
    attachments: 0,
    auditLogs: 0,
  };

  try {
    // Step 1: Initialize PostgreSQL schema
    console.log('📝 Step 1: Creating PostgreSQL schema...');
    const schemaPath = path.join(__dirname, '../lib/schema.postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await query(schema);
    console.log('✅ PostgreSQL schema created\n');

    // Step 2: Get SQLite connection
    console.log('📂 Step 2: Connecting to SQLite database...');
    const sqlite = getDatabase();
    console.log('✅ SQLite connected\n');

    // Step 3: Migrate data within a transaction
    console.log('🔄 Step 3: Migrating data...\n');

    await withTransaction(async (client) => {
      // 3.1: Users
      console.log('  👥 Migrating users...');
      const users = sqlite.prepare('SELECT * FROM users').all() as any[];
      for (const user of users) {
        await client.query(
          `INSERT INTO users (id, name, email, password, avatar, role, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.name, user.email, user.password, user.avatar, user.role, user.created_at]
        );
      }
      stats.users = users.length;
      console.log(`  ✓ Migrated ${users.length} users`);

      // 3.2: Organizations
      console.log('  🏢 Migrating organizations...');
      const orgs = sqlite.prepare('SELECT * FROM organizations').all() as any[];
      for (const org of orgs) {
        await client.query(
          `INSERT INTO organizations (id, name, slug, description, plan, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            org.id,
            org.name,
            org.slug,
            org.description,
            org.plan,
            org.settings || '{}',
            org.created_at,
            org.updated_at,
          ]
        );
      }
      stats.organizations = orgs.length;
      console.log(`  ✓ Migrated ${orgs.length} organizations`);

      // 3.3: Organization Members
      console.log('  👔 Migrating organization members...');
      const orgMembers = sqlite.prepare('SELECT * FROM organization_members').all() as any[];
      for (const member of orgMembers) {
        await client.query(
          `INSERT INTO organization_members (organization_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (organization_id, user_id) DO NOTHING`,
          [member.organization_id, member.user_id, member.role, member.joined_at]
        );
      }
      stats.organizationMembers = orgMembers.length;
      console.log(`  ✓ Migrated ${orgMembers.length} organization members`);

      // 3.4: Projects
      console.log('  📁 Migrating projects...');
      const projects = sqlite.prepare('SELECT * FROM projects').all() as any[];
      for (const project of projects) {
        await client.query(
          `INSERT INTO projects (project_id, name, description, owner_id, organization_id, color, is_public, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (project_id) DO NOTHING`,
          [
            project.project_id,
            project.name,
            project.description,
            project.owner_id,
            project.organization_id,
            project.color,
            project.is_public === 1,
            project.created_at,
            project.updated_at,
          ]
        );
      }
      stats.projects = projects.length;
      console.log(`  ✓ Migrated ${projects.length} projects`);

      // 3.5: Project Members
      console.log('  👥 Migrating project members...');
      const projectMembers = sqlite.prepare('SELECT * FROM project_members').all() as any[];
      for (const member of projectMembers) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4)`,
          [member.project_id, member.user_id, member.role, member.joined_at]
        );
      }
      stats.projectMembers = projectMembers.length;
      console.log(`  ✓ Migrated ${projectMembers.length} project members`);

      // 3.6: Boards
      console.log('  📋 Migrating boards...');
      const boards = sqlite.prepare('SELECT * FROM boards').all() as any[];
      for (const board of boards) {
        await client.query(
          `INSERT INTO boards (board_id, project_id)
           VALUES ($1, $2)
           ON CONFLICT (board_id) DO NOTHING`,
          [board.board_id, board.project_id]
        );
      }
      stats.boards = boards.length;
      console.log(`  ✓ Migrated ${boards.length} boards`);

      // 3.7: Columns
      console.log('  📊 Migrating columns...');
      const columns = sqlite.prepare('SELECT * FROM columns').all() as any[];
      for (const column of columns) {
        await client.query(
          `INSERT INTO columns (id, board_id, title, wip_limit, position)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [column.id, column.board_id, column.title, column.wip_limit, column.position]
        );
      }
      stats.columns = columns.length;
      console.log(`  ✓ Migrated ${columns.length} columns`);

      // 3.8: Milestones (before cards because cards reference milestones)
      console.log('  🎯 Migrating milestones...');
      const milestones = sqlite.prepare('SELECT * FROM milestones').all() as any[];
      for (const milestone of milestones) {
        await client.query(
          `INSERT INTO milestones (id, board_id, name, description, due_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [milestone.id, milestone.board_id, milestone.name, milestone.description, milestone.due_date]
        );
      }
      stats.milestones = milestones.length;
      console.log(`  ✓ Migrated ${milestones.length} milestones`);

      // 3.9: Cards
      console.log('  🎴 Migrating cards...');
      const cards = sqlite.prepare('SELECT * FROM cards').all() as any[];
      for (const card of cards) {
        await client.query(
          `INSERT INTO cards (id, column_id, title, description, priority, position, due_date, milestone_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            card.id,
            card.column_id,
            card.title,
            card.description,
            card.priority,
            card.position,
            card.due_date,
            card.milestone_id,
            card.created_at,
            card.updated_at,
          ]
        );
      }
      stats.cards = cards.length;
      console.log(`  ✓ Migrated ${cards.length} cards`);

      // 3.9: Card Assignees
      console.log('  👤 Migrating card assignees...');
      const assignees = sqlite.prepare('SELECT * FROM card_assignees').all() as any[];
      for (const assignee of assignees) {
        await client.query(
          `INSERT INTO card_assignees (card_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (card_id, user_id) DO NOTHING`,
          [assignee.card_id, assignee.user_id]
        );
      }
      console.log(`  ✓ Migrated ${assignees.length} card assignees`);

      // 3.10: Labels
      console.log('  🏷️  Migrating labels...');
      const labels = sqlite.prepare('SELECT * FROM labels').all() as any[];
      for (const label of labels) {
        await client.query(
          `INSERT INTO labels (id, board_id, name, color)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [label.id, label.board_id, label.name, label.color]
        );
      }
      stats.labels = labels.length;
      console.log(`  ✓ Migrated ${labels.length} labels`);

      // 3.11: Card Labels
      console.log('  🏷️  Migrating card labels...');
      const cardLabels = sqlite.prepare('SELECT * FROM card_labels').all() as any[];
      for (const cardLabel of cardLabels) {
        await client.query(
          `INSERT INTO card_labels (card_id, label_id)
           VALUES ($1, $2)
           ON CONFLICT (card_id, label_id) DO NOTHING`,
          [cardLabel.card_id, cardLabel.label_id]
        );
      }
      console.log(`  ✓ Migrated ${cardLabels.length} card labels`);

      // 3.12: Comments
      console.log('  💬 Migrating comments...');
      const comments = sqlite.prepare('SELECT * FROM comments').all() as any[];
      for (const comment of comments) {
        await client.query(
          `INSERT INTO comments (id, card_id, user_id, content, parent_id, created_at, updated_at, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            comment.id,
            comment.card_id,
            comment.user_id,
            comment.content,
            comment.parent_id,
            comment.created_at,
            comment.updated_at,
            comment.deleted_at,
          ]
        );
      }
      stats.comments = comments.length;
      console.log(`  ✓ Migrated ${comments.length} comments`);

      // 3.13: Attachments
      console.log('  📎 Migrating attachments...');
      const attachments = sqlite.prepare('SELECT * FROM attachments').all() as any[];
      for (const attachment of attachments) {
        await client.query(
          `INSERT INTO attachments (id, card_id, user_id, filename, original_name, mime_type, size, storage_path, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            attachment.id,
            attachment.card_id,
            attachment.user_id,
            attachment.filename,
            attachment.original_name,
            attachment.mime_type,
            attachment.size,
            attachment.storage_path,
            attachment.created_at,
          ]
        );
      }
      stats.attachments = attachments.length;
      console.log(`  ✓ Migrated ${attachments.length} attachments`);

      // 3.14: Audit Logs
      console.log('  📜 Migrating audit logs...');
      const auditLogs = sqlite.prepare('SELECT * FROM audit_logs').all() as any[];
      for (const log of auditLogs) {
        await client.query(
          `INSERT INTO audit_logs (id, user_id, user_name, action, resource_type, resource_id, project_id, changes, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            log.id,
            log.user_id,
            log.user_name,
            log.action,
            log.resource_type,
            log.resource_id,
            log.project_id,
            log.changes,
            log.ip_address,
            log.user_agent,
            log.created_at,
          ]
        );
      }
      stats.auditLogs = auditLogs.length;
      console.log(`  ✓ Migrated ${auditLogs.length} audit logs`);

      console.log('\n✅ All data migrated successfully!\n');
    });

    // Step 4: Validation
    console.log('🔍 Step 4: Validating migration...');
    const pgUserCount = await query('SELECT COUNT(*) FROM users');
    const pgProjectCount = await query('SELECT COUNT(*) FROM projects');
    const pgCardCount = await query('SELECT COUNT(*) FROM cards');

    console.log(`  Users: ${pgUserCount.rows[0].count} (SQLite: ${stats.users})`);
    console.log(`  Projects: ${pgProjectCount.rows[0].count} (SQLite: ${stats.projects})`);
    console.log(`  Cards: ${pgCardCount.rows[0].count} (SQLite: ${stats.cards})`);

    if (
      parseInt(pgUserCount.rows[0].count) === stats.users &&
      parseInt(pgProjectCount.rows[0].count) === stats.projects &&
      parseInt(pgCardCount.rows[0].count) === stats.cards
    ) {
      console.log('\n✅ Validation passed!\n');
    } else {
      console.warn('\n⚠️  Warning: Count mismatch detected!\n');
    }

    // Step 5: Summary
    console.log('📊 Migration Summary:');
    console.log('─'.repeat(50));
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(25)}: ${value.toString().padStart(10)}`);
    });
    console.log('─'.repeat(50));

    console.log('\n✨ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Update DATABASE_TYPE=postgres in .env');
    console.log('  2. Configure PostgreSQL connection settings');
    console.log('  3. Test application with PostgreSQL');
    console.log('  4. Backup SQLite database for rollback');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
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
