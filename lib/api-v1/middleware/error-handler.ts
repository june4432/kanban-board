/**
 * Global Error Handler Middleware for API v1
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '../types';
import { sendInternalError, sendValidationError } from '../utils/response';
import { ZodError } from 'zod';

/**
 * Error handler wrapper for API routes
 * Catches all errors and sends appropriate responses
 */
export function withErrorHandler(
  handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: ApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, req, res);
    }
  };
}

/**
 * Handle different types of errors
 */
function handleError(
  error: unknown,
  req: ApiRequest,
  res: NextApiResponse
): void {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    sendValidationError(
      res,
      'Validation failed',
      details,
      req.requestId
    );
    return;
  }

  // Custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Database errors
  if (isDatabaseError(error)) {
    console.error('Database error:', error);
    sendInternalError(res, 'Database operation failed', req.requestId);
    return;
  }

  // Generic errors
  if (error instanceof Error) {
    sendInternalError(res, error.message, req.requestId);
    return;
  }

  // Unknown errors
  sendInternalError(res, 'An unexpected error occurred', req.requestId);
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check if error is a database error
 */
function isDatabaseError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('SQLITE') ||
      error.message.includes('database') ||
      error.message.includes('constraint')
    );
  }
  return false;
}

/**
 * Create common API errors
 */
export const ApiErrors = {
  unauthorized: () =>
    new ApiError('UNAUTHORIZED', 'Authentication required', 401),

  forbidden: (message: string = 'Access denied') =>
    new ApiError('FORBIDDEN', message, 403),

  notFound: (resource: string = 'Resource') =>
    new ApiError('NOT_FOUND', `${resource} not found`, 404),

  conflict: (message: string) =>
    new ApiError('CONFLICT', message, 409),

  validation: (message: string, details?: Array<{ field?: string; message: string }>) =>
    new ApiError('VALIDATION_ERROR', message, 400, details),

  internal: (message: string = 'Internal server error') =>
    new ApiError('INTERNAL_ERROR', message, 500),
};
