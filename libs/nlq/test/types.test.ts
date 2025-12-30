/**
 * @fileoverview Tests for NLQ type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  QueryIntentSchema,
  CypherQuerySchema,
  NLQErrorSchema,
  NLQResultSchema,
  NLQOptionsSchema,
  GraphSchemaSchema,
  QueryIntentType,
  NLQErrorCode,
} from '../src/types.js';

describe('NLQ Types', () => {
  describe('QueryIntentSchema', () => {
    it('should validate valid query intent', () => {
      const validIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.95,
        entities: ['GPT-4'],
        isAmbiguous: false,
      };

      const result = QueryIntentSchema.safeParse(validIntent);
      expect(result.success).toBe(true);
    });

    it('should validate all intent types', () => {
      const types = Object.values(QueryIntentType);
      for (const type of types) {
        const intent = {
          type,
          confidence: 0.8,
          entities: [],
          isAmbiguous: false,
        };
        const result = QueryIntentSchema.safeParse(intent);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid confidence score', () => {
      const invalidIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 1.5, // > 1
        entities: [],
        isAmbiguous: false,
      };

      const result = QueryIntentSchema.safeParse(invalidIntent);
      expect(result.success).toBe(false);
    });

    it('should accept optional relations and clarificationNeeded', () => {
      const intentWithOptionals = {
        type: 'RELATIONSHIP_QUERY',
        confidence: 0.7,
        entities: ['Transformer'],
        relations: ['DEVELOPED_BY'],
        isAmbiguous: true,
        clarificationNeeded: 'Did you mean the neural network architecture?',
      };

      const result = QueryIntentSchema.safeParse(intentWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('CypherQuerySchema', () => {
    it('should validate valid cypher query', () => {
      const validQuery = {
        cypher: 'MATCH (n:AIModel) RETURN n LIMIT 10',
        isValid: true,
      };

      const result = CypherQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should accept optional parameters', () => {
      const queryWithParams = {
        cypher: 'MATCH (n:AIModel {name: $name}) RETURN n',
        parameters: { name: 'GPT-4' },
        isValid: true,
      };

      const result = CypherQuerySchema.safeParse(queryWithParams);
      expect(result.success).toBe(true);
    });

    it('should accept validation error for invalid queries', () => {
      const invalidQuery = {
        cypher: 'INVALID QUERY',
        isValid: false,
        validationError: 'Syntax error at position 0',
      };

      const result = CypherQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(true);
    });
  });

  describe('NLQErrorSchema', () => {
    it('should validate all error codes', () => {
      const codes = Object.values(NLQErrorCode);
      for (const code of codes) {
        const error = {
          code,
          message: 'Test error message',
        };
        const result = NLQErrorSchema.safeParse(error);
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional suggestions and details', () => {
      const errorWithOptionals = {
        code: 'E-NLQ-001',
        message: 'Failed to parse query',
        suggestions: ['Try rephrasing your question', 'Be more specific'],
        details: { originalQuery: 'test query' },
      };

      const result = NLQErrorSchema.safeParse(errorWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('NLQResultSchema', () => {
    it('should validate successful result', () => {
      const successResult = {
        success: true,
        data: [{ name: 'GPT-4', type: 'AIModel' }],
        cypher: 'MATCH (n:AIModel) RETURN n',
        fallbackUsed: false,
        executionTimeMs: 150,
      };

      const result = NLQResultSchema.safeParse(successResult);
      expect(result.success).toBe(true);
    });

    it('should validate error result', () => {
      const errorResult = {
        success: false,
        fallbackUsed: false,
        executionTimeMs: 50,
        error: {
          code: 'E-NLQ-002',
          message: 'Failed to generate Cypher',
        },
      };

      const result = NLQResultSchema.safeParse(errorResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with fallback', () => {
      const fallbackResult = {
        success: true,
        data: [{ name: 'GPT-4', score: 0.95 }],
        fallbackUsed: true,
        executionTimeMs: 200,
      };

      const result = NLQResultSchema.safeParse(fallbackResult);
      expect(result.success).toBe(true);
    });
  });

  describe('NLQOptionsSchema', () => {
    it('should provide defaults', () => {
      const minimalOptions = {};
      const result = NLQOptionsSchema.parse(minimalOptions);

      expect(result.lang).toBe('ja');
      expect(result.fallback).toBe(true);
      expect(result.maxRetries).toBe(3);
      expect(result.timeout).toBe(30000);
      expect(result.includeEvidence).toBe(true);
    });

    it('should accept custom options', () => {
      const customOptions = {
        lang: 'en',
        fallback: false,
        maxRetries: 5,
        timeout: 60000,
        includeEvidence: false,
      };

      const result = NLQOptionsSchema.parse(customOptions);
      expect(result).toEqual(customOptions);
    });
  });

  describe('GraphSchemaSchema', () => {
    it('should validate valid graph schema', () => {
      const schema = {
        nodeLabels: ['AIModel', 'Person', 'Organization'],
        relationTypes: ['DEVELOPED_BY', 'PUBLISHED_BY'],
        propertyKeys: {
          AIModel: ['name', 'releaseDate', 'parameters'],
          Person: ['name', 'affiliation'],
        },
      };

      const result = GraphSchemaSchema.safeParse(schema);
      expect(result.success).toBe(true);
    });
  });
});
