import { getRepositories } from '../lib/repositories';

async function addUsers() {
  const { users } = getRepositories();

  // Add admin user
  const admin = await users.create({
    id: 'admin',
    name: '관리자',
    email: 'admin@admin.com',
    password: 'admin',
    role: 'admin'
  });
  console.log('✓ Admin user created:', admin.email);

  // Add test user
  const test = await users.create({
    id: 'test',
    name: 'Test User',
    email: 'test@test.com',
    password: 'test',
    role: 'user'
  });
  console.log('✓ Test user created:', test.email);

  process.exit(0);
}

addUsers().catch(console.error);
