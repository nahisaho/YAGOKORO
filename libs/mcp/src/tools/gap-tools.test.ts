/**
 * @fileoverview Tests for MCP Gap Analysis Tools
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createGapTools,
  type GapToolDependencies,
  type GapAnalyzerInterface,
  type ResearchGap,
  type GapAnalysisReport,
  type ResearchProposal,
} from './gap-tools.js';

/**
 * Create mock gap analyzer
 */
function createMockGapAnalyzer(): GapAnalyzerInterface {
  return {
    analyze: vi.fn(),
    getGapById: vi.fn(),
    generateResearchProposals: vi.fn(),
    exportReport: vi.fn(),
  };
}

/**
 * Create sample gaps
 */
function createSampleGaps(): ResearchGap[] {
  return [
    {
      id: 'gap-1',
      type: 'missing_combination',
      description: 'GPT-4 and reinforcement learning combination unexplored',
      severity: 'high',
      relatedEntities: ['GPT-4', 'Reinforcement Learning'],
      suggestedActions: ['Research combination potential', 'Review existing approaches'],
      score: 0.85,
    },
    {
      id: 'gap-2',
      type: 'underexplored_technique',
      description: 'Sparse attention in LLMs needs more research',
      severity: 'medium',
      relatedEntities: ['Sparse Attention', 'LLM'],
      suggestedActions: ['Investigate scalability', 'Compare with dense attention'],
      score: 0.72,
    },
    {
      id: 'gap-3',
      type: 'stale_research_area',
      description: 'Traditional RNN research has declined',
      severity: 'low',
      relatedEntities: ['RNN', 'LSTM'],
      suggestedActions: ['Evaluate modern relevance', 'Consider hybrid approaches'],
      score: 0.55,
    },
  ];
}

/**
 * Create sample report
 */
function createSampleReport(): GapAnalysisReport {
  const gaps = createSampleGaps();
  return {
    id: 'report-123',
    generatedAt: new Date(),
    totalGaps: gaps.length,
    gapsByType: {
      missing_combination: 1,
      underexplored_technique: 1,
      isolated_cluster: 0,
      stale_research_area: 1,
      unexplored_application: 0,
    },
    gapsBySeverity: {
      critical: 0,
      high: 1,
      medium: 1,
      low: 1,
    },
    gaps,
  };
}

/**
 * Create sample proposals
 */
function createSampleProposals(): ResearchProposal[] {
  return [
    {
      id: 'proposal-1',
      title: 'Integrating RL with LLMs',
      abstract: 'Research proposal for combining reinforcement learning with large language models',
      methodology: ['Literature review', 'Experimental design', 'Evaluation'],
      expectedOutcomes: ['New training paradigm', 'Improved model performance'],
      priority: 1,
    },
    {
      id: 'proposal-2',
      title: 'Sparse Attention Mechanisms',
      abstract: 'Investigating sparse attention for efficient transformer models',
      methodology: ['Algorithm development', 'Benchmarking', 'Analysis'],
      expectedOutcomes: ['Reduced computational cost', 'Maintained accuracy'],
      priority: 2,
    },
  ];
}

describe('MCP Gap Tools', () => {
  let mockEntityRepository: { get: Mock; getAll: Mock };
  let mockGapAnalyzer: GapAnalyzerInterface;
  let deps: GapToolDependencies;

  beforeEach(() => {
    mockEntityRepository = {
      get: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue([]),
    };
    mockGapAnalyzer = createMockGapAnalyzer();
    deps = {
      entityRepository: mockEntityRepository as unknown as GapToolDependencies['entityRepository'],
      relationRepository: {} as unknown as GapToolDependencies['relationRepository'],
      communityRepository: {} as unknown as GapToolDependencies['communityRepository'],
      vectorStore: {} as unknown as GapToolDependencies['vectorStore'],
      gapAnalyzer: mockGapAnalyzer,
    };
  });

  describe('createGapTools', () => {
    it('should create 4 gap tools', () => {
      const tools = createGapTools(deps);

      expect(tools).toHaveLength(4);
      expect(tools.map((t) => t.name)).toEqual([
        'gap_analyze',
        'gap_get',
        'gap_propose',
        'gap_types',
      ]);
    });

    it('should create tools with descriptions', () => {
      const tools = createGapTools(deps);

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(10);
      }
    });

    it('should create tools with input schemas', () => {
      const tools = createGapTools(deps);

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('gap_analyze', () => {
    it('should analyze gaps and return report', async () => {
      const report = createSampleReport();
      (mockGapAnalyzer.analyze as Mock).mockResolvedValue(report);

      const tools = createGapTools(deps);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      const result = await analyzeTool.handler({
        limit: 50,
        includeCitations: true,
        includeClusters: true,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text as string);
      expect(parsed.success).toBe(true);
      expect(parsed.data.reportId).toBe('report-123');
      expect(parsed.data.totalGaps).toBe(3);
    });

    it('should filter by types', async () => {
      const report = createSampleReport();
      (mockGapAnalyzer.analyze as Mock).mockResolvedValue(report);

      const tools = createGapTools(deps);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      await analyzeTool.handler({
        types: ['missing_combination', 'underexplored_technique'],
      });

      expect(mockGapAnalyzer.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['missing_combination', 'underexplored_technique'],
        })
      );
    });

    it('should filter by severity', async () => {
      const report = createSampleReport();
      (mockGapAnalyzer.analyze as Mock).mockResolvedValue(report);

      const tools = createGapTools(deps);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      await analyzeTool.handler({
        minSeverity: 'high',
      });

      expect(mockGapAnalyzer.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          minSeverity: 'high',
        })
      );
    });

    it('should use fallback when analyzer not provided', async () => {
      const depsWithoutAnalyzer: GapToolDependencies = {
        entityRepository: mockEntityRepository as unknown as GapToolDependencies['entityRepository'],
        relationRepository: {} as unknown as GapToolDependencies['relationRepository'],
        communityRepository: {} as unknown as GapToolDependencies['communityRepository'],
        vectorStore: {} as unknown as GapToolDependencies['vectorStore'],
      };

      const tools = createGapTools(depsWithoutAnalyzer);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      const result = await analyzeTool.handler({ limit: 50 });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(true);
      expect(parsed.data.note).toContain('fallback');
    });

    it('should handle errors gracefully', async () => {
      (mockGapAnalyzer.analyze as Mock).mockRejectedValue(new Error('Analysis failed'));

      const tools = createGapTools(deps);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      const result = await analyzeTool.handler({ limit: 50 });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Analysis failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('gap_get', () => {
    it('should get gap by ID', async () => {
      const gaps = createSampleGaps();
      (mockGapAnalyzer.getGapById as Mock).mockResolvedValue(gaps[0]);

      const tools = createGapTools(deps);
      const getTool = tools.find((t) => t.name === 'gap_get')!;

      const result = await getTool.handler({ gapId: 'gap-1' });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(true);
      expect(parsed.data.id).toBe('gap-1');
      expect(parsed.data.type).toBe('missing_combination');
    });

    it('should return error for non-existent gap', async () => {
      (mockGapAnalyzer.getGapById as Mock).mockResolvedValue(null);

      const tools = createGapTools(deps);
      const getTool = tools.find((t) => t.name === 'gap_get')!;

      const result = await getTool.handler({ gapId: 'non-existent' });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('not found');
      expect(result.isError).toBe(true);
    });

    it('should return error when analyzer not configured', async () => {
      const depsWithoutAnalyzer: GapToolDependencies = {
        entityRepository: mockEntityRepository as unknown as GapToolDependencies['entityRepository'],
        relationRepository: {} as unknown as GapToolDependencies['relationRepository'],
        communityRepository: {} as unknown as GapToolDependencies['communityRepository'],
        vectorStore: {} as unknown as GapToolDependencies['vectorStore'],
      };

      const tools = createGapTools(depsWithoutAnalyzer);
      const getTool = tools.find((t) => t.name === 'gap_get')!;

      const result = await getTool.handler({ gapId: 'gap-1' });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('not configured');
    });
  });

  describe('gap_propose', () => {
    it('should generate proposals from analysis', async () => {
      const report = createSampleReport();
      const proposals = createSampleProposals();
      (mockGapAnalyzer.analyze as Mock).mockResolvedValue(report);
      (mockGapAnalyzer.generateResearchProposals as Mock).mockResolvedValue(proposals);

      const tools = createGapTools(deps);
      const proposeTool = tools.find((t) => t.name === 'gap_propose')!;

      const result = await proposeTool.handler({ count: 5 });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(true);
      expect(parsed.data.proposalCount).toBe(2);
      expect(parsed.data.proposals[0].title).toBe('Integrating RL with LLMs');
    });

    it('should generate proposals from specific gaps', async () => {
      const gaps = createSampleGaps();
      const proposals = createSampleProposals();
      (mockGapAnalyzer.getGapById as Mock).mockImplementation((id: string) => {
        return Promise.resolve(gaps.find((g) => g.id === id) ?? null);
      });
      (mockGapAnalyzer.generateResearchProposals as Mock).mockResolvedValue(proposals);

      const tools = createGapTools(deps);
      const proposeTool = tools.find((t) => t.name === 'gap_propose')!;

      const result = await proposeTool.handler({
        gapIds: ['gap-1', 'gap-2'],
        count: 3,
      });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(true);
      expect(mockGapAnalyzer.generateResearchProposals).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'gap-1' }),
          expect.objectContaining({ id: 'gap-2' }),
        ]),
        3
      );
    });

    it('should handle errors in proposal generation', async () => {
      (mockGapAnalyzer.analyze as Mock).mockRejectedValue(new Error('Generation failed'));

      const tools = createGapTools(deps);
      const proposeTool = tools.find((t) => t.name === 'gap_propose')!;

      const result = await proposeTool.handler({ count: 5 });
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Generation failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('gap_types', () => {
    it('should return all gap types', async () => {
      const tools = createGapTools(deps);
      const typesTool = tools.find((t) => t.name === 'gap_types')!;

      const result = await typesTool.handler({});
      const parsed = JSON.parse(result.content[0].text as string);

      expect(parsed.success).toBe(true);
      expect(parsed.data).toHaveProperty('missing_combination');
      expect(parsed.data).toHaveProperty('underexplored_technique');
      expect(parsed.data).toHaveProperty('isolated_cluster');
      expect(parsed.data).toHaveProperty('stale_research_area');
      expect(parsed.data).toHaveProperty('unexplored_application');
    });

    it('should include descriptions for each type', async () => {
      const tools = createGapTools(deps);
      const typesTool = tools.find((t) => t.name === 'gap_types')!;

      const result = await typesTool.handler({});
      const parsed = JSON.parse(result.content[0].text as string);

      for (const type of Object.values(parsed.data) as { name: string; description: string; example: string }[]) {
        expect(type.name).toBeDefined();
        expect(type.description).toBeDefined();
        expect(type.example).toBeDefined();
      }
    });
  });

  describe('Tool Schema Validation', () => {
    it('gap_analyze should accept valid input', async () => {
      const report = createSampleReport();
      (mockGapAnalyzer.analyze as Mock).mockResolvedValue(report);

      const tools = createGapTools(deps);
      const analyzeTool = tools.find((t) => t.name === 'gap_analyze')!;

      // Valid inputs
      const validInputs = [
        {},
        { limit: 10 },
        { types: ['missing_combination'] },
        { minSeverity: 'high' },
        { includeCitations: true, includeClusters: false },
        { limit: 100, types: ['stale_research_area', 'underexplored_technique'] },
      ];

      for (const input of validInputs) {
        const result = await analyzeTool.handler(input);
        const parsed = JSON.parse(result.content[0].text as string);
        expect(parsed.success).toBe(true);
      }
    });
  });
});
