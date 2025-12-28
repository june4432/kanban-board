/**
 * Test utilities for V1 API testing
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks, RequestMethod } from 'node-mocks-http';

// Mock user for authenticated requests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
};

// Mock company
export const mockCompany = {
  id: 'test-company-id',
  name: 'Test Company',
  slug: 'test-company',
};

// Mock organization
export const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  slug: 'test-org',
  companyId: 'test-company-id',
};

// Mock project
export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  slug: 'test-project',
  description: 'A test project',
  ownerId: 'test-user-id',
  organizationId: 'test-org-id',
};

// Create mock request/response pair
export function createMockApiContext(options?: {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | string[]>;
  user?: typeof mockUser | null;
}) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: (options?.method || 'GET') as RequestMethod,
    body: options?.body || {},
    query: options?.query || {},
  });

  // Add user to request if authenticated
  if (options?.user !== null) {
    (req as any).user = options?.user || mockUser;
  }

  return { req, res };
}

// Helper to get JSON response data
export function getResponseData(res: any) {
  return JSON.parse(res._getData());
}

// Helper to assert V1 API response format
export function assertV1ResponseFormat(data: any) {
  expect(data).toHaveProperty('meta');
  expect(data.meta).toHaveProperty('requestId');
  expect(data.meta).toHaveProperty('timestamp');
}

// Helper to assert V1 API error response format
export function assertV1ErrorFormat(data: any) {
  expect(data).toHaveProperty('error');
  expect(data.error).toHaveProperty('code');
  expect(data.error).toHaveProperty('message');
  expect(data).toHaveProperty('meta');
}
