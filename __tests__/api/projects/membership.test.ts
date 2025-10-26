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
import * as removeMemberApi from '@/pages/api/projects/[projectId]/members/[userId]';
import * as leaveProjectApi from '@/pages/api/projects/[projectId]/leave';

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

describe('Project Membership API', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let testOwnerId: string;
  let testMemberId: string;
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

    // Create test member
    const member = await userRepo.create({
      name: 'Test Member',
      email: 'member@example.com',
      password: 'password123',
    });
    testMemberId = member.id;

    // Create test project
    const project = projectRepo.create({
      name: 'Test Project',
      description: 'Test Description',
      ownerId: testOwnerId,
      isPublic: false,
    });
    testProjectId = project.projectId;

    // Add member to project
    projectRepo.addMember(testProjectId, testMemberId, 'member');
  });

  afterEach(() => {
    db.close();
  });

  describe('DELETE /api/projects/[projectId]/members/[userId]', () => {
    it('should remove member from project', async () => {
      const req = mockRequest('DELETE', {}, {
        projectId: testProjectId,
        userId: testMemberId,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        project: expect.objectContaining({
          projectId: testProjectId,
        }),
      });

      // Verify member is removed
      const isMember = projectRepo.isMember(testProjectId, testMemberId);
      expect(isMember).toBe(false);
    });

    it('should prevent removing project owner', async () => {
      const req = mockRequest('DELETE', {}, {
        projectId: testProjectId,
        userId: testOwnerId,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot remove project owner',
      });
    });

    it('should return 404 for non-existent member', async () => {
      const stranger = await userRepo.create({
        name: 'Stranger',
        email: 'stranger@example.com',
        password: 'password123',
      });

      const req = mockRequest('DELETE', {}, {
        projectId: testProjectId,
        userId: stranger.id,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Member not found' });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest('DELETE', {}, {
        projectId: 'non-existent',
        userId: testMemberId,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 400 for invalid parameters', async () => {
      const req = mockRequest('DELETE', {}, {
        projectId: ['invalid'],
        userId: testMemberId,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid project ID or user ID',
      });
    });

    it('should return 405 for unsupported method', async () => {
      const req = mockRequest('GET', {}, {
        projectId: testProjectId,
        userId: testMemberId,
      });
      const res = mockResponse();

      await removeMemberApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['DELETE']);
    });
  });

  describe('DELETE /api/projects/[projectId]/leave', () => {
    it('should allow member to leave project', async () => {
      const req = mockRequest(
        'DELETE',
        { userId: testMemberId },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '프로젝트에서 성공적으로 나가셨습니다.',
        project: expect.objectContaining({
          projectId: testProjectId,
        }),
      });

      // Verify member left
      const isMember = projectRepo.isMember(testProjectId, testMemberId);
      expect(isMember).toBe(false);
    });

    it('should prevent owner from leaving project', async () => {
      const req = mockRequest(
        'DELETE',
        { userId: testOwnerId },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '프로젝트 소유자는 프로젝트를 나갈 수 없습니다. 프로젝트를 삭제하거나 소유권을 이전하세요.',
      });

      // Verify owner is still member
      const isMember = projectRepo.isMember(testProjectId, testOwnerId);
      expect(isMember).toBe(true);
    });

    it('should return 400 for non-member trying to leave', async () => {
      const stranger = await userRepo.create({
        name: 'Stranger',
        email: 'stranger@example.com',
        password: 'password123',
      });

      const req = mockRequest(
        'DELETE',
        { userId: stranger.id },
        { projectId: testProjectId }
      );
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: '프로젝트 멤버가 아닙니다.' });
    });

    it('should return 400 for missing userId', async () => {
      const req = mockRequest('DELETE', {}, { projectId: testProjectId });
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest(
        'DELETE',
        { userId: testMemberId },
        { projectId: 'non-existent' }
      );
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 405 for unsupported method', async () => {
      const req = mockRequest('GET', {}, { projectId: testProjectId });
      const res = mockResponse();

      await leaveProjectApi.default(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['DELETE']);
    });
  });
});
