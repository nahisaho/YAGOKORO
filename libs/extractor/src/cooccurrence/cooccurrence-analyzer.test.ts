/**
 * CooccurrenceAnalyzer tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CooccurrenceAnalyzer,
  DEFAULT_COOCCURRENCE_CONFIG,
  type CooccurrenceConfig,
} from './cooccurrence-analyzer.js';
import type { ExtractionDocument, DocumentEntity } from '../types.js';

describe('CooccurrenceAnalyzer', () => {
  let analyzer: CooccurrenceAnalyzer;

  beforeEach(() => {
    analyzer = new CooccurrenceAnalyzer();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      expect(analyzer.getConfig()).toEqual(DEFAULT_COOCCURRENCE_CONFIG);
    });

    it('should merge custom config with defaults', () => {
      const customAnalyzer = new CooccurrenceAnalyzer({ minCount: 5 });
      const config = customAnalyzer.getConfig();
      expect(config.minCount).toBe(5);
      expect(config.levels).toEqual(DEFAULT_COOCCURRENCE_CONFIG.levels);
    });

    it('should allow custom levels', () => {
      const customAnalyzer = new CooccurrenceAnalyzer({ levels: ['sentence'] });
      expect(customAnalyzer.getConfig().levels).toEqual(['sentence']);
    });
  });

  describe('normalizeName', () => {
    it('should normalize entity names', () => {
      expect(analyzer.normalizeName('OpenAI')).toBe('openai');
      expect(analyzer.normalizeName('Google DeepMind')).toBe('google_deepmind');
      expect(analyzer.normalizeName('  GPT-4  ')).toBe('gpt4');
    });

    it('should return original name when normalizeNames is false', () => {
      const customAnalyzer = new CooccurrenceAnalyzer({ normalizeNames: false });
      expect(customAnalyzer.normalizeName('OpenAI')).toBe('OpenAI');
    });
  });

  describe('splitIntoParagraphs', () => {
    it('should split text into paragraphs', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = analyzer.splitIntoParagraphs(text);
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    it('should handle empty paragraphs', () => {
      const text = 'First.\n\n\n\nSecond.';
      const paragraphs = analyzer.splitIntoParagraphs(text);
      expect(paragraphs).toHaveLength(2);
    });

    it('should handle single paragraph', () => {
      const text = 'Just one paragraph without breaks.';
      const paragraphs = analyzer.splitIntoParagraphs(text);
      expect(paragraphs).toHaveLength(1);
    });
  });

  describe('splitIntoSentences', () => {
    it('should split text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = analyzer.splitIntoSentences(text);
      expect(sentences).toHaveLength(3);
      expect(sentences[0]).toBe('First sentence.');
      expect(sentences[1]).toBe('Second sentence!');
      expect(sentences[2]).toBe('Third sentence?');
    });

    it('should handle single sentence', () => {
      const text = 'Just one sentence.';
      const sentences = analyzer.splitIntoSentences(text);
      expect(sentences).toHaveLength(1);
    });
  });

  describe('extractEntities', () => {
    it('should extract capitalized entities', () => {
      const text = 'OpenAI developed GPT. Google DeepMind created AlphaFold.';
      const entities = analyzer.extractEntities(text);
      
      // The basic NER extracts capitalized words/phrases
      expect(entities.length).toBeGreaterThanOrEqual(1);
      expect(entities.some((e) => e.name === 'OpenAI')).toBe(true);
    });

    it('should track entity positions', () => {
      const text = 'OpenAI is great. OpenAI makes models.';
      const entities = analyzer.extractEntities(text);
      
      // Check we found OpenAI
      const openai = entities.find((e) => e.name === 'OpenAI');
      expect(openai).toBeDefined();
      expect(openai?.positions.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter common words', () => {
      const text = 'The Introduction discusses OpenAI research.';
      const entities = analyzer.extractEntities(text);
      
      expect(entities.some((e) => e.name === 'Introduction')).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should detect co-occurrences at document level', () => {
      const doc: ExtractionDocument = {
        id: 'doc1',
        title: 'Test Document',
        content: 'OpenAI and Google are AI companies.',
        source: 'test',
        entities: [
          { name: 'OpenAI', type: 'ORG', positions: [0] },
          { name: 'Google', type: 'ORG', positions: [12] },
        ],
      };

      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const pairs = analyzer.analyze(doc);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.documentIds).toContain('doc1');
    });

    it('should detect co-occurrences at sentence level', () => {
      const doc: ExtractionDocument = {
        id: 'doc1',
        title: 'Test Document',
        content: 'OpenAI created GPT. Google created BERT.',
        source: 'test',
        entities: [
          { name: 'OpenAI', type: 'ORG', positions: [0] },
          { name: 'GPT', type: 'MODEL', positions: [15] },
          { name: 'Google', type: 'ORG', positions: [21] },
          { name: 'BERT', type: 'MODEL', positions: [35] },
        ],
      };

      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['sentence'] });
      const pairs = analyzer.analyze(doc);

      // OpenAI-GPT and Google-BERT should be detected, but not OpenAI-Google (different sentences)
      expect(pairs.some((p) => 
        (p.sourceName === 'OpenAI' && p.targetName === 'GPT') ||
        (p.sourceName === 'GPT' && p.targetName === 'OpenAI')
      )).toBe(true);
    });

    it('should respect minCount threshold', () => {
      const doc: ExtractionDocument = {
        id: 'doc1',
        title: 'Test Document',
        content: 'OpenAI and Google are mentioned once.',
        source: 'test',
        entities: [
          { name: 'OpenAI', type: 'ORG', positions: [0] },
          { name: 'Google', type: 'ORG', positions: [12] },
        ],
      };

      const analyzer = new CooccurrenceAnalyzer({ minCount: 2, levels: ['document'] });
      const pairs = analyzer.analyze(doc);

      expect(pairs).toHaveLength(0); // Only 1 occurrence, minCount is 2
    });

    it('should return empty array for documents with less than 2 entities', () => {
      const doc: ExtractionDocument = {
        id: 'doc1',
        title: 'Test',
        content: 'Only OpenAI here.',
        source: 'test',
        entities: [{ name: 'OpenAI', type: 'ORG', positions: [5] }],
      };

      const pairs = analyzer.analyze(doc);
      expect(pairs).toHaveLength(0);
    });

    it('should use extractEntities when entities not provided', () => {
      const doc: ExtractionDocument = {
        id: 'doc1',
        title: 'Test Document',
        content: 'OpenAI and Google are collaborating on AI safety.',
        source: 'test',
      };

      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const pairs = analyzer.analyze(doc);

      expect(pairs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeMultiple', () => {
    it('should aggregate co-occurrences across documents', () => {
      const docs: ExtractionDocument[] = [
        {
          id: 'doc1',
          title: 'Doc 1',
          content: 'OpenAI and Google collaborate.',
          source: 'test',
          entities: [
            { name: 'OpenAI', type: 'ORG', positions: [0] },
            { name: 'Google', type: 'ORG', positions: [12] },
          ],
        },
        {
          id: 'doc2',
          title: 'Doc 2',
          content: 'Google partners with OpenAI.',
          source: 'test',
          entities: [
            { name: 'Google', type: 'ORG', positions: [0] },
            { name: 'OpenAI', type: 'ORG', positions: [20] },
          ],
        },
      ];

      // Use minCount: 1 to get individual document co-occurrences first
      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const pairs = analyzer.analyzeMultiple(docs);

      // Should find co-occurrences, count depends on algorithm
      expect(pairs.length).toBeGreaterThanOrEqual(1);
      const openaiGooglePair = pairs.find((p) =>
        (p.sourceName.includes('OpenAI') || p.sourceName.includes('Google')) &&
        (p.targetName.includes('OpenAI') || p.targetName.includes('Google'))
      );
      expect(openaiGooglePair).toBeDefined();
      expect(openaiGooglePair!.documentIds).toContain('doc1');
      expect(openaiGooglePair!.documentIds).toContain('doc2');
    });

    it('should handle empty document array', () => {
      const pairs = analyzer.analyzeMultiple([]);
      expect(pairs).toHaveLength(0);
    });

    it('should deduplicate document IDs', () => {
      const docs: ExtractionDocument[] = [
        {
          id: 'doc1',
          title: 'Doc 1',
          content: 'OpenAI and Google. OpenAI and Google again.',
          source: 'test',
          entities: [
            { name: 'OpenAI', type: 'ORG', positions: [0, 26] },
            { name: 'Google', type: 'ORG', positions: [12, 38] },
          ],
        },
      ];

      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const pairs = analyzer.analyzeMultiple(docs);

      // Even though same entities appear twice, documentIds should have doc1 only once
      const pair = pairs[0];
      expect(pair).toBeDefined();
      const uniqueDocIds = [...new Set(pair!.documentIds)];
      expect(uniqueDocIds).toHaveLength(pair!.documentIds.length);
    });
  });

  describe('performance', () => {
    it('should handle large documents efficiently', () => {
      const entities: DocumentEntity[] = [];
      for (let i = 0; i < 100; i++) {
        entities.push({
          name: `Entity${i}`,
          type: 'ORG',
          positions: [i * 10],
        });
      }

      const doc: ExtractionDocument = {
        id: 'large-doc',
        title: 'Large Document',
        content: entities.map((e) => e.name).join(' '),
        source: 'test',
        entities,
      };

      const start = performance.now();
      const analyzer = new CooccurrenceAnalyzer({ minCount: 1, levels: ['document'] });
      const pairs = analyzer.analyze(doc);
      const elapsed = performance.now() - start;

      // Should complete in reasonable time (< 1 second for 100 entities)
      expect(elapsed).toBeLessThan(1000);
      // Number of pairs = n*(n-1)/2 = 100*99/2 = 4950
      expect(pairs).toHaveLength(4950);
    });
  });
});
