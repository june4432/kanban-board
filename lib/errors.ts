/**
 * Custom Error Classes
 *
 * 애플리케이션 전반에서 사용할 커스텀 에러 클래스들입니다.
 * 일관된 에러 처리와 적절한 HTTP 상태 코드 반환을 위해 사용합니다.
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found 에러
 * 리소스를 찾을 수 없을 때 사용
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 401 Unauthorized 에러
 * 인증이 필요한 경우 사용
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden 에러
 * 권한이 없는 경우 사용
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 400 Bad Request 에러
 * 입력 검증 실패 시 사용
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public details?: any
  ) {
    super(400, message, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 409 Conflict 에러
 * 중복 데이터 등 충돌이 발생한 경우 사용
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 500 Internal Server Error
 * 예상치 못한 서버 에러 시 사용
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 429 Too Many Requests
 * Rate Limiting 초과 시 사용
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 에러가 운영 가능한 에러인지 확인
 * (예상된 에러 vs 프로그래밍 에러)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
