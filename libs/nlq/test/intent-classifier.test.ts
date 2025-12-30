/**
 * @fileoverview Tests for IntentClassifier
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentClassifier } from '../src/intent-classifier.js';
import type { LLMClient, QueryIntent } from '../src/types.js';

// Mock LLM client
const createMockLLM = (response: string): LLMClient => ({
  complete: vi.fn().mockResolvedValue(response),
});

describe('IntentClassifier', () => {
  describe('classify', () => {
    it('should classify entity lookup query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'ENTITY_LOOKUP',
        confidence: 0.95,
        entities: ['GPT-4'],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('GPT-4とは何ですか？');

      expect(result.type).toBe('ENTITY_LOOKUP');
      expect(result.confidence).toBe(0.95);
      expect(result.entities).toContain('GPT-4');
      expect(result.isAmbiguous).toBe(false);
    });

    it('should classify relationship query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'RELATIONSHIP_QUERY',
        confidence: 0.92,
        entities: ['Transformer'],
        relations: ['DEVELOPED_BY'],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('Transformerを開発した人は誰？');

      expect(result.type).toBe('RELATIONSHIP_QUERY');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.entities).toContain('Transformer');
    });

    it('should classify path finding query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'PATH_FINDING',
        confidence: 0.88,
        entities: ['BERT', 'GPT'],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('BERTとGPTの関係は？');

      expect(result.type).toBe('PATH_FINDING');
      expect(result.entities).toContain('BERT');
      expect(result.entities).toContain('GPT');
    });

    it('should classify aggregation query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'AGGREGATION',
        confidence: 0.90,
        entities: [],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('2023年にリリースされたAIモデルはいくつ？');

      expect(result.type).toBe('AGGREGATION');
    });

    it('should classify global summary query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'GLOBAL_SUMMARY',
        confidence: 0.85,
        entities: [],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('NLPの最新トレンドは？');

      expect(result.type).toBe('GLOBAL_SUMMARY');
    });

    it('should classify comparison query', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'COMPARISON',
        confidence: 0.93,
        entities: ['GPT-4', 'Claude 3'],
        isAmbiguous: false,
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('GPT-4とClaude 3の違いは？');

      expect(result.type).toBe('COMPARISON');
      expect(result.entities).toContain('GPT-4');
      expect(result.entities).toContain('Claude 3');
    });

    it('should flag ambiguous queries', async () => {
      const llm = createMockLLM(JSON.stringify({
        type: 'ENTITY_LOOKUP',
        confidence: 0.4,
        entities: [],
        isAmbiguous: true,
        clarificationNeeded: '具体的なAIモデル名を教えてください',
      }));

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('最近のAI');

      expect(result.isAmbiguous).toBe(true);
      expect(result.clarificationNeeded).toBeDefined();
    });

    it('should handle LLM errors gracefully', async () => {
      const llm: LLMClient = {
        complete: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      };

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('GPT-4について');

      // Should return fallback intent
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.isAmbiguous).toBe(true);
    });

    it('should handle malformed JSON response', async () => {
      const llm = createMockLLM('This is not valid JSON');

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('GPT-4とは？');

      // Should return fallback intent
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should extract entities from query using heuristics', async () => {
      const llm = createMockLLM('Invalid response');

      const classifier = new IntentClassifier(llm);
      const result = await classifier.classify('GPT-4とBERTの比較');

      // Should extract entities from query text
      expect(result.entities).toContain('GPT-4');
      expect(result.entities).toContain('BERT');
    });
  });

  describe('heuristic fallback', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
      const llm = createMockLLM('Invalid');
      classifier = new IntentClassifier(llm);
    });

    it('should detect comparison from keywords', async () => {
      const result = await classifier.classify('GPT-4とClaude 3の比較');
      expect(result.type).toBe('COMPARISON');
    });

    it('should detect relationship query from keywords', async () => {
      const result = await classifier.classify('Transformerを開発したのは誰？');
      expect(result.type).toBe('RELATIONSHIP_QUERY');
    });

    it('should detect aggregation from keywords', async () => {
      const result = await classifier.classify('モデルはいくつある？');
      expect(result.type).toBe('AGGREGATION');
    });

    it('should detect global summary from keywords', async () => {
      const result = await classifier.classify('AIのトレンドは？');
      expect(result.type).toBe('GLOBAL_SUMMARY');
    });
  });

  describe('configuration', () => {
    it('should use custom temperature', async () => {
      const complete = vi.fn().mockResolvedValue(JSON.stringify({
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      }));

      const llm: LLMClient = { complete };
      const classifier = new IntentClassifier(llm, { temperature: 0.5 });

      await classifier.classify('test');

      expect(complete).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ temperature: 0.5 })
      );
    });

    it('should use custom language', async () => {
      const complete = vi.fn().mockResolvedValue(JSON.stringify({
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      }));

      const llm: LLMClient = { complete };
      const classifier = new IntentClassifier(llm, { defaultLang: 'en' });

      await classifier.classify('What is GPT-4?');

      expect(complete).toHaveBeenCalledWith(
        expect.stringContaining('English'),
        expect.any(Object)
      );
    });
  });
});
