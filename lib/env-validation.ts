/**
 * 환경 변수 검증 시스템
 *
 * 프로덕션 환경에서 필수 환경 변수가 설정되었는지,
 * 보안 요구사항을 충족하는지 검증합니다.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 환경 변수를 검증합니다.
 * 프로덕션 환경에서는 엄격하게, 개발 환경에서는 느슨하게 검증합니다.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // 필수 환경 변수
  const required = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  // 필수 환경 변수 체크
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // NEXTAUTH_SECRET 검증
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    if (secret.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
    }

    const unsafeSecrets = [
      'your-secret-key-here-change-in-production',
      'secret',
      'changeme',
      'password',
      'test',
      'example',
    ];

    if (unsafeSecrets.some((unsafe) => secret.toLowerCase().includes(unsafe))) {
      if (isProduction) {
        errors.push('NEXTAUTH_SECRET is using an unsafe default value');
      } else {
        warnings.push('NEXTAUTH_SECRET is using an unsafe default value (okay for development)');
      }
    }
  }

  // 프로덕션 환경 추가 검증
  if (isProduction) {
    const url = process.env.NEXTAUTH_URL;
    if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      errors.push('NEXTAUTH_URL should not use localhost in production');
    }

    if (!process.env.ALLOWED_ORIGINS) {
      warnings.push('ALLOWED_ORIGINS not set. Using default CORS configuration.');
    }

    // DATABASE_PATH 체크 (선택사항이지만 권장)
    if (!process.env.DATABASE_PATH) {
      warnings.push('DATABASE_PATH not set. Using default: ./data/kanban.db');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 환경 변수를 검증하고, 에러가 있으면 예외를 발생시킵니다.
 * _app.tsx의 서버 사이드에서 호출됩니다.
 */
export function assertValidEnv(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:');
    result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
  }

  if (!result.valid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach((error) => console.error(`   - ${error}`));
    throw new Error('Environment validation failed. Check your .env file.');
  }

  console.log('✅ Environment validation passed');
}

/**
 * .env.example 파일에 있어야 할 환경 변수 목록을 반환합니다.
 */
export function getRequiredEnvVars(): string[] {
  return [
    'NODE_ENV',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'ALLOWED_ORIGINS',
    'DATABASE_PATH',
  ];
}
