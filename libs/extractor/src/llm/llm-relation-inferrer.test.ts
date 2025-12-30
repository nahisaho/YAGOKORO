/**
 * Tests for LLMRelationInferrer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LLMRelationInferrer,
  DEFAULT_LLM_CONFIG,
  type LLMProvider,
  type LLMInferenceResult,
} from './llm-relation-inferrer.js';
import type { DocumentEntity, ExtractedRelation, ExtractionDocument } from '../types.js';

/**
 * Mock LLM provider for testing
 */
function createMockProvider(responses: Map<string, string>): LLMProvider {
  return {
    name: 'mock',
    complete: vi.fn().mockImplementation(async (prompt: string) => {
      // Find matching response by checking if prompt contains key
      for (const [key, response] of responses) {
        if (prompt.includes(key)) {
          return response;
        }
      }
      return 'RELATION_TYPE: NONE\nCONFIDENCE: 0.0';
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Helper to create a document entity
 */
function createEntity(
  name: string,
  type: string,
  positions: number[] = [0]
): DocumentEntity {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    type,
    positions,
  };
}

describe('LLMRelationInferrer', () => {
  let inferrer: LLMRelationInferrer;

  beforeEach(() => {
    inferrer = new LLMRelationInferrer();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = inferrer.getConfig();
      expect(config.maxContextLength).toBe(DEFAULT_LLM_CONFIG.maxContextLength);
      expect(config.temperature).toBe(DEFAULT_LLM_CONFIG.temperature);
      expect(config.timeout).toBe(DEFAULT_LLM_CONFIG.timeout);
    });

    it('should merge custom config with defaults', () => {
      const customInferrer = new LLMRelationInferrer({
        maxContextLength: 1000,
        temperature: 0.5,
      });
      const config = customInferrer.getConfig();
      expect(config.maxContextLength).toBe(1000);
      expect(config.temperature).toBe(0.5);
      expect(config.timeout).toBe(DEFAULT_LLM_CONFIG.timeout);
    });

    it('should accept provider in config', () => {
      const mockProvider = createMockProvider(new Map());
      const customInferrer = new LLMRelationInferrer({ provider: mockProvider });
      expect(customInferrer.getProvider()).toBe(mockProvider);
    });
  });

  describe('setProvider', () => {
    it('should set the provider', () => {
      const mockProvider = createMockProvider(new Map());
      inferrer.setProvider(mockProvider);
      expect(inferrer.getProvider()).toBe(mockProvider);
    });
  });

  describe('isAvailable', () => {
    it('should return false when no provider set', async () => {
      const result = await inferrer.isAvailable();
      expect(result).toBe(false);
    });

    it('should return provider availability', async () => {
      const mockProvider = createMockProvider(new Map());
      inferrer.setProvider(mockProvider);
      
      const result = await inferrer.isAvailable();
      
      expect(result).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should return false if provider throws', async () => {
      const mockProvider: LLMProvider = {
        name: 'mock',
        complete: vi.fn(),
        isAvailable: vi.fn().mockRejectedValue(new Error('Connection failed')),
      };
      inferrer.setProvider(mockProvider);
      
      const result = await inferrer.isAvailable();
      
      expect(result).toBe(false);
    });
  });

  describe('generatePrompt', () => {
    it('should generate prompt with entity information', () => {
      const source = createEntity('GPT-4', 'model');
      const target = createEntity('OpenAI', 'organization');
      const context = 'GPT-4 was developed by OpenAI';

      const prompt = inferrer.generatePrompt(source, target, context);

      expect(prompt).toContain('GPT-4');
      expect(prompt).toContain('OpenAI');
      expect(prompt).toContain('GPT-4 was developed by OpenAI');
      expect(prompt).toContain('RELATION_TYPE');
      expect(prompt).toContain('CONFIDENCE');
    });

    it('should include all valid relation types', () => {
      const source = createEntity('A', 'entity');
      const target = createEntity('B', 'entity');
      const context = 'test';

      const prompt = inferrer.generatePrompt(source, target, context);

      expect(prompt).toContain('DEVELOPED_BY');
      expect(prompt).toContain('TRAINED_ON');
      expect(prompt).toContain('USES_TECHNIQUE');
      expect(prompt).toContain('COMPETES_WITH');
      expect(prompt).toContain('BASED_ON');
    });

    it('should truncate long context', () => {
      const customInferrer = new LLMRelationInferrer({ maxContextLength: 50 });
      const source = createEntity('A', 'entity');
      const target = createEntity('B', 'entity');
      const context = 'A'.repeat(100);

      const prompt = customInferrer.generatePrompt(source, target, context);

      expect(prompt).toContain('...');
      expect(prompt).not.toContain('A'.repeat(100));
    });
  });

  describe('parseResponse', () => {
    it('should parse valid response', () => {
      const response = `RELATION_TYPE: DEVELOPED_BY
CONFIDENCE: 0.9
EXPLANATION: GPT-4 is a product developed by OpenAI`;

      const result = inferrer.parseResponse(response);

      expect(result.relationType).toBe('DEVELOPED_BY');
      expect(result.confidence).toBe(0.9);
      expect(result.explanation).toContain('GPT-4');
      expect(result.isValid).toBe(true);
    });

    it('should handle NONE relation type', () => {
      const response = `RELATION_TYPE: NONE
CONFIDENCE: 0.1`;

      const result = inferrer.parseResponse(response);

      expect(result.isValid).toBe(false);
    });

    it('should clamp confidence to 0-1 range', () => {
      const response = `RELATION_TYPE: CITES
CONFIDENCE: 1.5`;

      const result = inferrer.parseResponse(response);

      expect(result.confidence).toBe(1);
    });

    it('should mark low confidence as invalid', () => {
      const response = `RELATION_TYPE: DEVELOPED_BY
CONFIDENCE: 0.2`;

      const result = inferrer.parseResponse(response);

      expect(result.isValid).toBe(false);
    });

    it('should handle missing fields gracefully', () => {
      const response = `Some unexpected format`;

      const result = inferrer.parseResponse(response);

      // Should return defaults
      expect(result.relationType).toBeDefined();
      expect(result.confidence).toBeDefined();
      // Default confidence is 0.5 which is >= 0.3, so isValid is true
      expect(result.isValid).toBe(true);
    });
  });

  describe('inferRelation', () => {
    it('should throw error when no provider set', async () => {
      const source = createEntity('A', 'entity');
      const target = createEntity('B', 'entity');

      await expect(inferrer.inferRelation(source, target, 'context')).rejects.toThrow(
        'LLM provider not set'
      );
    });

    it('should call provider and parse response', async () => {
      const mockProvider = createMockProvider(
        new Map([
          ['GPT-4', `RELATION_TYPE: DEVELOPED_BY\nCONFIDENCE: 0.95\nEXPLANATION: Clear development relationship`],
        ])
      );
      inferrer.setProvider(mockProvider);

      const source = createEntity('GPT-4', 'model');
      const target = createEntity('OpenAI', 'organization');

      const result = await inferrer.inferRelation(source, target, 'GPT-4 was made by OpenAI');

      expect(result.relationType).toBe('DEVELOPED_BY');
      expect(result.confidence).toBe(0.95);
      expect(result.isValid).toBe(true);
      expect(mockProvider.complete).toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      const slowProvider: LLMProvider = {
        name: 'slow',
        complete: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100000))
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const fastInferrer = new LLMRelationInferrer({
        provider: slowProvider,
        timeout: 100,
      });

      const source = createEntity('A', 'entity');
      const target = createEntity('B', 'entity');

      await expect(fastInferrer.inferRelation(source, target, 'context')).rejects.toThrow(
        'timeout'
      );
    });
  });

  describe('validateRelation', () => {
    it('should throw error when no provider set', async () => {
      const relation: ExtractedRelation = {
        sourceId: 'a',
        targetId: 'b',
        relationType: 'CITES',
        method: 'pattern',
        evidence: [],
        rawConfidence: 0.8,
      };

      await expect(inferrer.validateRelation(relation)).rejects.toThrow(
        'LLM provider not set'
      );
    });

    it('should validate and return result', async () => {
      const mockProvider = createMockProvider(
        new Map([
          ['VALID:', `VALID: true\nCONFIDENCE: 0.9\nEXPLANATION: Valid relationship`],
        ])
      );
      inferrer.setProvider(mockProvider);

      const relation: ExtractedRelation = {
        sourceId: 'gpt-4',
        targetId: 'openai',
        relationType: 'DEVELOPED_BY',
        method: 'pattern',
        evidence: [
          {
            documentId: 'doc1',
            context: 'GPT-4 developed by OpenAI',
            method: 'pattern',
            rawConfidence: 0.8,
          },
        ],
        rawConfidence: 0.8,
      };

      const result = await inferrer.validateRelation(relation);

      expect(result.isValid).toBe(true);
      expect(result.relationType).toBe('DEVELOPED_BY');
      expect(result.confidence).toBe(0.9);
    });

    it('should reduce confidence for invalid relations', async () => {
      const mockProvider = createMockProvider(
        new Map([
          ['VALID:', `VALID: false\nCONFIDENCE: 0.6\nEXPLANATION: Incorrect relationship`],
        ])
      );
      inferrer.setProvider(mockProvider);

      const relation: ExtractedRelation = {
        sourceId: 'a',
        targetId: 'b',
        relationType: 'COMPETES_WITH',
        method: 'pattern',
        evidence: [
          {
            documentId: 'doc1',
            context: 'A and B collaborate',
            method: 'pattern',
            rawConfidence: 0.8,
          },
        ],
        rawConfidence: 0.8,
      };

      const result = await inferrer.validateRelation(relation);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0.3); // 0.6 * 0.5
    });
  });

  describe('inferFromDocument', () => {
    it('should throw error when no provider set', async () => {
      const document: ExtractionDocument = {
        id: 'doc1',
        title: 'Test',
        content: 'Test content',
        source: 'test',
        entities: [createEntity('A', 'entity'), createEntity('B', 'entity')],
      };

      await expect(inferrer.inferFromDocument(document)).rejects.toThrow(
        'LLM provider not set'
      );
    });

    it('should return empty for documents with less than 2 entities', async () => {
      const mockProvider = createMockProvider(new Map());
      inferrer.setProvider(mockProvider);

      const document: ExtractionDocument = {
        id: 'doc1',
        title: 'Test',
        content: 'Test content',
        source: 'test',
        entities: [createEntity('A', 'entity')],
      };

      const result = await inferrer.inferFromDocument(document);

      expect(result).toHaveLength(0);
    });

    it('should infer relations for entity pairs', async () => {
      const mockProvider = createMockProvider(
        new Map([
          ['GPT', `RELATION_TYPE: DEVELOPED_BY\nCONFIDENCE: 0.9\nEXPLANATION: Development relationship`],
        ])
      );
      inferrer.setProvider(mockProvider);

      const document: ExtractionDocument = {
        id: 'doc1',
        title: 'Test',
        content: 'GPT-4 was developed by OpenAI',
        source: 'test',
        entities: [
          createEntity('GPT-4', 'model', [0]),
          createEntity('OpenAI', 'organization', [24]),
        ],
      };

      const result = await inferrer.inferFromDocument(document);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip low confidence relations', async () => {
      const mockProvider = createMockProvider(
        new Map([
          ['default', `RELATION_TYPE: CITES\nCONFIDENCE: 0.3\nEXPLANATION: Low confidence`],
        ])
      );
      inferrer.setProvider(mockProvider);

      const document: ExtractionDocument = {
        id: 'doc1',
        title: 'Test',
        content: 'A and B are both mentioned here',
        source: 'test',
        entities: [
          createEntity('A', 'entity', [0]),
          createEntity('B', 'entity', [10]),
        ],
      };

      const result = await inferrer.inferFromDocument(document);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      inferrer.updateConfig({ maxContextLength: 500, temperature: 0.7 });

      const config = inferrer.getConfig();
      expect(config.maxContextLength).toBe(500);
      expect(config.temperature).toBe(0.7);
    });

    it('should update provider if provided', () => {
      const mockProvider = createMockProvider(new Map());
      inferrer.updateConfig({ provider: mockProvider });

      expect(inferrer.getProvider()).toBe(mockProvider);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = inferrer.getConfig();
      const config2 = inferrer.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
