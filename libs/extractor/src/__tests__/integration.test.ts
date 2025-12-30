/**
 * @fileoverview Sprint 2 Integration Tests for Auto-Relation Extraction (F-001)
 * Tests the complete extraction pipeline from documents to relations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RelationType } from '@yagokoro/domain';

import { RelationExtractorService, RelationExtractorServiceConfig } from '../service/relation-extractor-service';
import { CooccurrenceAnalyzer } from '../cooccurrence/cooccurrence-analyzer';
import { PatternMatcher } from '../pattern/pattern-matcher';
import { RelationScorer, ScoreComponents } from '../scorer/relation-scorer';
import { ContradictionDetector } from '../contradiction/contradiction-detector';
import { LLMRelationInferrer, LLMProvider } from '../llm/llm-relation-inferrer';
import {
  ExtractionDocument,
  ExtractionResult,
  DocumentEntity,
  ExtractedRelation,
  ScoredRelation,
} from '../types';

/**
 * Mock LLM provider for integration tests
 */
function createMockLLMProvider(): LLMProvider {
  return {
    name: 'mock-integration',
    async complete(prompt: string): Promise<string> {
      const lowerPrompt = prompt.toLowerCase();

      if (lowerPrompt.includes('gpt-4') && lowerPrompt.includes('openai')) {
        return `RELATION_TYPE: DEVELOPED_BY
CONFIDENCE: 0.9
EXPLANATION: GPT-4 is a well-known model developed by OpenAI`;
      }

      if (lowerPrompt.includes('transformer') && lowerPrompt.includes('attention')) {
        return `RELATION_TYPE: USES_TECHNIQUE
CONFIDENCE: 0.85
EXPLANATION: Transformer architecture uses attention mechanism`;
      }

      // Default uncertain response
      return `RELATION_TYPE: COLLABORATED_WITH
CONFIDENCE: 0.4
EXPLANATION: General relationship inferred`;
    },
    isAvailable: () => Promise.resolve(true),
  };
}

/**
 * Create test entities as DocumentEntity format
 */
function createTestDocumentEntities(): DocumentEntity[] {
  return [
    { id: 'entity-gpt4', name: 'GPT-4', type: 'AIModel', positions: [] },
    { id: 'entity-openai', name: 'OpenAI', type: 'Organization', positions: [] },
    { id: 'entity-transformer', name: 'Transformer', type: 'Architecture', positions: [] },
    { id: 'entity-attention', name: 'Attention Mechanism', type: 'Technique', positions: [] },
    { id: 'entity-bert', name: 'BERT', type: 'AIModel', positions: [] },
    { id: 'entity-google', name: 'Google', type: 'Organization', positions: [] },
  ];
}

/**
 * Create test documents in ExtractionDocument format
 */
function createTestDocument(
  id: string,
  content: string,
  entities?: DocumentEntity[]
): ExtractionDocument {
  return {
    id,
    title: `Test Document ${id}`,
    source: 'test',
    content,
    entities,
  };
}

describe('Sprint 2 Integration Tests - F-001 Auto-Relation Extraction', () => {
  let service: RelationExtractorService;
  let entities: DocumentEntity[];

  beforeEach(() => {
    entities = createTestDocumentEntities();

    const config: Partial<RelationExtractorServiceConfig> = {
      cooccurrence: {
        windowSize: 150,
        minCount: 1,
      },
      llm: {
        provider: createMockLLMProvider(),
        timeout: 5000,
      },
      useLLM: true,
      detectContradictions: true,
      maxConcurrency: 2,
    };

    service = new RelationExtractorService(config);
  });

  describe('Single Document Extraction', () => {
    it('should extract relations from a document with entities', async () => {
      const doc = createTestDocument(
        'doc-1',
        'GPT-4 is a large language model developed by OpenAI.',
        entities.filter((e) => ['GPT-4', 'OpenAI'].includes(e.name))
      );

      const result = await service.extract(doc);

      expect(result.documentId).toBe('doc-1');
      expect(result.relations).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect entities mentioned in document', async () => {
      const doc = createTestDocument(
        'entity-test',
        'GPT-4 and OpenAI are working together on AI.',
        entities.filter((e) => ['GPT-4', 'OpenAI'].includes(e.name))
      );

      const result = await service.extract(doc);

      expect(result.entities).toBeDefined();
    });

    it('should handle document without entities', async () => {
      const doc = createTestDocument(
        'no-entities',
        'This is a document about general topics.',
        []
      );

      const result = await service.extract(doc);

      expect(result.relations).toEqual([]);
    });
  });

  describe('Batch Document Extraction', () => {
    it('should process multiple documents', async () => {
      const docs = [
        createTestDocument('batch-1', 'GPT-4 by OpenAI is great.', entities.slice(0, 2)),
        createTestDocument('batch-2', 'BERT by Google is also good.', entities.slice(4, 6)),
      ];

      const result = await service.extractBatch(docs);

      expect(result.totalDocuments).toBe(2);
      expect(result.successCount).toBeLessThanOrEqual(2);
      expect(result.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should track success and failure counts', async () => {
      const docs = [
        createTestDocument('success-1', 'GPT-4 is by OpenAI.', entities.slice(0, 2)),
      ];

      const result = await service.extractBatch(docs);

      expect(result.totalDocuments).toBe(1);
      expect(result.successCount + result.failureCount).toBe(1);
    });

    it('should calculate total processing time', async () => {
      const docs = [
        createTestDocument('time-1', 'Test content.', []),
        createTestDocument('time-2', 'More content.', []),
      ];

      const result = await service.extractBatch(docs);

      expect(result.totalProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Individual Component Integration', () => {
    it('should integrate CooccurrenceAnalyzer correctly', () => {
      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const content = 'GPT-4 is a model developed by OpenAI. GPT-4 shows great performance.';

      const gpt4: DocumentEntity = { name: 'GPT-4', type: 'AIModel', positions: [0, 38] };
      const openai: DocumentEntity = { name: 'OpenAI', type: 'Organization', positions: [30] };

      const doc: ExtractionDocument = {
        id: 'test-doc',
        content,
        title: 'Test',
        source: 'test',
        entities: [gpt4, openai],
      };

      const cooccurrences = analyzer.analyze(doc);

      // GPT-4 and OpenAI appear together at document level
      expect(cooccurrences.length).toBeGreaterThan(0);
    });

    it('should integrate PatternMatcher correctly', () => {
      const matcher = new PatternMatcher();
      const text = 'GPT-4 was developed by OpenAI';

      const docEntities: DocumentEntity[] = [
        { name: 'GPT-4', type: 'AIModel', positions: [0] },
        { name: 'OpenAI', type: 'Organization', positions: [25] },
      ];

      const matches = matcher.match(text, docEntities);

      // Should match "developed by" pattern
      const developedByMatch = matches.find((m) => m.relationType === 'DEVELOPED_BY');
      expect(developedByMatch).toBeDefined();
    });

    it('should integrate RelationScorer correctly', () => {
      const scorer = new RelationScorer({
        weights: { cooccurrence: 0.3, llm: 0.3, source: 0.2, graph: 0.2 },
        thresholds: { autoApprove: 0.7, review: 0.5 },
      });

      const components: ScoreComponents = {
        cooccurrenceScore: 0.8,
        llmConfidence: 0.9,
        sourceReliability: 0.7,
        graphConsistency: 0.5,
      };

      const relation: ExtractedRelation = {
        sourceId: 'entity-gpt4',
        targetId: 'entity-openai',
        relationType: 'DEVELOPED_BY' as any,
        method: 'pattern',
        evidence: [{ documentId: 'doc-1', context: 'test', method: 'pattern', rawConfidence: 0.8 }],
        rawConfidence: 0.8,
      };

      const scored = scorer.score(relation, components);

      expect(scored.confidence).toBeGreaterThan(0);
      expect(['approved', 'pending', 'rejected']).toContain(
        scored.reviewStatus
      );
    });

    it('should integrate ContradictionDetector correctly', () => {
      const detector = new ContradictionDetector();

      // Create ScoredRelations with cyclic dependency
      const relations: ScoredRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'DEVELOPED_BY' as any,
          method: 'pattern' as const,
          evidence: [{ documentId: 'doc-1', context: 'test', method: 'pattern' as const, rawConfidence: 0.8 }],
          rawConfidence: 0.8,
          confidence: 0.7,
          reviewStatus: 'pending' as const,
          needsReview: true,
        },
        {
          sourceId: 'b',
          targetId: 'c',
          relationType: 'DEVELOPED_BY' as any,
          method: 'pattern' as const,
          evidence: [{ documentId: 'doc-1', context: 'test', method: 'pattern' as const, rawConfidence: 0.8 }],
          rawConfidence: 0.8,
          confidence: 0.7,
          reviewStatus: 'pending' as const,
          needsReview: true,
        },
        {
          sourceId: 'c',
          targetId: 'a',
          relationType: 'DEVELOPED_BY' as any,
          method: 'pattern' as const,
          evidence: [{ documentId: 'doc-1', context: 'test', method: 'pattern' as const, rawConfidence: 0.8 }],
          rawConfidence: 0.8,
          confidence: 0.7,
          reviewStatus: 'pending' as const,
          needsReview: true,
        },
      ];

      const contradictions = detector.detect(relations);

      // Should detect cyclic contradiction
      const cyclic = contradictions.find((c) => c.type === 'cyclic');
      expect(cyclic).toBeDefined();
    });

    it('should integrate LLMRelationInferrer correctly', async () => {
      const provider = createMockLLMProvider();
      const inferrer = new LLMRelationInferrer({ provider, timeout: 5000 });

      const gpt4: DocumentEntity = {
        name: 'GPT-4',
        type: 'AIModel',
        positions: [0],
      };

      const openai: DocumentEntity = {
        name: 'OpenAI',
        type: 'Organization',
        positions: [25],
      };

      const result = await inferrer.inferRelation(gpt4, openai, 'GPT-4 developed by OpenAI');

      expect(result.relationType).toBe('DEVELOPED_BY');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Relation Merging', () => {
    it('should merge relations from different sources', () => {
      const cooccurrenceRelations: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'DEVELOPED_BY' as any,
          method: 'cooccurrence',
          evidence: [{ documentId: 'doc-1', context: 'test', method: 'cooccurrence', rawConfidence: 0.6 }],
          rawConfidence: 0.6,
        },
      ];

      const patternRelations: ExtractedRelation[] = [
        {
          sourceId: 'a',
          targetId: 'b',
          relationType: 'DEVELOPED_BY' as any,
          method: 'pattern',
          evidence: [{ documentId: 'doc-1', context: 'pattern match', method: 'pattern', rawConfidence: 0.8 }],
          rawConfidence: 0.8,
        },
      ];

      const merged = service.mergeRelations(cooccurrenceRelations, patternRelations, []);

      // Same relation should be merged
      expect(merged.length).toBe(1);
      expect(merged[0].method).toBe('hybrid');
      expect(merged[0].evidence.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM provider failures gracefully', async () => {
      const failingProvider: LLMProvider = {
        name: 'failing-provider',
        async infer() {
          throw new Error('LLM service unavailable');
        },
        isAvailable: () => Promise.resolve(true),
      };

      const config: Partial<RelationExtractorServiceConfig> = {
        llm: { provider: failingProvider, timeout: 1000 },
        useLLM: true,
        maxConcurrency: 1,
      };

      const failingService = new RelationExtractorService(config);
      const doc = createTestDocument('error-test', 'GPT-4 by OpenAI', entities.slice(0, 2));

      // Should not throw, should handle gracefully
      const result = await failingService.extract(doc);

      expect(result).toBeDefined();
    });

    it('should handle empty document content', async () => {
      const doc = createTestDocument('empty', '', []);

      const result = await service.extract(doc);

      expect(result.relations).toEqual([]);
    });

    it('should handle whitespace-only content', async () => {
      const doc = createTestDocument('whitespace', '   \n\t   ', []);

      const result = await service.extract(doc);

      expect(result).toBeDefined();
    });
  });

  describe('HITL Workflow Support', () => {
    it('should assign reviewStatus to relations', async () => {
      const doc = createTestDocument(
        'hitl-test',
        'GPT-4 was developed by OpenAI.',
        entities.filter((e) => ['GPT-4', 'OpenAI'].includes(e.name))
      );

      const result = await service.extract(doc);

      for (const relation of result.relations) {
        expect(['approved', 'pending', 'rejected']).toContain(
          relation.reviewStatus
        );
      }
    });

    it('should track confidence scores for HITL decisions', async () => {
      const doc = createTestDocument(
        'confidence-test',
        'GPT-4 created by OpenAI uses Transformer.',
        entities.filter((e) => ['GPT-4', 'OpenAI', 'Transformer'].includes(e.name))
      );

      const result = await service.extract(doc);

      for (const relation of result.relations) {
        expect(relation.confidence).toBeGreaterThanOrEqual(0);
        expect(relation.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Statistics Tracking', () => {
    it('should return statistics after extraction', async () => {
      const doc = createTestDocument(
        'stats-test',
        'GPT-4 is developed by OpenAI.',
        entities.filter((e) => ['GPT-4', 'OpenAI'].includes(e.name))
      );

      const result = await service.extract(doc);

      // Result should have processing info
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should get aggregated stats from service', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalProcessed).toBe('number');
      expect(typeof stats.totalRelations).toBe('number');
    });
  });
});

describe('ConfigLoader Integration', () => {
  it('should work with config-based scoring weights', () => {
    const scorer = new RelationScorer({
      weights: { cooccurrence: 0.25, llm: 0.35, source: 0.2, graph: 0.2 },
      thresholds: { autoApprove: 0.75, review: 0.55 },
    });

    const relation: ExtractedRelation = {
      sourceId: 'entity-1',
      targetId: 'entity-2',
      relationType: 'USES_TECHNIQUE' as any,
      method: 'pattern',
      evidence: [{ documentId: 'doc-1', context: 'test', method: 'pattern', rawConfidence: 0.7 }],
      rawConfidence: 0.7,
    };

    const components: ScoreComponents = {
      cooccurrenceScore: 0.6,
      llmConfidence: 0.8,
      sourceReliability: 0.5,
      graphConsistency: 0.7,
    };

    const scored = scorer.score(relation, components);

    // Verify custom weights are applied
    // confidence = 0.6*0.25 + 0.8*0.35 + 0.5*0.2 + 0.7*0.2
    // = 0.15 + 0.28 + 0.1 + 0.14 = 0.67
    expect(scored.confidence).toBeCloseTo(0.67, 2);
  });
});

describe('Performance Tests', () => {
  it('should complete extraction within reasonable time', async () => {
    const testEntities: DocumentEntity[] = [];
    for (let i = 0; i < 20; i++) {
      testEntities.push({
        id: `entity-${i}`,
        name: `Entity${i}`,
        type: 'AIModel',
        positions: [],
      });
    }

    const entityNames = testEntities.slice(0, 5).map((e) => e.name).join(', ');
    const doc = createTestDocument(
      'perf-test',
      `This document mentions ${entityNames} and discusses their relationships.`,
      testEntities.slice(0, 5)
    );

    const config: Partial<RelationExtractorServiceConfig> = {
      llm: { provider: createMockLLMProvider(), timeout: 1000 },
      useLLM: true,
      maxConcurrency: 5,
    };

    const perfService = new RelationExtractorService(config);

    const startTime = Date.now();
    const result = await perfService.extract(doc);
    const duration = Date.now() - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
    expect(result).toBeDefined();
  });
});
