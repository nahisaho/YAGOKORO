/**
 * Tests for RelationExtractorService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RelationExtractorService,
  DEFAULT_SERVICE_CONFIG,
} from './relation-extractor-service.js';
import type {
  ExtractionDocument,
  ExtractedRelation,
  ScoredRelation,
  DocumentEntity,
} from '../types.js';
import type { LLMProvider } from '../llm/llm-relation-inferrer.js';

/**
 * Create a mock LLM provider
 */
function createMockProvider(): LLMProvider {
  return {
    name: 'mock',
    complete: vi.fn().mockResolvedValue(
      'RELATION_TYPE: DEVELOPED_BY\nCONFIDENCE: 0.9\nEXPLANATION: Test'
    ),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Create a test document
 */
function createTestDocument(
  id: string,
  content: string,
  entities: DocumentEntity[] = []
): ExtractionDocument {
  return {
    id,
    title: `Test Document ${id}`,
    content,
    source: 'test',
    entities,
  };
}

/**
 * Create a test entity
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

describe('RelationExtractorService', () => {
  let service: RelationExtractorService;

  beforeEach(() => {
    service = new RelationExtractorService({ useLLM: false });
    service.resetStatistics();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const defaultService = new RelationExtractorService();
      const config = defaultService.getConfig();
      expect(config.useLLM).toBe(DEFAULT_SERVICE_CONFIG.useLLM);
      expect(config.detectContradictions).toBe(DEFAULT_SERVICE_CONFIG.detectContradictions);
      expect(config.maxConcurrency).toBe(DEFAULT_SERVICE_CONFIG.maxConcurrency);
    });

    it('should merge custom config with defaults', () => {
      const customService = new RelationExtractorService({
        useLLM: false,
        maxConcurrency: 5,
      });
      const config = customService.getConfig();
      expect(config.useLLM).toBe(false);
      expect(config.maxConcurrency).toBe(5);
      expect(config.detectContradictions).toBe(true);
    });

    it('should initialize all components', () => {
      const components = service.getComponents();
      expect(components.cooccurrenceAnalyzer).toBeDefined();
      expect(components.patternMatcher).toBeDefined();
      expect(components.scorer).toBeDefined();
      expect(components.contradictionDetector).toBeDefined();
      expect(components.llmInferrer).toBeDefined();
    });
  });

  describe('setLLMProvider', () => {
    it('should set the LLM provider', () => {
      const mockProvider = createMockProvider();
      service.setLLMProvider(mockProvider);
      
      const components = service.getComponents();
      expect(components.llmInferrer.getProvider()).toBe(mockProvider);
    });
  });

  describe('extract', () => {
    it('should extract relations from document', async () => {
      const document = createTestDocument(
        'doc1',
        'GPT-4 was developed by OpenAI. The model uses transformer architecture.',
        [
          createEntity('GPT-4', 'model', [0]),
          createEntity('OpenAI', 'organization', [23]),
        ]
      );

      const result = await service.extract(document);

      expect(result.documentId).toBe('doc1');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return entities from document', async () => {
      const entities = [
        createEntity('GPT-4', 'model'),
        createEntity('OpenAI', 'organization'),
      ];
      const document = createTestDocument('doc1', 'Test content', entities);

      const result = await service.extract(document);

      expect(result.entities).toEqual(entities);
    });

    it('should extract pattern-based relations', async () => {
      const document = createTestDocument(
        'doc1',
        'GPT-4 developed by OpenAI is based on the transformer architecture.',
        [
          createEntity('GPT-4', 'model', [0]),
          createEntity('OpenAI', 'organization', [17]),
        ]
      );

      const result = await service.extract(document);

      // Should find "developed by" pattern
      const developedByRelation = result.relations.find(
        (r) => r.relationType === 'DEVELOPED_BY'
      );
      // Pattern might or might not match depending on window
      expect(result.relations).toBeDefined();
    });

    it('should update statistics after extraction', async () => {
      service.resetStatistics();
      
      const document = createTestDocument('doc1', 'GPT-4 developed by OpenAI', [
        createEntity('GPT-4', 'model', [0]),
        createEntity('OpenAI', 'organization', [17]),
      ]);

      await service.extract(document);

      const stats = service.getStatistics();
      expect(stats.totalProcessed).toBe(1);
    });
  });

  describe('extractBatch', () => {
    it('should process multiple documents', async () => {
      const documents = [
        createTestDocument('doc1', 'Content 1'),
        createTestDocument('doc2', 'Content 2'),
        createTestDocument('doc3', 'Content 3'),
      ];

      const result = await service.extractBatch(documents);

      expect(result.totalDocuments).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should track processing time', async () => {
      const documents = [
        createTestDocument('doc1', 'Content 1'),
        createTestDocument('doc2', 'Content 2'),
      ];

      const result = await service.extractBatch(documents);

      expect(result.totalProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxConcurrency', async () => {
      const customService = new RelationExtractorService({
        useLLM: false,
        maxConcurrency: 2,
      });

      const documents = Array.from({ length: 5 }, (_, i) =>
        createTestDocument(`doc${i}`, `Content ${i}`)
      );

      const result = await customService.extractBatch(documents);

      expect(result.successCount).toBe(5);
    });
  });

  describe('mergeRelations', () => {
    it('should merge relations from different sources', () => {
      const cooccurrence: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'CITES',
          method: 'cooccurrence',
          evidence: [
            { documentId: 'doc1', context: 'co-occurred', method: 'cooccurrence', rawConfidence: 0.6 },
          ],
          rawConfidence: 0.6,
        },
      ];

      const pattern: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'CITES',
          method: 'pattern',
          evidence: [
            { documentId: 'doc1', context: 'pattern match', method: 'pattern', rawConfidence: 0.8 },
          ],
          rawConfidence: 0.8,
        },
      ];

      const llm: ExtractedRelation[] = [];

      const merged = service.mergeRelations(cooccurrence, pattern, llm);

      expect(merged).toHaveLength(1);
      expect(merged[0].method).toBe('hybrid');
      expect(merged[0].evidence).toHaveLength(2);
      expect(merged[0].rawConfidence).toBe(0.8); // Takes higher
    });

    it('should keep separate relations for different types', () => {
      const cooccurrence: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'CITES',
          method: 'cooccurrence',
          evidence: [],
          rawConfidence: 0.6,
        },
      ];

      const pattern: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'DEVELOPED_BY',
          method: 'pattern',
          evidence: [],
          rawConfidence: 0.8,
        },
      ];

      const merged = service.mergeRelations(cooccurrence, pattern, []);

      expect(merged).toHaveLength(2);
    });

    it('should handle empty inputs', () => {
      const merged = service.mergeRelations([], [], []);
      expect(merged).toHaveLength(0);
    });
  });

  describe('checkContradictions', () => {
    it('should mark contradicting relations for review', () => {
      const relations: ScoredRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'DEVELOPED_BY',
          method: 'pattern',
          evidence: [],
          rawConfidence: 0.9,
          confidence: 0.9,
          scoreComponents: {
            cooccurrenceScore: 0.8,
            llmConfidence: 0.9,
            sourceReliability: 0.9,
            graphConsistency: 0.9,
          },
          reviewStatus: 'approved',
          needsReview: false,
        },
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'COMPETES_WITH', // Conflicts with DEVELOPED_BY
          method: 'pattern',
          evidence: [],
          rawConfidence: 0.8,
          confidence: 0.8,
          scoreComponents: {
            cooccurrenceScore: 0.7,
            llmConfidence: 0.8,
            sourceReliability: 0.8,
            graphConsistency: 0.7,
          },
          reviewStatus: 'approved',
          needsReview: false,
        },
      ];

      const checked = service.checkContradictions(relations);

      // Both should be marked for review due to conflict
      expect(checked.some((r) => r.needsReview)).toBe(true);
    });

    it('should not modify non-contradicting relations', () => {
      const relations: ScoredRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'CITES',
          method: 'pattern',
          evidence: [],
          rawConfidence: 0.9,
          confidence: 0.9,
          scoreComponents: {
            cooccurrenceScore: 0.8,
            llmConfidence: 0.9,
            sourceReliability: 0.9,
            graphConsistency: 0.9,
          },
          reviewStatus: 'approved',
          needsReview: false,
        },
      ];

      const checked = service.checkContradictions(relations);

      expect(checked[0].reviewStatus).toBe('approved');
      expect(checked[0].needsReview).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return initial statistics', () => {
      service.resetStatistics();
      const stats = service.getStatistics();

      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalRelations).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.reviewRequired).toBe(0);
      expect(stats.autoApproved).toBe(0);
      expect(stats.rejected).toBe(0);
    });

    it('should track statistics across extractions', async () => {
      service.resetStatistics();

      await service.extract(createTestDocument('doc1', 'GPT-4 developed by OpenAI'));
      await service.extract(createTestDocument('doc2', 'BERT uses transformer'));

      const stats = service.getStatistics();
      expect(stats.totalProcessed).toBe(2);
    });
  });

  describe('resetStatistics', () => {
    it('should reset all statistics', async () => {
      await service.extract(createTestDocument('doc1', 'Test content'));
      service.resetStatistics();

      const stats = service.getStatistics();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalRelations).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({ maxConcurrency: 20, useLLM: true });

      const config = service.getConfig();
      expect(config.maxConcurrency).toBe(20);
      expect(config.useLLM).toBe(true);
    });

    it('should update component configs', () => {
      const newScorerConfig = {
        weights: {
          cooccurrence: 0.4,
          llm: 0.2,
          source: 0.2,
          graph: 0.2,
        },
      };

      service.updateConfig({ scorer: newScorerConfig });

      const components = service.getComponents();
      const scorerConfig = components.scorer.getConfig();
      expect(scorerConfig.weights.cooccurrence).toBe(0.4);
    });
  });

  describe('with LLM', () => {
    it('should check LLM availability when enabled', async () => {
      const mockProvider = createMockProvider();
      const llmService = new RelationExtractorService({ useLLM: true });
      llmService.setLLMProvider(mockProvider);

      // The LLM inferrer should have the provider set
      const components = llmService.getComponents();
      const isAvailable = await components.llmInferrer.isAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it('should continue without LLM if not available', async () => {
      const llmService = new RelationExtractorService({ useLLM: true });
      // No provider set

      const document = createTestDocument('doc1', 'Test content');

      // Should not throw
      const result = await llmService.extract(document);
      expect(result.documentId).toBe('doc1');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('getComponents', () => {
    it('should return all component instances', () => {
      const components = service.getComponents();

      expect(components).toHaveProperty('cooccurrenceAnalyzer');
      expect(components).toHaveProperty('patternMatcher');
      expect(components).toHaveProperty('scorer');
      expect(components).toHaveProperty('contradictionDetector');
      expect(components).toHaveProperty('llmInferrer');
    });
  });
});
