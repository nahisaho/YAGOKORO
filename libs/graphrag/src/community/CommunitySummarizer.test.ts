import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { LLMCompletionResponse } from '../llm/types.js';
import { CommunitySummarizer } from './CommunitySummarizer.js';
import type { Community } from './types.js';

// Mock LLM client
const mockLLMClient = {
  chat: vi.fn(),
  chatStream: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
  getModelName: vi.fn().mockReturnValue('gpt-4o'),
} as unknown as BaseLLMClient;

// Helper to create mock responses
const createMockResponse = (content: string): LLMCompletionResponse => ({
  content,
  model: 'gpt-4o',
  finishReason: 'stop',
  usage: {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
  },
});

describe('CommunitySummarizer', () => {
  let summarizer: CommunitySummarizer;

  beforeEach(() => {
    vi.clearAllMocks();
    summarizer = new CommunitySummarizer(mockLLMClient);
  });

  describe('summarize', () => {
    it('should generate summary for a community', async () => {
      const community: Community = {
        id: 'c0',
        level: 0,
        memberIds: ['n1', 'n2', 'n3'],
        metadata: { size: 3 },
      };

      const nodeData = new Map([
        ['n1', { name: 'GPT-4', type: 'AIModel', description: 'Large language model' }],
        ['n2', { name: 'OpenAI', type: 'Organization', description: 'AI research company' }],
        ['n3', { name: 'RLHF', type: 'Technique', description: 'Training method' }],
      ]);

      const mockSummary = {
        title: 'OpenAI Language Models',
        summary:
          'This community focuses on GPT-4, a large language model developed by OpenAI using RLHF.',
        keyEntities: ['GPT-4', 'OpenAI', 'RLHF'],
        themes: ['language models', 'AI research'],
      };

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockSummary))
      );

      const result = await summarizer.summarize(community, nodeData);

      expect(mockLLMClient.chat).toHaveBeenCalledOnce();
      expect(result.communityId).toBe('c0');
      expect(result.title).toBe('OpenAI Language Models');
      expect(result.summary).toContain('GPT-4');
      expect(result.keyEntities).toContain('GPT-4');
      expect(result.themes).toContain('language models');
    });

    it('should include edge context when provided', async () => {
      const community: Community = {
        id: 'c0',
        level: 0,
        memberIds: ['n1', 'n2'],
        metadata: { size: 2 },
      };

      const nodeData = new Map([
        ['n1', { name: 'GPT-4', type: 'AIModel' }],
        ['n2', { name: 'OpenAI', type: 'Organization' }],
      ]);

      const edgeData = [
        {
          source: 'n1',
          target: 'n2',
          type: 'DEVELOPED_BY',
          description: 'GPT-4 developed by OpenAI',
        },
      ];

      const mockSummary = {
        title: 'GPT-4 and OpenAI',
        summary: 'GPT-4 is developed by OpenAI.',
        keyEntities: ['GPT-4', 'OpenAI'],
        themes: ['AI development'],
      };

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockSummary))
      );

      await summarizer.summarize(community, nodeData, { edgeData });

      const callArgs = vi.mocked(mockLLMClient.chat).mock.calls[0];
      const userMessage = callArgs[0].find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('DEVELOPED_BY');
    });

    it('should handle malformed LLM response', async () => {
      const community: Community = {
        id: 'c0',
        level: 0,
        memberIds: ['n1'],
        metadata: { size: 1 },
      };

      const nodeData = new Map([['n1', { name: 'GPT-4', type: 'AIModel' }]]);

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(createMockResponse('invalid json {'));

      await expect(summarizer.summarize(community, nodeData)).rejects.toThrow(
        'Failed to parse LLM response'
      );
    });

    it('should include processing metadata', async () => {
      const community: Community = {
        id: 'c0',
        level: 0,
        memberIds: ['n1'],
        metadata: { size: 1 },
      };

      const nodeData = new Map([['n1', { name: 'Test', type: 'Concept' }]]);

      const mockSummary = {
        title: 'Test Summary',
        summary: 'Test description',
        keyEntities: ['Test'],
        themes: ['testing'],
      };

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockSummary))
      );

      const result = await summarizer.summarize(community, nodeData);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.model).toBe('gpt-4o');
    });

    it('should limit summary length when specified', async () => {
      const community: Community = {
        id: 'c0',
        level: 0,
        memberIds: ['n1'],
        metadata: { size: 1 },
      };

      const nodeData = new Map([['n1', { name: 'Test', type: 'Concept' }]]);

      const mockSummary = {
        title: 'Test',
        summary: 'Short summary',
        keyEntities: ['Test'],
        themes: [],
      };

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockSummary))
      );

      await summarizer.summarize(community, nodeData, { maxLength: 100 });

      const callArgs = vi.mocked(mockLLMClient.chat).mock.calls[0];
      const systemMessage = callArgs[0].find((m) => m.role === 'system');
      expect(systemMessage?.content).toContain('100');
    });
  });

  describe('summarizeBatch', () => {
    it('should summarize multiple communities', async () => {
      const communities: Community[] = [
        { id: 'c0', level: 0, memberIds: ['n1'], metadata: { size: 1 } },
        { id: 'c1', level: 0, memberIds: ['n2'], metadata: { size: 1 } },
      ];

      const nodeData = new Map([
        ['n1', { name: 'GPT-4', type: 'AIModel' }],
        ['n2', { name: 'Claude', type: 'AIModel' }],
      ]);

      const mockSummary1 = {
        title: 'GPT-4',
        summary: 'GPT-4 model',
        keyEntities: ['GPT-4'],
        themes: [],
      };

      const mockSummary2 = {
        title: 'Claude',
        summary: 'Claude model',
        keyEntities: ['Claude'],
        themes: [],
      };

      vi.mocked(mockLLMClient.chat)
        .mockResolvedValueOnce(createMockResponse(JSON.stringify(mockSummary1)))
        .mockResolvedValueOnce(createMockResponse(JSON.stringify(mockSummary2)));

      const results = await summarizer.summarizeBatch(communities, nodeData);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('GPT-4');
      expect(results[1].title).toBe('Claude');
    });

    it('should process with concurrency limit', async () => {
      const communities: Community[] = Array.from({ length: 5 }, (_, i) => ({
        id: `c${i}`,
        level: 0,
        memberIds: [`n${i}`],
        metadata: { size: 1 },
      }));

      const nodeData = new Map(
        communities.map((c) => [c.memberIds[0], { name: `Entity${c.id}`, type: 'Concept' }])
      );

      const mockSummary = {
        title: 'Test',
        summary: 'Test',
        keyEntities: ['Test'],
        themes: [],
      };

      vi.mocked(mockLLMClient.chat).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return createMockResponse(JSON.stringify(mockSummary));
      });

      const results = await summarizer.summarizeBatch(communities, nodeData, undefined, {
        concurrency: 2,
      });

      expect(results).toHaveLength(5);
    });
  });

  describe('summarizeHierarchy', () => {
    it('should summarize hierarchical communities', async () => {
      const communities: Community[] = [
        { id: 'c0', level: 0, memberIds: ['n1', 'n2'], parentId: 'c2', metadata: { size: 2 } },
        { id: 'c1', level: 0, memberIds: ['n3', 'n4'], parentId: 'c2', metadata: { size: 2 } },
        {
          id: 'c2',
          level: 1,
          memberIds: ['n1', 'n2', 'n3', 'n4'],
          childIds: ['c0', 'c1'],
          metadata: { size: 4 },
        },
      ];

      const nodeData = new Map([
        ['n1', { name: 'GPT-4', type: 'AIModel' }],
        ['n2', { name: 'GPT-3', type: 'AIModel' }],
        ['n3', { name: 'Claude', type: 'AIModel' }],
        ['n4', { name: 'Claude 2', type: 'AIModel' }],
      ]);

      const mockSummary = {
        title: 'AI Models',
        summary: 'Collection of AI models',
        keyEntities: ['GPT-4', 'Claude'],
        themes: ['AI', 'LLM'],
      };

      vi.mocked(mockLLMClient.chat).mockResolvedValue(
        createMockResponse(JSON.stringify(mockSummary))
      );

      const results = await summarizer.summarizeHierarchy(communities, nodeData);

      // Should summarize all communities
      expect(results).toHaveLength(3);
    });

    it('should include child summaries in parent context', async () => {
      const communities: Community[] = [
        { id: 'c0', level: 0, memberIds: ['n1'], parentId: 'c1', metadata: { size: 1 } },
        { id: 'c1', level: 1, memberIds: ['n1'], childIds: ['c0'], metadata: { size: 1 } },
      ];

      const nodeData = new Map([['n1', { name: 'Test', type: 'Concept' }]]);

      const childSummary = {
        title: 'Child Summary',
        summary: 'Child description',
        keyEntities: ['Test'],
        themes: [],
      };

      const parentSummary = {
        title: 'Parent Summary',
        summary: 'Parent description with child context',
        keyEntities: ['Test'],
        themes: [],
      };

      vi.mocked(mockLLMClient.chat)
        .mockResolvedValueOnce(createMockResponse(JSON.stringify(childSummary)))
        .mockResolvedValueOnce(createMockResponse(JSON.stringify(parentSummary)));

      await summarizer.summarizeHierarchy(communities, nodeData);

      // Parent summary call should include child summary context
      const parentCallArgs = vi.mocked(mockLLMClient.chat).mock.calls[1];
      const userMessage = parentCallArgs[0].find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('Child Summary');
    });
  });
});
