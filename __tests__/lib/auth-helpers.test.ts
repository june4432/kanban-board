/**
 * auth-helpers.ts 테스트
 *
 * next-auth를 모킹하여 인증/인가 헬퍼 함수들을 테스트합니다.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  requireAuth,
  requireProjectMember,
  requireProjectOwner,
  requireCardAccess,
  AuthSession,
} from '@/lib/auth-helpers';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock database module
jest.mock('@/lib/database', () => ({
  getDatabase: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { getDatabase } from '@/lib/database';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('auth-helpers', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  let testUserId: string;
  let otherUserId: string;
  let testProjectId: string;
  let testCardId: string;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Setup repositories
    projectRepo = new ProjectRepository(db);
    userRepo = new UserRepository(db);
    mockedGetDatabase.mockReturnValue(db);

    // Create test users
    const user1 = await userRepo.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    testUserId = user1.id;

    const user2 = await userRepo.create({
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
    });
    otherUserId = user2.id;

    // Create test project
    testProjectId = projectRepo.create({
      name: 'Test Project',
      ownerId: testUserId,
    }).id;

    // Create board and column
    const board = db
      .prepare('INSERT INTO boards (id, project_id, name) VALUES (?, ?, ?)')
      .run('board-1', testProjectId, 'Test Board');

    db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)')
      .run('column-1', 'board-1', 'To Do', 0);

    // Create test card
    testCardId = 'card-1';
    db.prepare(
      'INSERT INTO cards (id, column_id, title, description, position) VALUES (?, ?, ?, ?, ?)'
    ).run(testCardId, 'column-1', 'Test Card', 'Test Description', 0);

    // Setup mock request and response
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe('requireAuth', () => {
    it('인증된 사용자의 세션을 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );

      expect(result).toEqual(mockSession);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('인증되지 않은 사용자에게 401 에러를 반환해야 함', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const result = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized. Please login first.',
      });
    });

    it('세션은 있지만 user.id가 없으면 401 에러를 반환해야 함', async () => {
      mockedGetServerSession.mockResolvedValue({ user: {} } as any);

      const result = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('requireProjectMember', () => {
    it('프로젝트 멤버에게 세션과 isOwner를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toEqual({
        session: mockSession,
        isOwner: true,
      });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('멤버가 아닌 사용자에게 403 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. You are not a member of this project.',
      });
    });

    it('존재하지 않는 프로젝트에 404 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'non-existent-project'
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Project not found',
      });
    });

    it('프로젝트 멤버지만 소유자가 아닌 경우 isOwner가 false여야 함', async () => {
      // Add other user as member
      projectRepo.addMember(testProjectId, otherUserId, 'member');

      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toEqual({
        session: mockSession,
        isOwner: false,
      });
    });

    it('인증되지 않은 사용자에게 401 에러를 반환해야 함', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('requireProjectOwner', () => {
    it('프로젝트 소유자에게 세션을 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toEqual(mockSession);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('소유자가 아닌 멤버에게 403 에러를 반환해야 함', async () => {
      // Add other user as member
      projectRepo.addMember(testProjectId, otherUserId, 'member');

      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Only project owner can perform this action.',
      });
    });

    it('멤버가 아닌 사용자에게 403 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('존재하지 않는 프로젝트에 404 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'non-existent-project'
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('requireCardAccess', () => {
    it('카드가 속한 프로젝트의 멤버에게 세션과 projectId를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testCardId
      );

      expect(result).toEqual({
        session: mockSession,
        projectId: testProjectId,
      });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버가 아닌 사용자에게 403 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testCardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. You are not a member of this project.',
      });
    });

    it('존재하지 않는 카드에 404 에러를 반환해야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'non-existent-card'
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Card not found',
      });
    });

    it('인증되지 않은 사용자에게 401 에러를 반환해야 함', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testCardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('다른 프로젝트의 멤버가 카드에 접근하려 할 때 403 에러를 반환해야 함', async () => {
      // Create another project for other user
      const otherProjectId = projectRepo.create({
        name: 'Other Project',
        ownerId: otherUserId,
      }).id;

      const mockSession: AuthSession = {
        user: {
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        testCardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
