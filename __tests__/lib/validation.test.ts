/**
 * 입력 검증 테스트
 */

import { projectSchema, cardSchema, userSignupSchema, validate, validateSafe } from '@/lib/validation';

describe('validation', () => {
  describe('projectSchema', () => {
    it('유효한 프로젝트 데이터를 검증해야 함', () => {
      const validData = {
        name: 'Test Project',
        description: 'This is a test project',
        color: '#FF5733',
        isPublic: true,
      };

      const result = validate(projectSchema, validData);

      expect(result).toEqual(validData);
    });

    it('프로젝트 이름이 비어있으면 에러를 반환해야 함', () => {
      const invalidData = {
        name: '',
        description: 'Test',
      };

      expect(() => validate(projectSchema, invalidData)).toThrow();
    });

    it('색상 형식이 잘못되면 에러를 반환해야 함', () => {
      const invalidData = {
        name: 'Test',
        color: 'invalid-color',
      };

      expect(() => validate(projectSchema, invalidData)).toThrow();
    });

    it('프로젝트 이름이 너무 길면 에러를 반환해야 함', () => {
      const invalidData = {
        name: 'A'.repeat(101),
      };

      expect(() => validate(projectSchema, invalidData)).toThrow();
    });
  });

  describe('cardSchema', () => {
    it('유효한 카드 데이터를 검증해야 함', () => {
      const validData = {
        title: 'Test Card',
        description: 'This is a test card',
        priority: 'high',
        assignees: ['user-1', 'user-2'],
        labels: ['label-1'],
      };

      const result = validate(cardSchema, validData);

      expect(result.title).toBe('Test Card');
      expect(result.priority).toBe('high');
    });

    it('카드 제목이 비어있으면 에러를 반환해야 함', () => {
      const invalidData = {
        title: '',
      };

      expect(() => validate(cardSchema, invalidData)).toThrow();
    });

    it('우선순위가 잘못되면 에러를 반환해야 함', () => {
      const invalidData = {
        title: 'Test',
        priority: 'invalid-priority',
      };

      expect(() => validate(cardSchema, invalidData)).toThrow();
    });
  });

  describe('userSignupSchema', () => {
    it('유효한 회원가입 데이터를 검증해야 함', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validate(userSignupSchema, validData);

      expect(result).toEqual(validData);
    });

    it('이메일 형식이 잘못되면 에러를 반환해야 함', () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      expect(() => validate(userSignupSchema, invalidData)).toThrow();
    });

    it('비밀번호가 너무 짧으면 에러를 반환해야 함', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345',
      };

      expect(() => validate(userSignupSchema, invalidData)).toThrow();
    });
  });

  describe('validateSafe', () => {
    it('유효한 데이터의 경우 success: true를 반환해야 함', () => {
      const validData = {
        name: 'Test',
        description: 'Test description',
      };

      const result = validateSafe(projectSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test');
      }
    });

    it('유효하지 않은 데이터의 경우 success: false와 에러를 반환해야 함', () => {
      const invalidData = {
        name: '',
      };

      const result = validateSafe(projectSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });
});
