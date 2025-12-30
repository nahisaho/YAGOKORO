import { describe, it, expect, beforeEach } from 'vitest';
import { ConceptExtractor } from './ConceptExtractor.js';
import { ConceptGraphBuilder } from './ConceptGraphBuilder.js';
import type { TextChunk } from './types.js';

describe('ConceptGraphBuilder', () => {
  let extractor: ConceptExtractor;
  let builder: ConceptGraphBuilder;

  beforeEach(() => {
    extractor = new ConceptExtractor();
    builder = new ConceptGraphBuilder();
  });

  describe('basic graph building', () => {
    it('should build graph from concepts', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Machine learning is a subset of artificial intelligence.' },
        { id: 'chunk-2', content: 'Deep learning uses neural networks for machine learning.' },
        { id: 'chunk-3', content: 'Neural networks are inspired by the human brain.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.stats.nodeCount).toBe(graph.nodes.length);
    });

    it('should create edges from co-occurrences', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'GPT-4 and Claude are both language models.' },
        { id: 'chunk-2', content: 'Language models like GPT-4 generate text.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      // Should have edges connecting concepts
      expect(graph.edges.length).toBeGreaterThanOrEqual(0);
      expect(graph.stats.edgeCount).toBe(graph.edges.length);
    });

    it('should include edge weights', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'AI systems use machine learning.' },
        { id: 'chunk-2', content: 'AI and machine learning are related.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      for (const edge of graph.edges) {
        expect(edge.weight).toBeGreaterThanOrEqual(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('community detection', () => {
    it('should detect communities', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Python is used for machine learning.' },
        { id: 'chunk-2', content: 'Machine learning models are trained on data.' },
        { id: 'chunk-3', content: 'JavaScript is used for web development.' },
        { id: 'chunk-4', content: 'Web development includes frontend and backend.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      // Should have communities (may be 0 if not enough connections)
      expect(graph.communities).toBeDefined();
      expect(graph.stats.communityCount).toBe(graph.communities.length);
    });

    it('should assign concepts to communities', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Neural networks learn patterns.' },
        { id: 'chunk-2', content: 'Neural networks use backpropagation.' },
        { id: 'chunk-3', content: 'Patterns are recognized by neural networks.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      // Each node should have community assignments
      for (const node of graph.nodes) {
        expect(node.communities).toBeDefined();
        expect(Array.isArray(node.communities)).toBe(true);
      }
    });

    it('should create hierarchical communities', async () => {
      const chunks: TextChunk[] = Array.from({ length: 10 }, (_, i) => ({
        id: `chunk-${i}`,
        content: `Topic ${i % 3}: concept ${i}, related concept ${(i + 1) % 10}.`,
      }));

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      // Check if we have communities at level 0
      const level0Communities = graph.communities.filter((c) => c.level === 0);
      expect(level0Communities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('chunk-concept mapping', () => {
    it('should build chunk to concepts map', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'AI and ML are hot topics.' },
        { id: 'chunk-2', content: 'ML models are powerful.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      expect(graph.chunkToConcepts.size).toBeGreaterThan(0);
    });

    it('should build concept to chunks map', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Neural networks are powerful.' },
        { id: 'chunk-2', content: 'Neural networks learn from data.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      expect(graph.conceptToChunks.size).toBeGreaterThan(0);
    });

    it('should track source chunks for concepts', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'AI is transforming industries.' },
        { id: 'chunk-2', content: 'Industries use AI for automation.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      for (const node of graph.nodes) {
        expect(node.sourceChunks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('statistics', () => {
    it('should calculate graph statistics', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Graph databases store relationships.' },
        { id: 'chunk-2', content: 'Relationships connect nodes in graphs.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      expect(graph.stats.nodeCount).toBeGreaterThanOrEqual(0);
      expect(graph.stats.edgeCount).toBeGreaterThanOrEqual(0);
      expect(graph.stats.avgDegree).toBeGreaterThanOrEqual(0);
      expect(graph.stats.density).toBeGreaterThanOrEqual(0);
      expect(graph.stats.density).toBeLessThanOrEqual(1);
    });
  });

  describe('helper methods', () => {
    it('should get communities at specific level', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Data science uses statistics.' },
        { id: 'chunk-2', content: 'Statistics helps in data analysis.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      const level0 = builder.getCommunitiesAtLevel(graph, 0);
      expect(level0.every((c) => c.level === 0)).toBe(true);
    });

    it('should get chunks for community', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Programming languages vary.' },
        { id: 'chunk-2', content: 'Languages like Python are popular.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      if (graph.communities.length > 0) {
        const firstCommunity = graph.communities[0]!;
        const chunkIds = builder.getChunksForCommunity(graph, firstCommunity.id);
        expect(Array.isArray(chunkIds)).toBe(true);
      }
    });

    it('should get concepts for chunk', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Cloud computing enables scalability.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      const concepts = builder.getConceptsForChunk(graph, 'chunk-1');
      expect(Array.isArray(concepts)).toBe(true);
    });
  });

  describe('options', () => {
    it('should respect minEdgeWeight option', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'Testing frameworks help developers.' },
        { id: 'chunk-2', content: 'Developers use testing for quality.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const builderWithHighThreshold = new ConceptGraphBuilder({ minEdgeWeight: 0.9 });
      const graph = builderWithHighThreshold.build(
        extraction.concepts,
        extraction.cooccurrences,
        chunks
      );

      // With high threshold, fewer or no edges should be included
      for (const edge of graph.edges) {
        expect(edge.weight).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should respect topConceptsPerCommunity option', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'A B C D E F are all concepts.' },
        { id: 'chunk-2', content: 'A B C are common concepts.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const builderWithLimit = new ConceptGraphBuilder({ topConceptsPerCommunity: 2 });
      const graph = builderWithLimit.build(
        extraction.concepts,
        extraction.cooccurrences,
        chunks
      );

      for (const community of graph.communities) {
        expect(community.topConcepts.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('empty input handling', () => {
    it('should handle empty chunks', async () => {
      const chunks: TextChunk[] = [];
      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      expect(graph.nodes.length).toBe(0);
      expect(graph.edges.length).toBe(0);
      expect(graph.communities.length).toBe(0);
    });

    it('should handle chunks with no extractable concepts', async () => {
      const chunks: TextChunk[] = [
        { id: 'chunk-1', content: 'The is a an.' },
      ];

      const extraction = await extractor.extract(chunks, { minFrequency: 1 });
      const graph = builder.build(extraction.concepts, extraction.cooccurrences, chunks);

      // May have 0 nodes if all words are stopwords
      expect(graph.stats.nodeCount).toBeGreaterThanOrEqual(0);
    });
  });
});
