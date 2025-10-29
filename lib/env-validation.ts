/**
 * 환경 변수 검증 시스템
 * 서버 시작 시 필수 환경 변수가 설정되어 있는지 확인합니다.
 */

export function validateEnv() {
  const errors: string[] = [];

  // 필수 환경 변수 목록
  const required: Record<string, string | undefined> = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  // 필수 환경 변수 확인
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // NEXTAUTH_SECRET 검증
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    // 길이 검증 (최소 32자)
    if (secret.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
    }

    // 기본값 사용 검증
    const unsafeSecrets = [
      'your-secret-key-here-change-in-production',
      'secret',
      'changeme',
      'password',
      '12345678',
      'test',
    ];

    if (unsafeSecrets.some((unsafe) => secret.toLowerCase().includes(unsafe))) {
      errors.push('NEXTAUTH_SECRET is using an unsafe default value. Please generate a secure random string.');
    }
  }

  // NEXTAUTH_URL 검증
  const nextauthUrl = process.env.NEXTAUTH_URL;
  if (nextauthUrl) {
    try {
      const url = new URL(nextauthUrl);

      // 프로덕션 환경 추가 검증
      if (process.env.NODE_ENV === 'production') {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          errors.push('NEXTAUTH_URL should not use localhost in production');
        }

        if (url.protocol !== 'https:') {
          errors.push('NEXTAUTH_URL must use HTTPS in production');
        }
      }
    } catch (error) {
      errors.push('NEXTAUTH_URL is not a valid URL');
    }
  }

  // ALLOWED_ORIGINS 검증 (선택적, 하지만 프로덕션에서는 권장)
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      console.warn(
        '⚠️  WARNING: ALLOWED_ORIGINS is not set in production. CORS will use default settings.'
      );
    }
  }

  // 에러가 있으면 예외 발생
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach((error) => console.error(`   - ${error}`));

    throw new Error(
      `Environment validation failed. Please check your .env file and fix the following issues:\n${errors.join('\n')}`
    );
  }

  console.log('✅ Environment validation passed');

  // 설정된 환경 변수 로깅 (민감 정보는 제외)
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Environment variables:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
    console.log(`   - NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '***SET***' : 'NOT SET'}`);
    console.log(`   - ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'NOT SET (using defaults)'}`);
  }
}
