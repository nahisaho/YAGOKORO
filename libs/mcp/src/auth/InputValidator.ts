/**
 * @fileoverview Input Validator
 * TASK-V2-030: Input validation and sanitization
 *
 * Provides validation and sanitization for user inputs to prevent
 * injection attacks and ensure data integrity.
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: unknown;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'TYPE_MISMATCH'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'PATTERN_MISMATCH'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'FORBIDDEN_CHARS'
  | 'INJECTION_DETECTED';

/**
 * Validation schema for a field
 */
export interface FieldSchema {
  /** Field is required */
  required?: boolean;
  /** Expected type */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Minimum length (strings/arrays) */
  minLength?: number;
  /** Maximum length (strings/arrays) */
  maxLength?: number;
  /** Minimum value (numbers) */
  min?: number;
  /** Maximum value (numbers) */
  max?: number;
  /** Regex pattern (strings) */
  pattern?: RegExp;
  /** Custom validator */
  validator?: (value: unknown) => boolean | string;
  /** Sanitization function */
  sanitize?: (value: unknown) => unknown;
}

/**
 * Input schema definition
 */
export type InputSchema = Record<string, FieldSchema>;

/**
 * Input validator interface
 */
export interface InputValidator {
  /**
   * Validate input against schema
   */
  validate(input: Record<string, unknown>, schema: InputSchema): ValidationResult;

  /**
   * Sanitize a string (remove dangerous characters)
   */
  sanitizeString(value: string): string;

  /**
   * Check for potential injection attacks
   */
  detectInjection(value: string): boolean;

  /**
   * Validate entity ID format
   */
  isValidEntityId(id: string): boolean;

  /**
   * Validate Cypher query safety
   */
  isSafeCypherInput(value: string): boolean;
}

// ============================================================================
// Dangerous Patterns
// ============================================================================

/**
 * SQL/Cypher injection patterns
 */
const INJECTION_PATTERNS = [
  // SQL injection
  /('|")\s*(OR|AND)\s*('|")/i,
  /('|")\s*;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)/i,
  /UNION\s+SELECT/i,
  /\/\*.*\*\//,
  // Cypher injection
  /MATCH\s*\(/i,
  /CREATE\s*\(/i,
  /MERGE\s*\(/i,
  /DELETE\s+/i,
  /DETACH\s+DELETE/i,
  /REMOVE\s+/i,
  /SET\s+\w+\s*=/i,
  // Script injection
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  // Command injection
  /;\s*(rm|del|cat|ls|dir|echo|wget|curl)\s/i,
  /\$\(.*\)/,
  /`.*`/,
];

/**
 * Forbidden characters for general input
 */
const FORBIDDEN_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/**
 * Valid entity ID pattern
 */
const ENTITY_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Safe Cypher input pattern (alphanumeric, spaces, basic punctuation)
 */
const SAFE_CYPHER_INPUT = /^[a-zA-Z0-9\s.,_-]*$/;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create input validator
 */
export function createInputValidator(): InputValidator {
  return {
    validate(
      input: Record<string, unknown>,
      schema: InputSchema
    ): ValidationResult {
      const errors: ValidationError[] = [];
      const sanitized: Record<string, unknown> = {};

      for (const [field, fieldSchema] of Object.entries(schema)) {
        const value = input[field];
        const fieldErrors = validateField(field, value, fieldSchema);
        errors.push(...fieldErrors);

        if (fieldErrors.length === 0 && value !== undefined) {
          sanitized[field] = fieldSchema.sanitize
            ? fieldSchema.sanitize(value)
            : value;
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitized: errors.length === 0 ? sanitized : undefined,
      };
    },

    sanitizeString(value: string): string {
      if (typeof value !== 'string') {
        return '';
      }

      return value
        // Remove null bytes
        .replace(/\x00/g, '')
        // Remove other control characters
        .replace(FORBIDDEN_CHARS, '')
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        // Trim whitespace
        .trim();
    },

    detectInjection(value: string): boolean {
      if (typeof value !== 'string') {
        return false;
      }

      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(value)) {
          return true;
        }
      }

      return false;
    },

    isValidEntityId(id: string): boolean {
      if (typeof id !== 'string') {
        return false;
      }
      return ENTITY_ID_PATTERN.test(id);
    },

    isSafeCypherInput(value: string): boolean {
      if (typeof value !== 'string') {
        return false;
      }
      return SAFE_CYPHER_INPUT.test(value);
    },
  };
}

/**
 * Validate a single field
 */
function validateField(
  field: string,
  value: unknown,
  schema: FieldSchema
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required check
  if (schema.required && (value === undefined || value === null)) {
    errors.push({
      field,
      message: `${field} is required`,
      code: 'REQUIRED',
    });
    return errors; // Don't validate further if required field is missing
  }

  // Skip validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return errors;
  }

  // Type check
  if (schema.type) {
    if (!validateType(value, schema.type)) {
      errors.push({
        field,
        message: `${field} must be of type ${schema.type}`,
        code: 'TYPE_MISMATCH',
      });
      return errors; // Don't validate further if type is wrong
    }
  }

  // String validations
  if (typeof value === 'string') {
    // Check for forbidden characters
    if (FORBIDDEN_CHARS.test(value)) {
      errors.push({
        field,
        message: `${field} contains forbidden characters`,
        code: 'FORBIDDEN_CHARS',
      });
    }

    // Check for injection
    const validator = createInputValidator();
    if (validator.detectInjection(value)) {
      errors.push({
        field,
        message: `${field} contains potentially dangerous content`,
        code: 'INJECTION_DETECTED',
      });
    }

    // Min length
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${schema.minLength} characters`,
        code: 'MIN_LENGTH',
      });
    }

    // Max length
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field,
        message: `${field} must be at most ${schema.maxLength} characters`,
        code: 'MAX_LENGTH',
      });
    }

    // Pattern
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push({
        field,
        message: `${field} does not match required pattern`,
        code: 'PATTERN_MISMATCH',
      });
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        field,
        message: `${field} must be at least ${schema.min}`,
        code: 'OUT_OF_RANGE',
      });
    }

    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        field,
        message: `${field} must be at most ${schema.max}`,
        code: 'OUT_OF_RANGE',
      });
    }
  }

  // Array validations
  if (Array.isArray(value)) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field,
        message: `${field} must have at least ${schema.minLength} items`,
        code: 'MIN_LENGTH',
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field,
        message: `${field} must have at most ${schema.maxLength} items`,
        code: 'MAX_LENGTH',
      });
    }
  }

  // Custom validator
  if (schema.validator) {
    const result = schema.validator(value);
    if (result !== true) {
      errors.push({
        field,
        message: typeof result === 'string' ? result : `${field} is invalid`,
        code: 'INVALID_FORMAT',
      });
    }
  }

  return errors;
}

/**
 * Check if value matches expected type
 */
function validateType(
  value: unknown,
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
}

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Common validation schemas
 */
export const COMMON_SCHEMAS = {
  /** Entity ID schema */
  entityId: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 128,
    pattern: ENTITY_ID_PATTERN,
  },

  /** Entity name schema */
  entityName: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 256,
  },

  /** Entity type schema */
  entityType: {
    required: true,
    type: 'string' as const,
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
  },

  /** Limit parameter schema */
  limit: {
    type: 'number' as const,
    min: 1,
    max: 1000,
  },

  /** Offset parameter schema */
  offset: {
    type: 'number' as const,
    min: 0,
  },

  /** Query string schema */
  query: {
    type: 'string' as const,
    minLength: 1,
    maxLength: 4096,
  },
};
