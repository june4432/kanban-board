import { validateEnv } from '@/lib/env-validation';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass with valid environment variables', () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32); // 32 characters
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should fail if NEXTAUTH_SECRET is missing', () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow('Missing required environment variable: NEXTAUTH_SECRET');
  });

  it('should fail if NEXTAUTH_URL is missing', () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    delete process.env.NEXTAUTH_URL;

    expect(() => validateEnv()).toThrow('Missing required environment variable: NEXTAUTH_URL');
  });

  it('should fail if NEXTAUTH_SECRET is too short', () => {
    process.env.NEXTAUTH_SECRET = 'short'; // Less than 32 characters
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET must be at least 32 characters long');
  });

  it('should fail if NEXTAUTH_SECRET uses unsafe default value', () => {
    process.env.NEXTAUTH_SECRET = 'your-secret-key-here-change-in-production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET is using an unsafe default value');
  });

  it('should fail if NEXTAUTH_SECRET contains common unsafe strings', () => {
    const unsafeSecrets = ['secret', 'changeme', 'password', '12345678', 'test'];

    unsafeSecrets.forEach((unsafe) => {
      process.env.NEXTAUTH_SECRET = `my${unsafe}key1234567890123456789`; // 32+ characters but contains unsafe string
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET is using an unsafe default value');
    });
  });

  it('should fail if NEXTAUTH_URL is not a valid URL', () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    process.env.NEXTAUTH_URL = 'not-a-valid-url';

    expect(() => validateEnv()).toThrow('NEXTAUTH_URL is not a valid URL');
  });

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should fail if NEXTAUTH_URL uses localhost in production', () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      expect(() => validateEnv()).toThrow('NEXTAUTH_URL should not use localhost in production');
    });

    it('should fail if NEXTAUTH_URL uses 127.0.0.1 in production', () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://127.0.0.1:3000';

      expect(() => validateEnv()).toThrow('NEXTAUTH_URL should not use localhost in production');
    });

    it('should fail if NEXTAUTH_URL does not use HTTPS in production', () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://example.com';

      expect(() => validateEnv()).toThrow('NEXTAUTH_URL must use HTTPS in production');
    });

    it('should pass with HTTPS URL in production', () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'https://example.com';

      expect(() => validateEnv()).not.toThrow();
    });

    it('should warn if ALLOWED_ORIGINS is not set in production', () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'https://example.com';
      delete process.env.ALLOWED_ORIGINS;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => validateEnv()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ALLOWED_ORIGINS is not set in production')
      );

      consoleSpy.mockRestore();
    });
  });
});
