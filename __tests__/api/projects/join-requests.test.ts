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
import * as joinApi from '@/pages/api/projects/[projectId]/join';
import * as handleRequestApi from '@/pages/api/projects/[projectId]/requests/[requestId]';

// Mock Next.js request/response with WebSocket support
function mockRequest(method: string, body: any = {}, query: any = {}): NextApiRequest {
  return {
    method,
    body,
    query,
    headers: {},
  } as NextApiRequest;
}

function mockResponse(): any {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);

  // Mock WebSocket
  res.socket = {
    server: {
      io: {
        emit: jest.fn(),
      },
    },
  };

  return res;
}

describe('Project Join Request API', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let testOwnerId: string;
  let testUserId: string;
  let testProjectId: string;
  let publicProjectId: string;

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

    // Create test user
    const user = await userRepo.create({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
    });
    testUserId = user.id;

    // Create private project
    const privateProject = projectRepo.create({
      projectId: 'private-test-project',
      name: 'Private Project',
      description: 'Private Description',
      ownerId: testOwnerId,
      isPublic: false,
    });
    testProjectId = privateProject.projectId;

    // Create public project
    const publicProject = projectRepo.create({
      projectId: 'public-test-project',
      name: 'Public Project',
      description: 'Public Description',
      ownerId: testOwnerId,
      isPublic: true,
    });
    publicProjectId = publicProject.projectId;
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/projects/[projectId]/join', () => {
    it('should create join request for public project', async () => {
      const req = mockRequest(
        'POST',
        { userId: testUserId, message: 'Please let me join!' },
        { projectId: publicProjectId }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        request: expect.objectContaining({
          id: expect.any(String),
          userId: testUserId,
          projectId: publicProjectId,
          message: 'Please let me join!',
          status: 'pending',
        }),
      });

      // Verify WebSocket event was emitted
      expect(res.socket.server.io.emit).toHaveBeenCalledWith(
        'project-join-request',
        expect.objectContaining({
          projectId: publicProjectId,
          request: expect.any(Object),
          user: expect.any(Object),
          project: expect.any(Object),
        })
      );
    });

    it('should deny join request for private project', async () => {
      const req = mockRequest(
        'POST',
        { userId: testUserId, message: 'Please let me join!' },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This project is not public',
      });
    });

    it('should deny join request if user is already a member', async () => {
      // Add user as member
      projectRepo.addMember(publicProjectId, testUserId, 'member');

      const req = mockRequest(
        'POST',
        { userId: testUserId, message: 'Please let me join!' },
        { projectId: publicProjectId }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User is already a member',
      });
    });

    it('should deny duplicate join request', async () => {
      // Create first request
      projectRepo.createJoinRequest({
        projectId: publicProjectId,
        userId: testUserId,
        message: 'First request',
      });

      const req = mockRequest(
        'POST',
        { userId: testUserId, message: 'Second request' },
        { projectId: publicProjectId }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Join request already exists',
      });
    });

    it('should return 400 for missing userId', async () => {
      const req = mockRequest('POST', {}, { projectId: publicProjectId });
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest(
        'POST',
        { userId: testUserId },
        { projectId: 'non-existent' }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 404 for non-existent user', async () => {
      const req = mockRequest(
        'POST',
        { userId: 'non-existent-user' },
        { projectId: publicProjectId }
      );
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 405 for unsupported method', async () => {
      const req = mockRequest('GET', {}, { projectId: publicProjectId });
      const res = mockResponse();

      await joinApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    });
  });

  describe('PATCH /api/projects/[projectId]/requests/[requestId]', () => {
    let requestId: string;

    beforeEach(() => {
      // Create a join request
      const request = projectRepo.createJoinRequest({
        projectId: publicProjectId,
        userId: testUserId,
        message: 'Please let me join!',
      });
      requestId = request.id;
    });

    it('should approve join request', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'approve' },
        { projectId: publicProjectId, requestId }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          projectId: publicProjectId,
        }),
      });

      // Verify user is now a member
      const isMember = projectRepo.isMember(publicProjectId, testUserId);
      expect(isMember).toBe(true);

      // Verify WebSocket event was emitted
      expect(res.socket.server.io.emit).toHaveBeenCalledWith(
        'project-join-response',
        expect.objectContaining({
          projectId: publicProjectId,
          requestId,
          action: 'approve',
          message: expect.stringContaining('승인'),
        })
      );
    });

    it('should reject join request', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'reject' },
        { projectId: publicProjectId, requestId }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          projectId: publicProjectId,
        }),
      });

      // Verify user is NOT a member
      const isMember = projectRepo.isMember(publicProjectId, testUserId);
      expect(isMember).toBe(false);

      // Verify WebSocket event was emitted
      expect(res.socket.server.io.emit).toHaveBeenCalledWith(
        'project-join-response',
        expect.objectContaining({
          action: 'reject',
          message: expect.stringContaining('거부'),
        })
      );
    });

    it('should return 400 for invalid action', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'invalid' },
        { projectId: publicProjectId, requestId }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Action must be "approve" or "reject"',
      });
    });

    it('should return 400 for missing action', async () => {
      const req = mockRequest('PATCH', {}, { projectId: publicProjectId, requestId });
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Action must be "approve" or "reject"',
      });
    });

    it('should return 404 for non-existent request', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'approve' },
        { projectId: publicProjectId, requestId: 'non-existent' }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Request not found' });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'approve' },
        { projectId: 'non-existent', requestId }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 400 for invalid parameters', async () => {
      const req = mockRequest(
        'PATCH',
        { action: 'approve' },
        { projectId: ['invalid'], requestId }
      );
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid project ID or request ID',
      });
    });

    it('should return 405 for unsupported method', async () => {
      const req = mockRequest('GET', {}, { projectId: publicProjectId, requestId });
      const res = mockResponse();

      await handleRequestApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['PATCH']);
    });
  });
});
