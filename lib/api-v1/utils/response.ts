/**
 * API Response Utilities
 * Standardized response formatting for API v1
 */

import { NextApiResponse } from 'next';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  ApiErrorCode,
  PaginationResult,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Success Responses
// ============================================================================

export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  statusCode: number = 200,
  requestId?: string
): void {
  const response: ApiSuccessResponse<T> = {
    data,
    meta: {
      requestId: requestId || uuidv4(),
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: NextApiResponse,
  data: T,
  requestId?: string
): void {
  sendSuccess(res, data, 201, requestId);
}

export function sendNoContent(res: NextApiResponse): void {
  res.status(204).end();
}

export function sendPaginated<T>(
  res: NextApiResponse,
  result: PaginationResult<T>,
  requestId?: string
): void {
  const response: ApiPaginatedResponse<T> = {
    data: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
    meta: {
      requestId: requestId || uuidv4(),
      timestamp: new Date().toISOString(),
    },
  };

  res.status(200).json(response);
}

// ============================================================================
// Error Responses
// ============================================================================

export function sendError(
  res: NextApiResponse,
  code: ApiErrorCode,
  message: string,
  statusCode: number,
  details?: Array<{ field?: string; message: string }>,
  requestId?: string
): void {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      details,
    },
    meta: {
      requestId: requestId || uuidv4(),
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
}

// Specific error responses

export function sendUnauthorized(
  res: NextApiResponse,
  message: string = 'Unauthorized. Please login first.',
  requestId?: string
): void {
  sendError(res, ApiErrorCode.UNAUTHORIZED, message, 401, undefined, requestId);
}

export function sendForbidden(
  res: NextApiResponse,
  message: string = 'Access denied. Insufficient permissions.',
  requestId?: string
): void {
  sendError(res, ApiErrorCode.FORBIDDEN, message, 403, undefined, requestId);
}

export function sendNotFound(
  res: NextApiResponse,
  resource: string = 'Resource',
  requestId?: string
): void {
  sendError(
    res,
    ApiErrorCode.NOT_FOUND,
    `${resource} not found`,
    404,
    undefined,
    requestId
  );
}

export function sendValidationError(
  res: NextApiResponse,
  message: string,
  details?: Array<{ field?: string; message: string }>,
  requestId?: string
): void {
  sendError(
    res,
    ApiErrorCode.VALIDATION_ERROR,
    message,
    400,
    details,
    requestId
  );
}

export function sendConflict(
  res: NextApiResponse,
  message: string,
  requestId?: string
): void {
  sendError(res, ApiErrorCode.CONFLICT, message, 409, undefined, requestId);
}

export function sendRateLimitError(
  res: NextApiResponse,
  retryAfter: number,
  requestId?: string
): void {
  res.setHeader('Retry-After', retryAfter.toString());
  sendError(
    res,
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    429,
    undefined,
    requestId
  );
}

export function sendInternalError(
  res: NextApiResponse,
  message: string = 'Internal server error',
  requestId?: string
): void {
  sendError(
    res,
    ApiErrorCode.INTERNAL_ERROR,
    message,
    500,
    undefined,
    requestId
  );
}

// ============================================================================
// Method Not Allowed
// ============================================================================

export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[],
  requestId?: string
): void {
  res.setHeader('Allow', allowedMethods.join(', '));
  sendError(
    res,
    ApiErrorCode.INVALID_INPUT,
    `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    405,
    undefined,
    requestId
  );
}
