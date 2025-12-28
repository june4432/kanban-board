/**
 * Validation Utilities for API v1
 */

import { z } from 'zod';
import { ApiRequest } from '../types';
import { ApiErrors } from '../middleware/error-handler';

// ============================================================================
// Common Validation Schemas
// ============================================================================

// Relaxed ID schema to support various formats: UUID, timestamp, and custom prefixes
export const idSchema = z.string().min(1, 'ID is required').max(100, 'ID too long');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate request body against schema
 */
export function validateBody<T>(
  req: ApiRequest,
  schema: z.ZodSchema<T>
): T {
  // Check if body exists
  if (req.body === undefined || req.body === null) {
    throw ApiErrors.validation('Request body is required', [
      { field: 'body', message: 'Request body cannot be empty' }
    ]);
  }

  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Safely access error details
    if (!result.error || !result.error.issues) {
      console.error('[Validation Debug] result:', JSON.stringify(result, null, 2));
      console.error('[Validation Debug] result.error:', result.error);
      console.error('[Validation Debug] req.body:', req.body);
      throw ApiErrors.validation('Invalid request body', [
        { field: 'body', message: 'Validation failed but no details available' }
      ]);
    }

    const details = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    throw ApiErrors.validation('Invalid request body', details);
  }

  return result.data;
}

/**
 * Validate query parameters against schema
 */
export function validateQuery<T>(
  req: ApiRequest,
  schema: z.ZodSchema<T>
): T {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    // Safely access error details
    if (!result.error || !result.error.issues) {
      throw ApiErrors.validation('Invalid query parameters', [
        { field: 'query', message: 'Validation failed but no details available' }
      ]);
    }

    const details = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    throw ApiErrors.validation('Invalid query parameters', details);
  }

  return result.data;
}

/**
 * Validate path parameter (ID)
 */
export function validateId(value: unknown, paramName: string = 'id'): string {
  const result = idSchema.safeParse(value);

  if (!result.success) {
    throw ApiErrors.validation(`Invalid ${paramName}`, [
      { field: paramName, message: 'Must be a valid UUID' },
    ]);
  }

  return result.data;
}

/**
 * Extract and validate pagination params
 */
export function extractPaginationParams(req: ApiRequest) {
  return validateQuery(req, paginationSchema);
}

// ============================================================================
// Common Field Validators
// ============================================================================

export const validators = {
  email: z.string().email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),

  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format. Use hex format (#RRGGBB)')
    .optional(),

  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),

  status: z.string().optional(),

  date: z.string().datetime('Invalid date format. Use ISO 8601 format').optional(),

  url: z.string().url('Invalid URL format').optional(),

  tags: z.array(z.string()).optional(),

  boolean: z.boolean().optional(),
};

// ============================================================================
// Project Validation Schemas
// ============================================================================

export const createProjectSchema = z.object({
  name: validators.name,
  description: validators.description,
  color: validators.color,
  isPublic: validators.boolean,
  companyId: idSchema.optional(),
  organizationId: idSchema.optional(), // Legacy - optional
});

export const updateProjectSchema = z.object({
  name: validators.name.optional(),
  description: validators.description,
  color: validators.color,
  isPublic: validators.boolean,
});

export const projectFiltersSchema = paginationSchema.extend({
  companyId: idSchema.optional(),
  ownerId: idSchema.optional(),
  isPublic: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// ============================================================================
// Card Validation Schemas
// ============================================================================

export const createCardSchema = z.object({
  projectId: idSchema,
  columnId: idSchema,
  title: validators.name,
  description: validators.description,
  priority: validators.priority,
  assignees: z.array(idSchema).optional(),
  labels: z.array(idSchema).optional(),
  dueDate: validators.date,
  tags: validators.tags,
});

export const updateCardSchema = z.object({
  title: validators.name.optional(),
  description: validators.description,
  priority: validators.priority,
  assignees: z.array(idSchema).optional(),
  labels: z.array(idSchema).optional(),
  dueDate: validators.date,
  tags: validators.tags,
});

export const moveCardSchema = z.object({
  columnId: idSchema,
  position: z.number().int().min(0).optional(),
});

export const cardFiltersSchema = paginationSchema.extend({
  projectId: idSchema.optional(),
  columnId: idSchema.optional(),
  status: z.string().optional(),
  assignee: idSchema.optional(),
  priority: validators.priority,
  dueDateFrom: validators.date,
  dueDateTo: validators.date,
  tags: z.string().optional(), // comma-separated
  search: z.string().optional(),
});
