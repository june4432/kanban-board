import { getRepositories } from '../lib/repositories';

async function addTestOrganization() {
  const { organizations, users } = getRepositories();

  // 기존 사용자 조회
  const admin = users.findByEmail('admin@admin.com');
  const testUser = users.findByEmail('test@test.com');

  if (!admin) {
    console.error('❌ Admin user not found. Please run add-users.ts first.');
    process.exit(1);
  }

  // 테스트 조직 생성
  const testOrg = organizations.create({
    name: '테스트 조직',
    slug: 'test-org',
    description: '테스트용 조직입니다',
    plan: 'pro',
    ownerId: admin.id,
  });
  console.log('✓ Test organization created:', testOrg.name);

  // 테스트 사용자를 멤버로 추가
  if (testUser) {
    organizations.addMember(testOrg.id, testUser.id, 'member');
    console.log('✓ Test user added as member');
  }

  // 조직 멤버 확인
  const members = organizations.getMembers(testOrg.id);
  console.log('\n📋 Organization members:');
  members.forEach(member => {
    console.log(`  - ${member.userName} (${member.userEmail}) - ${member.role}`);
  });

  process.exit(0);
}

addTestOrganization().catch(console.error);
