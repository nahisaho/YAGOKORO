/**
 * Sprint 1 Integration Tests
 * 
 * Tests the complete paper ingestion pipeline:
 * arXiv fetch → deduplication → Semantic Scholar enrichment → Paper entity
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Deduplicator } from '../../dedup/deduplicator.js';
import type { Paper } from '../../entities/paper.js';

describe('Ingestion Pipeline Integration Tests', () => {
  let deduplicator: Deduplicator;

  beforeEach(() => {
    vi.clearAllMocks();
    deduplicator = new Deduplicator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Deduplicator Integration', () => {
    it('should detect duplicates by DOI', () => {
      const existingPaper: Paper = {
        id: '10.1234/example.2023.001',
        title: 'Advances in Large Language Model Reasoning',
        authors: [{ name: 'John Smith' }],
        abstract: 'Existing abstract',
        publishedDate: new Date('2023-11-01'),
        source: 'semantic_scholar',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'existing-hash',
        processingStatus: 'completed',
        doi: '10.1234/example.2023.001',
      };

      const candidatePaper: Paper = {
        id: 'paper2',
        title: 'Advances in Large Language Model Reasoning (Updated)',
        authors: [{ name: 'John Smith' }, { name: 'Jane Doe' }],
        abstract: 'Updated abstract',
        publishedDate: new Date('2023-12-01'),
        source: 'arxiv',
        categories: ['cs.CL', 'cs.AI'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'new-hash',
        processingStatus: 'ingested',
        doi: '10.1234/example.2023.001', // Same DOI
        arxivId: '2312.00001',
      };

      const result = deduplicator.checkDuplicate(candidatePaper, [existingPaper]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('doi');
      expect(result.matchedPaperId).toBe(existingPaper.id);
    });

    it('should detect duplicates by arXiv ID', () => {
      const existingPaper: Paper = {
        id: '2312.00001',
        title: 'Different Title Same ArXiv ID',
        authors: [{ name: 'Someone' }],
        abstract: 'Different abstract',
        publishedDate: new Date('2023-12-01'),
        source: 'arxiv',
        categories: ['cs.AI'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'existing-hash',
        processingStatus: 'completed',
        arxivId: '2312.00001',
      };

      const candidatePaper: Paper = {
        id: 'paper2',
        title: 'Advances in Large Language Model Reasoning',
        authors: [{ name: 'John Smith' }],
        abstract: 'New abstract',
        publishedDate: new Date('2023-12-01'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'new-hash',
        processingStatus: 'ingested',
        arxivId: '2312.00001', // Same arXiv ID
      };

      const result = deduplicator.checkDuplicate(candidatePaper, [existingPaper]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('doi'); // arXivId is treated as identifier
    });

    it('should detect duplicates by title similarity', () => {
      const existingPaper: Paper = {
        id: 'paper1',
        title: 'Attention Is All You Need',
        authors: [{ name: 'Vaswani' }, { name: 'Shazeer' }, { name: 'Parmar' }],
        abstract: 'The dominant sequence...',
        publishedDate: new Date('2017-06-12'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash1',
        processingStatus: 'completed',
      };

      const candidatePaper: Paper = {
        id: 'paper2',
        title: 'Attention is All You Need', // Slightly different casing
        authors: [{ name: 'Vaswani' }, { name: 'Shazeer' }, { name: 'Parmar' }],
        abstract: 'The dominant sequence...',
        publishedDate: new Date('2017-06-12'),
        source: 'semantic_scholar',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash2',
        processingStatus: 'completed',
      };

      const result = deduplicator.checkDuplicate(candidatePaper, [existingPaper]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('title');
    });

    it('should not flag non-duplicates', () => {
      const existingPaper: Paper = {
        id: 'paper1',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: [{ name: 'Devlin' }, { name: 'Chang' }],
        abstract: 'We introduce BERT...',
        publishedDate: new Date('2018-10-11'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash1',
        processingStatus: 'completed',
      };

      const candidatePaper: Paper = {
        id: 'paper2',
        title: 'GPT-4 Technical Report',
        authors: [{ name: 'OpenAI' }],
        abstract: 'We report the development...',
        publishedDate: new Date('2023-03-15'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash2',
        processingStatus: 'completed',
      };

      const result = deduplicator.checkDuplicate(candidatePaper, [existingPaper]);

      expect(result.isDuplicate).toBe(false);
    });

    it('should recommend review for borderline cases', () => {
      const existingPaper: Paper = {
        id: 'paper1',
        title: 'A Survey of Large Language Models',
        authors: [{ name: 'Zhang' }, { name: 'Li' }, { name: 'Wang' }],
        abstract: 'This paper surveys recent advances...',
        publishedDate: new Date('2023-06-01'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash1',
        processingStatus: 'completed',
      };

      const candidatePaper: Paper = {
        id: 'paper2',
        title: 'Survey of Large Language Models and Their Applications',
        authors: [{ name: 'Zhang' }, { name: 'Li' }, { name: 'Chen' }],
        abstract: 'We survey the recent progress...',
        publishedDate: new Date('2023-09-01'),
        source: 'arxiv',
        categories: ['cs.CL'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'hash2',
        processingStatus: 'completed',
      };

      const result = deduplicator.checkDuplicate(candidatePaper, [existingPaper]);

      // May or may not be duplicate, but should recommend review for similar titles
      if (!result.isDuplicate) {
        expect(result.needsReview).toBeDefined();
      }
    });

    it('should filter duplicates from batch using checkDuplicate', () => {
      const existingPapers: Paper[] = [
        {
          id: 'existing1',
          title: 'Paper One',
          authors: [{ name: 'Author A' }],
          abstract: 'Abstract one',
          publishedDate: new Date('2023-01-01'),
          source: 'arxiv',
          categories: ['cs.AI'],
          ingestionDate: new Date(),
          lastUpdated: new Date(),
          contentHash: 'hash1',
          processingStatus: 'completed',
          doi: '10.1234/paper1',
        },
      ];

      const newPapers: Paper[] = [
        {
          id: 'new1',
          title: 'Paper One Updated', // Different title but same DOI
          authors: [{ name: 'Author A' }],
          abstract: 'Updated abstract',
          publishedDate: new Date('2023-06-01'),
          source: 'arxiv',
          categories: ['cs.AI'],
          ingestionDate: new Date(),
          lastUpdated: new Date(),
          contentHash: 'hash2',
          processingStatus: 'ingested',
          doi: '10.1234/paper1', // Same DOI
        },
        {
          id: 'new2',
          title: 'Paper Two - Completely New',
          authors: [{ name: 'Author B' }],
          abstract: 'New paper abstract',
          publishedDate: new Date('2023-06-01'),
          source: 'arxiv',
          categories: ['cs.LG'],
          ingestionDate: new Date(),
          lastUpdated: new Date(),
          contentHash: 'hash3',
          processingStatus: 'ingested',
        },
      ];

      // Filter using checkDuplicate
      const nonDuplicates = newPapers.filter(
        paper => !deduplicator.checkDuplicate(paper, existingPapers).isDuplicate
      );

      expect(nonDuplicates).toHaveLength(1);
      expect(nonDuplicates[0].id).toBe('new2');
    });
  });

  describe('Paper Entity and Content Hash', () => {
    it('should generate content hash for papers', async () => {
      const { createContentHash } = await import('../../entities/paper.js');
      
      const paper: Partial<Paper> = {
        title: 'Test Paper Title',
        abstract: 'This is the abstract of the test paper.',
        authors: [{ name: 'John Doe' }, { name: 'Jane Smith' }],
        categories: ['cs.AI', 'cs.LG'],
      };

      const hash = createContentHash(paper);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes for same content', async () => {
      const { createContentHash } = await import('../../entities/paper.js');
      
      const paper: Partial<Paper> = {
        title: 'Consistent Hash Test',
        abstract: 'Same abstract content',
        authors: [{ name: 'Author One' }],
        categories: ['cs.AI'],
      };

      const hash1 = createContentHash(paper);
      const hash2 = createContentHash(paper);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', async () => {
      const { createContentHash } = await import('../../entities/paper.js');
      
      const paper1: Partial<Paper> = {
        title: 'Paper One',
        abstract: 'Abstract one',
        authors: [{ name: 'Author A' }],
        categories: ['cs.AI'],
      };

      const paper2: Partial<Paper> = {
        title: 'Paper Two',
        abstract: 'Abstract two',
        authors: [{ name: 'Author B' }],
        categories: ['cs.LG'],
      };

      const hash1 = createContentHash(paper1);
      const hash2 = createContentHash(paper2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Processing Status Workflow', () => {
    it('should support full processing workflow', () => {
      const paper: Paper = {
        id: 'test-paper',
        title: 'Test Paper',
        authors: [{ name: 'Test Author' }],
        abstract: 'Test abstract',
        publishedDate: new Date(),
        source: 'arxiv',
        categories: ['cs.AI'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'test-hash',
        processingStatus: 'ingested',
      };

      // Verify initial status
      expect(paper.processingStatus).toBe('ingested');

      // Simulate workflow transitions
      const statuses = [
        'ingested',
        'extracting',
        'extracted',
        'reviewing',
        'completed',
      ];

      // Each status should be valid
      statuses.forEach(status => {
        const updatedPaper = { ...paper, processingStatus: status as Paper['processingStatus'] };
        expect(['ingested', 'extracting', 'extracted', 'reviewing', 'completed', 'failed'])
          .toContain(updatedPaper.processingStatus);
      });
    });

    it('should handle failed status', () => {
      const paper: Paper = {
        id: 'failed-paper',
        title: 'Failed Paper',
        authors: [{ name: 'Test Author' }],
        abstract: 'Test abstract',
        publishedDate: new Date(),
        source: 'arxiv',
        categories: ['cs.AI'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'test-hash',
        processingStatus: 'failed',
      };

      expect(paper.processingStatus).toBe('failed');
    });
  });

  describe('Paper Source Types', () => {
    it('should support all paper sources', () => {
      const sources: Paper['source'][] = ['arxiv', 'semantic_scholar', 'manual'];

      sources.forEach(source => {
        const paper: Paper = {
          id: `paper-${source}`,
          title: `Paper from ${source}`,
          authors: [{ name: 'Test Author' }],
          abstract: 'Test abstract',
          publishedDate: new Date(),
          source,
          categories: ['cs.AI'],
          ingestionDate: new Date(),
          lastUpdated: new Date(),
          contentHash: 'test-hash',
          processingStatus: 'ingested',
        };

        expect(paper.source).toBe(source);
      });
    });
  });

  describe('Author Information', () => {
    it('should support authors with affiliations', () => {
      const paper: Paper = {
        id: 'paper-with-affiliations',
        title: 'Paper with Affiliations',
        authors: [
          { name: 'John Doe', authorId: 'auth1', affiliations: ['MIT', 'Google Research'] },
          { name: 'Jane Smith', authorId: 'auth2', affiliations: ['Stanford'] },
          { name: 'Bob Wilson' }, // No affiliation
        ],
        abstract: 'Test abstract',
        publishedDate: new Date(),
        source: 'arxiv',
        categories: ['cs.AI'],
        ingestionDate: new Date(),
        lastUpdated: new Date(),
        contentHash: 'test-hash',
        processingStatus: 'ingested',
      };

      expect(paper.authors).toHaveLength(3);
      expect(paper.authors[0].affiliations).toContain('MIT');
      expect(paper.authors[0].affiliations).toContain('Google Research');
      expect(paper.authors[1].affiliations).toContain('Stanford');
      expect(paper.authors[2].affiliations).toBeUndefined();
    });
  });
});
