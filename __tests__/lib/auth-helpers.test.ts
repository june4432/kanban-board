import { requireAuth, requireProjectMember, requireProjectOwner, requireCardAccess } from '@/lib/auth-helpers';
import { getServerSession } from 'next-auth/next';
import { getRepositories } from '@/lib/repositories';
import { NextApiRequest, NextApiResponse } from 'next';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/repositories');

describe('Auth Helpers', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockReq = {};
    mockRes = {
      status: mockStatus,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return session if user is authenticated', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@test.com', name: 'Test User' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(result).toEqual(mockSession);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return null and send 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const result = await requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(result).toBeNull();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized. Please sign in.' });
    });

    it('should return null and send 401 if session has no user ID', async () => {
      const mockSession = {
        user: { email: 'test@test.com', name: 'Test User' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(result).toBeNull();
      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('requireProjectMember', () => {
    const mockProject = {
      projectId: 'project-1',
      name: 'Test Project',
      ownerId: 'owner-1',
      members: [
        { id: 'member-1', name: 'Member 1', email: 'member1@test.com', avatar: '' },
        { id: 'member-2', name: 'Member 2', email: 'member2@test.com', avatar: '' },
      ],
      pendingRequests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      color: '#blue',
      isPublic: false,
      description: 'Test',
    };

    beforeEach(() => {
      (getRepositories as jest.Mock).mockReturnValue({
        projects: {
          findById: jest.fn().mockReturnValue(mockProject),
        },
      });
    });

    it('should return auth data if user is project owner', async () => {
      const mockSession = {
        user: { id: 'owner-1', email: 'owner@test.com', name: 'Owner' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'project-1'
      );

      expect(result).toEqual({
        session: mockSession,
        project: mockProject,
        userId: 'owner-1',
      });
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return auth data if user is project member', async () => {
      const mockSession = {
        user: { id: 'member-1', email: 'member1@test.com', name: 'Member 1' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'project-1'
      );

      expect(result).toEqual({
        session: mockSession,
        project: mockProject,
        userId: 'member-1',
      });
    });

    it('should return null and send 403 if user is not a member', async () => {
      const mockSession = {
        user: { id: 'stranger-1', email: 'stranger@test.com', name: 'Stranger' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'project-1'
      );

      expect(result).toBeNull();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied. You are not a member of this project.',
      });
    });

    it('should return null and send 404 if project not found', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@test.com', name: 'Test User' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getRepositories as jest.Mock).mockReturnValue({
        projects: {
          findById: jest.fn().mockReturnValue(null),
        },
      });

      const result = await requireProjectMember(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'nonexistent'
      );

      expect(result).toBeNull();
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Project not found' });
    });
  });

  describe('requireProjectOwner', () => {
    const mockProject = {
      projectId: 'project-1',
      name: 'Test Project',
      ownerId: 'owner-1',
      members: [
        { id: 'member-1', name: 'Member 1', email: 'member1@test.com', avatar: '' },
      ],
      pendingRequests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      color: '#blue',
      isPublic: false,
      description: 'Test',
    };

    beforeEach(() => {
      (getRepositories as jest.Mock).mockReturnValue({
        projects: {
          findById: jest.fn().mockReturnValue(mockProject),
        },
      });
    });

    it('should return auth data if user is project owner', async () => {
      const mockSession = {
        user: { id: 'owner-1', email: 'owner@test.com', name: 'Owner' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'project-1'
      );

      expect(result).toEqual({
        session: mockSession,
        project: mockProject,
        userId: 'owner-1',
      });
    });

    it('should return null and send 403 if user is member but not owner', async () => {
      const mockSession = {
        user: { id: 'member-1', email: 'member1@test.com', name: 'Member 1' },
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireProjectOwner(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        'project-1'
      );

      expect(result).toBeNull();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied. Only the project owner can perform this action.',
      });
    });
  });
});
