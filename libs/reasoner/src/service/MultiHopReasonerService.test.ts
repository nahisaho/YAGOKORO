/**
 * MultiHopReasonerService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiHopReasonerService } from './MultiHopReasonerService.js';
import type {
  PathFinderStrategy,
  PathCacheInterface,
  PathExplainerInterface,
  PathQuery,
  PathResult,
  Path,
  PathExplanation,
  PathNode,
} from '../types.js';

describe('MultiHopReasonerService', () => {
  let service: MultiHopReasonerService;
  let mockPathFinder: PathFinderStrategy;
  let mockPathCache: PathCacheInterface;
  let mockPathExplainer: PathExplainerInterface;

  const createNode = (id: string, name: string, type: string): PathNode => ({
    id,
    type: type as PathNode['type'],
    name,
    properties: {},
  });

  const createPath = (nodeNames: string[], hops: number): Path => ({
    nodes: nodeNames.map((name, i) => createNode(`${i}`, name, 'Entity')),
    relations: Array.from({ length: hops }, () => ({
      type: 'USES' as const,
      direction: 'outgoing' as const,
      properties: {},
    })),
    score: 1.0,
    hops,
  });

  const createPathResult = (paths: Path[]): PathResult => ({
    paths,
    statistics: {
      totalPaths: paths.length,
      averageHops: paths.length > 0 ? paths.reduce((a, p) => a + p.hops, 0) / paths.length : 0,
      minHops: paths.length > 0 ? Math.min(...paths.map((p) => p.hops)) : 0,
      maxHops: paths.length > 0 ? Math.max(...paths.map((p) => p.hops)) : 0,
      pathsByHops: {},
    },
    executionTime: 100,
  });

  const createExplanation = (path: Path): PathExplanation => ({
    path,
    naturalLanguage: `Explanation for ${path.nodes[0].name} to ${path.nodes[path.nodes.length - 1].name}`,
    summary: `${path.hops}-hop path`,
    keyRelations: [],
  });

  beforeEach(() => {
    mockPathFinder = {
      findPaths: vi.fn().mockResolvedValue(createPathResult([])),
    };

    mockPathCache = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      invalidate: vi.fn().mockReturnValue(0),
      getStats: vi.fn().mockReturnValue({ size: 0, maxSize: 1000, hitRate: 0 }),
    };

    mockPathExplainer = {
      explain: vi.fn().mockImplementation((path) => Promise.resolve(createExplanation(path))),
    };

    service = new MultiHopReasonerService({
      pathFinder: mockPathFinder,
      pathCache: mockPathCache,
      pathExplainer: mockPathExplainer,
    });
  });

  describe('findAndExplain', () => {
    it('should find paths and generate explanations', async () => {
      const paths = [createPath(['A', 'B', 'C'], 2)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const query: PathQuery = {
        startEntityType: 'Entity',
        startEntityName: 'A',
        endEntityType: 'Entity',
        endEntityName: 'C',
        maxHops: 4,
      };

      const result = await service.findAndExplain(query);

      expect(result.paths).toHaveLength(1);
      expect(result.explanations).toHaveLength(1);
      expect(mockPathFinder.findPaths).toHaveBeenCalledWith(query);
      expect(mockPathExplainer.explain).toHaveBeenCalledTimes(1);
    });

    it('should use cache when available', async () => {
      const paths = [createPath(['A', 'B'], 1)];
      const cachedResult = createPathResult(paths);
      vi.mocked(mockPathCache.get).mockReturnValue(cachedResult);

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 4,
      };

      const result = await service.findAndExplain(query);

      expect(result.fromCache).toBe(true);
      expect(mockPathFinder.findPaths).not.toHaveBeenCalled();
    });

    it('should skip cache when useCache is false', async () => {
      const paths = [createPath(['A', 'B'], 1)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 4,
      };

      await service.findAndExplain(query, { useCache: false });

      expect(mockPathCache.get).not.toHaveBeenCalled();
      expect(mockPathFinder.findPaths).toHaveBeenCalled();
    });

    it('should skip explanations when explain is false', async () => {
      const paths = [createPath(['A', 'B'], 1)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 4,
      };

      const result = await service.findAndExplain(query, { explain: false });

      expect(result.explanations).toBeUndefined();
      expect(mockPathExplainer.explain).not.toHaveBeenCalled();
    });

    it('should limit explanations', async () => {
      const paths = Array.from({ length: 20 }, (_, i) =>
        createPath([`A${i}`, `B${i}`], 1)
      );
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 4,
      };

      const result = await service.findAndExplain(query, { explainLimit: 5 });

      expect(result.explanations).toHaveLength(5);
    });

    it('should cache results', async () => {
      const paths = [createPath(['A', 'B'], 1)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 4,
      };

      await service.findAndExplain(query);

      expect(mockPathCache.set).toHaveBeenCalled();
    });
  });

  describe('findRelationPaths', () => {
    it('should find paths between named entities', async () => {
      const paths = [createPath(['GPT4', 'CoT'], 1)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const result = await service.findRelationPaths('GPT4', 'CoT');

      expect(result.paths).toHaveLength(1);
      expect(mockPathFinder.findPaths).toHaveBeenCalledWith(
        expect.objectContaining({
          startEntityName: 'GPT4',
          endEntityName: 'CoT',
        })
      );
    });

    it('should use provided options', async () => {
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult([]));

      await service.findRelationPaths('A', 'B', {
        entity1Type: 'AIModel',
        entity2Type: 'Technique',
        maxHops: 3,
        relationTypes: ['USES'],
      });

      expect(mockPathFinder.findPaths).toHaveBeenCalledWith(
        expect.objectContaining({
          startEntityType: 'AIModel',
          endEntityType: 'Technique',
          maxHops: 3,
          relationTypes: ['USES'],
        })
      );
    });
  });

  describe('findConceptConnections', () => {
    it('should find connections to models and techniques', async () => {
      const modelPaths = [createPath(['Attention', 'Transformer', 'GPT4'], 2)];
      const techPaths = [createPath(['Attention', 'CoT'], 1)];

      vi.mocked(mockPathFinder.findPaths)
        .mockResolvedValueOnce(createPathResult(modelPaths))
        .mockResolvedValueOnce(createPathResult(techPaths));

      const result = await service.findConceptConnections('Attention');

      expect(result.concept).toBe('Attention');
      expect(result.connectedModels).toHaveLength(1);
      expect(result.connectedTechniques).toHaveLength(1);
      expect(result.summary).toContain('Attention');
    });
  });

  describe('findShortestPath', () => {
    it('should return shortest path', async () => {
      const paths = [
        createPath(['A', 'B', 'C', 'D'], 3),
        createPath(['A', 'X', 'D'], 2),
        createPath(['A', 'Y', 'Z', 'D'], 3),
      ];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const result = await service.findShortestPath('A', 'D');

      expect(result?.hops).toBe(2);
    });

    it('should return null when no path found', async () => {
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult([]));

      const result = await service.findShortestPath('A', 'Z');

      expect(result).toBeNull();
    });
  });

  describe('areConnected', () => {
    it('should return true when connected', async () => {
      const paths = [createPath(['A', 'B'], 1)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const result = await service.areConnected('A', 'B');

      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult([]));

      const result = await service.areConnected('A', 'Z');

      expect(result).toBe(false);
    });
  });

  describe('getDegreesOfSeparation', () => {
    it('should return hop count', async () => {
      const paths = [createPath(['A', 'B', 'C'], 2)];
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult(paths));

      const result = await service.getDegreesOfSeparation('A', 'C');

      expect(result).toBe(2);
    });

    it('should return null when not connected', async () => {
      vi.mocked(mockPathFinder.findPaths).mockResolvedValue(createPathResult([]));

      const result = await service.getDegreesOfSeparation('A', 'Z');

      expect(result).toBeNull();
    });
  });

  describe('findCommonConnections', () => {
    it('should find common connections between entities', async () => {
      const paths1 = [
        createPath(['A', 'X'], 1),
        createPath(['A', 'Y'], 1),
      ];
      const paths2 = [
        createPath(['B', 'X'], 1),
        createPath(['B', 'Z'], 1),
      ];

      vi.mocked(mockPathFinder.findPaths)
        .mockResolvedValueOnce(createPathResult(paths1))
        .mockResolvedValueOnce(createPathResult(paths2))
        .mockResolvedValueOnce(createPathResult([])); // Direct path

      const result = await service.findCommonConnections('A', 'B');

      expect(result.entity1).toBe('A');
      expect(result.entity2).toBe('B');
      expect(result.commonConnections).toContain('X');
      expect(result.commonConnections).not.toContain('Y');
      expect(result.commonConnections).not.toContain('Z');
    });
  });

  describe('explainPath', () => {
    it('should explain a single path', async () => {
      const path = createPath(['A', 'B'], 1);

      const explanation = await service.explainPath(path, 'test context');

      expect(mockPathExplainer.explain).toHaveBeenCalledWith(path, 'test context');
      expect(explanation.path).toBe(path);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache for entity', () => {
      vi.mocked(mockPathCache.invalidate).mockReturnValue(5);

      const count = service.invalidateCacheForEntity('GPT4');

      expect(mockPathCache.invalidate).toHaveBeenCalledWith('GPT4');
      expect(count).toBe(5);
    });

    it('should get cache stats', () => {
      const stats = { size: 10, maxSize: 100, hitRate: 0.5 };
      vi.mocked(mockPathCache.getStats).mockReturnValue(stats);

      const result = service.getCacheStats();

      expect(result).toEqual(stats);
    });

    it('should clear cache', () => {
      service.clearCache();

      expect(mockPathCache.invalidate).toHaveBeenCalled();
    });
  });
});
