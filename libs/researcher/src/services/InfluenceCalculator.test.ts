/**
 * InfluenceCalculator Unit Tests
 *
 * @description 研究者影響力計算のテスト
 * @since v4.0.0
 * @see REQ-005-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InfluenceCalculator,
  type InfluenceCalculatorConfig,
  type ResearcherCitations,
  type InfluenceResult,
} from './InfluenceCalculator.js';
import type { CoauthorEdge, ResearcherMetrics } from '@yagokoro/domain';

describe('InfluenceCalculator', () => {
  let calculator: InfluenceCalculator;
  const defaultConfig: InfluenceCalculatorConfig = {
    pageRankDamping: 0.85,
    pageRankIterations: 100,
    pageRankTolerance: 1e-6,
  };

  beforeEach(() => {
    calculator = new InfluenceCalculator(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const calc = new InfluenceCalculator();
      expect(calc).toBeInstanceOf(InfluenceCalculator);
    });

    it('should create instance with custom config', () => {
      const config: InfluenceCalculatorConfig = {
        pageRankDamping: 0.90,
        pageRankIterations: 50,
        pageRankTolerance: 1e-4,
      };
      const calc = new InfluenceCalculator(config);
      expect(calc).toBeInstanceOf(InfluenceCalculator);
    });
  });

  describe('calculateHIndex()', () => {
    it('should calculate h-index for typical researcher', () => {
      // 5 papers with citations [10, 8, 5, 4, 3] -> h-index = 4
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 10 },
          { paperId: 'p2', citations: 8 },
          { paperId: 'p3', citations: 5 },
          { paperId: 'p4', citations: 4 },
          { paperId: 'p5', citations: 3 },
        ],
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(4);
    });

    it('should return 0 for researcher with no papers', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [],
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(0);
    });

    it('should return 0 for researcher with no citations', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 0 },
          { paperId: 'p2', citations: 0 },
          { paperId: 'p3', citations: 0 },
        ],
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(0);
    });

    it('should handle highly cited single paper', () => {
      // 1 paper with 1000 citations -> h-index = 1
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: 1000 }],
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(1);
    });

    it('should handle many equally cited papers', () => {
      // 10 papers each with 10 citations -> h-index = 10
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: Array.from({ length: 10 }, (_, i) => ({
          paperId: `p${i}`,
          citations: 10,
        })),
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(10);
    });

    it('should handle papers in any order', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 3 },
          { paperId: 'p2', citations: 10 },
          { paperId: 'p3', citations: 1 },
          { paperId: 'p4', citations: 5 },
        ],
      };

      const hIndex = calculator.calculateHIndex(citations);

      // Sorted: [10, 5, 3, 1] -> h-index = 3
      expect(hIndex).toBe(3);
    });
  });

  describe('calculateI10Index()', () => {
    it('should count papers with 10+ citations', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 15 },
          { paperId: 'p2', citations: 10 },
          { paperId: 'p3', citations: 8 },
          { paperId: 'p4', citations: 12 },
        ],
      };

      const i10Index = calculator.calculateI10Index(citations);

      expect(i10Index).toBe(3);
    });

    it('should return 0 when no papers have 10+ citations', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 9 },
          { paperId: 'p2', citations: 5 },
        ],
      };

      const i10Index = calculator.calculateI10Index(citations);

      expect(i10Index).toBe(0);
    });

    it('should count paper with exactly 10 citations', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: 10 }],
      };

      const i10Index = calculator.calculateI10Index(citations);

      expect(i10Index).toBe(1);
    });
  });

  describe('calculateTotalCitations()', () => {
    it('should sum all citations', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 100 },
          { paperId: 'p2', citations: 50 },
          { paperId: 'p3', citations: 25 },
        ],
      };

      const total = calculator.calculateTotalCitations(citations);

      expect(total).toBe(175);
    });

    it('should return 0 for no papers', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [],
      };

      const total = calculator.calculateTotalCitations(citations);

      expect(total).toBe(0);
    });
  });

  describe('calculatePageRank()', () => {
    it('should calculate PageRank for simple network', () => {
      // Simple triangle network: A-B, B-C, A-C
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 2),
        createEdge('B', 'C', 1),
        createEdge('A', 'C', 1),
      ];

      const pageRanks = calculator.calculatePageRank(edges);

      // All nodes should have PageRank > 0
      expect(pageRanks.get('A')).toBeGreaterThan(0);
      expect(pageRanks.get('B')).toBeGreaterThan(0);
      expect(pageRanks.get('C')).toBeGreaterThan(0);

      // Sum should be approximately 1
      const sum = Array.from(pageRanks.values()).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 3);
    });

    it('should assign higher PageRank to well-connected nodes', () => {
      // Star network: Center connected to A, B, C, D
      const edges: CoauthorEdge[] = [
        createEdge('Center', 'A', 1),
        createEdge('Center', 'B', 1),
        createEdge('Center', 'C', 1),
        createEdge('Center', 'D', 1),
      ];

      const pageRanks = calculator.calculatePageRank(edges);

      // Center should have higher PageRank than periphery
      expect(pageRanks.get('Center')).toBeGreaterThan(pageRanks.get('A')!);
      expect(pageRanks.get('Center')).toBeGreaterThan(pageRanks.get('B')!);
    });

    it('should consider edge weights', () => {
      // A-B with strong connection, A-C with weak connection
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 10),
        createEdge('A', 'C', 1),
      ];

      const pageRanks = calculator.calculatePageRank(edges);

      // B should have higher PageRank than C due to stronger connection
      expect(pageRanks.get('B')).toBeGreaterThan(pageRanks.get('C')!);
    });

    it('should return empty map for empty network', () => {
      const pageRanks = calculator.calculatePageRank([]);

      expect(pageRanks.size).toBe(0);
    });

    it('should handle disconnected components', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'B', 1),
        createEdge('C', 'D', 1),
      ];

      const pageRanks = calculator.calculatePageRank(edges);

      // All nodes should have PageRank > 0
      expect(pageRanks.get('A')).toBeGreaterThan(0);
      expect(pageRanks.get('C')).toBeGreaterThan(0);
    });
  });

  describe('calculateMetrics()', () => {
    it('should calculate all metrics for a researcher', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 100 },
          { paperId: 'p2', citations: 50 },
          { paperId: 'p3', citations: 25 },
          { paperId: 'p4', citations: 10 },
          { paperId: 'p5', citations: 5 },
        ],
      };
      const edges: CoauthorEdge[] = [
        createEdge('r1', 'r2', 3),
        createEdge('r1', 'r3', 2),
      ];

      const metrics = calculator.calculateMetrics(citations, edges);

      expect(metrics.hIndex).toBe(5);
      expect(metrics.i10Index).toBe(4);
      expect(metrics.citationCount).toBe(190);
      expect(metrics.paperCount).toBe(5);
      expect(metrics.coauthorCount).toBe(2);
      expect(metrics.pageRank).toBeGreaterThan(0);
      expect(metrics.avgCitationsPerPaper).toBeCloseTo(38, 0);
    });

    it('should handle researcher with no coauthors', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: 10 }],
      };

      const metrics = calculator.calculateMetrics(citations, []);

      expect(metrics.coauthorCount).toBe(0);
      expect(metrics.pageRank).toBe(0);
    });
  });

  describe('calculateInfluenceScore()', () => {
    it('should calculate combined influence score', () => {
      const metrics: ResearcherMetrics = {
        hIndex: 50,
        citationCount: 10000,
        paperCount: 100,
        coauthorCount: 50,
        pageRank: 0.05,
        i10Index: 80,
        avgCitationsPerPaper: 100,
        updatedAt: new Date(),
      };

      const score = calculator.calculateInfluenceScore(metrics);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0 for empty metrics', () => {
      const metrics: ResearcherMetrics = {
        hIndex: 0,
        citationCount: 0,
        paperCount: 0,
        coauthorCount: 0,
        pageRank: 0,
        updatedAt: new Date(),
      };

      const score = calculator.calculateInfluenceScore(metrics);

      expect(score).toBe(0);
    });

    it('should rank researchers correctly', () => {
      const seniorMetrics: ResearcherMetrics = {
        hIndex: 60,
        citationCount: 20000,
        paperCount: 150,
        coauthorCount: 100,
        pageRank: 0.08,
        updatedAt: new Date(),
      };

      const juniorMetrics: ResearcherMetrics = {
        hIndex: 10,
        citationCount: 500,
        paperCount: 20,
        coauthorCount: 15,
        pageRank: 0.01,
        updatedAt: new Date(),
      };

      const seniorScore = calculator.calculateInfluenceScore(seniorMetrics);
      const juniorScore = calculator.calculateInfluenceScore(juniorMetrics);

      expect(seniorScore).toBeGreaterThan(juniorScore);
    });
  });

  describe('rankResearchers()', () => {
    it('should rank researchers by influence score', () => {
      const researchers = [
        {
          researcherId: 'r1',
          citations: createCitations('r1', [100, 50, 25]),
          edges: [createEdge('r1', 'r2', 2)],
        },
        {
          researcherId: 'r2',
          citations: createCitations('r2', [200, 150, 100, 50]),
          edges: [createEdge('r2', 'r1', 2), createEdge('r2', 'r3', 3)],
        },
        {
          researcherId: 'r3',
          citations: createCitations('r3', [10, 5]),
          edges: [createEdge('r3', 'r2', 3)],
        },
      ];

      const rankings = calculator.rankResearchers(researchers);

      expect(rankings).toHaveLength(3);
      // r2 should be ranked first (most citations, papers, connections)
      expect(rankings[0]!.researcherId).toBe('r2');
      expect(rankings[0]!.rank).toBe(1);
      // r3 should be last
      expect(rankings[2]!.researcherId).toBe('r3');
      expect(rankings[2]!.rank).toBe(3);
    });

    it('should limit results when specified', () => {
      const researchers = Array.from({ length: 10 }, (_, i) => ({
        researcherId: `r${i}`,
        citations: createCitations(`r${i}`, [10 * (10 - i)]),
        edges: [],
      }));

      const rankings = calculator.rankResearchers(researchers, { limit: 5 });

      expect(rankings).toHaveLength(5);
      expect(rankings[0]!.rank).toBe(1);
      expect(rankings[4]!.rank).toBe(5);
    });

    it('should filter by minimum h-index', () => {
      const researchers = [
        {
          researcherId: 'r1',
          citations: createCitations('r1', [50, 40, 30, 20, 10]),
          edges: [],
        },
        {
          researcherId: 'r2',
          citations: createCitations('r2', [5, 4, 3]),
          edges: [],
        },
      ];

      const rankings = calculator.rankResearchers(researchers, { minHIndex: 4 });

      expect(rankings).toHaveLength(1);
      expect(rankings[0]!.researcherId).toBe('r1');
    });
  });

  describe('edge cases', () => {
    it('should handle negative citations gracefully', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: -5 }],
      };

      const hIndex = calculator.calculateHIndex(citations);

      expect(hIndex).toBe(0);
    });

    it('should handle very large citation counts', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: 1000000 }],
      };

      const total = calculator.calculateTotalCitations(citations);

      expect(total).toBe(1000000);
    });

    it('should handle self-loops in coauthor network', () => {
      const edges: CoauthorEdge[] = [
        createEdge('A', 'A', 1), // Self-loop
        createEdge('A', 'B', 1),
      ];

      // Should not crash
      const pageRanks = calculator.calculatePageRank(edges);
      expect(pageRanks.size).toBeGreaterThan(0);
    });
  });
});

// Helper functions
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

function createCitations(researcherId: string, citationCounts: number[]): ResearcherCitations {
  return {
    researcherId,
    papers: citationCounts.map((c, i) => ({
      paperId: `${researcherId}-p${i}`,
      citations: c,
    })),
  };
}
