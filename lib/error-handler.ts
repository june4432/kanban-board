/**
 * Error Handler Middleware
 *
 * API 라우트에서 발생하는 에러를 일관되게 처리합니다.
 * - 커스텀 에러 → 적절한 HTTP 상태 코드와 메시지
 * - Zod 검증 에러 → 400 Bad Request with details
 * - 예상치 못한 에러 → 500 Internal Server Error (프로덕션에서는 상세 정보 숨김)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger, logError } from './logger';

/**
 * 에러를 처리하고 적절한 HTTP 응답을 보냅니다.
 */
export function errorHandler(
  error: unknown,
  req: NextApiRequest,
  res: NextApiResponse
): void {
  // 에러 로깅
  const context = `${req.method} ${req.url}`;
  logError(error, context, {
    userId: (req as any).session?.user?.id,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  });

  // 이미 응답이 전송된 경우 무시
  if (res.headersSent) {
    return;
  }

  // Zod 검증 에러
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // 커스텀 AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error.statusCode === 400 && (error as any).details
        ? { details: (error as any).details }
        : {}),
    });
  }

  // 일반 Error 객체
  if (error instanceof Error) {
    // 프로덕션: 상세 정보 숨김
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }

    // 개발: 상세 정보 제공
    return res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR',
      stack: error.stack?.split('\n').slice(0, 5), // 스택 트레이스 일부만
    });
  }

  // 알 수 없는 에러 타입
  logger.error({ error, context }, 'Unknown error type');
  return res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  });
}

/**
 * API 핸들러를 래핑하여 자동으로 에러를 처리합니다.
 *
 * @example
 * export default withErrorHandler(async (req, res) => {
 *   // 여기서 에러가 발생하면 자동으로 처리됨
 *   throw new NotFoundError('Card');
 * });
 */
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
}

/**
 * 비동기 함수를 래핑하여 에러를 캐치합니다.
 * Repository나 Service 메서드에서 사용할 수 있습니다.
 */
export function catchAsync<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      // 에러를 다시 throw하여 상위에서 처리하도록 함
      throw error;
    }
  };
}
