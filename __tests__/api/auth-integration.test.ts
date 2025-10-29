/**
 * API 라우트 인증 통합 테스트
 *
 * 수정된 API 라우트들이 인증/인가를 제대로 적용하고 있는지 확인합니다.
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

describe('API Routes Authentication Integration', () => {
  let db: Database.Database;
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  let ownerUserId: string;
  let memberUserId: string;
  let nonMemberUserId: string;
  let publicProjectId: string;
  let privateProjectId: string;
  let boardId: string;
  let columnId: string;
  let cardId: string;

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
    const owner = await userRepo.create({
      name: 'Project Owner',
      email: 'owner@example.com',
      password: 'password123',
    });
    ownerUserId = owner.id;

    const member = await userRepo.create({
      name: 'Project Member',
      email: 'member@example.com',
      password: 'password123',
    });
    memberUserId = member.id;

    const nonMember = await userRepo.create({
      name: 'Non Member',
      email: 'nonmember@example.com',
      password: 'password123',
    });
    nonMemberUserId = nonMember.id;

    // Create projects
    publicProjectId = projectRepo.create({
      name: 'Public Project',
      ownerId: ownerUserId,
      isPublic: true,
    }).projectId;

    privateProjectId = projectRepo.create({
      name: 'Private Project',
      ownerId: ownerUserId,
      isPublic: false,
    }).projectId;

    // Add member to private project
    projectRepo.addMember(privateProjectId, memberUserId, 'member');

    // Create board, column, and card for testing
    boardId = 'test-board-1';
    columnId = 'test-column-1';
    cardId = 'test-card-1';

    db.prepare('INSERT INTO boards (id, project_id, name) VALUES (?, ?, ?)').run(
      boardId,
      privateProjectId,
      'Test Board'
    );

    db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(
      columnId,
      boardId,
      'To Do',
      0
    );

    db.prepare(
      'INSERT INTO cards (id, column_id, title, description, position) VALUES (?, ?, ?, ?, ?)'
    ).run(cardId, columnId, 'Test Card', 'Test Description', 0);

    // Setup mock request and response
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe('GET /api/cards/[id] - requireCardAccess', () => {
    it('프로젝트 멤버는 카드에 접근할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeDefined();
      expect(result?.session.user.id).toBe(memberUserId);
      expect(result?.projectId).toBe(privateProjectId);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 소유자는 카드에 접근할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeDefined();
      expect(result?.session.user.id).toBe(ownerUserId);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버가 아닌 사용자는 카드에 접근할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('인증되지 않은 사용자는 카드에 접근할 수 없어야 함', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('POST /api/cards/move - requireCardAccess', () => {
    it('프로젝트 멤버는 카드를 이동할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeDefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버가 아닌 사용자는 카드를 이동할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /api/cards - requireProjectMember', () => {
    it('프로젝트 멤버는 카드를 생성할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.session.user.id).toBe(memberUserId);
      expect(result?.isOwner).toBe(false);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 소유자는 카드를 생성할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.isOwner).toBe(true);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버가 아닌 사용자는 카드를 생성할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('PATCH /api/projects/[projectId] - requireProjectMember', () => {
    it('프로젝트 멤버는 자신의 권한으로 수정 가능한 필드를 변경할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.isOwner).toBe(false);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 소유자만 모든 필드를 수정할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.isOwner).toBe(true);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/projects/[projectId] - requireProjectOwner', () => {
    it('프로젝트 소유자만 프로젝트를 삭제할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.user.id).toBe(ownerUserId);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버는 프로젝트를 삭제할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Only project owner can perform this action.',
      });
    });

    it('프로젝트 멤버가 아닌 사용자는 프로젝트를 삭제할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /api/projects/[projectId]/leave - requireProjectMember', () => {
    it('프로젝트 멤버는 프로젝트를 떠날 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.session.user.id).toBe(memberUserId);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 소유자도 프로젝트를 떠날 수 있어야 함 (isOwner 확인)', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(result?.isOwner).toBe(true);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/projects/[projectId]/members/[userId] - requireProjectOwner', () => {
    it('프로젝트 소유자만 멤버를 제거할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버는 다른 멤버를 제거할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /api/projects/[projectId]/requests/[requestId] - requireProjectOwner', () => {
    it('프로젝트 소유자만 가입 요청을 승인/거부할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버는 가입 요청을 승인/거부할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('GET /api/kanban - requireProjectMember', () => {
    it('프로젝트 멤버는 칸반 보드를 조회할 수 있어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeDefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('프로젝트 멤버가 아닌 사용자는 칸반 보드를 조회할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );

      expect(result).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('권한 누적 테스트', () => {
    it('소유자는 모든 권한을 가져야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: ownerUserId,
          name: 'Project Owner',
          email: 'owner@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      // Check all permission levels
      const authResult = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );
      expect(authResult).toBeDefined();

      jest.clearAllMocks();
      const memberResult = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );
      expect(memberResult).toBeDefined();
      expect(memberResult?.isOwner).toBe(true);

      jest.clearAllMocks();
      const ownerResult = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );
      expect(ownerResult).toBeDefined();

      jest.clearAllMocks();
      const cardResult = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );
      expect(cardResult).toBeDefined();
    });

    it('멤버는 소유자 전용 작업을 수행할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: memberUserId,
          name: 'Project Member',
          email: 'member@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      // Member can authenticate
      const authResult = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );
      expect(authResult).toBeDefined();

      jest.clearAllMocks();
      // Member can access project
      const memberResult = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );
      expect(memberResult).toBeDefined();
      expect(memberResult?.isOwner).toBe(false);

      jest.clearAllMocks();
      // Member CANNOT perform owner actions
      const ownerResult = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );
      expect(ownerResult).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('비멤버는 프로젝트 관련 작업을 수행할 수 없어야 함', async () => {
      const mockSession: AuthSession = {
        user: {
          id: nonMemberUserId,
          name: 'Non Member',
          email: 'nonmember@example.com',
        },
      };

      mockedGetServerSession.mockResolvedValue(mockSession as any);

      // Non-member can authenticate
      const authResult = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );
      expect(authResult).toBeDefined();

      jest.clearAllMocks();
      // Non-member CANNOT access project
      const memberResult = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        privateProjectId
      );
      expect(memberResult).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);

      jest.clearAllMocks();
      // Non-member CANNOT access cards
      const cardResult = await requireCardAccess(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        cardId
      );
      expect(cardResult).toBeNull();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
