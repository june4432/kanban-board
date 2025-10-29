/**
 * env-validation.ts 테스트
 *
 * 환경 변수 검증 로직을 테스트합니다.
 */

import { validateEnv, assertValidEnv, getRequiredEnvVars } from '@/lib/env-validation';

describe('env-validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    describe('필수 환경 변수 검증', () => {
      it('모든 필수 환경 변수가 있으면 valid: true를 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('NEXTAUTH_SECRET이 없으면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.NEXTAUTH_SECRET;
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_SECRET');
      });

      it('NEXTAUTH_URL이 없으면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        delete process.env.NEXTAUTH_URL;

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_URL');
      });

      it('모든 필수 환경 변수가 없으면 여러 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.NEXTAUTH_URL;

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_SECRET');
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_URL');
      });
    });

    describe('NEXTAUTH_SECRET 검증', () => {
      it('NEXTAUTH_SECRET이 32자 미만이면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'short-secret';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NEXTAUTH_SECRET must be at least 32 characters long');
      });

      it('NEXTAUTH_SECRET이 정확히 32자면 통과해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('개발 환경에서 unsafe secret을 사용하면 warning을 반환해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'secret'.repeat(10); // 60 chars but unsafe
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(true); // Valid in dev
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toContain(
          'NEXTAUTH_SECRET is using an unsafe default value (okay for development)'
        );
      });

      it('프로덕션 환경에서 unsafe secret을 사용하면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'secret'.repeat(10);
        process.env.NEXTAUTH_URL = 'https://example.com';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NEXTAUTH_SECRET is using an unsafe default value');
      });

      it('다양한 unsafe secret 패턴을 감지해야 함', () => {
        const unsafePatterns = [
          'your-secret-key-here-change-in-production-aaaa',
          'changeme'.repeat(5),
          'password'.repeat(5),
          'test'.repeat(10),
          'example'.repeat(10),
        ];

        for (const unsafe of unsafePatterns) {
          process.env.NODE_ENV = 'production';
          process.env.NEXTAUTH_SECRET = unsafe;
          process.env.NEXTAUTH_URL = 'https://example.com';

          const result = validateEnv();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('NEXTAUTH_SECRET is using an unsafe default value');
        }
      });

      it('안전한 랜덤 secret은 통과해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'xK9mP2qW7nL5jR8vT3yH6fD1sA4gB0cZ'; // Random safe secret
        process.env.NEXTAUTH_URL = 'https://example.com';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('프로덕션 환경 검증', () => {
      it('프로덕션에서 localhost URL을 사용하면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NEXTAUTH_URL should not use localhost in production');
      });

      it('프로덕션에서 127.0.0.1 URL을 사용하면 에러를 반환해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://127.0.0.1:3000';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NEXTAUTH_URL should not use localhost in production');
      });

      it('프로덕션에서 적절한 URL을 사용하면 통과해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'https://example.com';
        process.env.ALLOWED_ORIGINS = 'https://example.com';
        process.env.DATABASE_PATH = './data/kanban.db';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('프로덕션에서 ALLOWED_ORIGINS이 없으면 warning을 반환해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'https://example.com';
        delete process.env.ALLOWED_ORIGINS;

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain(
          'ALLOWED_ORIGINS not set. Using default CORS configuration.'
        );
      });

      it('프로덕션에서 DATABASE_PATH가 없으면 warning을 반환해야 함', () => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'https://example.com';
        delete process.env.DATABASE_PATH;

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('DATABASE_PATH not set. Using default: ./data/kanban.db');
      });
    });

    describe('개발 환경 검증', () => {
      it('개발 환경에서는 localhost URL을 허용해야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('개발 환경에서 ALLOWED_ORIGINS이 없어도 warning이 없어야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        delete process.env.ALLOWED_ORIGINS;

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).not.toContain(
          'ALLOWED_ORIGINS not set. Using default CORS configuration.'
        );
      });

      it('개발 환경에서 DATABASE_PATH가 없어도 warning이 없어야 함', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        delete process.env.DATABASE_PATH;

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).not.toContain(
          'DATABASE_PATH not set. Using default: ./data/kanban.db'
        );
      });
    });
  });

  describe('assertValidEnv', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('환경 변수가 유효하면 예외를 발생시키지 않아야 함', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      expect(() => assertValidEnv()).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed');
    });

    it('환경 변수가 유효하지 않으면 예외를 발생시켜야 함', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_URL;

      expect(() => assertValidEnv()).toThrow('Environment validation failed. Check your .env file.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Environment validation failed:');
    });

    it('warning이 있으면 콘솔에 출력해야 함', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'secret'.repeat(10); // Unsafe but long enough
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      expect(() => assertValidEnv()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Environment validation warnings:');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed');
    });

    it('에러 메시지를 모두 출력해야 함', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_URL;

      expect(() => assertValidEnv()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '   - Missing required environment variable: NEXTAUTH_SECRET'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '   - Missing required environment variable: NEXTAUTH_URL'
      );
    });

    it('warning 메시지를 모두 출력해야 함', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'https://example.com';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.DATABASE_PATH;

      expect(() => assertValidEnv()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '   - ALLOWED_ORIGINS not set. Using default CORS configuration.'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '   - DATABASE_PATH not set. Using default: ./data/kanban.db'
      );
    });
  });

  describe('getRequiredEnvVars', () => {
    it('필수 환경 변수 목록을 반환해야 함', () => {
      const required = getRequiredEnvVars();

      expect(required).toContain('NODE_ENV');
      expect(required).toContain('NEXTAUTH_URL');
      expect(required).toContain('NEXTAUTH_SECRET');
      expect(required).toContain('ALLOWED_ORIGINS');
      expect(required).toContain('DATABASE_PATH');
    });

    it('빈 배열이 아니어야 함', () => {
      const required = getRequiredEnvVars();
      expect(required.length).toBeGreaterThan(0);
    });
  });
});
