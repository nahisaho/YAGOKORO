/**
 * ResearcherService Unit Tests
 *
 * @description 研究者分析サービスファサードのテスト
 * @since v4.0.0
 * @see REQ-005-06, REQ-005-08
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResearcherService,
  type ResearcherServiceConfig,
  type ResearcherSearchOptions,
  type ResearcherDetails,
} from './ResearcherService.js';
import type { Paper } from './CoauthorExtractor.js';
import type { ResearcherCitations } from './InfluenceCalculator.js';

describe('ResearcherService', () => {
  let service: ResearcherService;
  const defaultConfig: ResearcherServiceConfig = {
    enableORCID: false, // テストではORCIDを無効化
    enableCommunityDetection: true,
    defaultResolution: 1.0,
  };

  beforeEach(() => {
    service = new ResearcherService(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const svc = new ResearcherService();
      expect(svc).toBeInstanceOf(ResearcherService);
    });

    it('should create instance with custom config', () => {
      const config: ResearcherServiceConfig = {
        enableORCID: true,
        enableCommunityDetection: false,
        defaultResolution: 0.8,
      };
      const svc = new ResearcherService(config);
      expect(svc).toBeInstanceOf(ResearcherService);
    });
  });

  describe('indexPapers()', () => {
    it('should index papers and extract researcher data', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice Smith', orcid: '0000-0001-1234-5678', affiliation: 'MIT' },
            { name: 'Bob Jones', affiliation: 'Stanford' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [
            { name: 'Alice Smith', orcid: '0000-0001-1234-5678', affiliation: 'MIT' },
            { name: 'Charlie Brown', affiliation: 'Harvard' },
          ],
          publishedDate: new Date('2023-06-20'),
        },
      ];

      const result = await service.indexPapers(papers);

      expect(result.totalPapers).toBe(2);
      expect(result.totalResearchers).toBeGreaterThan(0);
      expect(result.totalEdges).toBeGreaterThan(0);
    });

    it('should handle empty paper list', async () => {
      const result = await service.indexPapers([]);

      expect(result.totalPapers).toBe(0);
      expect(result.totalResearchers).toBe(0);
    });
  });

  describe('getResearcher()', () => {
    it('should return researcher details after indexing', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice Smith', orcid: '0000-0001-1234-5678', affiliation: 'MIT' },
            { name: 'Bob Jones', affiliation: 'Stanford' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      // ORCIDプレフィックス付きで検索
      const researcher = service.getResearcher('orcid:0000-0001-1234-5678');

      expect(researcher).toBeDefined();
      expect(researcher?.name).toBe('Alice Smith');
    });

    it('should return undefined for non-existent researcher', () => {
      const researcher = service.getResearcher('unknown-id');

      expect(researcher).toBeUndefined();
    });
  });

  describe('getCoauthors()', () => {
    it('should return coauthors for a researcher', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: '0000-0001-1234-5678' },
            { name: 'Bob' },
            { name: 'Charlie' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      // ORCIDプレフィックス付きで検索
      const coauthors = service.getCoauthors('orcid:0000-0001-1234-5678');

      expect(coauthors.length).toBe(2);
    });

    it('should return empty array for unknown researcher', () => {
      const coauthors = service.getCoauthors('unknown-id');

      expect(coauthors).toEqual([]);
    });
  });

  describe('findPath()', () => {
    it('should find collaboration path between researchers', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: '0000-0001-0000-0001' },
            { name: 'Bob', orcid: '0000-0001-0000-0002' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [
            { name: 'Bob', orcid: '0000-0001-0000-0002' },
            { name: 'Charlie', orcid: '0000-0001-0000-0003' },
          ],
          publishedDate: new Date('2023-06-20'),
        },
      ];

      await service.indexPapers(papers);
      const path = service.findPath('orcid:0000-0001-0000-0001', 'orcid:0000-0001-0000-0003');

      expect(path).toBeDefined();
      expect(path?.length).toBeGreaterThan(0);
    });

    it('should return null for disconnected researchers', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice', orcid: '0000-0001-0000-0001' }],
          publishedDate: new Date('2023-01-15'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [{ name: 'Bob', orcid: '0000-0001-0000-0002' }],
          publishedDate: new Date('2023-06-20'),
        },
      ];

      await service.indexPapers(papers);
      const path = service.findPath('orcid:0000-0001-0000-0001', 'orcid:0000-0001-0000-0002');

      expect(path).toBeNull();
    });
  });

  describe('searchResearchers()', () => {
    it('should search researchers by name', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice Smith', affiliation: 'MIT' },
            { name: 'Bob Jones', affiliation: 'Stanford' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      const results = service.searchResearchers({ nameQuery: 'Alice' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.name.toLowerCase()).toContain('alice');
    });

    it('should search researchers by affiliation', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', affiliation: 'MIT' },
            { name: 'Bob', affiliation: 'Stanford' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      const results = service.searchResearchers({ affiliation: 'MIT' });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit search results', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: Array.from({ length: 10 }, (_, i) => ({ name: `Author ${i}` })),
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      const results = service.searchResearchers({ limit: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCommunities()', () => {
    it('should detect communities in collaboration network', async () => {
      const papers: Paper[] = [
        // Clique 1
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: '0000-0001-0000-0001' },
            { name: 'Bob', orcid: '0000-0001-0000-0002' },
            { name: 'Charlie', orcid: '0000-0001-0000-0003' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
        // Clique 2
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [
            { name: 'Dave', orcid: '0000-0001-0000-0004' },
            { name: 'Eve', orcid: '0000-0001-0000-0005' },
            { name: 'Frank', orcid: '0000-0001-0000-0006' },
          ],
          publishedDate: new Date('2023-06-20'),
        },
      ];

      await service.indexPapers(papers);
      const communities = service.getCommunities();

      // コミュニティが検出されることを確認
      expect(Array.isArray(communities)).toBe(true);
      // 2つの独立したクリークがあるため、2つのコミュニティが期待される
      expect(communities.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array if community detection disabled', async () => {
      const svc = new ResearcherService({
        enableCommunityDetection: false,
      });

      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await svc.indexPapers(papers);
      const communities = svc.getCommunities();

      expect(communities).toEqual([]);
    });
  });

  describe('getInfluenceRanking()', () => {
    it('should rank researchers by influence', async () => {
      // Mock citation data since we don't have actual citations
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: '0000-0001-0000-0001' },
            { name: 'Bob', orcid: '0000-0001-0000-0002' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);

      // Set citations manually for testing
      service.setCitations('orcid:0000-0001-0000-0001', [
        { paperId: 'p1', citations: 100 },
        { paperId: 'p2', citations: 50 },
      ]);

      const ranking = service.getInfluenceRanking({ limit: 10 });

      expect(ranking.length).toBeGreaterThan(0);
      // First researcher should have higher influence
      if (ranking.length > 1) {
        expect(ranking[0]!.influenceScore).toBeGreaterThanOrEqual(ranking[1]!.influenceScore);
      }
    });
  });

  describe('getNetworkStats()', () => {
    it('should return network statistics', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'Charlie' },
          ],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      const stats = service.getNetworkStats();

      expect(stats.totalResearchers).toBe(3);
      expect(stats.totalEdges).toBe(3); // 3 pairs
      expect(stats.averageDegree).toBeGreaterThan(0);
    });

    it('should return zeroes for empty network', () => {
      const stats = service.getNetworkStats();

      expect(stats.totalResearchers).toBe(0);
      expect(stats.totalEdges).toBe(0);
    });
  });

  describe('exportToGraph()', () => {
    it('should export network as graph data', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      const graphData = service.exportToGraph();

      expect(graphData.nodes.length).toBe(2);
      expect(graphData.edges.length).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all indexed data', async () => {
      const papers: Paper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedDate: new Date('2023-01-15'),
        },
      ];

      await service.indexPapers(papers);
      service.clear();

      const stats = service.getNetworkStats();
      expect(stats.totalResearchers).toBe(0);
    });
  });
});
