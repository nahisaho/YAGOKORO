/**
 * Unit tests for EntityNormalizerService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityNormalizerService, type LLMClient } from './EntityNormalizerService.js';

// Mock LLM client
const createMockLLM = (confirmAll: boolean = true): LLMClient => ({
  generate: vi.fn(async (prompt: string) => {
    return JSON.stringify({
      confirmed: confirmAll,
      suggestion: null,
      confidence: 0.9,
      explanation: 'Mock LLM confirmation',
    });
  }),
});

describe('EntityNormalizerService', () => {
  let service: EntityNormalizerService;
  // Note: These entities should match expected normalized forms
  // RuleNormalizer normalizes GPT-4 → GPT4, so we use GPT4 here
  const existingEntities = [
    'GPT4',
    'GPT3.5',
    'Claude',
    'LLaMA2',
    'Transformer',
    'CoT', // Normalized form of Chain-of-Thought
    'OpenAI',
    'DeepMind',
  ];

  beforeEach(() => {
    service = new EntityNormalizerService({
      existingEntities,
      config: {
        similarityThreshold: 0.8,
        useLLMConfirmation: false,
        autoRegisterAliases: false,
      },
    });
  });

  describe('normalize', () => {
    it('should normalize using rules (Stage 1)', async () => {
      // RuleNormalizer normalizes GPT-4 → GPT4
      // Since GPT4 exists in existingEntities, similarity will match it
      const result = await service.normalize('GPT-4');
      
      expect(result.normalized).toBe('GPT4');
      expect(result.wasNormalized).toBe(true);
      // Rule applies first, then similarity confirms with existing entity
      expect(result.stages.rule).toBeDefined();
      expect(result.stages.rule?.appliedRules.length).toBeGreaterThan(0);
    });

    it('should match using similarity (Stage 2)', async () => {
      // GPT4 is already normalized, so it goes to similarity matching
      const result = await service.normalize('GPT4');
      
      // Should find GPT4 in existing entities via similarity
      expect(result.stages.similarity).toBeDefined();
      expect(result.normalized).toBe('GPT4');
    });

    it('should handle already normalized entities', async () => {
      const result = await service.normalize('Transformer');
      
      // Should find it in similarity matching
      expect(result.normalized).toBe('Transformer');
    });

    it('should return original if no match found', async () => {
      const result = await service.normalize('CompletelyUnknownEntity12345');
      
      expect(result.normalized).toBe('CompletelyUnknownEntity12345');
      expect(result.wasNormalized).toBe(false);
    });

    it('should normalize Chain of Thought to CoT', async () => {
      const result = await service.normalize('Chain of Thought');
      
      expect(result.normalized).toBe('CoT');
      expect(result.wasNormalized).toBe(true);
      // Rule applies, then similarity confirms with existing entity CoT
      expect(result.stages.rule).toBeDefined();
    });

    it('should handle whitespace', async () => {
      // RuleNormalizer normalizes GPT-4 → GPT4
      const result = await service.normalize('  GPT-4  ');
      
      expect(result.original).toBe('  GPT-4  ');
      expect(result.normalized).toBe('GPT4');
    });
  });

  describe('normalize with LLM confirmation', () => {
    it('should use LLM when confidence is low and enabled', async () => {
      const mockLLM = createMockLLM(true);
      const serviceWithLLM = new EntityNormalizerService({
        existingEntities,
        llmClient: mockLLM,
        config: {
          useLLMConfirmation: true,
          llmConfirmationThreshold: 0.99, // Very high to trigger LLM
          autoRegisterAliases: false,
        },
      });

      const result = await serviceWithLLM.normalize('GPT-4');
      
      // LLM should have been called
      expect(mockLLM.generate).toHaveBeenCalled();
      expect(result.stages.llm).toBeDefined();
    });

    it('should skip LLM when skipLLM option is set', async () => {
      const mockLLM = createMockLLM(true);
      const serviceWithLLM = new EntityNormalizerService({
        existingEntities,
        llmClient: mockLLM,
        config: {
          useLLMConfirmation: true,
          llmConfirmationThreshold: 0.5,
        },
      });

      const result = await serviceWithLLM.normalize('GPT-4', { skipLLM: true });
      
      expect(mockLLM.generate).not.toHaveBeenCalled();
      expect(result.stages.llm).toBeUndefined();
    });

    it('should force LLM when forceLLM option is set', async () => {
      const mockLLM = createMockLLM(true);
      const serviceWithLLM = new EntityNormalizerService({
        existingEntities,
        llmClient: mockLLM,
        config: {
          useLLMConfirmation: true,
          // Set high threshold so rule confidence (0.9) is below it
          llmConfirmationThreshold: 0.99,
          autoRegisterAliases: false,
        },
      });

      // Use an entity that won't get high confidence from rules
      // forceLLM should still trigger LLM even when useLLMConfirmation is true
      const result = await serviceWithLLM.normalize('UnknownEntity', { forceLLM: true });
      
      expect(mockLLM.generate).toHaveBeenCalled();
    });
  });

  describe('normalizeAll', () => {
    it('should normalize multiple entities', async () => {
      const inputs = ['GPT-4', 'Chain of Thought', 'Open AI'];
      const results = await service.normalizeAll(inputs);
      
      expect(results.length).toBe(3);
      expect(results[0].normalized).toBe('GPT4');
      expect(results[1].normalized).toBe('CoT');
      expect(results[2].normalized).toBe('OpenAI');
    });

    it('should handle empty array', async () => {
      const results = await service.normalizeAll([]);
      expect(results).toEqual([]);
    });
  });

  describe('addKnownEntities', () => {
    it('should add entities to known set', async () => {
      service.addKnownEntities(['NewModel', 'AnotherModel']);
      
      const result = await service.normalize('NewModel');
      expect(result.stages.similarity?.candidates.some(c => c.canonical === 'NewModel')).toBe(true);
    });
  });

  describe('getExistingEntities', () => {
    it('should return known entities without Neo4j', async () => {
      const entities = await service.getExistingEntities();
      
      // Note: existingEntities uses normalized forms (GPT4, not GPT-4)
      expect(entities).toContain('GPT4');
      expect(entities).toContain('Claude');
    });
  });

  describe('getAliasManager', () => {
    it('should return alias manager instance', () => {
      const aliasManager = service.getAliasManager();
      expect(aliasManager).toBeDefined();
    });
  });

  describe('getRuleNormalizer', () => {
    it('should return rule normalizer instance', () => {
      const ruleNormalizer = service.getRuleNormalizer();
      expect(ruleNormalizer).toBeDefined();
    });
  });

  describe('getSimilarityMatcher', () => {
    it('should return similarity matcher instance', () => {
      const similarityMatcher = service.getSimilarityMatcher();
      expect(similarityMatcher).toBeDefined();
    });
  });

  describe('alias table lookup', () => {
    it('should resolve from alias table if exists', async () => {
      // Register an alias first
      const aliasManager = service.getAliasManager();
      await aliasManager.registerAlias('CustomAlias', 'CanonicalForm', 0.95, 'rule');

      const result = await service.normalize('CustomAlias');
      
      expect(result.normalized).toBe('CanonicalForm');
      expect(result.confidence.score).toBe(0.95);
      expect(result.confidence.explanation).toContain('alias table');
    });
  });

  describe('auto-register aliases', () => {
    it('should register alias when autoRegisterAliases is true', async () => {
      const serviceWithAutoRegister = new EntityNormalizerService({
        existingEntities,
        config: {
          autoRegisterAliases: true,
          llmConfirmationThreshold: 0.5, // Low threshold to ensure registration
        },
      });

      const result = await serviceWithAutoRegister.normalize('GPT-4');
      
      // Alias should have been registered
      const aliasManager = serviceWithAutoRegister.getAliasManager();
      const resolved = await aliasManager.resolveAlias('GPT-4');
      expect(resolved).toBe('GPT4');
    });
  });
});
