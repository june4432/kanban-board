/**
 * Tests for V1 Projects API response format
 *
 * These tests verify the API response format without loading the full handler
 * which has complex dependencies (postgres, next-auth, etc.)
 */
import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  sendSuccess,
  sendCreated,
  sendValidationError,
  sendForbidden,
  sendMethodNotAllowed,
  sendUnauthorized,
} from '@/lib/api-v1/utils/response';

describe('V1 Projects API Response Format', () => {
  function createMockRes() {
    const { res } = createMocks<NextApiRequest, NextApiResponse>();
    return res;
  }

  describe('GET /api/v1/projects Response Format', () => {
    it('should return projects in correct V1 format', () => {
      const res = createMockRes();
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', organizationId: 'org-1' },
        { id: 'proj-2', name: 'Project 2', organizationId: 'org-1' },
      ];

      sendSuccess(res, { projects: mockProjects }, 200, 'test-request-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.data.projects).toHaveLength(2);
      expect(data.meta.requestId).toBe('test-request-id');
    });

    it('should return unauthorized error when not authenticated', () => {
      const res = createMockRes();

      sendUnauthorized(res, 'Authentication required', 'test-request-id');

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());

      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Authentication required');
    });
  });

  describe('POST /api/v1/projects Response Format', () => {
    it('should return created project in correct V1 format', () => {
      const res = createMockRes();
      const mockProject = {
        id: 'new-proj-id',
        name: 'New Project',
        organizationId: 'org-1',
        ownerId: 'user-1',
      };

      sendCreated(res, { project: mockProject }, 'test-request-id');

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('data');
      expect(data.data.project.name).toBe('New Project');
    });

    it('should return validation error when required fields are missing', () => {
      const res = createMockRes();

      sendValidationError(res, 'Project name is required', undefined, 'test-request-id');

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());

      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return forbidden error when user is not organization member', () => {
      const res = createMockRes();

      sendForbidden(res, 'You must be a member of the organization to create a project', 'test-request-id');

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());

      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Method Not Allowed Response Format', () => {
    it('should return 405 for unsupported methods', () => {
      const res = createMockRes();

      sendMethodNotAllowed(res, ['GET', 'POST'], 'test-request-id');

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      // sendMethodNotAllowed uses INVALID_INPUT code
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });
});

describe('V1 Project Member Operations Response Format', () => {
  function createMockRes() {
    const { res } = createMocks<NextApiRequest, NextApiResponse>();
    return res;
  }

  describe('POST /api/v1/projects/:id/members/invite Response Format', () => {
    it('should return success when user is invited', () => {
      const res = createMockRes();
      const mockMember = {
        id: 'user-2',
        email: 'member@example.com',
        name: 'New Member',
        role: 'member',
      };

      sendCreated(res, { message: 'User invited successfully', member: mockMember }, 'test-request-id');

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());

      expect(data.data.message).toBe('User invited successfully');
      expect(data.data.member.name).toBe('New Member');
    });
  });

  describe('DELETE /api/v1/projects/:id/members/:userId Response Format', () => {
    it('should return success when member is removed', () => {
      const res = createMockRes();

      sendSuccess(res, { message: 'Member removed successfully' }, 200, 'test-request-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.data.message).toBe('Member removed successfully');
    });
  });
});

describe('V1 Project Join Request Response Format', () => {
  function createMockRes() {
    const { res } = createMocks<NextApiRequest, NextApiResponse>();
    return res;
  }

  describe('POST /api/v1/projects/:id/join-requests/:requestId/approve Response Format', () => {
    it('should return success when join request is approved', () => {
      const res = createMockRes();

      sendSuccess(res, { message: 'Join request approved' }, 200, 'test-request-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.data.message).toBe('Join request approved');
    });
  });

  describe('POST /api/v1/projects/:id/join-requests/:requestId/reject Response Format', () => {
    it('should return success when join request is rejected', () => {
      const res = createMockRes();

      sendSuccess(res, { message: 'Join request rejected' }, 200, 'test-request-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.data.message).toBe('Join request rejected');
    });
  });
});
