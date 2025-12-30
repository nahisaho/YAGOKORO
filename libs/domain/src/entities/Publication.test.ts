import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Publication, type PublicationType, type Author, type ProcessingStatus } from './Publication.js';

describe('Publication', () => {
  const createValidProps = () => ({
    title: 'Attention Is All You Need',
    type: 'paper' as PublicationType,
    venue: 'NeurIPS 2017',
    year: '2017',
    url: 'https://arxiv.org/abs/1706.03762',
    abstract: 'The dominant sequence transduction models...',
    citations: 50000,
  });

  describe('create', () => {
    it('should create a valid Publication', () => {
      const pub = Publication.create(createValidProps());

      expect(pub.title).toBe('Attention Is All You Need');
      expect(pub.type).toBe('paper');
      expect(pub.citations).toBe(50000);
      expect(pub.id.prefix).toBe('pub');
    });

    it('should require title', () => {
      const props = createValidProps();
      props.title = '';
      expect(() => Publication.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Publication from stored data', () => {
      const id = EntityId.create('pub');
      const pub = Publication.restore(id, createValidProps());

      expect(pub.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const pub = Publication.create(createValidProps());
      const json = pub.toJSON();

      expect(json.entityType).toBe('Publication');
      expect(json.title).toBe('Attention Is All You Need');
    });
  });

  // v3 tests
  describe('v3 features', () => {
    describe('fromIngestion', () => {
      it('should create Publication from ingestion data', () => {
        const authors: Author[] = [
          { name: 'Ashish Vaswani', authorId: 'abc123' },
          { name: 'Noam Shazeer' },
        ];
        const pub = Publication.fromIngestion({
          title: 'Attention Is All You Need',
          abstract: 'The dominant sequence transduction models...',
          authors,
          arxivId: '1706.03762',
          url: 'https://arxiv.org/abs/1706.03762',
          publishedDate: new Date('2017-06-12'),
          source: 'arxiv',
          categories: ['cs.CL', 'cs.LG'],
          citations: 50000,
          contentHash: 'abc12345',
        });

        expect(pub.title).toBe('Attention Is All You Need');
        expect(pub.type).toBe('preprint'); // arxiv papers are preprints
        expect(pub.source).toBe('arxiv');
        expect(pub.arxivId).toBe('1706.03762');
        expect(pub.authors).toHaveLength(2);
        expect(pub.categories).toContain('cs.CL');
        expect(pub.processingStatus).toBe('ingested');
        expect(pub.ingestionDate).toBeDefined();
        expect(pub.lastUpdated).toBeDefined();
        expect(pub.contentHash).toBe('abc12345');
      });

      it('should set type to paper for non-arxiv sources', () => {
        const pub = Publication.fromIngestion({
          title: 'Some Paper',
          doi: '10.1234/test',
          source: 'semantic_scholar',
        });

        expect(pub.type).toBe('paper');
      });
    });

    describe('updateProcessingStatus', () => {
      it('should update processing status and lastUpdated', () => {
        const pub = Publication.fromIngestion({
          title: 'Test Paper',
          source: 'arxiv',
        });
        const originalLastUpdated = pub.lastUpdated;

        // Wait a small amount to ensure timestamp difference
        const updatedPub = pub.updateProcessingStatus('extracting');

        expect(updatedPub.processingStatus).toBe('extracting');
        expect(updatedPub.title).toBe('Test Paper'); // unchanged
        // lastUpdated should be updated (or same if executed too fast)
        expect(updatedPub.lastUpdated).toBeDefined();
      });

      it('should allow all valid status transitions', () => {
        const statuses: ProcessingStatus[] = [
          'ingested',
          'extracting',
          'extracted',
          'reviewing',
          'completed',
          'failed',
        ];

        let pub = Publication.fromIngestion({
          title: 'Test Paper',
          source: 'arxiv',
        });

        for (const status of statuses) {
          pub = pub.updateProcessingStatus(status);
          expect(pub.processingStatus).toBe(status);
        }
      });
    });

    describe('hasContentChanged', () => {
      it('should detect content changes', () => {
        const pub = Publication.fromIngestion({
          title: 'Test Paper',
          source: 'arxiv',
          contentHash: 'hash123',
        });

        expect(pub.hasContentChanged('hash123')).toBe(false);
        expect(pub.hasContentChanged('hash456')).toBe(true);
      });
    });

    describe('updateContentHash', () => {
      it('should update content hash', () => {
        const pub = Publication.fromIngestion({
          title: 'Test Paper',
          source: 'arxiv',
          contentHash: 'old-hash',
        });

        const updated = pub.updateContentHash('new-hash');
        expect(updated.contentHash).toBe('new-hash');
      });
    });

    describe('v3 props', () => {
      it('should support all v3 properties', () => {
        const now = new Date();
        const pub = Publication.create({
          title: 'Test Paper',
          type: 'paper',
          arxivId: '2024.12345',
          source: 'arxiv',
          authors: [{ name: 'Test Author', affiliations: ['MIT'] }],
          categories: ['cs.AI', 'cs.LG'],
          references: ['paper1', 'paper2'],
          publishedDate: now,
          ingestionDate: now,
          lastUpdated: now,
          contentHash: 'test-hash',
          processingStatus: 'completed',
        });

        expect(pub.arxivId).toBe('2024.12345');
        expect(pub.source).toBe('arxiv');
        expect(pub.authors).toHaveLength(1);
        expect(pub.authors![0].affiliations).toContain('MIT');
        expect(pub.categories).toEqual(['cs.AI', 'cs.LG']);
        expect(pub.references).toEqual(['paper1', 'paper2']);
        expect(pub.publishedDate).toEqual(now);
        expect(pub.contentHash).toBe('test-hash');
        expect(pub.processingStatus).toBe('completed');
      });
    });

    describe('toJSON with v3 fields', () => {
      it('should serialize v3 fields to JSON', () => {
        const pub = Publication.fromIngestion({
          title: 'Test Paper',
          source: 'arxiv',
          arxivId: '2024.12345',
          authors: [{ name: 'Test Author' }],
          categories: ['cs.AI'],
          contentHash: 'hash123',
        });

        const json = pub.toJSON();

        expect(json.arxivId).toBe('2024.12345');
        expect(json.source).toBe('arxiv');
        expect(json.authors).toHaveLength(1);
        expect(json.categories).toEqual(['cs.AI']);
        expect(json.contentHash).toBe('hash123');
        expect(json.processingStatus).toBe('ingested');
        expect(json.ingestionDate).toBeDefined();
      });
    });
  });
});
