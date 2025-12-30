/**
 * @fileoverview Input Validator Tests
 * TASK-V2-030: Tests for InputValidator
 */

import { describe, it, expect } from 'vitest';
import {
  createInputValidator,
  COMMON_SCHEMAS,
  type InputSchema,
} from './InputValidator.js';

describe('InputValidator', () => {
  const validator = createInputValidator();

  describe('validate', () => {
    it('should pass validation for valid input', () => {
      const schema: InputSchema = {
        name: { required: true, type: 'string', minLength: 1 },
        age: { required: true, type: 'number', min: 0 },
      };

      const result = validator.validate(
        { name: 'John', age: 25 },
        schema
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'John', age: 25 });
    });

    it('should fail for missing required field', () => {
      const schema: InputSchema = {
        name: { required: true, type: 'string' },
      };

      const result = validator.validate({}, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should fail for type mismatch', () => {
      const schema: InputSchema = {
        age: { required: true, type: 'number' },
      };

      const result = validator.validate({ age: 'not-a-number' }, schema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('TYPE_MISMATCH');
    });

    it('should validate string length', () => {
      const schema: InputSchema = {
        name: { type: 'string', minLength: 2, maxLength: 10 },
      };

      expect(validator.validate({ name: 'a' }, schema).valid).toBe(false);
      expect(validator.validate({ name: 'ab' }, schema).valid).toBe(true);
      expect(validator.validate({ name: 'a'.repeat(11) }, schema).valid).toBe(false);
    });

    it('should validate number range', () => {
      const schema: InputSchema = {
        value: { type: 'number', min: 0, max: 100 },
      };

      expect(validator.validate({ value: -1 }, schema).valid).toBe(false);
      expect(validator.validate({ value: 50 }, schema).valid).toBe(true);
      expect(validator.validate({ value: 101 }, schema).valid).toBe(false);
    });

    it('should validate pattern', () => {
      const schema: InputSchema = {
        id: { type: 'string', pattern: /^[a-z]+$/ },
      };

      expect(validator.validate({ id: 'valid' }, schema).valid).toBe(true);
      expect(validator.validate({ id: 'INVALID' }, schema).valid).toBe(false);
      expect(validator.validate({ id: '123' }, schema).valid).toBe(false);
    });

    it('should validate array length', () => {
      const schema: InputSchema = {
        items: { type: 'array', minLength: 1, maxLength: 3 },
      };

      expect(validator.validate({ items: [] }, schema).valid).toBe(false);
      expect(validator.validate({ items: [1] }, schema).valid).toBe(true);
      expect(validator.validate({ items: [1, 2, 3, 4] }, schema).valid).toBe(false);
    });

    it('should use custom validator', () => {
      const schema: InputSchema = {
        email: {
          type: 'string',
          validator: (v) => {
            const str = v as string;
            return str.includes('@') || 'Must be an email';
          },
        },
      };

      expect(validator.validate({ email: 'test@example.com' }, schema).valid).toBe(true);
      const result = validator.validate({ email: 'invalid' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('Must be an email');
    });

    it('should apply sanitization', () => {
      const schema: InputSchema = {
        name: {
          type: 'string',
          sanitize: (v) => (v as string).trim().toLowerCase(),
        },
      };

      const result = validator.validate({ name: '  HELLO  ' }, schema);
      expect(result.sanitized).toEqual({ name: 'hello' });
    });

    it('should skip optional fields', () => {
      const schema: InputSchema = {
        optional: { type: 'string' },
      };

      const result = validator.validate({}, schema);
      expect(result.valid).toBe(true);
    });

    it('should detect injection attacks', () => {
      const schema: InputSchema = {
        query: { type: 'string' },
      };

      const injectionInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        '<script>alert("xss")</script>',
        'UNION SELECT * FROM users',
      ];

      for (const input of injectionInputs) {
        const result = validator.validate({ query: input }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'INJECTION_DETECTED')).toBe(true);
      }
    });

    it('should reject forbidden characters', () => {
      const schema: InputSchema = {
        text: { type: 'string' },
      };

      // Null byte
      const result = validator.validate({ text: 'hello\x00world' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FORBIDDEN_CHARS');
    });
  });

  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      expect(validator.sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should escape HTML entities', () => {
      expect(validator.sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(validator.sanitizeString('"hello"')).toBe('&quot;hello&quot;');
      expect(validator.sanitizeString("'world'")).toBe('&#x27;world&#x27;');
    });

    it('should trim whitespace', () => {
      expect(validator.sanitizeString('  hello  ')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(validator.sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(validator.sanitizeString(123 as unknown as string)).toBe('');
    });
  });

  describe('detectInjection', () => {
    it('should detect SQL injection', () => {
      expect(validator.detectInjection("'; DROP TABLE --")).toBe(true);
      expect(validator.detectInjection("' OR '1'='1")).toBe(true);
      expect(validator.detectInjection('UNION SELECT')).toBe(true);
    });

    it('should detect Cypher injection', () => {
      expect(validator.detectInjection('MATCH (n) DELETE n')).toBe(true);
      expect(validator.detectInjection('CREATE (n:Test)')).toBe(true);
      expect(validator.detectInjection('DETACH DELETE')).toBe(true);
    });

    it('should detect script injection', () => {
      expect(validator.detectInjection('<script>')).toBe(true);
      expect(validator.detectInjection('javascript:alert()')).toBe(true);
      expect(validator.detectInjection('onclick="alert()"')).toBe(true);
    });

    it('should detect command injection', () => {
      expect(validator.detectInjection('; rm -rf /')).toBe(true);
      expect(validator.detectInjection('$(whoami)')).toBe(true);
      expect(validator.detectInjection('`ls -la`')).toBe(true);
    });

    it('should allow safe input', () => {
      expect(validator.detectInjection('Hello World')).toBe(false);
      expect(validator.detectInjection('GPT-4')).toBe(false);
      expect(validator.detectInjection('user@example.com')).toBe(false);
    });
  });

  describe('isValidEntityId', () => {
    it('should accept valid entity IDs', () => {
      expect(validator.isValidEntityId('entity-123')).toBe(true);
      expect(validator.isValidEntityId('Entity_456')).toBe(true);
      expect(validator.isValidEntityId('abc')).toBe(true);
    });

    it('should reject invalid entity IDs', () => {
      expect(validator.isValidEntityId('')).toBe(false);
      expect(validator.isValidEntityId('entity with spaces')).toBe(false);
      expect(validator.isValidEntityId('entity.dot')).toBe(false);
      expect(validator.isValidEntityId('a'.repeat(129))).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(validator.isValidEntityId(123 as unknown as string)).toBe(false);
    });
  });

  describe('isSafeCypherInput', () => {
    it('should accept safe input', () => {
      expect(validator.isSafeCypherInput('GPT-4')).toBe(true);
      expect(validator.isSafeCypherInput('Hello World')).toBe(true);
      expect(validator.isSafeCypherInput('test_value')).toBe(true);
    });

    it('should reject unsafe input', () => {
      expect(validator.isSafeCypherInput("test' OR '1'='1")).toBe(false);
      expect(validator.isSafeCypherInput('test{}')).toBe(false);
      expect(validator.isSafeCypherInput('test()')).toBe(false);
    });
  });

  describe('COMMON_SCHEMAS', () => {
    it('should validate entity ID with common schema', () => {
      const schema: InputSchema = {
        id: COMMON_SCHEMAS.entityId,
      };

      expect(validator.validate({ id: 'valid-id' }, schema).valid).toBe(true);
      expect(validator.validate({ id: '' }, schema).valid).toBe(false);
      expect(validator.validate({}, schema).valid).toBe(false);
    });

    it('should validate entity type with common schema', () => {
      const schema: InputSchema = {
        type: COMMON_SCHEMAS.entityType,
      };

      expect(validator.validate({ type: 'AIModel' }, schema).valid).toBe(true);
      expect(validator.validate({ type: 'aimodel' }, schema).valid).toBe(false);
      expect(validator.validate({ type: '123' }, schema).valid).toBe(false);
    });

    it('should validate limit with common schema', () => {
      const schema: InputSchema = {
        limit: COMMON_SCHEMAS.limit,
      };

      expect(validator.validate({ limit: 50 }, schema).valid).toBe(true);
      expect(validator.validate({ limit: 0 }, schema).valid).toBe(false);
      expect(validator.validate({ limit: 1001 }, schema).valid).toBe(false);
    });
  });
});
