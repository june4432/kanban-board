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
  dueDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
  assignees: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  milestoneId: z.union([z.string(), z.null()]).optional(),
});

export const cardUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
  assignees: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  milestoneId: z.union([z.string(), z.null()]).optional(),
});

export const cardMoveSchema = z.object({
  cardId: z.string(),
  sourceColumnId: z.string(),
  destinationColumnId: z.string(),
  destinationIndex: z.number().int().min(0),
});

// === 사용자 관련 스키마 ===

export const userSignupSchema = z.object({
  name: z.string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z\s]+$/, '이름에는 한글, 영문, 공백만 사용 가능합니다'),
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .max(255, '이메일은 최대 255자까지 가능합니다')
    .toLowerCase(),
  password: z.string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 가능합니다')
    .regex(/[A-Z]/, '비밀번호에 대문자가 포함되어야 합니다')
    .regex(/[a-z]/, '비밀번호에 소문자가 포함되어야 합니다')
    .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '비밀번호에 특수문자가 포함되어야 합니다'),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// === 댓글 관련 스키마 ===

export const commentSchema = z.object({
  content: z.string()
    .min(1, '댓글 내용은 필수입니다')
    .max(2000, '댓글은 최대 2000자까지 가능합니다'),
  parentId: z.string().optional(),
});

export const commentUpdateSchema = z.object({
  content: z.string()
    .min(1, '댓글 내용은 필수입니다')
    .max(2000, '댓글은 최대 2000자까지 가능합니다'),
});

// === 멤버 관리 스키마 ===

export const projectJoinRequestSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().max(500).optional(),
});

export const projectMemberRoleSchema = z.object({
  role: z.enum(['owner', 'member']),
});

// === 공통 스키마 ===

export const idSchema = z.object({
  id: z.string().min(1),
});

export const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// === 파일 업로드 스키마 ===

export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 최대 10MB
});

// === 알림 설정 스키마 ===

export const notificationSettingsSchema = z.object({
  cardCreated: z.boolean().optional(),
  cardUpdated: z.boolean().optional(),
  cardDeleted: z.boolean().optional(),
  cardAssigned: z.boolean().optional(),
  cardDueSoon: z.boolean().optional(),
  commentCreated: z.boolean().optional(),
  commentMentioned: z.boolean().optional(),
  projectInvited: z.boolean().optional(),
  projectUpdated: z.boolean().optional(),
  muted: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

// === 타입 추출 ===

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type CardInput = z.infer<typeof cardSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
export type CardMoveInput = z.infer<typeof cardMoveSchema>;
export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;
export type ProjectJoinRequestInput = z.infer<typeof projectJoinRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

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
