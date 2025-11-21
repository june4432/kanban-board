/**
 * Data Migration Script: JSON → SQLite
 *
 * Migrates existing JSON data files to SQLite database
 */

import fs from 'fs';
import path from 'path';
import { initDatabase } from '../lib/database';
import { getRepositories } from '../lib/repositories';

interface JSONUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string;
  role?: 'admin' | 'user';
  createdAt?: string | Date;
}

interface JSONProject {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  members: any[];
  createdAt: string | Date;
  updatedAt: string | Date;
  color?: string;
  isPublic: boolean;
  pendingRequests: any[];
}

interface JSONBoard {
  boardId: string;
  projectId: string;
  columns: any[];
  labels: any[];
  milestones: any[];
}

async function migrateUsers() {
  const usersPath = path.join(process.cwd(), 'data', 'users.json');

  if (!fs.existsSync(usersPath)) {
    console.log('⚠️  users.json not found, skipping user migration');
    return;
  }

  const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const users: JSONUser[] = data.users || [];

  console.log(`📥 Migrating ${users.length} users...`);

  const { users: userRepo } = getRepositories();

  for (const user of users) {
    try {
      // Check if user already exists
      const existing = await userRepo.findByEmail(user.email);
      if (existing) {
        console.log(`   ⏭️  User ${user.email} already exists, skipping`);
        continue;
      }

      // Note: Passwords in JSON are plain text, will be hashed by repository
      await userRepo.create({
        id: user.id,  // Preserve original ID
        name: user.name,
        email: user.email,
        password: user.password || 'defaultpassword123', // fallback password
        role: user.role || 'user',
      });

      console.log(`   ✅ Migrated user: ${user.email}`);
    } catch (error: any) {
      console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
    }
  }

  console.log('✅ Users migration completed\n');
}

async function migrateProjects() {
  const projectsPath = path.join(process.cwd(), 'data', 'projects.json');

  if (!fs.existsSync(projectsPath)) {
    console.log('⚠️  projects.json not found, skipping project migration');
    return;
  }

  const data = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
  const projects: JSONProject[] = data.projects || [];

  console.log(`📥 Migrating ${projects.length} projects...`);

  const { projects: projectRepo } = getRepositories();

  for (const project of projects) {
    try {
      // Check if project already exists
      const existing = await projectRepo.findById(project.projectId);
      if (existing) {
        console.log(`   ⏭️  Project ${project.projectId} already exists, skipping`);
        continue;
      }

      // Create project
      await projectRepo.create({
        id: project.projectId,  // Preserve original ID
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        color: project.color,
        isPublic: project.isPublic,
      });

      console.log(`   ✅ Migrated project: ${project.name}`);

      // Migrate members (if any beyond owner)
      if (project.members && Array.isArray(project.members)) {
        for (const member of project.members) {
          const userId = typeof member === 'string' ? member : member.userId || member.id;

          if (userId && userId !== project.ownerId) {
            await projectRepo.addMember(project.projectId, userId, 'member');
            console.log(`      👥 Added member: ${userId}`);
          }
        }
      }

      // Skip join requests migration - API now uses email-based invitations
      // if (project.pendingRequests && Array.isArray(project.pendingRequests)) {
      //   console.log('      ⚠️ Skipping pending requests migration (new API uses email)');
      // }
    } catch (error: any) {
      console.error(`   ❌ Error migrating project ${project.name}:`, error.message);
    }
  }

  console.log('✅ Projects migration completed\n');
}

async function migrateBoards() {
  const boardsPath = path.join(process.cwd(), 'data', 'kanban-boards.json');

  if (!fs.existsSync(boardsPath)) {
    console.log('⚠️  kanban-boards.json not found, skipping boards migration');
    return;
  }

  const data = JSON.parse(fs.readFileSync(boardsPath, 'utf-8'));
  const boards: JSONBoard[] = data.boards || [];

  console.log(`📥 Migrating ${boards.length} boards...`);

  const { boards: boardRepo, cards: cardRepo } = getRepositories();

  for (const board of boards) {
    try {
      console.log(`   📋 Migrating board for project: ${board.projectId}`);

      // Board is already created by ProjectRepository, so we just need to verify
      const existingBoard = await boardRepo.findByProjectId(board.projectId);
      if (!existingBoard) {
        console.log(`   ⚠️  Board for project ${board.projectId} not found, skipping`);
        continue;
      }

      // Migrate labels
      for (const label of board.labels || []) {
        try {
          await boardRepo.createLabel(board.boardId, {
            name: label.name,
            color: label.color,
          });
          console.log(`      🏷️  Added label: ${label.name}`);
        } catch (error) {
          // Label might already exist, ignore
        }
      }

      // Migrate milestones
      for (const milestone of board.milestones || []) {
        try {
          await boardRepo.createMilestone(board.boardId, {
            name: milestone.name,
            dueDate: new Date(milestone.dueDate),
            description: milestone.description,
          });
          console.log(`      🎯 Added milestone: ${milestone.name}`);
        } catch (error) {
          // Milestone might already exist, ignore
        }
      }

      // Migrate columns and cards
      for (const column of board.columns || []) {
        console.log(`      📂 Processing column: ${column.title}`);

        // Update column if needed (title, wipLimit)
        try {
          await boardRepo.updateColumn(column.id, {
            title: column.title,
            wipLimit: column.wipLimit || 0,
          });
        } catch (error) {
          // Column might not exist if it's a new project
        }

        // Migrate cards
        for (const card of column.cards || []) {
          try {
            await cardRepo.create({
              columnId: column.id,
              title: card.title,
              description: card.description,
              priority: card.priority || 'medium',
              assignees: card.assignees || [],
              labels: (card.labels || []).map((l: any) => l.id),
              milestoneId: card.milestone?.id,
              dueDate: card.dueDate ? new Date(card.dueDate) : undefined,
            });

            console.log(`         🃏 Added card: ${card.title}`);
          } catch (error: any) {
            console.error(`         ❌ Error migrating card ${card.title}:`, error.message);
          }
        }
      }

      console.log(`   ✅ Migrated board: ${board.boardId}`);
    } catch (error: any) {
      console.error(`   ❌ Error migrating board ${board.boardId}:`, error.message);
    }
  }

  console.log('✅ Boards migration completed\n');
}

async function main() {
  console.log('🚀 Starting data migration: JSON → SQLite\n');
  console.log('================================================\n');

  try {
    // Initialize database
    console.log('🔧 Initializing database...');
    initDatabase();
    console.log('✅ Database initialized\n');

    // Backup JSON files
    console.log('💾 Creating backup of JSON files...');
    const backupDir = path.join(process.cwd(), 'data', '.backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = ['users.json', 'projects.json', 'kanban-boards.json'];
    for (const file of files) {
      const src = path.join(process.cwd(), 'data', file);
      const dest = path.join(backupDir, `${file}.${Date.now()}.bak`);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`   ✅ Backed up: ${file}`);
      }
    }
    console.log('✅ Backup completed\n');

    // Run migrations in order (due to foreign key dependencies)
    await migrateUsers();
    migrateProjects();
    migrateBoards();

    console.log('\n================================================');
    console.log('🎉 Migration completed successfully!');
    console.log('================================================\n');
    console.log('Next steps:');
    console.log('1. Test the application with SQLite');
    console.log('2. Verify all data is correct');
    console.log('3. If everything works, you can archive the JSON files\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nYou can restore from backups in data/.backup/\n');
    process.exit(1);
  }
}

// Run migration
main();
