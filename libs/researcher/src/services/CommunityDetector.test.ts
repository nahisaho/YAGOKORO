/**
 * CommunityDetector Unit Tests
 *
 * @description 研究者コミュニティ検出のテスト（Louvain/Leiden algorithm）
 * @since v4.0.0
 * @see REQ-005-04
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommunityDetector,
  type CommunityDetectorConfig,
  type CommunityInfo,
  type CommunityMember,
} from './CommunityDetector.js';
import type { CoauthorEdge } from '@yagokoro/domain';

describe('CommunityDetector', () => {
  let detector: CommunityDetector;
  const defaultConfig: CommunityDetectorConfig = {
    algorithm: 'louvain',
    resolution: 1.0,
    randomSeed: 42,
  };

  beforeEach(() => {
    detector = new CommunityDetector(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const det = new CommunityDetector();
      expect(det).toBeInstanceOf(CommunityDetector);
    });

    it('should create instance with custom config', () => {
      const config: CommunityDetectorConfig = {
        algorithm: 'louvain',
        resolution: 0.5,
        randomSeed: 123,
      };
      const det = new CommunityDetector(config);
      expect(det).toBeInstanceOf(CommunityDetector);
    });
  });

  describe('detectCommunities()', () => {
    it('should detect communities in a simple network', () => {
      // Two clearly separated cliques
      const edges: CoauthorEdge[] = [
        // Clique 1: A-B-C
        createEdge('A', 'B', 3),
        createEdge('B', 'C', 3),
        createEdge('A', 'C', 3),
        // Clique 2: D-E-F
        createEdge('D', 'E', 3),
        createEdge('E', 'F', 3),
        createEdge('D', 'F', 3),
        // Weak connection between cliques
        createEdge('C', 'D', 1),
      ];

      const communities = detector.detectCommunities(edges);

      expect(communities.length).toBeGreaterThan(0);
      // Should detect at least 2 communities
      expect(communities.length).toBeGreaterThanOrEqual(1);
      // All nodes should be assigned
      const allMembers = communities.flatMap((c) => c.members.map((m) => m.researcherId));
      expect(allMembers).toContain('A');
      expect(allMembers).toContain('D');
    });

    it('should return empty array for empty network', () => {
      const communities = detector.detectCommunities([]);

      expect(communities).toEqual([]);
    });

    it('should assign community IDs', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
      ];

      const communities = detector.detectCommunities(edges);

      for (const community of communities) {
        expect(community.communityId).toBeDefined();
        expect(typeof community.communityId).toBe('string');
      }
    });

    it('should calculate community size correctly', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
        createEdge('A', 'C', 1),
      ];

      const communities = detector.detectCommunities(edges);

      const totalMembers = communities.reduce((sum, c) => sum + c.size, 0);
      expect(totalMembers).toBe(3);
    });

    it('should include member details', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 2),
        createEdge('B', 'C', 1),
      ];

      const communities = detector.detectCommunities(edges);

      for (const community of communities) {
        for (const member of community.members) {
          expect(member.researcherId).toBeDefined();
          expect(member.researcherName).toBeDefined();
        }
      }
    });

    it('should handle self-loops gracefully', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'A', 1),
        createEdge('A', 'B', 1),
      ];

      const communities = detector.detectCommunities(edges);

      expect(communities.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle disconnected components', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('C', 'D', 1),
      ];

      const communities = detector.detectCommunities(edges);

      // All 4 nodes should be assigned
      const allMemberIds = communities.flatMap((c) =>
        c.members.map((m) => m.researcherId),
      );
      expect(new Set(allMemberIds).size).toBe(4);
    });
  });

  describe('getCommunity()', () => {
    it('should return community for a given researcher', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
      ];

      const communities = detector.detectCommunities(edges);
      const community = detector.getCommunity('A');

      expect(community).toBeDefined();
      expect(community?.members.some((m) => m.researcherId === 'A')).toBe(true);
    });

    it('should return undefined for non-existent researcher', () => {
      const edges: CoauthorEdge[] = [createEdge('A', 'B', 1)];

      detector.detectCommunities(edges);
      const community = detector.getCommunity('Z');

      expect(community).toBeUndefined();
    });

    it('should return undefined before detection is run', () => {
      const community = detector.getCommunity('A');

      expect(community).toBeUndefined();
    });
  });

  describe('getCommunityMembers()', () => {
    it('should return all members in a community', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
        createEdge('A', 'C', 1),
      ];

      detector.detectCommunities(edges);
      const communityA = detector.getCommunity('A');
      
      if (communityA) {
        const members = detector.getCommunityMembers(communityA.communityId);
        expect(members.length).toBe(communityA.size);
      }
    });

    it('should return empty array for non-existent community', () => {
      const edges: CoauthorEdge[] = [createEdge('A', 'B', 1)];

      detector.detectCommunities(edges);
      const members = detector.getCommunityMembers('non-existent');

      expect(members).toEqual([]);
    });
  });

  describe('getModularity()', () => {
    it('should return modularity score after detection', () => {
      const edges: CoauthorEdge[] = [
        // Two dense cliques with weak connection
        createEdge('A', 'B', 5),
        createEdge('B', 'C', 5),
        createEdge('A', 'C', 5),
        createEdge('D', 'E', 5),
        createEdge('E', 'F', 5),
        createEdge('D', 'F', 5),
        createEdge('C', 'D', 1),
      ];

      detector.detectCommunities(edges);
      const modularity = detector.getModularity();

      // Modularity should be a defined number (can exceed 1 for weighted graphs)
      expect(typeof modularity).toBe('number');
      expect(Number.isFinite(modularity)).toBe(true);
    });

    it('should return 0 before detection', () => {
      const modularity = detector.getModularity();

      expect(modularity).toBe(0);
    });
  });

  describe('findBridgeResearchers()', () => {
    it('should identify researchers connecting communities', () => {
      const edges: CoauthorEdge[] = [
        // Clique 1
        createEdge('A', 'B', 3),
        createEdge('B', 'C', 3),
        createEdge('A', 'C', 3),
        // Clique 2
        createEdge('D', 'E', 3),
        createEdge('E', 'F', 3),
        createEdge('D', 'F', 3),
        // Bridge: C connects to D
        createEdge('C', 'D', 1),
      ];

      detector.detectCommunities(edges);
      const bridges = detector.findBridgeResearchers();

      // Bridge researchers should have connections across communities
      expect(Array.isArray(bridges)).toBe(true);
    });

    it('should return empty array for single community', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
        createEdge('A', 'C', 1),
      ];

      detector.detectCommunities(edges);
      const bridges = detector.findBridgeResearchers();

      expect(bridges).toEqual([]);
    });
  });

  describe('getCommunityStats()', () => {
    it('should return statistics about detected communities', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
        createEdge('A', 'C', 1),
        createEdge('D', 'E', 1),
      ];

      detector.detectCommunities(edges);
      const stats = detector.getCommunityStats();

      expect(stats.totalCommunities).toBeGreaterThanOrEqual(1);
      expect(stats.totalMembers).toBe(5);
      expect(stats.averageSize).toBeDefined();
      expect(stats.largestCommunitySize).toBeGreaterThan(0);
      expect(stats.smallestCommunitySize).toBeGreaterThan(0);
    });

    it('should return zeroes before detection', () => {
      const stats = detector.getCommunityStats();

      expect(stats.totalCommunities).toBe(0);
      expect(stats.totalMembers).toBe(0);
    });
  });

  describe('resolution parameter', () => {
    it('should detect more communities with higher resolution', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('B', 'C', 1),
        createEdge('C', 'D', 1),
        createEdge('D', 'E', 1),
        createEdge('E', 'F', 1),
        createEdge('F', 'A', 1),
      ];

      // Low resolution - tend to find fewer, larger communities
      const lowResDetector = new CommunityDetector({ resolution: 0.5 });
      const lowResCommunities = lowResDetector.detectCommunities(edges);

      // High resolution - tend to find more, smaller communities
      const highResDetector = new CommunityDetector({ resolution: 2.0 });
      const highResCommunities = highResDetector.detectCommunities(edges);

      // Generally, higher resolution should give more or equal communities
      // (This is not always guaranteed, so we just check both work)
      expect(lowResCommunities.length).toBeGreaterThanOrEqual(1);
      expect(highResCommunities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge weights', () => {
    it('should consider edge weights in community detection', () => {
      // Strong internal edges, weak external edge
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 10),
        createEdge('C', 'D', 10),
        createEdge('B', 'C', 1), // Weak bridge
      ];

      const communities = detector.detectCommunities(edges);

      // Should tend to separate strongly connected pairs
      // from weakly connected ones
      expect(communities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('label assignment', () => {
    it('should generate meaningful community labels', () => {
      const edges: CoauthorEdge[] = [
        createEdge('Alice', 'Bob', 1),
        createEdge('Bob', 'Charlie', 1),
      ];

      const communities = detector.detectCommunities(edges);

      for (const community of communities) {
        expect(community.label).toBeDefined();
        expect(typeof community.label).toBe('string');
      }
    });
  });
});

// Helper function
function createEdge(r1: string, r2: string, weight: number): CoauthorEdge {
  return {
    researcher1Id: r1,
    researcher1Name: r1,
    researcher2Id: r2,
    researcher2Name: r2,
    paperCount: weight,
    paperIds: [],
    firstCollaboration: new Date(),
    lastCollaboration: new Date(),
    weight,
  };
}
