/**
 * Path command tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPathCommand, type PathService, type CLIPath, type CLIPathResult, type CLIPathExplanation } from '../src/commands/path.js';

describe('createPathCommand', () => {
  let mockService: PathService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const createMockPath = (nodes: string[], hops: number): CLIPath => ({
    nodes: nodes.map((name, i) => ({
      id: `${i}`,
      type: 'Entity',
      name,
    })),
    relations: Array.from({ length: hops }, () => ({
      type: 'USES',
      direction: 'outgoing' as const,
    })),
    hops,
    score: 1.0,
  });

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockService = {
      findPaths: vi.fn().mockResolvedValue({
        paths: [createMockPath(['A', 'B', 'C'], 2)],
        totalPaths: 1,
        executionTime: 100,
      } as CLIPathResult),
      findShortestPath: vi.fn().mockResolvedValue(createMockPath(['A', 'B'], 1)),
      areConnected: vi.fn().mockResolvedValue(true),
      getDegreesOfSeparation: vi.fn().mockResolvedValue(2),
      explainPath: vi.fn().mockImplementation((path: CLIPath) =>
        Promise.resolve({
          path,
          naturalLanguage: 'A is connected to B',
          summary: '1-hop path',
        } as CLIPathExplanation)
      ),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create path command', () => {
    const cmd = createPathCommand();
    expect(cmd.name()).toBe('path');
  });

  it('should have find subcommand', () => {
    const cmd = createPathCommand();
    const subcommands = cmd.commands.map((c) => c.name());
    expect(subcommands).toContain('find');
  });

  it('should have shortest subcommand', () => {
    const cmd = createPathCommand();
    const subcommands = cmd.commands.map((c) => c.name());
    expect(subcommands).toContain('shortest');
  });

  it('should have check subcommand', () => {
    const cmd = createPathCommand();
    const subcommands = cmd.commands.map((c) => c.name());
    expect(subcommands).toContain('check');
  });

  it('should have degrees subcommand', () => {
    const cmd = createPathCommand();
    const subcommands = cmd.commands.map((c) => c.name());
    expect(subcommands).toContain('degrees');
  });

  it('should have explain subcommand', () => {
    const cmd = createPathCommand();
    const subcommands = cmd.commands.map((c) => c.name());
    expect(subcommands).toContain('explain');
  });

  describe('find command', () => {
    it('should find paths between entities', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'find', 'EntityA', 'EntityB', '-o', 'json']);

      expect(mockService.findPaths).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should pass max-hops option', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'find', 'A', 'B', '-m', '5', '-o', 'json']);

      expect(mockService.findPaths).toHaveBeenCalledWith(
        'A',
        'B',
        expect.objectContaining({ maxHops: 5 })
      );
    });

    it('should handle relation types filter', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'find', 'A', 'B', '-r', 'USES,RELATES_TO', '-o', 'json']);

      expect(mockService.findPaths).toHaveBeenCalledWith(
        'A',
        'B',
        expect.objectContaining({ relationTypes: ['USES', 'RELATES_TO'] })
      );
    });
  });

  describe('shortest command', () => {
    it('should find shortest path', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'shortest', 'A', 'B', '-o', 'json']);

      expect(mockService.findShortestPath).toHaveBeenCalledWith('A', 'B', 6);
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should pass custom max-hops', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'shortest', 'A', 'B', '-m', '10', '-o', 'json']);

      expect(mockService.findShortestPath).toHaveBeenCalledWith('A', 'B', 10);
    });
  });

  describe('check command', () => {
    it('should check if entities are connected', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'check', 'A', 'B']);

      expect(mockService.areConnected).toHaveBeenCalledWith('A', 'B', 4);
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle disconnected entities', async () => {
      vi.mocked(mockService.areConnected).mockResolvedValue(false);
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'check', 'A', 'Z']);

      expect(mockService.areConnected).toHaveBeenCalled();
    });
  });

  describe('degrees command', () => {
    it('should get degrees of separation', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'degrees', 'A', 'B']);

      expect(mockService.getDegreesOfSeparation).toHaveBeenCalledWith('A', 'B', 6);
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle no connection', async () => {
      vi.mocked(mockService.getDegreesOfSeparation).mockResolvedValue(null);
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'degrees', 'A', 'Z']);

      expect(mockService.getDegreesOfSeparation).toHaveBeenCalled();
    });
  });

  describe('explain command', () => {
    it('should find and explain paths', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'explain', 'A', 'B', '-o', 'json']);

      expect(mockService.findPaths).toHaveBeenCalled();
      expect(mockService.explainPath).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should limit explanation count', async () => {
      const paths = [
        createMockPath(['A', 'B'], 1),
        createMockPath(['A', 'C', 'B'], 2),
        createMockPath(['A', 'D', 'E', 'B'], 3),
      ];
      vi.mocked(mockService.findPaths).mockResolvedValue({
        paths,
        totalPaths: 3,
        executionTime: 100,
      });

      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'explain', 'A', 'B', '-n', '2', '-o', 'json']);

      expect(mockService.explainPath).toHaveBeenCalledTimes(2);
    });

    it('should pass language option', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'explain', 'A', 'B', '-l', 'ja', '-o', 'json']);

      expect(mockService.findPaths).toHaveBeenCalledWith(
        'A',
        'B',
        expect.objectContaining({ language: 'ja' })
      );
    });

    it('should pass context option', async () => {
      const cmd = createPathCommand(async () => mockService);
      await cmd.parseAsync(['node', 'test', 'explain', 'A', 'B', '--context', 'AI research', '-o', 'json']);

      expect(mockService.explainPath).toHaveBeenCalledWith(
        expect.anything(),
        'AI research'
      );
    });
  });
});

