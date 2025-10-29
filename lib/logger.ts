import pino from 'pino';

/**
 * 구조화된 로깅 시스템
 *
 * pino를 사용하여 구조화된 로그를 생성합니다.
 * 개발 환경에서는 pino-pretty로 가독성 있게, 프로덕션에서는 JSON으로 출력합니다.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined, // 프로덕션에서는 JSON으로 출력
});

/**
 * 애플리케이션 에러 클래스
 *
 * 운영상 예상 가능한 에러 (Operational Error)를 표현합니다.
 * statusCode를 포함하여 HTTP 응답에 직접 사용할 수 있습니다.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // TypeScript에서 Error를 상속할 때 필요한 설정
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 에러를 로깅합니다.
 *
 * 개발 환경에서는 전체 스택 트레이스를,
 * 프로덕션에서는 최소한의 정보만 로깅합니다.
 */
export function logError(error: unknown, context: string): void {
  if (error instanceof AppError) {
    // Operational Error - 예상 가능한 에러
    logger.warn(
      {
        context,
        statusCode: error.statusCode,
        message: error.message,
        isOperational: error.isOperational,
      },
      `Operational error in ${context}`
    );
  } else if (error instanceof Error) {
    // Programming Error - 예상하지 못한 에러
    if (process.env.NODE_ENV === 'development') {
      logger.error(
        {
          context,
          message: error.message,
          stack: error.stack,
        },
        `Unexpected error in ${context}`
      );
    } else {
      logger.error(
        {
          context,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        `Unexpected error in ${context}`
      );
    }
  } else {
    // Unknown Error
    logger.error(
      {
        context,
        error: String(error),
      },
      `Unknown error in ${context}`
    );
  }
}

/**
 * 에러를 안전하게 클라이언트에게 반환할 수 있는 형태로 변환합니다.
 *
 * 프로덕션에서는 내부 구현 정보를 노출하지 않습니다.
 */
export function sanitizeError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      return {
        message: error.message,
        statusCode: 500,
      };
    } else {
      return {
        message: 'Internal server error',
        statusCode: 500,
      };
    }
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

/**
 * API 라우트에서 에러를 처리하는 헬퍼 함수
 *
 * 에러를 로깅하고 클라이언트에게 안전한 응답을 반환합니다.
 */
export function handleApiError(error: unknown, context: string): { error: string; statusCode: number } {
  logError(error, context);
  const sanitized = sanitizeError(error);

  return {
    error: sanitized.message,
    statusCode: sanitized.statusCode,
  };
}
