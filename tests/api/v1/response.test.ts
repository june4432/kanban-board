/**
 * Tests for V1 API response utilities
 */
import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendForbidden,
  sendUnauthorized,
  sendMethodNotAllowed,
  sendError,
  sendInternalError,
} from '@/lib/api-v1/utils/response';
import { ApiErrorCode } from '@/lib/api-v1/types';

describe('V1 API Response Utilities', () => {
  function createMockRes() {
    const { res } = createMocks<NextApiRequest, NextApiResponse>();
    return res;
  }

  describe('sendSuccess', () => {
    it('should return 200 status with data', () => {
      const res = createMockRes();
      const testData = { users: [{ id: '1', name: 'Test' }] };
      const requestId = 'test-request-id';

      sendSuccess(res, testData, 200, requestId);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual(testData);
      expect(data.meta.requestId).toBe(requestId);
      expect(data.meta).toHaveProperty('timestamp');
    });

    it('should handle empty data', () => {
      const res = createMockRes();
      sendSuccess(res, {}, 200, 'test-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual({});
    });
  });

  describe('sendCreated', () => {
    it('should return 201 status with data', () => {
      const res = createMockRes();
      const testData = { company: { id: '1', name: 'New Company' } };
      const requestId = 'test-request-id';

      sendCreated(res, testData, requestId);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual(testData);
      expect(data.meta.requestId).toBe(requestId);
    });
  });

  describe('sendNotFound', () => {
    it('should return 404 status with error message', () => {
      const res = createMockRes();
      const message = 'Project';
      const requestId = 'test-request-id';

      sendNotFound(res, message, requestId);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe(`${message} not found`);
      expect(data.meta.requestId).toBe(requestId);
    });
  });

  describe('sendValidationError', () => {
    it('should return 400 status with validation error', () => {
      const res = createMockRes();
      const message = 'Invalid input';
      const requestId = 'test-request-id';

      sendValidationError(res, message, undefined, requestId);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe(message);
    });

    it('should include field details when provided', () => {
      const res = createMockRes();
      const details = [{ field: 'name', message: 'Name is required' }];

      sendValidationError(res, 'Validation failed', details, 'test-id');

      const data = JSON.parse(res._getData());
      expect(data.error.details).toEqual(details);
    });
  });

  describe('sendForbidden', () => {
    it('should return 403 status with forbidden error', () => {
      const res = createMockRes();
      const message = 'Not authorized';
      const requestId = 'test-request-id';

      sendForbidden(res, message, requestId);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe(message);
    });
  });

  describe('sendUnauthorized', () => {
    it('should return 401 status with unauthorized error', () => {
      const res = createMockRes();
      const message = 'Not authenticated';
      const requestId = 'test-request-id';

      sendUnauthorized(res, message, requestId);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe(message);
    });
  });

  describe('sendMethodNotAllowed', () => {
    it('should return 405 status with allowed methods header', () => {
      const res = createMockRes();
      const allowedMethods = ['GET', 'POST'];
      const requestId = 'test-request-id';

      sendMethodNotAllowed(res, allowedMethods, requestId);

      expect(res._getStatusCode()).toBe(405);
      expect(res._getHeaders().allow).toBe('GET, POST');
      const data = JSON.parse(res._getData());
      // sendMethodNotAllowed uses INVALID_INPUT code
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('sendInternalError', () => {
    it('should return 500 status with error', () => {
      const res = createMockRes();

      sendInternalError(res, 'Something went wrong', 'test-id');

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('Something went wrong');
    });
  });

  describe('sendError', () => {
    it('should return specified status with error', () => {
      const res = createMockRes();

      sendError(res, ApiErrorCode.INTERNAL_ERROR, 'Something went wrong', 500, undefined, 'test-id');

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('Something went wrong');
    });
  });
});
