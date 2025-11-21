import 'dotenv/config';
import { getRepositories } from '@/lib/repositories';
import { query } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function verify() {
    console.log('Starting verification...');

    const testUserId = `test-user-${uuidv4()}`;
    const testOrgId = `org-${uuidv4()}`;

    try {
        const { auditLogs, organizations } = getRepositories();

        // 0. Create Test User and Organization (to satisfy foreign keys)
        console.log('Creating test user and organization...');

        // Create User
        await query(
            `INSERT INTO users (id, name, email, password, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
            [testUserId, 'Test User Verification', `test-${uuidv4()}@example.com`, 'hash']
        );

        // Create Organization
        await query(
            `INSERT INTO organizations (id, name, slug, plan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [testOrgId, 'Test Org Verification', `test-org-${uuidv4()}`, 'free']
        );

        // 1. Test Audit Log Creation
        console.log('Testing Audit Log Creation...');
        const log = await auditLogs.create({
            userId: testUserId,
            userName: 'Test User Verification',
            organizationId: testOrgId,
            action: 'create',
            resourceType: 'card',
            resourceId: 'test-card-verification',
            projectId: undefined, // Optional
            changes: { title: 'New Card Verification' }
        });
        console.log('Audit Log Created:', log.id);
        console.log('Audit Log Action:', log.action);

        // 2. Test RBAC Logic
        console.log('Testing RBAC Logic...');

        // Verify findMember exists
        if (typeof organizations.findMember === 'function') {
            console.log('OrganizationRepository.findMember exists and is a function.');
        } else {
            throw new Error('OrganizationRepository.findMember is missing or not a function');
        }

        console.log('Verification Complete.');

        // Cleanup
        console.log('Cleaning up...');
        await query('DELETE FROM audit_logs WHERE id = $1', [log.id]);
        await query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
        await query('DELETE FROM users WHERE id = $1', [testUserId]);

        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        // Attempt cleanup on failure
        try {
            await query('DELETE FROM users WHERE id = $1', [testUserId]);
        } catch (e) { /* ignore */ }
        process.exit(1);
    }
}

verify();
