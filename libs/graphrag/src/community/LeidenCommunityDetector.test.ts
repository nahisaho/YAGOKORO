import { beforeEach, describe, expect, it } from 'vitest';
import { LeidenCommunityDetector } from './LeidenCommunityDetector.js';
import type { Graph } from './types.js';

describe('LeidenCommunityDetector', () => {
  let detector: LeidenCommunityDetector;

  beforeEach(() => {
    detector = new LeidenCommunityDetector();
  });

  describe('detect', () => {
    it('should return algorithm name', () => {
      expect(detector.getAlgorithmName()).toBe('leiden');
    });

    it('should detect communities in a simple graph', async () => {
      // Two clear clusters connected by weak edges
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }],
        edges: [
          // Cluster 1: a-b-c (densely connected)
          { source: 'a', target: 'b', weight: 1 },
          { source: 'b', target: 'c', weight: 1 },
          { source: 'a', target: 'c', weight: 1 },
          // Cluster 2: d-e-f (densely connected)
          { source: 'd', target: 'e', weight: 1 },
          { source: 'e', target: 'f', weight: 1 },
          { source: 'd', target: 'f', weight: 1 },
          // Weak bridge between clusters
          { source: 'c', target: 'd', weight: 0.1 },
        ],
      };

      const result = await detector.detect(graph);

      expect(result.communities.length).toBeGreaterThanOrEqual(2);
      expect(result.metrics.modularity).toBeGreaterThan(0);
      expect(result.metrics.numCommunities).toBeGreaterThanOrEqual(2);
      expect(result.metrics.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty graph', async () => {
      const graph: Graph = { nodes: [], edges: [] };

      const result = await detector.detect(graph);

      expect(result.communities).toHaveLength(0);
      expect(result.metrics.numCommunities).toBe(0);
    });

    it('should handle single node graph', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }],
        edges: [],
      };

      const result = await detector.detect(graph);

      expect(result.communities).toHaveLength(1);
      expect(result.communities[0].memberIds).toContain('a');
    });

    it('should handle disconnected components', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        edges: [
          // Two disconnected pairs
          { source: 'a', target: 'b', weight: 1 },
          { source: 'c', target: 'd', weight: 1 },
        ],
      };

      const result = await detector.detect(graph);

      // Should detect at least 2 communities
      expect(result.communities.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide node to community mapping', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [{ source: 'a', target: 'b', weight: 1 }],
      };

      const result = await detector.detect(graph);

      expect(result.nodeCommunities.has('a')).toBe(true);
      expect(result.nodeCommunities.has('b')).toBe(true);
    });

    it('should respect resolution parameter', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        edges: [
          { source: 'a', target: 'b', weight: 1 },
          { source: 'b', target: 'c', weight: 1 },
          { source: 'c', target: 'd', weight: 1 },
          { source: 'd', target: 'a', weight: 1 },
        ],
      };

      // Higher resolution = more communities
      const lowResDetector = new LeidenCommunityDetector({ resolution: 0.5 });
      const highResDetector = new LeidenCommunityDetector({ resolution: 2.0 });

      const lowResResult = await lowResDetector.detect(graph);
      const highResResult = await highResDetector.detect(graph);

      // Higher resolution tends to create more or equal communities
      expect(highResResult.metrics.numCommunities).toBeGreaterThanOrEqual(
        lowResResult.metrics.numCommunities
      );
    });

    it('should handle weighted edges', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        edges: [
          // Strong connection between a-b
          { source: 'a', target: 'b', weight: 10 },
          // Strong connection between c-d
          { source: 'c', target: 'd', weight: 10 },
          // No bridge - disconnected components
        ],
      };

      const result = await detector.detect(graph);

      // Should respect edge weights and create separate communities for disconnected components
      expect(result.communities.length).toBeGreaterThanOrEqual(2);
    });

    it('should support hierarchical detection', async () => {
      const detector = new LeidenCommunityDetector({ hierarchical: true, maxLevels: 3 });

      // Create a graph with potential hierarchy
      const graph: Graph = {
        nodes: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` })),
        edges: [
          // Cluster 1: n0-n3
          { source: 'n0', target: 'n1' },
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
          { source: 'n3', target: 'n0' },
          { source: 'n0', target: 'n2' },
          // Cluster 2: n4-n7
          { source: 'n4', target: 'n5' },
          { source: 'n5', target: 'n6' },
          { source: 'n6', target: 'n7' },
          { source: 'n7', target: 'n4' },
          { source: 'n4', target: 'n6' },
          // Cluster 3: n8-n11
          { source: 'n8', target: 'n9' },
          { source: 'n9', target: 'n10' },
          { source: 'n10', target: 'n11' },
          { source: 'n11', target: 'n8' },
          { source: 'n8', target: 'n10' },
          // Inter-cluster edges
          { source: 'n3', target: 'n4', weight: 0.5 },
          { source: 'n7', target: 'n8', weight: 0.5 },
        ],
      };

      const result = await detector.detect(graph);

      expect(result.levels).toBeGreaterThanOrEqual(1);
      expect(result.communities.some((c) => c.level === 0)).toBe(true);
    });

    it('should calculate community metadata', async () => {
      const graph: Graph = {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        edges: [
          { source: 'a', target: 'b', weight: 1 },
          { source: 'b', target: 'c', weight: 1 },
          { source: 'a', target: 'c', weight: 1 },
        ],
      };

      const result = await detector.detect(graph);

      expect(result.communities.length).toBeGreaterThanOrEqual(1);
      for (const community of result.communities) {
        expect(community.metadata).toBeDefined();
        expect(community.metadata?.size).toBeGreaterThan(0);
      }
    });
  });
});
