
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/postgres';
import { CardRepository } from '@/lib/repositories/card.repository';

async function verifySearch() {
    console.log('Starting Advanced Search Verification...');

    const repo = new CardRepository();
    const orgId = uuidv4();
    const userId = uuidv4();
    const projectId = uuidv4();
    const boardId = uuidv4();
    const columnId1 = uuidv4();
    const columnId2 = uuidv4();

    try {
        // 1. Setup Test Data in Postgres
        console.log('Setting up test data in PostgreSQL...');

        // Create Organization
        await query('INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)', [orgId, 'Test Org', `test-org-${uuidv4()}`]);

        // Create User
        await query('INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)', [userId, 'Test User', `test-${uuidv4()}@example.com`, 'hashedpassword', 'admin']);

        // Create Project
        await query('INSERT INTO projects (project_id, organization_id, name, owner_id) VALUES ($1, $2, $3, $4)', [projectId, orgId, 'Search Project', userId]);

        // Create Board
        await query('INSERT INTO boards (board_id, project_id) VALUES ($1, $2)', [boardId, projectId]);

        // Create Columns
        await query('INSERT INTO columns (id, board_id, title, position) VALUES ($1, $2, $3, $4)', [columnId1, boardId, 'To Do', 0]);
        await query('INSERT INTO columns (id, board_id, title, position) VALUES ($1, $2, $3, $4)', [columnId2, boardId, 'Done', 1]);

        // Create Cards
        const card1Id = uuidv4();
        const card2Id = uuidv4();
        const card3Id = uuidv4();

        await query(`
      INSERT INTO cards (id, column_id, title, description, priority, position, search_vector)
      VALUES ($1, $2, $3, $4, $5, $6, 
        setweight(to_tsvector('english', $7), 'A') || setweight(to_tsvector('english', $8), 'B')
      )
    `, [card1Id, columnId1, 'Fix critical bug in login', 'Users cannot log in when using Firefox', 'high', 0, 'Fix critical bug in login', 'Users cannot log in when using Firefox']);

        await query(`
      INSERT INTO cards (id, column_id, title, description, priority, position, search_vector)
      VALUES ($1, $2, $3, $4, $5, $6,
        setweight(to_tsvector('english', $7), 'A') || setweight(to_tsvector('english', $8), 'B')
      )
    `, [card2Id, columnId1, 'Update documentation', 'Add section about advanced search features', 'low', 1, 'Update documentation', 'Add section about advanced search features']);

        await query(`
      INSERT INTO cards (id, column_id, title, description, priority, position, search_vector)
      VALUES ($1, $2, $3, $4, $5, $6,
        setweight(to_tsvector('english', $7), 'A') || setweight(to_tsvector('english', $8), 'B')
      )
    `, [card3Id, columnId2, 'Refactor database schema', 'Migrate from SQLite to PostgreSQL', 'medium', 0, 'Refactor database schema', 'Migrate from SQLite to PostgreSQL']);

        console.log('Test data created.');

        // 2. Verify Search
        console.log('\n--- Test 1: Search for "bug" ---');
        const result1 = await repo.findAll({
            projectId,
            filters: { search: 'bug' },
            sort: [],
            pagination: { page: 1, pageSize: 10 }
        });
        console.log(`Found ${result1.total} cards.`);
        if (result1.total === 1 && result1.cards[0]?.title.includes('bug')) {
            console.log('✅ Success');
        } else {
            console.error('❌ Failed', result1.cards);
        }

        console.log('\n--- Test 2: Search for "search" (in description) ---');
        const result2 = await repo.findAll({
            projectId,
            filters: { search: 'search' },
            sort: [],
            pagination: { page: 1, pageSize: 10 }
        });
        console.log(`Found ${result2.total} cards.`);
        if (result2.total === 1 && result2.cards[0]?.title.includes('documentation')) {
            console.log('✅ Success');
        } else {
            console.error('❌ Failed', result2.cards);
        }

        console.log('\n--- Test 3: Filter by Priority "high" ---');
        const result3 = await repo.findAll({
            projectId,
            filters: { priority: ['high'] },
            sort: [],
            pagination: { page: 1, pageSize: 10 }
        });
        console.log(`Found ${result3.total} cards.`);
        if (result3.total === 1 && result3.cards[0]?.priority === 'high') {
            console.log('✅ Success');
        } else {
            console.error('❌ Failed', result3.cards);
        }

        console.log('\n--- Test 4: Combined Search "database" AND Priority "medium" ---');
        const result4 = await repo.findAll({
            projectId,
            filters: { search: 'database', priority: ['medium'] },
            sort: [],
            pagination: { page: 1, pageSize: 10 }
        });
        console.log(`Found ${result4.total} cards.`);
        if (result4.total === 1 && result4.cards[0]?.title.includes('Refactor')) {
            console.log('✅ Success');
        } else {
            console.error('❌ Failed', result4.cards);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        await query('DELETE FROM projects WHERE project_id = $1', [projectId]);
        await query('DELETE FROM users WHERE id = $1', [userId]);
        await query('DELETE FROM organizations WHERE id = $1', [orgId]);
        process.exit(0);
    }
}

verifySearch();
