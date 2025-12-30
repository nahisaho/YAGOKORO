/**
 * MultiHopReasoner Tests
 *
 * Test suite for multi-hop reasoning over knowledge graphs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiHopReasoner } from './MultiHopReasoner.js';
import type { ReasoningContext, ReasoningRelation } from './types.js';
import type { GraphPath } from '@yagokoro/domain';

// Helper to create mock reasoning context
function createMockContext(): ReasoningContext {
  return {
    getEntity: vi.fn(),
    getOutgoingRelations: vi.fn(),
    getIncomingRelations: vi.fn(),
    findPaths: vi.fn(),
    getEntityName: vi.fn(),
  };
}

// Helper to create mock entity
function createMockEntity(id: string, name: string, type: string) {
  return { id, name, type, description: `${name} description` };
}

// Helper to create mock relation
function createMockRelation(
  sourceId: string,
  targetId: string,
  type: string,
  confidence = 0.9
): ReasoningRelation {
  return { sourceId, targetId, type: type as any, confidence };
}

describe('MultiHopReasoner', () => {
  let reasoner: MultiHopReasoner;
  let mockContext: ReasoningContext;

  beforeEach(() => {
    mockContext = createMockContext();
    reasoner = new MultiHopReasoner(mockContext);
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(reasoner).toBeDefined();
    });

    it('should accept custom options', () => {
      const customReasoner = new MultiHopReasoner(mockContext, {
        maxHops: 3,
        minConfidence: 0.5,
      });
      expect(customReasoner).toBeDefined();
    });
  });

  describe('reason', () => {
    it('should find direct path between two entities (1 hop)', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      vi.mocked(mockContext.getEntityName)
        .mockResolvedValueOnce('GPT-4')
        .mockResolvedValueOnce('OpenAI');

      const mockPath: GraphPath = {
        nodes: [sourceId, targetId],
        edges: [{ id: 'edge-1', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.95 }],
        totalWeight: 0.95,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([mockPath]);

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.success).toBe(true);
      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].hopCount).toBe(1);
      expect(result.bestPath).not.toBeNull();
    });

    it('should find multi-hop path (2+ hops)', async () => {
      const sourceId = 'entity-1';
      const middleId = 'entity-2';
      const targetId = 'entity-3';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'Anthropic', 'Organization'));

      vi.mocked(mockContext.getEntityName)
        .mockImplementation(async (id) => {
          const names: Record<string, string> = {
            [sourceId]: 'GPT-4',
            [middleId]: 'OpenAI',
            [targetId]: 'Anthropic',
          };
          return names[id] || null;
        });

      const mockPath: GraphPath = {
        nodes: [sourceId, middleId, targetId],
        edges: [
          { id: 'edge-1', sourceId, targetId: middleId, type: 'DEVELOPED_BY', weight: 0.9 },
          { id: 'edge-2', sourceId: middleId, targetId, type: 'RELATED_TO', weight: 0.8 },
        ],
        totalWeight: 0.72,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([mockPath]);

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.success).toBe(true);
      expect(result.paths[0].hopCount).toBe(2);
      expect(result.paths[0].steps).toHaveLength(2);
    });

    it('should return empty result when no path exists', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'Isolated Entity', 'Organization'));

      vi.mocked(mockContext.findPaths).mockResolvedValue([]);

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.success).toBe(false);
      expect(result.paths).toHaveLength(0);
      expect(result.bestPath).toBeNull();
    });

    it('should handle source entity not found', async () => {
      vi.mocked(mockContext.getEntity).mockResolvedValueOnce(null);

      const result = await reasoner.reason('non-existent', 'entity-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source entity');
    });

    it('should handle target entity not found', async () => {
      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity('entity-1', 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(null);

      const result = await reasoner.reason('entity-1', 'non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target entity');
    });

    it('should filter paths by minimum confidence', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      // Two paths: one high confidence, one low confidence
      const highConfPath: GraphPath = {
        nodes: [sourceId, targetId],
        edges: [{ id: 'edge-1', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.9 }],
        totalWeight: 0.9,
      };
      const lowConfPath: GraphPath = {
        nodes: [sourceId, 'middle', targetId],
        edges: [
          { id: 'edge-2', sourceId, targetId: 'middle', type: 'RELATED_TO', weight: 0.3 },
          { id: 'edge-3', sourceId: 'middle', targetId, type: 'RELATED_TO', weight: 0.2 },
        ],
        totalWeight: 0.06,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([highConfPath, lowConfPath]);
      vi.mocked(mockContext.getEntityName).mockResolvedValue('Test');

      // With default minConfidence (0.1), low confidence path should be filtered
      const customReasoner = new MultiHopReasoner(mockContext, { minConfidence: 0.5 });
      const result = await customReasoner.reason(sourceId, targetId);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].totalConfidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should limit number of returned paths', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      // Create multiple paths
      const paths: GraphPath[] = Array.from({ length: 20 }, (_, i) => ({
        nodes: [sourceId, `middle-${i}`, targetId],
        edges: [
          { id: `edge-${i}-1`, sourceId, targetId: `middle-${i}`, type: 'RELATED_TO', weight: 0.8 },
          { id: `edge-${i}-2`, sourceId: `middle-${i}`, targetId, type: 'RELATED_TO', weight: 0.8 },
        ],
        totalWeight: 0.64,
      }));

      vi.mocked(mockContext.findPaths).mockResolvedValue(paths);
      vi.mocked(mockContext.getEntityName).mockResolvedValue('Test');

      const customReasoner = new MultiHopReasoner(mockContext, { maxPaths: 5 });
      const result = await customReasoner.reason(sourceId, targetId);

      expect(result.paths).toHaveLength(5);
    });

    it('should respect maxHops option', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      vi.mocked(mockContext.findPaths).mockResolvedValue([]);

      const customReasoner = new MultiHopReasoner(mockContext, { maxHops: 3 });
      await customReasoner.reason(sourceId, targetId);

      // findPaths should be called with maxHops = 3
      expect(mockContext.findPaths).toHaveBeenCalledWith(sourceId, targetId, 3);
    });

    it('should sort paths by confidence (highest first)', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      const paths: GraphPath[] = [
        {
          nodes: [sourceId, targetId],
          edges: [{ id: 'edge-1', sourceId, targetId, type: 'RELATED_TO', weight: 0.5 }],
          totalWeight: 0.5,
        },
        {
          nodes: [sourceId, targetId],
          edges: [{ id: 'edge-2', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.95 }],
          totalWeight: 0.95,
        },
        {
          nodes: [sourceId, targetId],
          edges: [{ id: 'edge-3', sourceId, targetId, type: 'PART_OF', weight: 0.7 }],
          totalWeight: 0.7,
        },
      ];

      vi.mocked(mockContext.findPaths).mockResolvedValue(paths);
      vi.mocked(mockContext.getEntityName).mockResolvedValue('Test');

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.paths[0].totalConfidence).toBe(0.95);
      expect(result.paths[1].totalConfidence).toBe(0.7);
      expect(result.paths[2].totalConfidence).toBe(0.5);
      expect(result.bestPath?.totalConfidence).toBe(0.95);
    });
  });

  describe('explainPath', () => {
    it('should generate human-readable explanation', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      vi.mocked(mockContext.getEntityName)
        .mockResolvedValueOnce('GPT-4')
        .mockResolvedValueOnce('OpenAI');

      const mockPath: GraphPath = {
        nodes: [sourceId, targetId],
        edges: [{ id: 'edge-1', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.95 }],
        totalWeight: 0.95,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([mockPath]);

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.paths[0].summary).toBeDefined();
      expect(result.paths[0].summary.length).toBeGreaterThan(0);
      expect(result.paths[0].steps[0].explanation).toBeDefined();
    });
  });

  describe('reasonWithQuery', () => {
    it('should include query in result', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';
      const query = 'How is GPT-4 related to OpenAI?';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      vi.mocked(mockContext.findPaths).mockResolvedValue([]);

      const result = await reasoner.reasonWithQuery(query, sourceId, targetId);

      expect(result.query).toBe(query);
    });
  });

  describe('metrics', () => {
    it('should track processing time', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      vi.mocked(mockContext.findPaths).mockResolvedValue([]);

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.metrics.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should count explored and valid paths', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      const paths: GraphPath[] = [
        {
          nodes: [sourceId, targetId],
          edges: [{ id: 'edge-1', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.9 }],
          totalWeight: 0.9,
        },
        {
          nodes: [sourceId, 'middle', targetId],
          edges: [
            { id: 'edge-2', sourceId, targetId: 'middle', type: 'RELATED_TO', weight: 0.05 },
            { id: 'edge-3', sourceId: 'middle', targetId, type: 'RELATED_TO', weight: 0.05 },
          ],
          totalWeight: 0.0025, // Below minConfidence
        },
      ];

      vi.mocked(mockContext.findPaths).mockResolvedValue(paths);
      vi.mocked(mockContext.getEntityName).mockResolvedValue('Test');

      const result = await reasoner.reason(sourceId, targetId);

      expect(result.metrics.pathsExplored).toBe(2);
      expect(result.metrics.validPathsFound).toBe(1);
      expect(result.metrics.pathsPruned).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle self-referential query (source === target)', async () => {
      const entityId = 'entity-1';

      vi.mocked(mockContext.getEntity).mockResolvedValue(
        createMockEntity(entityId, 'GPT-4', 'AIModel')
      );

      const result = await reasoner.reason(entityId, entityId);

      expect(result.success).toBe(true);
      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].hopCount).toBe(0);
    });

    it('should handle paths with circular references', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      // Path that goes back through source
      const mockPath: GraphPath = {
        nodes: [sourceId, 'middle', sourceId, targetId],
        edges: [
          { id: 'edge-1', sourceId, targetId: 'middle', type: 'RELATED_TO', weight: 0.8 },
          { id: 'edge-2', sourceId: 'middle', targetId: sourceId, type: 'RELATED_TO', weight: 0.8 },
          { id: 'edge-3', sourceId, targetId, type: 'DEVELOPED_BY', weight: 0.9 },
        ],
        totalWeight: 0.576,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([mockPath]);
      vi.mocked(mockContext.getEntityName).mockResolvedValue('Test');

      const result = await reasoner.reason(sourceId, targetId);

      // Should still process the path (context provider is responsible for avoiding cycles)
      expect(result.success).toBe(true);
    });

    it('should handle empty edges in path', async () => {
      const sourceId = 'entity-1';
      const targetId = 'entity-2';

      vi.mocked(mockContext.getEntity)
        .mockResolvedValueOnce(createMockEntity(sourceId, 'GPT-4', 'AIModel'))
        .mockResolvedValueOnce(createMockEntity(targetId, 'OpenAI', 'Organization'));

      const emptyEdgePath: GraphPath = {
        nodes: [sourceId, targetId],
        edges: [],
        totalWeight: 0,
      };

      vi.mocked(mockContext.findPaths).mockResolvedValue([emptyEdgePath]);

      const result = await reasoner.reason(sourceId, targetId);

      // Empty edges should result in invalid path
      expect(result.metrics.pathsPruned).toBe(1);
    });
  });
});
