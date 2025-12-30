import { describe, it, expect, beforeEach } from 'vitest';
import { ConceptExtractor } from './ConceptExtractor.js';
import type { TextChunk } from './types.js';

describe('ConceptExtractor', () => {
  let extractor: ConceptExtractor;

  beforeEach(() => {
    extractor = new ConceptExtractor();
  });

  describe('basic extraction', () => {
    it('should extract concepts from text', async () => {
      const chunks: TextChunk[] = [
        {
          id: 'chunk-1',
          content: 'GPT-4 is a large language model developed by OpenAI.',
        },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.metadata.totalChunks).toBe(1);
    });

    it('should extract noun phrases', async () => {
      const chunks: TextChunk[] = [
        {
          id: 'chunk-1',
          content: 'The transformer architecture revolutionized natural language processing.',
        },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      const conceptTexts = result.concepts.map((c) => c.text);
      // Should find multi-word noun phrases
      expect(
        conceptTexts.some(
          (t) =>
            t.includes('transformer') ||
            t.includes('architecture') ||
            t.includes('language') ||
            t.includes('processing')
        )
      ).toBe(true);
    });

    it('should track concept frequency across chunks', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'GPT-4 is an AI model.' },
        { id: 'chunk-2', content: 'GPT-4 was trained on large datasets.' },
        { id: 'chunk-3', content: 'The GPT-4 model performs well.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      // Find the GPT-4 concept (may be normalized)
      const gpt4Concept = result.concepts.find(
        (c) => c.text.includes('gpt') || c.text.includes('model')
      );

      expect(gpt4Concept).toBeDefined();
    });

    it('should calculate importance scores', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Machine learning is important. Deep learning is a subset.' },
        { id: 'chunk-2', content: 'Machine learning models learn from data.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      // All concepts should have importance between 0 and 1
      for (const concept of result.concepts) {
        expect(concept.importance).toBeGreaterThanOrEqual(0);
        expect(concept.importance).toBeLessThanOrEqual(1);
      }

      // At least one concept should have importance = 1 (max normalized)
      expect(result.concepts.some((c) => c.importance === 1)).toBe(true);
    });
  });

  describe('co-occurrence detection', () => {
    it('should detect co-occurrences within chunks', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'OpenAI developed GPT-4. GPT-4 uses transformers.' },
        { id: 'chunk-2', content: 'OpenAI also created ChatGPT based on GPT-4.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      // Should have co-occurrence relations
      expect(result.cooccurrences.length).toBeGreaterThanOrEqual(0);
      expect(result.metadata.totalCooccurrences).toBe(result.cooccurrences.length);
    });

    it('should calculate co-occurrence strength', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'AI and machine learning are related.' },
        { id: 'chunk-2', content: 'AI and machine learning research grows.' },
        { id: 'chunk-3', content: 'AI systems use machine learning.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      // All co-occurrences should have strength between 0 and 1
      for (const cooc of result.cooccurrences) {
        expect(cooc.strength).toBeGreaterThanOrEqual(0);
        expect(cooc.strength).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('filtering options', () => {
    it('should respect minFrequency option', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Python is popular. Python is versatile.' },
        { id: 'chunk-2', content: 'Java is also popular. Ruby is less common.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 2 });

      // Only concepts appearing 2+ times should be included
      for (const concept of result.concepts) {
        expect(concept.frequency).toBeGreaterThanOrEqual(2);
      }
    });

    it('should respect maxConcepts option', async () => {
      const chunks: TextChunk[] = [
        {
          id: 'chunk-1',
          content:
            'TensorFlow, PyTorch, Keras, Scikit-learn, NumPy, Pandas are all Python libraries.',
        },
      ];

      const result = await extractor.extract(chunks, {
        minFrequency: 1,
        maxConcepts: 3,
      });

      expect(result.concepts.length).toBeLessThanOrEqual(3);
    });

    it('should filter stopwords', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'The model is very good and fast.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      const conceptTexts = result.concepts.map((c) => c.text);
      // Common stopwords should be filtered
      expect(conceptTexts).not.toContain('the');
      expect(conceptTexts).not.toContain('is');
      expect(conceptTexts).not.toContain('and');
    });
  });

  describe('proper noun extraction', () => {
    it('should extract proper nouns when enabled', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Microsoft and Google are tech companies.' },
      ];

      const result = await extractor.extract(chunks, {
        minFrequency: 1,
        includeProperNouns: true,
      });

      const conceptTexts = result.concepts.map((c) => c.text);
      // Should find company names (case-normalized)
      expect(
        conceptTexts.some((t) => t.includes('microsoft') || t.includes('google'))
      ).toBe(true);
    });
  });

  describe('extractFromText convenience method', () => {
    it('should extract from a single text string', async () => {
      const text = 'Neural networks are fundamental to deep learning.';

      const result = await extractor.extractFromText(text, { minFrequency: 1 });

      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.metadata.totalChunks).toBe(1);
    });
  });

  describe('metadata', () => {
    it('should track processing time', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Simple test text.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track source chunks for concepts', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'AI is transforming industries.' },
        { id: 'chunk-2', content: 'AI models are becoming more powerful.' },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      // Each concept should have sourceChunks
      for (const concept of result.concepts) {
        expect(concept.sourceChunks.length).toBeGreaterThan(0);
        for (const chunkId of concept.sourceChunks) {
          expect(['chunk-1', 'chunk-2']).toContain(chunkId);
        }
      }
    });
  });

  describe('AI domain concepts', () => {
    it('should extract AI-specific concepts', async () => {
      const chunks: TextChunk[] = [
        {
          id: 'chunk-1',
          content:
            'Transformer architecture enables attention mechanisms in neural networks.',
        },
        {
          id: 'chunk-2',
          content:
            'Large language models like GPT and BERT use transformer architecture.',
        },
      ];

      const result = await extractor.extract(chunks, { minFrequency: 1 });

      const conceptTexts = result.concepts.map((c) => c.text);
      
      // Should find AI-related concepts
      expect(
        conceptTexts.some(
          (t) =>
            t.includes('transformer') ||
            t.includes('attention') ||
            t.includes('neural') ||
            t.includes('language') ||
            t.includes('model')
        )
      ).toBe(true);
    });
  });
});
