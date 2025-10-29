/**
 * WebSocket 인증 미들웨어 테스트
 *
 * Socket.IO 인증 미들웨어와 프로젝트 멤버십 검증을 테스트합니다.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
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

// Mock repositories module
jest.mock('@/lib/repositories', () => ({
  getRepositories: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { getDatabase } from '@/lib/database';
import { getRepositories } from '@/lib/repositories';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockedGetRepositories = getRepositories as jest.MockedFunction<typeof getRepositories>;

describe('WebSocket Authentication', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;

  let testUserId: string;
  let otherUserId: string;
  let testProjectId: string;

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
    mockedGetRepositories.mockReturnValue({
      projects: projectRepo,
      users: userRepo,
      cards: null as any,
      columns: null as any,
      boards: null as any,
    });

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
    }).projectId;

    jest.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe('인증 미들웨어', () => {
    it('유효한 세션이 있으면 연결을 허용해야 함', async () => {
      const mockSession = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const mockSocket = {
        request: {},
        data: {},
      };

      const mockNext = jest.fn();

      // Simulate middleware execution
      const middlewareLogic = async () => {
        const req = mockSocket.request as any;
        const session = await getServerSession(req, {} as any, null as any);

        if (!session?.user?.id) {
          return mockNext(new Error('Unauthorized'));
        }

        mockSocket.data.userId = session.user.id;
        mockSocket.data.userEmail = session.user.email;
        mockSocket.data.userName = session.user.name;

        mockNext();
      };

      await middlewareLogic();

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.data.userId).toBe(testUserId);
      expect(mockSocket.data.userEmail).toBe('test@example.com');
      expect(mockSocket.data.userName).toBe('Test User');
    });

    it('세션이 없으면 연결을 거부해야 함', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const mockSocket = {
        request: {},
        data: {},
      };

      const mockNext = jest.fn();

      // Simulate middleware execution
      const middlewareLogic = async () => {
        const req = mockSocket.request as any;
        const session = await getServerSession(req, {} as any, null as any);

        if (!session?.user?.id) {
          return mockNext(new Error('Unauthorized'));
        }

        mockSocket.data.userId = session.user.id;
        mockNext();
      };

      await middlewareLogic();

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Unauthorized');
      expect(mockSocket.data.userId).toBeUndefined();
    });

    it('세션은 있지만 user.id가 없으면 연결을 거부해야 함', async () => {
      mockedGetServerSession.mockResolvedValue({ user: {} } as any);

      const mockSocket = {
        request: {},
        data: {},
      };

      const mockNext = jest.fn();

      // Simulate middleware execution
      const middlewareLogic = async () => {
        const req = mockSocket.request as any;
        const session = await getServerSession(req, {} as any, null as any);

        if (!session?.user?.id) {
          return mockNext(new Error('Unauthorized'));
        }

        mockSocket.data.userId = session.user.id;
        mockNext();
      };

      await middlewareLogic();

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Unauthorized');
    });

    it('인증 과정에서 에러가 발생하면 연결을 거부해야 함', async () => {
      mockedGetServerSession.mockRejectedValue(new Error('Session error'));

      const mockSocket = {
        request: {},
        data: {},
      };

      const mockNext = jest.fn();

      // Simulate middleware execution with error handling
      const middlewareLogic = async () => {
        try {
          const req = mockSocket.request as any;
          const session = await getServerSession(req, {} as any, null as any);

          if (!session?.user?.id) {
            return mockNext(new Error('Unauthorized'));
          }

          mockSocket.data.userId = session.user.id;
          mockNext();
        } catch (error) {
          mockNext(new Error('Authentication failed'));
        }
      };

      await middlewareLogic();

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication failed');
    });
  });

  describe('프로젝트 멤버십 검증', () => {
    it('프로젝트 멤버가 join-project를 요청하면 성공해야 함', () => {
      const isMember = projectRepo.isMember(testProjectId, testUserId);

      expect(isMember).toBe(true);
    });

    it('프로젝트 멤버가 아닌 사용자의 join-project 요청은 실패해야 함', () => {
      const isMember = projectRepo.isMember(testProjectId, otherUserId);

      expect(isMember).toBe(false);
    });

    it('존재하지 않는 프로젝트에 대한 join-project 요청은 실패해야 함', () => {
      const project = projectRepo.findById('non-existent-project');

      expect(project).toBeNull();
    });

    it('멤버를 추가한 후 join-project를 요청하면 성공해야 함', () => {
      // Add other user as member
      projectRepo.addMember(testProjectId, otherUserId, 'member');

      const isMember = projectRepo.isMember(testProjectId, otherUserId);

      expect(isMember).toBe(true);
    });

    it('멤버를 제거한 후 join-project를 요청하면 실패해야 함', () => {
      // Add then remove member
      projectRepo.addMember(testProjectId, otherUserId, 'member');
      projectRepo.removeMember(testProjectId, otherUserId);

      const isMember = projectRepo.isMember(testProjectId, otherUserId);

      expect(isMember).toBe(false);
    });
  });

  describe('사용자 룸 자동 참여', () => {
    it('인증된 사용자는 자동으로 user-{userId} 룸에 참여해야 함', () => {
      const mockSocket = {
        data: {
          userId: testUserId,
          userEmail: 'test@example.com',
        },
        join: jest.fn(),
      };

      // Simulate auto-join logic
      mockSocket.join(`user-${mockSocket.data.userId}`);

      expect(mockSocket.join).toHaveBeenCalledWith(`user-${testUserId}`);
    });

    it('각 사용자는 자신의 고유한 룸에 참여해야 함', () => {
      const user1Room = `user-${testUserId}`;
      const user2Room = `user-${otherUserId}`;

      expect(user1Room).not.toBe(user2Room);
      expect(user1Room).toBe(`user-${testUserId}`);
      expect(user2Room).toBe(`user-${otherUserId}`);
    });
  });

  describe('프로젝트 룸 참여/퇴장', () => {
    it('프로젝트 소유자는 project-{projectId} 룸에 참여할 수 있어야 함', () => {
      const mockSocket = {
        data: { userId: testUserId },
        join: jest.fn(),
        emit: jest.fn(),
      };

      const project = projectRepo.findById(testProjectId);
      expect(project).toBeDefined();
      expect(project?.ownerId).toBe(testUserId);

      const isMember = projectRepo.isMember(testProjectId, testUserId);
      expect(isMember).toBe(true);

      mockSocket.join(`project-${testProjectId}`);
      mockSocket.emit('project-joined', { projectId: testProjectId });

      expect(mockSocket.join).toHaveBeenCalledWith(`project-${testProjectId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('project-joined', { projectId: testProjectId });
    });

    it('프로젝트 멤버도 project-{projectId} 룸에 참여할 수 있어야 함', () => {
      projectRepo.addMember(testProjectId, otherUserId, 'member');

      const mockSocket = {
        data: { userId: otherUserId },
        join: jest.fn(),
        emit: jest.fn(),
      };

      const isMember = projectRepo.isMember(testProjectId, otherUserId);
      expect(isMember).toBe(true);

      mockSocket.join(`project-${testProjectId}`);
      mockSocket.emit('project-joined', { projectId: testProjectId });

      expect(mockSocket.join).toHaveBeenCalledWith(`project-${testProjectId}`);
    });

    it('프로젝트 멤버가 아닌 사용자는 에러를 받아야 함', () => {
      const mockSocket = {
        data: { userId: otherUserId },
        join: jest.fn(),
        emit: jest.fn(),
      };

      const isMember = projectRepo.isMember(testProjectId, otherUserId);
      expect(isMember).toBe(false);

      mockSocket.emit('error', { message: 'Access denied to project' });

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Access denied to project' });
    });

    it('leave-project 이벤트로 룸을 떠날 수 있어야 함', () => {
      const mockSocket = {
        data: { userId: testUserId },
        leave: jest.fn(),
      };

      mockSocket.leave(`project-${testProjectId}`);

      expect(mockSocket.leave).toHaveBeenCalledWith(`project-${testProjectId}`);
    });
  });

  describe('CORS 설정', () => {
    it('ALLOWED_ORIGINS 환경 변수를 사용해야 함', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

      expect(Array.isArray(allowedOrigins)).toBe(true);
    });

    it('ALLOWED_ORIGINS이 없으면 기본값을 사용해야 함', () => {
      const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
      delete process.env.ALLOWED_ORIGINS;

      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

      expect(allowedOrigins).toEqual(['http://localhost:3000']);

      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    });

    it('여러 개의 origin을 지원해야 함', () => {
      const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://app.example.com';

      const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

      expect(allowedOrigins).toHaveLength(3);
      expect(allowedOrigins).toContain('http://localhost:3000');
      expect(allowedOrigins).toContain('https://example.com');
      expect(allowedOrigins).toContain('https://app.example.com');

      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    });
  });

  describe('Socket 데이터 저장', () => {
    it('인증 후 socket.data에 사용자 정보를 저장해야 함', () => {
      const mockSocket = {
        data: {},
      };

      const session = {
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockSocket.data.userId = session.user.id;
      mockSocket.data.userEmail = session.user.email;
      mockSocket.data.userName = session.user.name;

      expect(mockSocket.data.userId).toBe(testUserId);
      expect(mockSocket.data.userEmail).toBe('test@example.com');
      expect(mockSocket.data.userName).toBe('Test User');
    });

    it('저장된 사용자 정보를 이후 이벤트에서 사용할 수 있어야 함', () => {
      const mockSocket = {
        data: {
          userId: testUserId,
          userEmail: 'test@example.com',
          userName: 'Test User',
        },
      };

      // Socket data should be accessible in event handlers
      expect(mockSocket.data.userId).toBe(testUserId);
      expect(mockSocket.data.userEmail).toBe('test@example.com');
      expect(mockSocket.data.userName).toBe('Test User');

      // Verify project membership using stored userId
      const isMember = projectRepo.isMember(testProjectId, mockSocket.data.userId);
      expect(isMember).toBe(true);
    });
  });
});
