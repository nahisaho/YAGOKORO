/**
 * MCP Researcher Tools Tests
 *
 * @description researcher MCP ツールのテスト
 * @see T-404
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  researcherTools,
  createResearcherToolHandlers,
  type ResearcherToolService,
  type MCPResearcherDetails,
  type MCPInfluenceRankingItem,
  type MCPCommunityInfo,
  type MCPNetworkStats,
  type MCPCareerTimeline,
  type MCPCareerPrediction,
} from './researcher.js';

// Mock service factory
function createMockService(): ResearcherToolService {
  const mockResearcher: MCPResearcherDetails = {
    id: 'researcher-001',
    name: 'John Doe',
    affiliation: 'Stanford University',
    orcid: '0000-0001-2345-6789',
    paperCount: 50,
    coauthorCount: 25,
    communityId: 1,
    influenceScore: 0.85,
  };

  const mockCoauthors: MCPResearcherDetails[] = [
    {
      id: 'researcher-002',
      name: 'Jane Smith',
      affiliation: 'MIT',
      paperCount: 30,
      coauthorCount: 15,
      communityId: 1,
      influenceScore: 0.72,
    },
    {
      id: 'researcher-003',
      name: 'Bob Johnson',
      affiliation: 'Stanford University',
      paperCount: 40,
      coauthorCount: 20,
      communityId: 1,
      influenceScore: 0.68,
    },
  ];

  const mockRanking: MCPInfluenceRankingItem[] = [
    { id: 'researcher-001', name: 'John Doe', influenceScore: 0.85, hIndex: 45, pageRank: 0.12 },
    { id: 'researcher-002', name: 'Jane Smith', influenceScore: 0.72, hIndex: 38, pageRank: 0.09 },
  ];

  const mockCommunities: MCPCommunityInfo[] = [
    { id: 1, memberCount: 50, representative: 'John Doe', density: 0.35 },
    { id: 2, memberCount: 30, representative: 'Alice Wang', density: 0.42 },
  ];

  const mockStats: MCPNetworkStats = {
    totalResearchers: 1000,
    totalEdges: 5000,
    totalPapers: 2500,
    averageDegree: 10.5,
    communityCount: 15,
  };

  const mockCareer: MCPCareerTimeline = {
    researcherId: 'researcher-001',
    stages: [
      { period: '2010-2015', publications: 10, avgImpact: 5.2, topVenue: 'NeurIPS' },
      { period: '2015-2020', publications: 25, avgImpact: 8.5, topVenue: 'ICML' },
    ],
    currentStage: 'senior',
  };

  const mockPrediction: MCPCareerPrediction = {
    researcherId: 'researcher-001',
    projectedHIndex: 55,
    projectedPublications: 75,
    trendDirection: 'rising',
    confidence: 0.78,
  };

  return {
    searchResearchers: vi.fn().mockReturnValue([mockResearcher, ...mockCoauthors]),
    getResearcher: vi.fn().mockReturnValue(mockResearcher),
    getCoauthors: vi.fn().mockReturnValue(mockCoauthors),
    findPath: vi.fn().mockReturnValue(['researcher-001', 'researcher-002', 'researcher-003']),
    getInfluenceRanking: vi.fn().mockReturnValue(mockRanking),
    getCommunities: vi.fn().mockReturnValue(mockCommunities),
    getNetworkStats: vi.fn().mockReturnValue(mockStats),
    exportToGraph: vi.fn().mockReturnValue({
      nodes: [{ id: 'researcher-001', name: 'John Doe' }],
      edges: [],
    }),
    analyzeCareer: vi.fn().mockReturnValue(mockCareer),
    predictCareer: vi.fn().mockReturnValue(mockPrediction),
  };
}

describe('researcherTools', () => {
  it('should define all required tools', () => {
    const toolNames = researcherTools.map((t) => t.name);
    expect(toolNames).toContain('researcher_search');
    expect(toolNames).toContain('researcher_get');
    expect(toolNames).toContain('researcher_coauthors');
    expect(toolNames).toContain('researcher_path');
    expect(toolNames).toContain('researcher_ranking');
    expect(toolNames).toContain('researcher_communities');
    expect(toolNames).toContain('researcher_career');
  });

  it('should have correct input schemas', () => {
    const getTool = researcherTools.find((t) => t.name === 'researcher_get');
    expect(getTool).toBeDefined();
    expect(getTool!.inputSchema.required).toContain('researcherId');

    const pathTool = researcherTools.find((t) => t.name === 'researcher_path');
    expect(pathTool).toBeDefined();
    expect(pathTool!.inputSchema.required).toContain('fromId');
    expect(pathTool!.inputSchema.required).toContain('toId');

    const careerTool = researcherTools.find((t) => t.name === 'researcher_career');
    expect(careerTool).toBeDefined();
    expect(careerTool!.inputSchema.required).toContain('researcherId');
  });

  it('should have Japanese descriptions', () => {
    for (const tool of researcherTools) {
      expect(tool.description).toMatch(/[ァ-ヶぁ-ん]/);
    }
  });
});

describe('createResearcherToolHandlers', () => {
  let mockService: ResearcherToolService;
  let handlers: ReturnType<typeof createResearcherToolHandlers>;

  beforeEach(() => {
    mockService = createMockService();
    handlers = createResearcherToolHandlers(mockService);
  });

  describe('handleSearch', () => {
    it('should call service.searchResearchers with options', async () => {
      const result = await handlers.handleSearch({ nameQuery: 'John' });
      expect(mockService.searchResearchers).toHaveBeenCalledWith({
        nameQuery: 'John',
        affiliation: undefined,
        minCoauthors: undefined,
        limit: 20,
      });
      expect(result.isError).toBe(false);
    });

    it('should pass all search options', async () => {
      await handlers.handleSearch({
        nameQuery: 'John',
        affiliation: 'Stanford',
        minCoauthors: 5,
        limit: 10,
      });
      expect(mockService.searchResearchers).toHaveBeenCalledWith({
        nameQuery: 'John',
        affiliation: 'Stanford',
        minCoauthors: 5,
        limit: 10,
      });
    });
  });

  describe('handleGetResearcher', () => {
    it('should call service.getResearcher', async () => {
      const result = await handlers.handleGetResearcher({ researcherId: 'researcher-001' });
      expect(mockService.getResearcher).toHaveBeenCalledWith('researcher-001');
      expect(result.isError).toBe(false);
    });

    it('should return error when researcherId is missing', async () => {
      const result = await handlers.handleGetResearcher({ researcherId: '' });
      expect(result.isError).toBe(true);
    });

    it('should return error when researcher not found', async () => {
      (mockService.getResearcher as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const result = await handlers.handleGetResearcher({ researcherId: 'nonexistent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('見つかりません');
    });
  });

  describe('handleCoauthors', () => {
    it('should call service.getCoauthors', async () => {
      const result = await handlers.handleCoauthors({ researcherId: 'researcher-001' });
      expect(mockService.getCoauthors).toHaveBeenCalledWith('researcher-001');
      expect(result.isError).toBe(false);
    });

    it('should return error when researcherId is missing', async () => {
      const result = await handlers.handleCoauthors({ researcherId: '' });
      expect(result.isError).toBe(true);
    });

    it('should respect limit option', async () => {
      const result = await handlers.handleCoauthors({ researcherId: 'researcher-001', limit: 1 });
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      expect(parsed.coauthors).toHaveLength(1);
    });
  });

  describe('handlePath', () => {
    it('should call service.findPath', async () => {
      const result = await handlers.handlePath({ fromId: 'a', toId: 'b' });
      expect(mockService.findPath).toHaveBeenCalledWith('a', 'b');
      expect(result.isError).toBe(false);
    });

    it('should return error when fromId is missing', async () => {
      const result = await handlers.handlePath({ fromId: '', toId: 'b' });
      expect(result.isError).toBe(true);
    });

    it('should return error when toId is missing', async () => {
      const result = await handlers.handlePath({ fromId: 'a', toId: '' });
      expect(result.isError).toBe(true);
    });

    it('should return error when path not found', async () => {
      (mockService.findPath as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = await handlers.handlePath({ fromId: 'a', toId: 'b' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('見つかりません');
    });

    it('should return path with distance', async () => {
      const result = await handlers.handlePath({ fromId: 'a', toId: 'c' });
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      expect(parsed.path).toBeDefined();
      expect(parsed.distance).toBe(2);
    });
  });

  describe('handleRanking', () => {
    it('should call service.getInfluenceRanking', async () => {
      const result = await handlers.handleRanking({});
      expect(mockService.getInfluenceRanking).toHaveBeenCalledWith({
        limit: 10,
        communityId: undefined,
      });
      expect(result.isError).toBe(false);
    });

    it('should pass options', async () => {
      await handlers.handleRanking({ limit: 5, communityId: 2 });
      expect(mockService.getInfluenceRanking).toHaveBeenCalledWith({
        limit: 5,
        communityId: 2,
      });
    });
  });

  describe('handleCommunities', () => {
    it('should call service.getCommunities', async () => {
      const result = await handlers.handleCommunities();
      expect(mockService.getCommunities).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('handleCareer', () => {
    it('should call service.analyzeCareer', async () => {
      const result = await handlers.handleCareer({ researcherId: 'researcher-001' });
      expect(mockService.analyzeCareer).toHaveBeenCalledWith('researcher-001');
      expect(result.isError).toBe(false);
    });

    it('should return error when researcherId is missing', async () => {
      const result = await handlers.handleCareer({ researcherId: '' });
      expect(result.isError).toBe(true);
    });

    it('should return error when career not found', async () => {
      (mockService.analyzeCareer as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = await handlers.handleCareer({ researcherId: 'nonexistent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('見つかりません');
    });

    it('should include prediction when predict is true', async () => {
      const result = await handlers.handleCareer({ researcherId: 'researcher-001', predict: true });
      expect(mockService.predictCareer).toHaveBeenCalledWith('researcher-001');
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      expect(parsed.prediction).toBeDefined();
    });

    it('should not include prediction when predict is false', async () => {
      const result = await handlers.handleCareer({
        researcherId: 'researcher-001',
        predict: false,
      });
      expect(mockService.predictCareer).not.toHaveBeenCalled();
    });
  });

  describe('handleResearcherTool', () => {
    it('should route to correct handler', async () => {
      await handlers.handleResearcherTool('researcher_search', { nameQuery: 'test' });
      expect(mockService.searchResearchers).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_get', { researcherId: 'r-1' });
      expect(mockService.getResearcher).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_coauthors', { researcherId: 'r-1' });
      expect(mockService.getCoauthors).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_path', { fromId: 'a', toId: 'b' });
      expect(mockService.findPath).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_ranking', {});
      expect(mockService.getInfluenceRanking).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_communities', {});
      expect(mockService.getCommunities).toHaveBeenCalled();

      await handlers.handleResearcherTool('researcher_career', { researcherId: 'r-1' });
      expect(mockService.analyzeCareer).toHaveBeenCalled();
    });

    it('should return error for unknown tool', async () => {
      const result = await handlers.handleResearcherTool('unknown_tool', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown');
    });
  });
});

describe('Tool Response Format', () => {
  let handlers: ReturnType<typeof createResearcherToolHandlers>;

  beforeEach(() => {
    const mockService = createMockService();
    handlers = createResearcherToolHandlers(mockService);
  });

  it('should return properly formatted JSON in content', async () => {
    const result = await handlers.handleCommunities();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
    expect(parsed).toHaveProperty('communities');
  });

  it('should include isError: false for success', async () => {
    const result = await handlers.handleSearch({});
    expect(result.isError).toBe(false);
  });

  it('should include isError: true for errors', async () => {
    const result = await handlers.handleGetResearcher({ researcherId: '' });
    expect(result.isError).toBe(true);
  });
});
