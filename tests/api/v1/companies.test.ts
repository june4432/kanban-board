/**
 * Tests for V1 Companies API response format
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
  sendMethodNotAllowed,
} from '@/lib/api-v1/utils/response';

describe('V1 Companies API Response Format', () => {
  function createMockRes() {
    const { res } = createMocks<NextApiRequest, NextApiResponse>();
    return res;
  }

  describe('GET /api/v1/companies Response Format', () => {
    it('should return companies in correct V1 format', () => {
      const res = createMockRes();
      const mockCompanies = [
        { id: 'comp-1', name: 'Company 1', slug: 'company-1', role: 'owner' },
        { id: 'comp-2', name: 'Company 2', slug: 'company-2', role: 'member' },
      ];

      sendSuccess(res, { companies: mockCompanies }, 200, 'test-request-id');

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      // Verify V1 response structure
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.data.companies).toHaveLength(2);
      expect(data.meta.requestId).toBe('test-request-id');
      expect(data.meta).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/v1/companies Response Format', () => {
    it('should return created company in correct V1 format', () => {
      const res = createMockRes();
      const mockCompany = {
        id: 'new-comp-id',
        name: 'New Company',
        slug: 'new-company',
        plan: 'free',
      };

      sendCreated(res, { company: mockCompany }, 'test-request-id');

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.data.company.name).toBe('New Company');
    });

    it('should return validation error in correct V1 format', () => {
      const res = createMockRes();

      sendValidationError(res, '회사 이름은 필수입니다.', undefined, 'test-request-id');

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('회사 이름은 필수입니다.');
      expect(data.meta.requestId).toBe('test-request-id');
    });
  });

  describe('Method Not Allowed Response Format', () => {
    it('should return 405 with correct format', () => {
      const res = createMockRes();

      sendMethodNotAllowed(res, ['GET', 'POST'], 'test-request-id');

      expect(res._getStatusCode()).toBe(405);
      expect(res._getHeaders().allow).toBe('GET, POST');

      const data = JSON.parse(res._getData());
      // sendMethodNotAllowed uses INVALID_INPUT code
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });
});
