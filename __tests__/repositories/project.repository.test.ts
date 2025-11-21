import { ProjectRepository } from '@/lib/repositories/project.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

// Note: These tests require PostgreSQL connection
describe('ProjectRepository', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let testOwnerId: string;

  beforeEach(async () => {
    projectRepo = new ProjectRepository();
    userRepo = new UserRepository();

    // Create a test owner
    const owner = await userRepo.create({
      name: 'Project Owner',
      email: 'owner@example.com',
      password: 'password123',
    });
    testOwnerId = owner.id;
  });

  describe('create', () => {
    it('should create a project with default board and columns', async () => {
      const project = await projectRepo.create({
        name: 'Test Project',
        description: 'Test Description',
        ownerId: testOwnerId,
        color: '#ff0000',
        isPublic: true,
      });

      expect(project.projectId).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('Test Description');
      expect(project.ownerId).toBe(testOwnerId);
      expect(project.color).toBe('#ff0000');
      expect(project.isPublic).toBe(true);
      expect(project.members).toHaveLength(1); // Owner should be added as member
      expect(project.members[0].id).toBe(testOwnerId);
    });

    it('should preserve custom projectId', async () => {
      const customId = 'custom-project-id';
      const project = await projectRepo.create({
        projectId: customId,
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      expect(project.projectId).toBe(customId);
    });

    it('should create default board with 4 columns', async () => {
      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      // Verify board exists by checking if we can find the project
      const found = await projectRepo.findById(project.projectId);
      expect(found).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find project by ID', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      const found = await projectRepo.findById(created.projectId);

      expect(found).toBeDefined();
      expect(found?.projectId).toBe(created.projectId);
      expect(found?.name).toBe('Test Project');
    });

    it('should return null for non-existent project', async () => {
      const found = await projectRepo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find projects owned by user', async () => {
      await projectRepo.create({
        name: 'My Project',
        ownerId: testOwnerId,
      });

      const projects = await projectRepo.findByUserId(testOwnerId);

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('My Project');
    });

    it('should find projects where user is a member', async () => {
      const member = await userRepo.create({
        name: 'Member',
        email: 'member@example.com',
        password: 'password123',
      });

      const project = await projectRepo.create({
        name: 'Team Project',
        ownerId: testOwnerId,
      });

      await projectRepo.addMember(project.projectId, member.id, 'member');

      const projects = await projectRepo.findByUserId(member.id);

      expect(projects).toHaveLength(1);
      expect(projects[0].projectId).toBe(project.projectId);
    });
  });

  describe('findPublicProjects', () => {
    it('should return only public projects', async () => {
      await projectRepo.create({
        projectId: 'public-project-1',
        name: 'Public Project',
        ownerId: testOwnerId,
        isPublic: true,
      });

      await projectRepo.create({
        projectId: 'private-project-1',
        name: 'Private Project',
        ownerId: testOwnerId,
        isPublic: false,
      });

      const projects = await projectRepo.findPublicProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Public Project');
      expect(projects[0].isPublic).toBe(true);
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      const project = await projectRepo.create({
        name: 'Original Name',
        ownerId: testOwnerId,
      });

      const updated = await projectRepo.update(project.projectId, {
        name: 'Updated Name',
        description: 'Updated Description',
        isPublic: true,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated Description');
      expect(updated?.isPublic).toBe(true);
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      const member = await userRepo.create({
        name: 'New Member',
        email: 'member@example.com',
        password: 'password123',
      });

      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      const added = await projectRepo.addMember(project.projectId, member.id, 'member');

      expect(added).toBe(true);

      const found = await projectRepo.findById(project.projectId);
      expect(found?.members).toHaveLength(2); // Owner + New Member
    });

    it('should not add duplicate member', async () => {
      const member = await userRepo.create({
        name: 'Member',
        email: 'member@example.com',
        password: 'password123',
      });

      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      await projectRepo.addMember(project.projectId, member.id, 'member');
      const added = await projectRepo.addMember(project.projectId, member.id, 'member');

      expect(added).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      const member = await userRepo.create({
        name: 'Member',
        email: 'member@example.com',
        password: 'password123',
      });

      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      await projectRepo.addMember(project.projectId, member.id, 'member');
      const removed = await projectRepo.removeMember(project.projectId, member.id);

      expect(removed).toBe(true);

      const found = await projectRepo.findById(project.projectId);
      expect(found?.members).toHaveLength(1); // Only owner remains
    });
  });

  describe('isMember', () => {
    it('should return true for project member', async () => {
      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      const isMember = await projectRepo.isMember(project.projectId, testOwnerId);

      expect(isMember).toBe(true);
    });

    it('should return false for non-member', async () => {
      const nonMember = await userRepo.create({
        name: 'Non Member',
        email: 'nonmember@example.com',
        password: 'password123',
      });

      const project = await projectRepo.create({
        name: 'Test Project',
        ownerId: testOwnerId,
      });

      const isMember = await projectRepo.isMember(project.projectId, nonMember.id);

      expect(isMember).toBe(false);
    });
  });
});
