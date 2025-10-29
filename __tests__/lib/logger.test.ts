/**
 * logger.ts 테스트
 *
 * 로깅 시스템과 에러 처리 로직을 테스트합니다.
 */

import { AppError, logError, sanitizeError, handleApiError, logger } from '@/lib/logger';

describe('logger', () => {
  describe('AppError', () => {
    it('기본값으로 AppError를 생성해야 함', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('커스텀 statusCode로 AppError를 생성해야 함', () => {
      const error = new AppError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('isOperational을 false로 설정할 수 있어야 함', () => {
      const error = new AppError('Programming error', 500, false);

      expect(error.message).toBe('Programming error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });

    it('Error 프로토타입 체인이 올바르게 설정되어야 함', () => {
      const error = new AppError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error.constructor.name).toBe('AppError');
    });

    it('스택 트레이스가 포함되어야 함', () => {
      const error = new AppError('Test');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack!.length).toBeGreaterThan(0);
    });

    it('다양한 HTTP 상태 코드를 지원해야 함', () => {
      const errors = [
        new AppError('Bad request', 400),
        new AppError('Unauthorized', 401),
        new AppError('Forbidden', 403),
        new AppError('Not found', 404),
        new AppError('Conflict', 409),
        new AppError('Internal error', 500),
      ];

      expect(errors[0].statusCode).toBe(400);
      expect(errors[1].statusCode).toBe(401);
      expect(errors[2].statusCode).toBe(403);
      expect(errors[3].statusCode).toBe(404);
      expect(errors[4].statusCode).toBe(409);
      expect(errors[5].statusCode).toBe(500);
    });
  });

  describe('logError', () => {
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    });

    afterEach(() => {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('AppError를 warn 레벨로 로깅해야 함', () => {
      const error = new AppError('Test operational error', 400);

      logError(error, 'test-context');

      expect(warnSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          statusCode: 400,
          message: 'Test operational error',
          isOperational: true,
        },
        'Operational error in test-context'
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('일반 Error를 error 레벨로 로깅해야 함 (개발 환경)', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Unexpected error');

      logError(error, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          message: 'Unexpected error',
          stack: expect.any(String),
        },
        'Unexpected error in test-context'
      );
    });

    it('일반 Error를 error 레벨로 로깅해야 함 (프로덕션 환경)', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Unexpected error');

      logError(error, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          message: 'Unexpected error',
          timestamp: expect.any(String),
        },
        'Unexpected error in test-context'
      );
    });

    it('개발 환경에서는 스택 트레이스를 포함해야 함', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      logError(error, 'test-context');

      const callArgs = errorSpy.mock.calls[0][0];
      expect(callArgs.stack).toBeDefined();
    });

    it('프로덕션 환경에서는 스택 트레이스를 포함하지 않아야 함', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      logError(error, 'test-context');

      const callArgs = errorSpy.mock.calls[0][0];
      expect(callArgs.stack).toBeUndefined();
      expect(callArgs.timestamp).toBeDefined();
    });

    it('프로덕션 환경에서는 ISO 타임스탬프를 포함해야 함', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      const beforeTime = new Date().toISOString();

      logError(error, 'test-context');

      const callArgs = errorSpy.mock.calls[0][0];
      const afterTime = new Date().toISOString();

      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.timestamp >= beforeTime && callArgs.timestamp <= afterTime).toBe(true);
    });

    it('Unknown 타입 에러를 로깅해야 함', () => {
      const unknownError = 'string error';

      logError(unknownError, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          error: 'string error',
        },
        'Unknown error in test-context'
      );
    });

    it('null 에러를 로깅해야 함', () => {
      logError(null, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          error: 'null',
        },
        'Unknown error in test-context'
      );
    });

    it('undefined 에러를 로깅해야 함', () => {
      logError(undefined, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          error: 'undefined',
        },
        'Unknown error in test-context'
      );
    });

    it('숫자 에러를 로깅해야 함', () => {
      logError(42, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          error: '42',
        },
        'Unknown error in test-context'
      );
    });

    it('객체 에러를 로깅해야 함', () => {
      const objectError = { code: 'ERR_001', detail: 'Something went wrong' };

      logError(objectError, 'test-context');

      expect(errorSpy).toHaveBeenCalledWith(
        {
          context: 'test-context',
          error: '[object Object]',
        },
        'Unknown error in test-context'
      );
    });
  });

  describe('sanitizeError', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    describe('AppError 처리', () => {
      it('AppError를 그대로 반환해야 함', () => {
        const error = new AppError('User not found', 404);

        const result = sanitizeError(error);

        expect(result).toEqual({
          message: 'User not found',
          statusCode: 404,
        });
      });

      it('다양한 AppError 상태 코드를 처리해야 함', () => {
        const errors = [
          new AppError('Bad request', 400),
          new AppError('Unauthorized', 401),
          new AppError('Forbidden', 403),
          new AppError('Not found', 404),
          new AppError('Internal error', 500),
        ];

        const results = errors.map((err) => sanitizeError(err));

        expect(results[0].statusCode).toBe(400);
        expect(results[1].statusCode).toBe(401);
        expect(results[2].statusCode).toBe(403);
        expect(results[3].statusCode).toBe(404);
        expect(results[4].statusCode).toBe(500);
      });
    });

    describe('일반 Error 처리', () => {
      it('개발 환경에서 Error 메시지를 그대로 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Database connection failed');

        const result = sanitizeError(error);

        expect(result).toEqual({
          message: 'Database connection failed',
          statusCode: 500,
        });
      });

      it('프로덕션 환경에서 Error 메시지를 숨겨야 함', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Database connection failed');

        const result = sanitizeError(error);

        expect(result).toEqual({
          message: 'Internal server error',
          statusCode: 500,
        });
      });

      it('프로덕션 환경에서 민감한 정보를 노출하지 않아야 함', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Password validation failed for user admin@example.com');

        const result = sanitizeError(error);

        expect(result.message).toBe('Internal server error');
        expect(result.message).not.toContain('admin@example.com');
        expect(result.message).not.toContain('Password');
      });
    });

    describe('Unknown 타입 에러 처리', () => {
      it('string 타입 에러를 처리해야 함', () => {
        const result = sanitizeError('Something went wrong');

        expect(result).toEqual({
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      });

      it('null을 처리해야 함', () => {
        const result = sanitizeError(null);

        expect(result).toEqual({
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      });

      it('undefined를 처리해야 함', () => {
        const result = sanitizeError(undefined);

        expect(result).toEqual({
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      });

      it('숫자를 처리해야 함', () => {
        const result = sanitizeError(42);

        expect(result).toEqual({
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      });

      it('객체를 처리해야 함', () => {
        const result = sanitizeError({ code: 'ERR_001' });

        expect(result).toEqual({
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      });
    });
  });

  describe('handleApiError', () => {
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    });

    afterEach(() => {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('에러를 로깅하고 안전한 응답을 반환해야 함', () => {
      const error = new AppError('User not found', 404);

      const result = handleApiError(error, 'get-user');

      expect(warnSpy).toHaveBeenCalled();
      expect(result).toEqual({
        error: 'User not found',
        statusCode: 404,
      });
    });

    it('개발 환경에서 일반 Error를 처리해야 함', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Database error');

      const result = handleApiError(error, 'database-operation');

      expect(errorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        error: 'Database error',
        statusCode: 500,
      });
    });

    it('프로덕션 환경에서 일반 Error를 안전하게 처리해야 함', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal implementation detail');

      const result = handleApiError(error, 'secret-operation');

      expect(errorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        error: 'Internal server error',
        statusCode: 500,
      });
    });

    it('다양한 HTTP 상태 코드를 반환해야 함', () => {
      const errors = [
        { error: new AppError('Bad request', 400), expected: 400 },
        { error: new AppError('Unauthorized', 401), expected: 401 },
        { error: new AppError('Forbidden', 403), expected: 403 },
        { error: new AppError('Not found', 404), expected: 404 },
        { error: new AppError('Conflict', 409), expected: 409 },
        { error: new AppError('Internal', 500), expected: 500 },
      ];

      for (const { error, expected } of errors) {
        const result = handleApiError(error, 'test');
        expect(result.statusCode).toBe(expected);
      }
    });

    it('context를 로거에 전달해야 함', () => {
      const error = new AppError('Test error', 400);
      const context = 'user-registration';

      handleApiError(error, context);

      const logCall = warnSpy.mock.calls[0][0];
      expect(logCall.context).toBe(context);
    });

    it('Unknown 타입 에러를 안전하게 처리해야 함', () => {
      const unknownError = 'string error';

      const result = handleApiError(unknownError, 'unknown-context');

      expect(errorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        error: 'An unexpected error occurred',
        statusCode: 500,
      });
    });

    it('민감한 정보를 클라이언트에 노출하지 않아야 함', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Failed to connect to database at postgres://admin:password@localhost:5432');

      const result = handleApiError(error, 'database');

      expect(result.error).not.toContain('postgres://');
      expect(result.error).not.toContain('password');
      expect(result.error).toBe('Internal server error');
    });
  });
});
