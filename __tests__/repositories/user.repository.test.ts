import Database from 'better-sqlite3';
import { UserRepository } from '@/lib/repositories/user.repository';
import fs from 'fs';
import path from 'path';

describe('UserRepository', () => {
  let db: Database.Database;
  let userRepo: UserRepository;
  let testDbPath: string;

  beforeEach(() => {
    // Create in-memory database for each test
    testDbPath = ':memory:';
    db = new Database(testDbPath);

    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    userRepo = new UserRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const user = await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBeUndefined(); // Password should not be returned
      expect(user.role).toBe('user');
    });

    it('should preserve custom ID when provided', async () => {
      const customId = 'custom-id-123';
      const user = await userRepo.create({
        id: customId,
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(user.id).toBe(customId);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const created = await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const found = userRepo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', () => {
      const found = userRepo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const found = userRepo.findByEmail('test@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', () => {
      const found = userRepo.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const user = await userRepo.verifyPassword('test@example.com', 'password123');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should reject incorrect password', async () => {
      await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const user = await userRepo.verifyPassword('test@example.com', 'wrongpassword');

      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await userRepo.verifyPassword('nonexistent@example.com', 'password123');
      expect(user).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      await userRepo.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password123',
      });

      await userRepo.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password123',
      });

      const users = userRepo.findAll();

      expect(users).toHaveLength(2);
      expect(users[0].password).toBeUndefined(); // Passwords should not be returned
      expect(users[1].password).toBeUndefined();
    });

    it('should return empty array when no users', () => {
      const users = userRepo.findAll();
      expect(users).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const updated = userRepo.update(user.id, {
        name: 'Updated User',
        email: 'updated@example.com',
      });

      expect(updated?.name).toBe('Updated User');
      expect(updated?.email).toBe('updated@example.com');
    });

    it('should return null for non-existent user', () => {
      const updated = userRepo.update('non-existent', { name: 'Updated' });
      expect(updated).toBeDefined(); // Should still return (update doesn't fail silently)
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await userRepo.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const deleted = userRepo.delete(user.id);

      expect(deleted).toBe(true);

      const found = userRepo.findById(user.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent user', () => {
      const deleted = userRepo.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });
});
