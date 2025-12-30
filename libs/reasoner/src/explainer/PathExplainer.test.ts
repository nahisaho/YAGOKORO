/**
 * PathExplainer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathExplainer } from './PathExplainer.js';
import type { Path, LLMClient, PathNode } from '../types.js';

describe('PathExplainer', () => {
  let explainer: PathExplainer;
  let mockLLMClient: LLMClient;

  const createNode = (id: string, name: string, type: string): PathNode => ({
    id,
    type: type as PathNode['type'],
    name,
    properties: {},
  });

  const createPath = (
    nodes: Array<{ name: string; type: string }>,
    relations: string[]
  ): Path => ({
    nodes: nodes.map((n, i) => createNode(`${i}`, n.name, n.type)),
    relations: relations.map((r) => ({
      type: r as Path['relations'][0]['type'],
      direction: 'outgoing',
      properties: {},
    })),
    score: 1.0,
    hops: relations.length,
  });

  beforeEach(() => {
    mockLLMClient = {
      generate: vi.fn().mockResolvedValue('LLM generated explanation'),
    };
    explainer = new PathExplainer(mockLLMClient, { language: 'ja', useLLM: true });
  });

  describe('explain', () => {
    it('should generate explanation for a path', async () => {
      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = await explainer.explain(path);

      expect(explanation.path).toBe(path);
      expect(explanation.naturalLanguage).toBeDefined();
      expect(explanation.summary).toContain('GPT4');
      expect(explanation.summary).toContain('CoT');
      expect(explanation.keyRelations).toHaveLength(1);
    });

    it('should use LLM when available', async () => {
      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = await explainer.explain(path);

      expect(mockLLMClient.generate).toHaveBeenCalled();
      expect(explanation.naturalLanguage).toBe('LLM generated explanation');
    });

    it('should fall back to template when LLM fails', async () => {
      vi.mocked(mockLLMClient.generate).mockRejectedValue(new Error('LLM error'));

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = await explainer.explain(path);

      expect(explanation.naturalLanguage).toContain('GPT4');
      expect(explanation.naturalLanguage).toContain('CoT');
    });

    it('should use template when LLM is disabled', async () => {
      explainer = new PathExplainer(mockLLMClient, { useLLM: false });

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = await explainer.explain(path);

      expect(mockLLMClient.generate).not.toHaveBeenCalled();
      expect(explanation.naturalLanguage).toBeDefined();
    });

    it('should include context in LLM prompt', async () => {
      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      await explainer.explain(path, 'Additional research context');

      expect(mockLLMClient.generate).toHaveBeenCalledWith(
        expect.stringContaining('Additional research context')
      );
    });
  });

  describe('explainBatch', () => {
    it('should explain multiple paths', async () => {
      const paths = [
        createPath(
          [{ name: 'GPT4', type: 'AIModel' }, { name: 'CoT', type: 'Technique' }],
          ['USES']
        ),
        createPath(
          [{ name: 'BERT', type: 'AIModel' }, { name: 'NER', type: 'Technique' }],
          ['USES']
        ),
      ];

      const explanations = await explainer.explainBatch(paths);

      expect(explanations).toHaveLength(2);
      expect(explanations[0].path).toBe(paths[0]);
      expect(explanations[1].path).toBe(paths[1]);
    });
  });

  describe('generateTemplateExplanation', () => {
    it('should generate Japanese template explanation', () => {
      explainer = new PathExplainer(undefined, { language: 'ja' });

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = explainer.generateTemplateExplanation(path);

      expect(explanation).toContain('GPT4');
      expect(explanation).toContain('CoT');
      expect(explanation).toContain('を使用する');
    });

    it('should generate English template explanation', () => {
      explainer = new PathExplainer(undefined, { language: 'en' });

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = explainer.generateTemplateExplanation(path);

      expect(explanation).toContain('GPT4');
      expect(explanation).toContain('CoT');
      expect(explanation).toContain('uses');
    });

    it('should handle multi-hop paths', () => {
      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'OpenAI', type: 'Organization' },
          { name: 'Sam Altman', type: 'Person' },
        ],
        ['DEVELOPED_BY', 'AFFILIATED_WITH']
      );

      const explanation = explainer.generateTemplateExplanation(path);

      expect(explanation).toContain('GPT4');
      expect(explanation).toContain('OpenAI');
      expect(explanation).toContain('Sam Altman');
    });
  });

  describe('generateSummary', () => {
    it('should generate Japanese summary', () => {
      explainer = new PathExplainer(undefined, { language: 'ja' });

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const summary = explainer.generateSummary(path);

      expect(summary).toBe('GPT4 から CoT への 1 ホップのパス');
    });

    it('should generate English summary', () => {
      explainer = new PathExplainer(undefined, { language: 'en' });

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const summary = explainer.generateSummary(path);

      expect(summary).toBe('1-hop path from GPT4 to CoT');
    });
  });

  describe('extractKeyRelations', () => {
    it('should extract relations with explanations', () => {
      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'OpenAI', type: 'Organization' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['DEVELOPED_BY', 'USES']
      );

      const relations = explainer.extractKeyRelations(path);

      expect(relations).toHaveLength(2);
      expect(relations[0].from).toBe('GPT4');
      expect(relations[0].to).toBe('OpenAI');
      expect(relations[0].relationType).toBe('DEVELOPED_BY');
      expect(relations[0].explanation).toBeDefined();
    });
  });

  describe('getRelationDescription', () => {
    it('should return description for known relation', () => {
      const desc = explainer.getRelationDescription('USES');
      expect(desc).toBe('を使用する');
    });

    it('should return relation type for unknown relation', () => {
      const desc = explainer.getRelationDescription('UNKNOWN_RELATION');
      expect(desc).toBe('UNKNOWN_RELATION');
    });
  });

  describe('addRelationDescription', () => {
    it('should add custom relation description', () => {
      explainer.addRelationDescription('CUSTOM_REL', 'カスタム関係');

      const desc = explainer.getRelationDescription('CUSTOM_REL');
      expect(desc).toBe('カスタム関係');
    });
  });

  describe('setLanguage', () => {
    it('should switch language and update descriptions', () => {
      explainer = new PathExplainer(undefined, { language: 'ja' });
      expect(explainer.getRelationDescription('USES')).toBe('を使用する');

      explainer.setLanguage('en');
      expect(explainer.getRelationDescription('USES')).toBe('uses');
    });
  });

  describe('comparePaths', () => {
    it('should compare multiple paths', () => {
      const paths = [
        createPath(
          [
            { name: 'A', type: 'Entity' },
            { name: 'B', type: 'Entity' },
            { name: 'C', type: 'Entity' },
          ],
          ['USES', 'IMPROVES']
        ),
        createPath(
          [
            { name: 'A', type: 'Entity' },
            { name: 'C', type: 'Entity' },
          ],
          ['DERIVED_FROM']
        ),
      ];

      const comparison = explainer.comparePaths(paths);

      expect(comparison.shortestPath?.hops).toBe(1);
      expect(comparison.longestPath?.hops).toBe(2);
      expect(comparison.uniqueRelations).toContain('USES');
      expect(comparison.uniqueRelations).toContain('IMPROVES');
      expect(comparison.uniqueRelations).toContain('DERIVED_FROM');
    });

    it('should handle empty paths array', () => {
      const comparison = explainer.comparePaths([]);

      expect(comparison.shortestPath).toBeNull();
      expect(comparison.longestPath).toBeNull();
      expect(comparison.commonNodes).toHaveLength(0);
      expect(comparison.uniqueRelations).toHaveLength(0);
    });

    it('should find common nodes', () => {
      // Paths share node 'B' (id: '1')
      const node0 = createNode('0', 'A', 'Entity');
      const node1 = createNode('1', 'B', 'Entity');
      const node2 = createNode('2', 'C', 'Entity');

      const paths: Path[] = [
        {
          nodes: [node0, node1, node2],
          relations: [
            { type: 'USES', direction: 'outgoing', properties: {} },
            { type: 'USES', direction: 'outgoing', properties: {} },
          ],
          score: 1.0,
          hops: 2,
        },
        {
          nodes: [node1, node2],
          relations: [
            { type: 'USES', direction: 'outgoing', properties: {} },
          ],
          score: 1.0,
          hops: 1,
        },
      ];

      const comparison = explainer.comparePaths(paths);

      expect(comparison.commonNodes.map((n) => n.id)).toContain('1');
      expect(comparison.commonNodes.map((n) => n.id)).toContain('2');
    });
  });

  describe('without LLM client', () => {
    it('should work without LLM client', async () => {
      explainer = new PathExplainer();

      const path = createPath(
        [
          { name: 'GPT4', type: 'AIModel' },
          { name: 'CoT', type: 'Technique' },
        ],
        ['USES']
      );

      const explanation = await explainer.explain(path);

      expect(explanation.naturalLanguage).toBeDefined();
      expect(explanation.summary).toBeDefined();
    });
  });
});
