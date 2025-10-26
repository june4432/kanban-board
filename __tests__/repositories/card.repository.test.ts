import Database from 'better-sqlite3';
import { CardRepository } from '@/lib/repositories/card.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import fs from 'fs';
import path from 'path';

describe('CardRepository', () => {
  let db: Database.Database;
  let cardRepo: CardRepository;
  let userRepo: UserRepository;
  let projectRepo: ProjectRepository;
  let testColumnId: string;
  let testProjectId: string;

  beforeEach(async () => {
    // Create in-memory database for each test
    db = new Database(':memory:');

    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    cardRepo = new CardRepository(db);
    userRepo = new UserRepository(db);
    projectRepo = new ProjectRepository(db);

    // Create test user and project with board
    const owner = await userRepo.create({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
    });

    const project = projectRepo.create({
      name: 'Test Project',
      ownerId: owner.id,
    });

    testProjectId = project.projectId;
    testColumnId = `board-${project.projectId}-backlog`; // Default column ID
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a card', () => {
      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
        description: 'Test Description',
        priority: 'high',
      });

      expect(card.id).toBeDefined();
      expect(card.title).toBe('Test Card');
      expect(card.description).toBe('Test Description');
      expect(card.priority).toBe('high');
      expect(card.columnId).toBe(testColumnId);
      expect(card.position).toBe(0); // First card
    });

    it('should create card with assignees', async () => {
      const user = await userRepo.create({
        name: 'Assignee',
        email: 'assignee@example.com',
        password: 'password123',
      });

      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
        assignees: [user.id],
      });

      expect(card.assignees).toContain(user.id);
    });

    it('should set position automatically', () => {
      const card1 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 1',
      });

      const card2 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 2',
      });

      expect(card1.position).toBe(0);
      expect(card2.position).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find card by ID', () => {
      const created = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
      });

      const found = cardRepo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Card');
    });

    it('should return null for non-existent card', () => {
      const found = cardRepo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update card fields', () => {
      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Original Title',
        description: 'Original Description',
      });

      const updated = cardRepo.update(card.id, {
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'urgent',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('Updated Description');
      expect(updated?.priority).toBe('urgent');
    });

    it('should update assignees', async () => {
      const user1 = await userRepo.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password123',
      });

      const user2 = await userRepo.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password123',
      });

      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
        assignees: [user1.id],
      });

      const updated = cardRepo.update(card.id, {
        assignees: [user1.id, user2.id],
      });

      expect(updated?.assignees).toHaveLength(2);
      expect(updated?.assignees).toContain(user1.id);
      expect(updated?.assignees).toContain(user2.id);
    });
  });

  describe('delete', () => {
    it('should delete card', () => {
      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
      });

      const deleted = cardRepo.delete(card.id);

      expect(deleted).toBe(true);

      const found = cardRepo.findById(card.id);
      expect(found).toBeNull();
    });

    it('should reorder remaining cards after deletion', () => {
      const card1 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 1',
      });

      const card2 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 2',
      });

      const card3 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 3',
      });

      // Delete middle card
      cardRepo.delete(card2.id);

      // Check remaining cards have correct positions
      const remaining1 = cardRepo.findById(card1.id);
      const remaining3 = cardRepo.findById(card3.id);

      expect(remaining1?.position).toBe(0);
      expect(remaining3?.position).toBe(1);
    });
  });

  describe('moveCard', () => {
    it('should move card within same column', () => {
      const card1 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 1',
      });

      const card2 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 2',
      });

      const card3 = cardRepo.create({
        columnId: testColumnId,
        title: 'Card 3',
      });

      // Move card3 to position 0
      const success = cardRepo.moveCard(card3.id, testColumnId, 0);

      expect(success).toBe(true);

      const movedCard = cardRepo.findById(card3.id);
      expect(movedCard?.position).toBe(0);
    });

    it('should move card to different column', () => {
      const todoColumnId = `board-${testProjectId}-todo`;

      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
      });

      const success = cardRepo.moveCard(card.id, todoColumnId, 0);

      expect(success).toBe(true);

      const movedCard = cardRepo.findById(card.id);
      expect(movedCard?.columnId).toBe(todoColumnId);
      expect(movedCard?.position).toBe(0);
    });
  });

  describe('assignees management', () => {
    it('should add assignee to card', async () => {
      const user = await userRepo.create({
        name: 'Assignee',
        email: 'assignee@example.com',
        password: 'password123',
      });

      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
      });

      const added = cardRepo.addAssignee(card.id, user.id);

      expect(added).toBe(true);

      const updated = cardRepo.findById(card.id);
      expect(updated?.assignees).toContain(user.id);
    });

    it('should remove assignee from card', async () => {
      const user = await userRepo.create({
        name: 'Assignee',
        email: 'assignee@example.com',
        password: 'password123',
      });

      const card = cardRepo.create({
        columnId: testColumnId,
        title: 'Test Card',
        assignees: [user.id],
      });

      const removed = cardRepo.removeAssignee(card.id, user.id);

      expect(removed).toBe(true);

      const updated = cardRepo.findById(card.id);
      expect(updated?.assignees).not.toContain(user.id);
    });
  });
});
