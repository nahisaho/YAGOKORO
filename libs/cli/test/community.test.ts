import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCommunityCommand,
  type CommunityService,
  type CLICommunity,
  type CommunityDetectionResult,
} from '../src/commands/community.js';

const originalExitCode = process.exitCode;

describe('Community Command', () => {
  let mockService: CommunityService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockCommunity: CLICommunity = {
    id: 'comm-12345678-1234-1234-1234-123456789012',
    level: 0,
    title: 'AI Research Community',
    summary: 'A community focused on AI research and development',
    entityCount: 25,
    entities: ['entity-1', 'entity-2', 'entity-3'],
    parentId: undefined,
    childIds: ['comm-child-1', 'comm-child-2'],
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockDetectionResult: CommunityDetectionResult = {
    communitiesDetected: 10,
    levels: 3,
    duration: 5000,
    details: [
      { level: 0, count: 3 },
      { level: 1, count: 5 },
      { level: 2, count: 2 },
    ],
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue({
        communities: [mockCommunity],
        total: 1,
      }),
      get: vi.fn().mockResolvedValue(mockCommunity),
      detect: vi.fn().mockResolvedValue(mockDetectionResult),
      summarize: vi.fn().mockResolvedValue({
        summary: 'Test summary of the community',
        keywords: ['AI', 'research', 'development'],
      }),
      summarizeAll: vi.fn().mockResolvedValue({ summarized: 5, failed: 0 }),
      getHierarchy: vi.fn().mockResolvedValue([mockCommunity]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('createCommunityCommand', () => {
    it('should create community command with all subcommands', () => {
      const community = createCommunityCommand();

      expect(community.name()).toBe('community');
      expect(community.description()).toBe('Community management commands');

      const subcommands = community.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('detect');
      expect(subcommands).toContain('summarize');
      expect(subcommands).toContain('hierarchy');
    });
  });

  describe('community list', () => {
    it('should list communities', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'list']);

      expect(mockService.list).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept level filter', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'list', '-l', '0']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 0,
        })
      );
    });

    it('should accept sort options', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'list', '-s', 'level', '--order', 'asc']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'level',
          sortOrder: 'asc',
        })
      );
    });

    it('should output JSON when specified', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'list', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"communities"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('community get', () => {
    it('should get community by ID', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'get', 'comm-id']);

      expect(mockService.get).toHaveBeenCalledWith('comm-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle community not found', async () => {
      const notFoundMock = {
        ...mockService,
        get: vi.fn().mockResolvedValue(null),
      };

      const community = createCommunityCommand(async () => notFoundMock);
      await community.parseAsync(['node', 'test', 'get', 'non-existent']);

      expect(process.exitCode).toBe(1);
    });

    it('should output JSON when specified', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'get', 'comm-id', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"id"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('community detect', () => {
    it('should detect communities', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'detect']);

      expect(mockService.detect).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept algorithm option', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'detect', '-a', 'louvain']);

      expect(mockService.detect).toHaveBeenCalledWith(
        expect.objectContaining({
          algorithm: 'louvain',
        })
      );
    });

    it('should accept resolution option', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'detect', '-r', '0.5']);

      expect(mockService.detect).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: 0.5,
        })
      );
    });

    it('should accept min-size and max-levels options', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'detect', '--min-size', '5', '--max-levels', '4']);

      expect(mockService.detect).toHaveBeenCalledWith(
        expect.objectContaining({
          minCommunitySize: 5,
          maxLevels: 4,
        })
      );
    });

    it('should output JSON when specified', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'detect', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"communitiesDetected"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('community summarize', () => {
    it('should summarize single community', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize', 'comm-id']);

      expect(mockService.summarize).toHaveBeenCalledWith('comm-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should summarize all communities with --all flag', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize', '--all']);

      expect(mockService.summarizeAll).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept level filter with --all', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize', '--all', '-l', '1']);

      expect(mockService.summarizeAll).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 1,
        })
      );
    });

    it('should accept force flag', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize', '--all', '-f']);

      expect(mockService.summarizeAll).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        })
      );
    });

    it('should fail if no ID and no --all flag', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize']);

      expect(process.exitCode).toBe(1);
    });

    it('should output JSON for single community', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'summarize', 'comm-id', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"summary"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('community hierarchy', () => {
    it('should get hierarchy', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'hierarchy']);

      expect(mockService.getHierarchy).toHaveBeenCalledWith(undefined);
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should get hierarchy for specific community', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'hierarchy', 'comm-id']);

      expect(mockService.getHierarchy).toHaveBeenCalledWith('comm-id');
    });

    it('should output JSON when specified', async () => {
      const community = createCommunityCommand(async () => mockService);
      await community.parseAsync(['node', 'test', 'hierarchy', '-o', 'json']);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      const errorMock = {
        ...mockService,
        list: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const community = createCommunityCommand(async () => errorMock);
      await community.parseAsync(['node', 'test', 'list']);

      expect(process.exitCode).toBe(1);
    });

    it('should handle detection errors', async () => {
      const errorMock = {
        ...mockService,
        detect: vi.fn().mockRejectedValue(new Error('Detection failed')),
      };

      const community = createCommunityCommand(async () => errorMock);
      await community.parseAsync(['node', 'test', 'detect']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('without service factory', () => {
    it('should work without service factory for list', async () => {
      const community = createCommunityCommand();
      await community.parseAsync(['node', 'test', 'list']);

      expect(true).toBe(true);
    });

    it('should work without service factory for detect', async () => {
      const community = createCommunityCommand();
      await community.parseAsync(['node', 'test', 'detect']);

      expect(true).toBe(true);
    });
  });
});
