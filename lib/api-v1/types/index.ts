/**
 * API v1 Type Definitions
 * RESTful API standardized types
 */

import { NextApiRequest, NextApiResponse } from 'next';

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

export interface ApiRequest extends NextApiRequest {
  user?: AuthUser;
  organizationId?: string;
  requestId?: string;
  apiKeyScopes?: string[]; // For API key authentication - available scopes
  isApiKeyAuth?: boolean; // True if authenticated via API key (vs session)
}

// ============================================================================
// Response Types
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiPaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

// ============================================================================
// Error Codes
// ============================================================================

export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// HTTP Method Handler Type
// ============================================================================

export type ApiHandler = (
  req: ApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

export interface ApiRouteHandlers {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  PUT?: ApiHandler;
}

// ============================================================================
// Permission Types
// ============================================================================

export enum Permission {
  // Organization
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',
  ORG_MEMBERS_MANAGE = 'org:members:manage',

  // Project
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_MEMBERS_MANAGE = 'project:members:manage',

  // Card
  CARD_CREATE = 'card:create',
  CARD_READ = 'card:read',
  CARD_UPDATE = 'card:update',
  CARD_DELETE = 'card:delete',
  CARD_ASSIGN = 'card:assign',

  // Comment
  COMMENT_CREATE = 'comment:create',
  COMMENT_UPDATE_OWN = 'comment:update:own',
  COMMENT_UPDATE_ANY = 'comment:update:any',
  COMMENT_DELETE_OWN = 'comment:delete:own',
  COMMENT_DELETE_ANY = 'comment:delete:any',
}

export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

// ============================================================================
// Query Filter Types
// ============================================================================

export interface BaseFilters {
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectFilters extends BaseFilters {
  organizationId?: string;
  ownerId?: string;
  isPublic?: boolean;
}

export interface CardFilters extends BaseFilters {
  projectId?: string;
  columnId?: string;
  status?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDateFrom?: string;
  dueDateTo?: string;
  tags?: string[];
}
