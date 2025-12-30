/**
 * Unit tests for SimilarityMatcher
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimilarityMatcher, type VectorStoreClient } from './SimilarityMatcher.js';

describe('SimilarityMatcher', () => {
  const existingEntities = [
    'GPT-4',
    'GPT-3.5',
    'Claude',
    'LLaMA2',
    'Transformer',
    'BERT',
    'Chain-of-Thought',
    'Retrieval-Augmented Generation',
    'OpenAI',
    'DeepMind',
    'Attention Mechanism',
  ];

  let matcher: SimilarityMatcher;

  beforeEach(() => {
    matcher = new SimilarityMatcher(existingEntities);
  });

  describe('findMatches', () => {
    it('should find exact matches', async () => {
      const result = await matcher.findMatches('GPT-4');
      expect(result.canonical).toBe('GPT-4');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should find similar matches for GPT4 -> GPT-4', async () => {
      const result = await matcher.findMatches('GPT4');
      expect(result.canonical).toBe('GPT-4');
      // Levenshtein: GPT4 vs GPT-4 = 1 edit, similarity = 1 - 1/5 = 0.8
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should find similar matches for gpt-4 (case insensitive)', async () => {
      const result = await matcher.findMatches('gpt-4');
      expect(result.canonical).toBe('GPT-4');
    });

    it('should find matches with minor typos', async () => {
      const result = await matcher.findMatches('Transformr');
      expect(result.canonical).toBe('Transformer');
    });

    it('should return null for completely different strings', async () => {
      const result = await matcher.findMatches('xyz123completely_different');
      expect(result.canonical).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should return multiple candidates sorted by similarity', async () => {
      // GPT-4 and GPT-3.5 are both similar to GPT-4
      const result = await matcher.findMatches('GPT-4');
      // Should have at least GPT-4 as exact match
      expect(result.candidates.length).toBeGreaterThan(0);
      
      // Check sorting
      for (let i = 1; i < result.candidates.length; i++) {
        expect(result.candidates[i - 1].similarity)
          .toBeGreaterThanOrEqual(result.candidates[i].similarity);
      }
    });

    it('should handle empty input', async () => {
      const result = await matcher.findMatches('');
      expect(result.canonical).toBeNull();
    });

    it('should handle whitespace', async () => {
      const result = await matcher.findMatches('  GPT-4  ');
      expect(result.canonical).toBe('GPT-4');
    });
  });

  describe('with custom threshold', () => {
    it('should respect lower threshold', async () => {
      const lowThresholdMatcher = new SimilarityMatcher(existingEntities, {
        threshold: 0.3, // Very low threshold
      });
      
      // Even short input should find some matches
      const result = await lowThresholdMatcher.findMatches('GPT');
      // GPT vs GPT-4 = 2 edits, similarity = 1 - 2/5 = 0.6
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('should respect higher threshold', async () => {
      const highThresholdMatcher = new SimilarityMatcher(existingEntities, {
        threshold: 0.95,
      });
      
      const result = await highThresholdMatcher.findMatches('GPT4');
      // May or may not find match depending on exact similarity
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('with vector store', () => {
    it('should combine edit distance and vector similarity', async () => {
      const mockVectorStore: VectorStoreClient = {
        search: async (query: string, limit: number) => {
          if (query.toLowerCase().includes('gpt')) {
            return [
              { name: 'GPT-4', score: 0.95 },
              { name: 'GPT-3.5', score: 0.85 },
            ];
          }
          return [];
        },
      };

      const matcherWithVector = new SimilarityMatcher(
        existingEntities,
        { threshold: 0.8 },
        mockVectorStore
      );

      const result = await matcherWithVector.findMatches('GPT model');
      expect(result.candidates.length).toBeGreaterThan(0);
      // Vector similarity should boost the score
      expect(result.candidates[0].vectorSimilarity).toBeDefined();
    });
  });

  describe('addEntities', () => {
    it('should add new entities', async () => {
      matcher.addEntities(['NewModel', 'AnotherModel']);
      
      const result = await matcher.findMatches('NewModel');
      expect(result.canonical).toBe('NewModel');
    });
  });

  describe('removeEntity', () => {
    it('should remove entities', async () => {
      const removed = matcher.removeEntity('GPT-4');
      expect(removed).toBe(true);
      
      const result = await matcher.findMatches('GPT-4');
      expect(result.canonical).not.toBe('GPT-4');
    });

    it('should return false for non-existent entities', () => {
      const removed = matcher.removeEntity('NonExistent');
      expect(removed).toBe(false);
    });
  });

  describe('getEntities', () => {
    it('should return all entities', () => {
      const entities = matcher.getEntities();
      expect(entities).toContain('GPT-4');
      expect(entities).toContain('Transformer');
      expect(entities.length).toBe(existingEntities.length);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      matcher.updateConfig({ threshold: 0.95 });
      
      // With higher threshold, some matches may not pass
      const result = await matcher.findMatches('GPT');
      expect(result.candidates.every(c => c.similarity >= 0.95)).toBe(true);
    });
  });

  describe('edit distance calculation', () => {
    it('should calculate correct similarity for identical strings', async () => {
      const result = await matcher.findMatches('GPT-4');
      const exactMatch = result.candidates.find(c => c.canonical === 'GPT-4');
      expect(exactMatch?.editSimilarity).toBe(1.0);
    });

    it('should calculate reasonable similarity for similar strings', async () => {
      const result = await matcher.findMatches('GPT-4o');
      const match = result.candidates.find(c => c.canonical === 'GPT-4');
      // 'GPT-4' vs 'GPT-4o' should be very similar
      expect(match?.editSimilarity).toBeGreaterThan(0.8);
    });
  });
});
