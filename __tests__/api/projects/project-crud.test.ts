import Database from 'better-sqlite3';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock database module
jest.mock('@/lib/database', () => {
  let mockDb: any = null;
  return {
    getDatabase: jest.fn(() => mockDb),
    setMockDatabase: (db: any) => { mockDb = db; },
  };
});

import { setMockDatabase } from '@/lib/database';
import * as projectApi from '@/pages/api/projects/[projectId]';

// Mock Next.js request/response
function mockRequest(method: string, body: any = {}, query: any = {}): NextApiRequest {
  return {
    method,
    body,
    query,
    headers: {},
  } as NextApiRequest;
}

function mockResponse(): NextApiResponse {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as NextApiResponse;
}

describe('Project CRUD API', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let testOwnerId: string;
  let testProjectId: string;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');

    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Set mock database
    (setMockDatabase as any)(db);

    projectRepo = new ProjectRepository(db);
    userRepo = new UserRepository(db);

    // Create test owner
    const owner = await userRepo.create({
      name: 'Test Owner',
      email: 'owner@example.com',
      password: 'password123',
    });
    testOwnerId = owner.id;

    // Create test project
    const project = projectRepo.create({
      name: 'Test Project',
      description: 'Test Description',
      ownerId: testOwnerId,
      isPublic: false,
    });
    testProjectId = project.projectId;
  });

  afterEach(() => {
    db.close();
  });

  describe('GET /api/projects/[projectId]', () => {
    it('should return project details', async () => {
      const req = mockRequest('GET', {}, { projectId: testProjectId });
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          projectId: testProjectId,
          name: 'Test Project',
          description: 'Test Description',
          ownerId: testOwnerId,
        }),
      });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest('GET', {}, { projectId: 'non-existent' });
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 400 for invalid project ID', async () => {
      const req = mockRequest('GET', {}, { projectId: ['invalid', 'array'] });
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid project ID' });
    });
  });

  describe('PATCH /api/projects/[projectId]', () => {
    it('should update project as owner', async () => {
      const req = mockRequest(
        'PATCH',
        {
          userId: testOwnerId,
          name: 'Updated Project',
          description: 'Updated Description',
          color: '#ff0000',
          isPublic: true,
        },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          name: 'Updated Project',
          description: 'Updated Description',
          color: '#ff0000',
          isPublic: true,
        }),
      });
    });

    it('should allow member to update description only', async () => {
      // Create a member
      const member = await userRepo.create({
        name: 'Test Member',
        email: 'member@example.com',
        password: 'password123',
      });
      projectRepo.addMember(testProjectId, member.id, 'member');

      const req = mockRequest(
        'PATCH',
        {
          userId: member.id,
          description: 'Member Updated Description',
        },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          description: 'Member Updated Description',
        }),
      });
    });

    it('should deny member from updating name', async () => {
      // Create a member
      const member = await userRepo.create({
        name: 'Test Member',
        email: 'member@example.com',
        password: 'password123',
      });
      projectRepo.addMember(testProjectId, member.id, 'member');

      const req = mockRequest(
        'PATCH',
        {
          userId: member.id,
          name: 'Hacked Name',
        },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Only project owner can modify name',
      });
    });

    it('should deny non-member from updating project', async () => {
      const stranger = await userRepo.create({
        name: 'Stranger',
        email: 'stranger@example.com',
        password: 'password123',
      });

      const req = mockRequest(
        'PATCH',
        {
          userId: stranger.id,
          description: 'Hacked Description',
        },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    });
  });

  describe('DELETE /api/projects/[projectId]', () => {
    it('should delete project as owner', async () => {
      const req = mockRequest(
        'DELETE',
        { userId: testOwnerId },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();

      // Verify project is deleted
      const deletedProject = projectRepo.findById(testProjectId);
      expect(deletedProject).toBeNull();
    });

    it('should deny non-owner from deleting project', async () => {
      const member = await userRepo.create({
        name: 'Test Member',
        email: 'member@example.com',
        password: 'password123',
      });
      projectRepo.addMember(testProjectId, member.id, 'member');

      const req = mockRequest(
        'DELETE',
        { userId: member.id },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Only project owner can delete the project',
      });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest('DELETE', {}, { projectId: 'non-existent' });
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported method', async () => {
      const req = mockRequest('POST', {}, { projectId: testProjectId });
      const res = mockResponse();

      await projectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PATCH', 'DELETE']);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });
});
