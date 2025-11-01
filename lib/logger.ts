import pino from 'pino';
import { AppError } from './errors';

/**
 * 구조화된 로깅 시스템
 *
 * pino를 사용하여 구조화된 로그를 생성합니다.
 * 개발 환경에서는 pino-pretty로 가독성 있게, 프로덕션에서는 JSON으로 출력합니다.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
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
 * 에러를 로깅합니다.
 *
 * 개발 환경에서는 전체 스택 트레이스를,
 * 프로덕션에서는 최소한의 정보만 로깅합니다.
 *
 * @param error - 로깅할 에러
 * @param context - 에러가 발생한 컨텍스트 (예: "API /api/cards")
 * @param metadata - 추가 메타데이터 (userId, projectId 등)
 */
export function logError(error: unknown, context: string, metadata?: object): void {
  if (error instanceof AppError) {
    // Operational Error - 예상 가능한 에러
    const level = error.statusCode >= 500 ? 'error' : 'warn';
    logger[level](
      {
        context,
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        isOperational: error.isOperational,
        ...metadata,
      },
      `${error.code || 'OPERATIONAL_ERROR'} in ${context}`
    );
  } else if (error instanceof Error) {
    // Programming Error - 예상하지 못한 에러
    if (process.env.NODE_ENV === 'development') {
      logger.error(
        {
          context,
          message: error.message,
          stack: error.stack,
          ...metadata,
        },
        `Unexpected error in ${context}`
      );
    } else {
      logger.error(
        {
          context,
          message: error.message,
          timestamp: new Date().toISOString(),
          ...metadata,
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
        ...metadata,
      },
      `Unknown error in ${context}`
    );
  }
}

/**
 * API 요청을 로깅합니다.
 *
 * @param method - HTTP 메서드 (GET, POST 등)
 * @param url - 요청 URL
 * @param metadata - 추가 정보 (userId, duration 등)
 */
export function logRequest(method: string, url: string, metadata?: object): void {
  logger.info(
    {
      method,
      url,
      ...metadata,
    },
    `${method} ${url}`
  );
}

/**
 * 중요한 비즈니스 이벤트를 로깅합니다.
 *
 * @param event - 이벤트 이름
 * @param metadata - 이벤트 메타데이터
 */
export function logEvent(event: string, metadata?: object): void {
  logger.info(
    {
      event,
      ...metadata,
    },
    `Event: ${event}`
  );
}

/**
 * 에러를 안전하게 클라이언트에게 반환할 수 있는 형태로 변환합니다.
 *
 * 프로덕션에서는 내부 구현 정보를 노출하지 않습니다.
 */
export function sanitizeError(error: unknown): { message: string; statusCode: number; code?: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      return {
        message: error.message,
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      };
    } else {
      return {
        message: 'Internal server error',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * API 라우트에서 에러를 처리하는 헬퍼 함수
 *
 * 에러를 로깅하고 클라이언트에게 안전한 응답을 반환합니다.
 * @deprecated 대신 error-handler.ts의 withErrorHandler를 사용하세요
 */
export function handleApiError(error: unknown, context: string): { error: string; statusCode: number; code?: string } {
  logError(error, context);
  const sanitized = sanitizeError(error);

  return {
    error: sanitized.message,
    statusCode: sanitized.statusCode,
    code: sanitized.code,
  };
}
