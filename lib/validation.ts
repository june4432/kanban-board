import { z } from 'zod';

/**
 * Zod 스키마를 사용한 입력 검증
 *
 * API 라우트에서 사용자 입력을 검증하여
 * SQL Injection, XSS 등의 보안 취약점을 방지합니다.
 */

// === 프로젝트 관련 스키마 ===

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  isPublic: z.boolean().optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isPublic: z.boolean().optional(),
});

// === 카드 관련 스키마 ===

export const cardSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(200, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  assignees: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  milestoneId: z.string().optional(),
});

export const cardUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  assignees: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  milestoneId: z.string().optional(),
});

export const cardMoveSchema = z.object({
  cardId: z.string(),
  sourceColumnId: z.string(),
  destinationColumnId: z.string(),
  destinationIndex: z.number().int().min(0),
});

// === 사용자 관련 스키마 ===

export const userSignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email format').max(255, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// === 공통 스키마 ===

export const idSchema = z.object({
  id: z.string().min(1),
});

export const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

// === 타입 추출 ===

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type CardInput = z.infer<typeof cardSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
export type CardMoveInput = z.infer<typeof cardMoveSchema>;
export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;

/**
 * Zod 스키마로 데이터를 검증하고 에러를 처리합니다.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Zod 스키마로 데이터를 검증하고 결과를 반환합니다.
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
