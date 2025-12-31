/**
 * CoauthorExtractor Unit Tests
 *
 * @description 共著関係抽出のテスト
 * @since v4.0.0
 * @see REQ-005-01, REQ-005-05
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoauthorExtractor, type CoauthorExtractorConfig } from './CoauthorExtractor.js';
import type { CoauthorEdge } from '@yagokoro/domain';

// Mock paper types for testing
interface TestAuthor {
  id?: string;
  name: string;
  orcid?: string;
  affiliations?: string[];
}

interface TestPaper {
  id: string;
  title: string;
  authors: TestAuthor[];
  publishedAt: Date;
  citations?: number;
}

describe('CoauthorExtractor', () => {
  let extractor: CoauthorExtractor;
  const defaultConfig: CoauthorExtractorConfig = {
    minPapersForEdge: 1,
    includeOrcid: true,
    normalizeNames: true,
  };

  beforeEach(() => {
    extractor = new CoauthorExtractor(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const ext = new CoauthorExtractor();
      expect(ext).toBeInstanceOf(CoauthorExtractor);
    });

    it('should create instance with custom config', () => {
      const config: CoauthorExtractorConfig = {
        minPapersForEdge: 2,
        includeOrcid: false,
        normalizeNames: true,
      };
      const ext = new CoauthorExtractor(config);
      expect(ext).toBeInstanceOf(CoauthorExtractor);
    });
  });

  describe('extractFromPaper()', () => {
    it('should extract coauthor edges from a paper with 2 authors', () => {
      const paper: TestPaper = {
        id: 'paper-1',
        title: 'Attention Is All You Need',
        authors: [
          { name: 'Ashish Vaswani' },
          { name: 'Noam Shazeer' },
        ],
        publishedAt: new Date('2017-06-12'),
      };

      const edges = extractor.extractFromPaper(paper);

      expect(edges).toHaveLength(1);
      expect(edges[0]!.researcher1Name).toBe('Ashish Vaswani');
      expect(edges[0]!.researcher2Name).toBe('Noam Shazeer');
      expect(edges[0]!.paperCount).toBe(1);
      expect(edges[0]!.paperIds).toContain('paper-1');
    });

    it('should extract multiple edges from a paper with 3 authors', () => {
      const paper: TestPaper = {
        id: 'paper-2',
        title: 'BERT',
        authors: [
          { name: 'Jacob Devlin' },
          { name: 'Ming-Wei Chang' },
          { name: 'Kenton Lee' },
        ],
        publishedAt: new Date('2018-10-11'),
      };

      const edges = extractor.extractFromPaper(paper);

      // 3 authors should produce 3 edges (3 choose 2 = 3)
      expect(edges).toHaveLength(3);
    });

    it('should extract 6 edges from a paper with 4 authors', () => {
      const paper: TestPaper = {
        id: 'paper-3',
        title: 'GPT-3',
        authors: [
          { name: 'Tom Brown' },
          { name: 'Benjamin Mann' },
          { name: 'Nick Ryder' },
          { name: 'Melanie Subbiah' },
        ],
        publishedAt: new Date('2020-05-28'),
      };

      const edges = extractor.extractFromPaper(paper);

      // 4 authors should produce 6 edges (4 choose 2 = 6)
      expect(edges).toHaveLength(6);
    });

    it('should return empty array for single author papers', () => {
      const paper: TestPaper = {
        id: 'paper-4',
        title: 'Solo Paper',
        authors: [{ name: 'Solo Author' }],
        publishedAt: new Date('2023-01-01'),
      };

      const edges = extractor.extractFromPaper(paper);

      expect(edges).toHaveLength(0);
    });

    it('should return empty array for papers with no authors', () => {
      const paper: TestPaper = {
        id: 'paper-5',
        title: 'No Author Paper',
        authors: [],
        publishedAt: new Date('2023-01-01'),
      };

      const edges = extractor.extractFromPaper(paper);

      expect(edges).toHaveLength(0);
    });

    it('should set firstCollaboration and lastCollaboration to paper date', () => {
      const paperDate = new Date('2022-06-15');
      const paper: TestPaper = {
        id: 'paper-6',
        title: 'Test Paper',
        authors: [
          { name: 'Author A' },
          { name: 'Author B' },
        ],
        publishedAt: paperDate,
      };

      const edges = extractor.extractFromPaper(paper);

      expect(edges[0]!.firstCollaboration).toEqual(paperDate);
      expect(edges[0]!.lastCollaboration).toEqual(paperDate);
    });

    it('should calculate initial weight based on paper date', () => {
      const paper: TestPaper = {
        id: 'paper-7',
        title: 'Recent Paper',
        authors: [
          { name: 'Author A' },
          { name: 'Author B' },
        ],
        publishedAt: new Date(), // Today
      };

      const edges = extractor.extractFromPaper(paper);

      // For a paper from today, weight should be close to 1 (1 paper * ~1 recency factor)
      expect(edges[0]!.weight).toBeGreaterThan(0.9);
      expect(edges[0]!.weight).toBeLessThanOrEqual(1);
    });

    it('should include ORCID when available', () => {
      const paper: TestPaper = {
        id: 'paper-8',
        title: 'ORCID Paper',
        authors: [
          { name: 'Author A', orcid: '0000-0001-2345-6789' },
          { name: 'Author B', orcid: '0000-0002-3456-7890' },
        ],
        publishedAt: new Date('2023-01-01'),
      };

      const edges = extractor.extractFromPaper(paper);

      // Verify author IDs are set correctly when ORCID is available
      expect(edges[0]!.researcher1Id).toContain('0000-0001-2345-6789');
      expect(edges[0]!.researcher2Id).toContain('0000-0002-3456-7890');
    });

    it('should normalize author names when config enabled', () => {
      const paper: TestPaper = {
        id: 'paper-9',
        title: 'Name Test Paper',
        authors: [
          { name: 'José García' },
          { name: 'François Müller' },
        ],
        publishedAt: new Date('2023-01-01'),
      };

      const edges = extractor.extractFromPaper(paper);

      // Names should be stored with original display names (order by normalized ID)
      const names = [edges[0]!.researcher1Name, edges[0]!.researcher2Name];
      expect(names).toContain('José García');
      expect(names).toContain('François Müller');
    });
  });

  describe('extractFromPapers()', () => {
    it('should aggregate edges from multiple papers', () => {
      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice' },
            { name: 'Bob' },
          ],
          publishedAt: new Date('2020-01-01'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [
            { name: 'Alice' },
            { name: 'Bob' },
          ],
          publishedAt: new Date('2021-01-01'),
        },
      ];

      const edges = extractor.extractFromPapers(papers);

      // Should merge into single edge with paperCount = 2
      expect(edges).toHaveLength(1);
      expect(edges[0]!.paperCount).toBe(2);
      expect(edges[0]!.paperIds).toHaveLength(2);
      expect(edges[0]!.paperIds).toContain('p1');
      expect(edges[0]!.paperIds).toContain('p2');
    });

    it('should update firstCollaboration and lastCollaboration correctly', () => {
      const firstDate = new Date('2018-01-01');
      const lastDate = new Date('2023-06-15');

      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Early Paper',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: firstDate,
        },
        {
          id: 'p2',
          title: 'Recent Paper',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: lastDate,
        },
      ];

      const edges = extractor.extractFromPapers(papers);

      expect(edges[0]!.firstCollaboration).toEqual(firstDate);
      expect(edges[0]!.lastCollaboration).toEqual(lastDate);
    });

    it('should handle papers with different author combinations', () => {
      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: new Date('2020-01-01'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [{ name: 'Bob' }, { name: 'Charlie' }],
          publishedAt: new Date('2021-01-01'),
        },
        {
          id: 'p3',
          title: 'Paper 3',
          authors: [{ name: 'Alice' }, { name: 'Charlie' }],
          publishedAt: new Date('2022-01-01'),
        },
      ];

      const edges = extractor.extractFromPapers(papers);

      // Should have 3 distinct edges: Alice-Bob, Bob-Charlie, Alice-Charlie
      expect(edges).toHaveLength(3);
    });

    it('should update weight based on most recent collaboration', () => {
      const oldDate = new Date('2010-01-01');
      const recentDate = new Date();

      const papersOld: TestPaper[] = [
        {
          id: 'p1',
          title: 'Old Paper',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: oldDate,
        },
      ];

      const papersRecent: TestPaper[] = [
        {
          id: 'p1',
          title: 'Old Paper',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: oldDate,
        },
        {
          id: 'p2',
          title: 'Recent Paper',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: recentDate,
        },
      ];

      const edgesOld = extractor.extractFromPapers(papersOld);
      const edgesRecent = extractor.extractFromPapers(papersRecent);

      // More recent collaboration should have higher weight
      expect(edgesRecent[0]!.weight).toBeGreaterThan(edgesOld[0]!.weight);
    });

    it('should respect minPapersForEdge config', () => {
      const config: CoauthorExtractorConfig = {
        minPapersForEdge: 2,
        includeOrcid: true,
        normalizeNames: true,
      };
      const extractorWithMin = new CoauthorExtractor(config);

      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: new Date('2020-01-01'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [{ name: 'Alice' }, { name: 'Bob' }],
          publishedAt: new Date('2021-01-01'),
        },
        {
          id: 'p3',
          title: 'Paper 3',
          authors: [{ name: 'Bob' }, { name: 'Charlie' }], // Only 1 paper
          publishedAt: new Date('2022-01-01'),
        },
      ];

      const edges = extractorWithMin.extractFromPapers(papers);

      // Only Alice-Bob edge should be included (2 papers)
      // Bob-Charlie has only 1 paper, below minPapersForEdge
      expect(edges).toHaveLength(1);
      expect(edges[0]!.researcher1Name).toBe('Alice');
      expect(edges[0]!.researcher2Name).toBe('Bob');
    });
  });

  describe('calculateWeight()', () => {
    it('should calculate weight as paperCount * recencyFactor', () => {
      const edge: CoauthorEdge = {
        researcher1Id: 'r1',
        researcher1Name: 'Alice',
        researcher2Id: 'r2',
        researcher2Name: 'Bob',
        paperCount: 5,
        paperIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        firstCollaboration: new Date('2020-01-01'),
        lastCollaboration: new Date(), // Today
        weight: 0,
      };

      const weight = extractor.calculateWeight(edge);

      // Weight should be close to 5 (5 papers * ~1 recency factor for today)
      expect(weight).toBeGreaterThan(4.5);
      expect(weight).toBeLessThanOrEqual(5);
    });

    it('should reduce weight for older collaborations', () => {
      const recentEdge: CoauthorEdge = {
        researcher1Id: 'r1',
        researcher1Name: 'Alice',
        researcher2Id: 'r2',
        researcher2Name: 'Bob',
        paperCount: 3,
        paperIds: ['p1', 'p2', 'p3'],
        firstCollaboration: new Date(),
        lastCollaboration: new Date(),
        weight: 0,
      };

      const oldEdge: CoauthorEdge = {
        researcher1Id: 'r1',
        researcher1Name: 'Alice',
        researcher2Id: 'r2',
        researcher2Name: 'Bob',
        paperCount: 3,
        paperIds: ['p1', 'p2', 'p3'],
        firstCollaboration: new Date('2015-01-01'),
        lastCollaboration: new Date('2015-01-01'),
        weight: 0,
      };

      const recentWeight = extractor.calculateWeight(recentEdge);
      const oldWeight = extractor.calculateWeight(oldEdge);

      expect(recentWeight).toBeGreaterThan(oldWeight);
    });

    it('should return zero weight for edge with no papers', () => {
      const edge: CoauthorEdge = {
        researcher1Id: 'r1',
        researcher1Name: 'Alice',
        researcher2Id: 'r2',
        researcher2Name: 'Bob',
        paperCount: 0,
        paperIds: [],
        firstCollaboration: new Date(),
        lastCollaboration: new Date(),
        weight: 0,
      };

      const weight = extractor.calculateWeight(edge);

      expect(weight).toBe(0);
    });
  });

  describe('generateResearcherId()', () => {
    it('should use ORCID as ID when available', () => {
      const author: TestAuthor = {
        name: 'Test Author',
        orcid: '0000-0001-2345-6789',
      };

      const id = extractor.generateResearcherId(author);

      expect(id).toBe('orcid:0000-0001-2345-6789');
    });

    it('should generate ID from normalized name when no ORCID', () => {
      const author: TestAuthor = {
        name: 'José García-López',
      };

      const id = extractor.generateResearcherId(author);

      // Should be a hash or normalized form of the name
      expect(id).toBeTruthy();
      expect(id.startsWith('name:')).toBe(true);
    });

    it('should generate consistent ID for same author', () => {
      const author: TestAuthor = {
        name: 'John Smith',
      };

      const id1 = extractor.generateResearcherId(author);
      const id2 = extractor.generateResearcherId(author);

      expect(id1).toBe(id2);
    });

    it('should generate same ID for case-variant names', () => {
      const author1: TestAuthor = { name: 'John Smith' };
      const author2: TestAuthor = { name: 'JOHN SMITH' };
      const author3: TestAuthor = { name: 'john smith' };

      const id1 = extractor.generateResearcherId(author1);
      const id2 = extractor.generateResearcherId(author2);
      const id3 = extractor.generateResearcherId(author3);

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });
  });

  describe('getEdgeKey()', () => {
    it('should generate consistent key regardless of order', () => {
      const key1 = extractor.getEdgeKey('Alice', 'Bob');
      const key2 = extractor.getEdgeKey('Bob', 'Alice');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different pairs', () => {
      const key1 = extractor.getEdgeKey('Alice', 'Bob');
      const key2 = extractor.getEdgeKey('Alice', 'Charlie');

      expect(key1).not.toBe(key2);
    });
  });

  describe('buildCoauthorNetwork()', () => {
    it('should build network with unique researchers', () => {
      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: 'orcid-a' },
            { name: 'Bob', orcid: 'orcid-b' },
          ],
          publishedAt: new Date('2020-01-01'),
        },
        {
          id: 'p2',
          title: 'Paper 2',
          authors: [
            { name: 'Bob', orcid: 'orcid-b' },
            { name: 'Charlie', orcid: 'orcid-c' },
          ],
          publishedAt: new Date('2021-01-01'),
        },
      ];

      const network = extractor.buildCoauthorNetwork(papers);

      expect(network.researchers).toHaveLength(3);
      expect(network.edges).toHaveLength(2);
      expect(network.researchers.map((r) => r.name)).toContain('Alice');
      expect(network.researchers.map((r) => r.name)).toContain('Bob');
      expect(network.researchers.map((r) => r.name)).toContain('Charlie');
    });

    it('should include researcher metadata', () => {
      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice', orcid: 'orcid-a', affiliations: ['MIT'] },
            { name: 'Bob', affiliations: ['Stanford'] },
          ],
          publishedAt: new Date('2020-01-01'),
        },
      ];

      const network = extractor.buildCoauthorNetwork(papers);

      const alice = network.researchers.find((r) => r.name === 'Alice');
      expect(alice).toBeDefined();
      expect(alice!.orcid).toBe('orcid-a');
      expect(alice!.affiliations).toContain('MIT');
    });

    it('should return network statistics', () => {
      const papers: TestPaper[] = [
        {
          id: 'p1',
          title: 'Paper 1',
          authors: [
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'Charlie' },
          ],
          publishedAt: new Date('2020-01-01'),
        },
      ];

      const network = extractor.buildCoauthorNetwork(papers);

      expect(network.statistics.nodeCount).toBe(3);
      expect(network.statistics.edgeCount).toBe(3);
      expect(network.statistics.avgDegree).toBeCloseTo(2, 1);
    });
  });

  describe('edge cases', () => {
    it('should handle authors with empty names', () => {
      const paper: TestPaper = {
        id: 'p1',
        title: 'Test',
        authors: [
          { name: '' },
          { name: 'Valid Author' },
        ],
        publishedAt: new Date(),
      };

      // Should filter out empty names or handle gracefully
      const edges = extractor.extractFromPaper(paper);
      expect(edges).toBeDefined();
    });

    it('should handle duplicate authors in same paper', () => {
      const paper: TestPaper = {
        id: 'p1',
        title: 'Test',
        authors: [
          { name: 'Alice' },
          { name: 'Alice' }, // Duplicate
          { name: 'Bob' },
        ],
        publishedAt: new Date(),
      };

      const edges = extractor.extractFromPaper(paper);

      // Should deduplicate authors
      expect(edges).toHaveLength(1);
    });

    it('should handle papers with very large author lists', () => {
      // Use distinct names that won't be normalized to the same value
      const authorNames = [
        'Alice', 'Bob', 'Charlie', 'David', 'Emma',
        'Frank', 'Grace', 'Henry', 'Iris', 'Jack',
      ];
      const manyAuthors = authorNames.map((name) => ({ name }));

      const paper: TestPaper = {
        id: 'p1',
        title: 'Big Collaboration',
        authors: manyAuthors,
        publishedAt: new Date(),
      };

      const edges = extractor.extractFromPaper(paper);

      // 10 choose 2 = 45 edges
      expect(edges).toHaveLength(45);
    });

    it('should handle papers with invalid dates', () => {
      const paper: TestPaper = {
        id: 'p1',
        title: 'Test',
        authors: [{ name: 'Alice' }, { name: 'Bob' }],
        publishedAt: new Date('invalid'),
      };

      // Should handle gracefully
      expect(() => extractor.extractFromPaper(paper)).not.toThrow();
    });
  });
});
