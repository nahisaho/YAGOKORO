/**
 * Researcher CLI Tests
 *
 * @description researcher コマンドのテスト
 * @see T-402
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createResearcherCommand,
  type ResearcherCLIService,
  type CLIResearcherDetails,
  type CLIInfluenceRankingItem,
  type CLICommunityInfo,
  type CLINetworkStats,
  type CLIGraphExport,
  type CLICareerTimeline,
  type CLICareerPrediction,
} from '../researcher.js';

// テスト用モックサービス
function createMockService(): ResearcherCLIService {
  const mockResearcher: CLIResearcherDetails = {
    id: 'researcher-001',
    name: 'John Doe',
    affiliation: 'Stanford University',
    orcid: '0000-0001-2345-6789',
    paperCount: 50,
    coauthorCount: 25,
    communityId: 1,
    influenceScore: 0.85,
  };

  const mockCoauthors: CLIResearcherDetails[] = [
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

  const mockRanking: CLIInfluenceRankingItem[] = [
    { id: 'researcher-001', name: 'John Doe', influenceScore: 0.85, hIndex: 45, pageRank: 0.12 },
    { id: 'researcher-002', name: 'Jane Smith', influenceScore: 0.72, hIndex: 38, pageRank: 0.09 },
  ];

  const mockCommunities: CLICommunityInfo[] = [
    { id: 1, memberCount: 50, representative: 'John Doe', density: 0.35 },
    { id: 2, memberCount: 30, representative: 'Alice Wang', density: 0.42 },
  ];

  const mockStats: CLINetworkStats = {
    totalResearchers: 1000,
    totalEdges: 5000,
    totalPapers: 2500,
    averageDegree: 10.5,
    communityCount: 15,
  };

  const mockGraph: CLIGraphExport = {
    nodes: [
      { id: 'researcher-001', name: 'John Doe', affiliation: 'Stanford', communityId: 1 },
      { id: 'researcher-002', name: 'Jane Smith', affiliation: 'MIT', communityId: 1 },
    ],
    edges: [
      { source: 'researcher-001', target: 'researcher-002', weight: 5 },
    ],
  };

  const mockCareer: CLICareerTimeline = {
    researcherId: 'researcher-001',
    stages: [
      { period: '2010-2015', publications: 10, avgImpact: 5.2, topVenue: 'NeurIPS' },
      { period: '2015-2020', publications: 25, avgImpact: 8.5, topVenue: 'ICML' },
    ],
    currentStage: 'senior',
  };

  const mockPrediction: CLICareerPrediction = {
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
    exportToGraph: vi.fn().mockReturnValue(mockGraph),
    analyzeCareer: vi.fn().mockReturnValue(mockCareer),
    predictCareer: vi.fn().mockReturnValue(mockPrediction),
  };
}

describe('createResearcherCommand', () => {
  let mockService: ResearcherCLIService;
  let command: ReturnType<typeof createResearcherCommand>;

  beforeEach(() => {
    mockService = createMockService();
    command = createResearcherCommand(mockService);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create a command with correct name and description', () => {
    expect(command.name()).toBe('researcher');
    expect(command.description()).toContain('研究者');
  });

  it('should have all required subcommands', () => {
    const subcommands = command.commands.map((c) => c.name());
    expect(subcommands).toContain('search');
    expect(subcommands).toContain('info');
    expect(subcommands).toContain('coauthors');
    expect(subcommands).toContain('path');
    expect(subcommands).toContain('ranking');
    expect(subcommands).toContain('communities');
    expect(subcommands).toContain('stats');
    expect(subcommands).toContain('export');
    expect(subcommands).toContain('career');
  });

  describe('search command', () => {
    it('should have correct options', () => {
      const searchCmd = command.commands.find((c) => c.name() === 'search');
      expect(searchCmd).toBeDefined();
      const optionNames = searchCmd!.options.map((o) => o.long);
      expect(optionNames).toContain('--name');
      expect(optionNames).toContain('--affiliation');
      expect(optionNames).toContain('--min-coauthors');
      expect(optionNames).toContain('--limit');
      expect(optionNames).toContain('--format');
    });

    it('should call searchResearchers', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['search', '--name', 'John'], { from: 'user' });
      expect(mockService.searchResearchers).toHaveBeenCalledWith({
        nameQuery: 'John',
        affiliation: undefined,
        minCoauthors: 0,
        limit: 20,
      });
    });

    it('should apply all filters', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['search', '--name', 'John', '--affiliation', 'Stanford', '--min-coauthors', '5', '--limit', '10'], { from: 'user' });
      expect(mockService.searchResearchers).toHaveBeenCalledWith({
        nameQuery: 'John',
        affiliation: 'Stanford',
        minCoauthors: 5,
        limit: 10,
      });
    });
  });

  describe('info command', () => {
    it('should have researcherId argument', () => {
      const infoCmd = command.commands.find((c) => c.name() === 'info');
      expect(infoCmd).toBeDefined();
      expect(infoCmd!.registeredArguments.length).toBeGreaterThan(0);
      expect(infoCmd!.registeredArguments[0]?.name()).toBe('researcherId');
    });

    it('should call getResearcher with researcherId', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['info', 'researcher-001'], { from: 'user' });
      expect(mockService.getResearcher).toHaveBeenCalledWith('researcher-001');
    });
  });

  describe('coauthors command', () => {
    it('should have researcherId argument', () => {
      const coauthorsCmd = command.commands.find((c) => c.name() === 'coauthors');
      expect(coauthorsCmd).toBeDefined();
      expect(coauthorsCmd!.registeredArguments.length).toBeGreaterThan(0);
      expect(coauthorsCmd!.registeredArguments[0]?.name()).toBe('researcherId');
    });

    it('should call getCoauthors with researcherId', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['coauthors', 'researcher-001'], { from: 'user' });
      expect(mockService.getCoauthors).toHaveBeenCalledWith('researcher-001');
    });
  });

  describe('path command', () => {
    it('should have fromId and toId arguments', () => {
      const pathCmd = command.commands.find((c) => c.name() === 'path');
      expect(pathCmd).toBeDefined();
      expect(pathCmd!.registeredArguments.length).toBe(2);
      expect(pathCmd!.registeredArguments[0]?.name()).toBe('fromId');
      expect(pathCmd!.registeredArguments[1]?.name()).toBe('toId');
    });

    it('should call findPath with fromId and toId', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['path', 'researcher-001', 'researcher-003'], { from: 'user' });
      expect(mockService.findPath).toHaveBeenCalledWith('researcher-001', 'researcher-003');
    });
  });

  describe('ranking command', () => {
    it('should have alias "rank"', () => {
      const rankingCmd = command.commands.find((c) => c.name() === 'ranking');
      expect(rankingCmd).toBeDefined();
      expect(rankingCmd!.aliases()).toContain('rank');
    });

    it('should call getInfluenceRanking', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['ranking', '--limit', '5'], { from: 'user' });
      expect(mockService.getInfluenceRanking).toHaveBeenCalledWith({
        limit: 5,
        communityId: undefined,
      });
    });

    it('should filter by community', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['ranking', '--community', '2'], { from: 'user' });
      expect(mockService.getInfluenceRanking).toHaveBeenCalledWith({
        limit: 10,
        communityId: 2,
      });
    });
  });

  describe('communities command', () => {
    it('should have alias "comm"', () => {
      const commCmd = command.commands.find((c) => c.name() === 'communities');
      expect(commCmd).toBeDefined();
      expect(commCmd!.aliases()).toContain('comm');
    });

    it('should call getCommunities', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['communities'], { from: 'user' });
      expect(mockService.getCommunities).toHaveBeenCalled();
    });
  });

  describe('stats command', () => {
    it('should call getNetworkStats', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['stats'], { from: 'user' });
      expect(mockService.getNetworkStats).toHaveBeenCalled();
    });
  });

  describe('export command', () => {
    it('should call exportToGraph', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['export'], { from: 'user' });
      expect(mockService.exportToGraph).toHaveBeenCalled();
    });
  });

  describe('career command', () => {
    it('should have researcherId argument', () => {
      const careerCmd = command.commands.find((c) => c.name() === 'career');
      expect(careerCmd).toBeDefined();
      expect(careerCmd!.registeredArguments.length).toBeGreaterThan(0);
      expect(careerCmd!.registeredArguments[0]?.name()).toBe('researcherId');
    });

    it('should call analyzeCareer with researcherId', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['career', 'researcher-001'], { from: 'user' });
      expect(mockService.analyzeCareer).toHaveBeenCalledWith('researcher-001');
    });

    it('should call predictCareer when --predict flag is set', async () => {
      const cmd = createResearcherCommand(mockService);
      await cmd.parseAsync(['career', 'researcher-001', '--predict'], { from: 'user' });
      expect(mockService.analyzeCareer).toHaveBeenCalledWith('researcher-001');
      expect(mockService.predictCareer).toHaveBeenCalledWith('researcher-001');
    });
  });
});

describe('Researcher CLI Output Formats', () => {
  let mockService: ResearcherCLIService;

  beforeEach(() => {
    mockService = createMockService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should output JSON when --format json is specified', async () => {
    const cmd = createResearcherCommand(mockService);
    await cmd.parseAsync(['search', '--format', 'json'], { from: 'user' });
    expect(console.log).toHaveBeenCalled();
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('should output table format by default', async () => {
    const cmd = createResearcherCommand(mockService);
    await cmd.parseAsync(['stats'], { from: 'user' });
    expect(console.log).toHaveBeenCalled();
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(output).toContain('📊');
    expect(output).toContain('ネットワーク統計');
  });
});

describe('Error Handling', () => {
  let mockService: ResearcherCLIService;

  beforeEach(() => {
    mockService = createMockService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle researcher not found', async () => {
    (mockService.getResearcher as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const cmd = createResearcherCommand(mockService);
    await cmd.parseAsync(['info', 'nonexistent'], { from: 'user' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('見つかりません'));
  });

  it('should handle path not found', async () => {
    (mockService.findPath as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const cmd = createResearcherCommand(mockService);
    await cmd.parseAsync(['path', 'a', 'b'], { from: 'user' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('パスが見つかりません'));
  });

  it('should handle career data not found', async () => {
    (mockService.analyzeCareer as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const cmd = createResearcherCommand(mockService);
    await cmd.parseAsync(['career', 'nonexistent'], { from: 'user' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('見つかりません'));
  });
});
