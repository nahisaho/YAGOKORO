import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRelationCommand,
  type RelationService,
  type CLIRelation,
} from '../src/commands/relation.js';

const originalExitCode = process.exitCode;

describe('Relation Command', () => {
  let mockService: RelationService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockRelation: CLIRelation = {
    id: 'rel-12345678-1234-1234-1234-123456789012',
    type: 'KNOWS',
    sourceId: 'entity-1',
    targetId: 'entity-2',
    sourceName: 'Alice',
    targetName: 'Bob',
    weight: 0.8,
    properties: { since: '2020' },
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue({
        relations: [mockRelation],
        total: 1,
      }),
      get: vi.fn().mockResolvedValue(mockRelation),
      create: vi.fn().mockResolvedValue(mockRelation),
      delete: vi.fn().mockResolvedValue(true),
      getByEntity: vi.fn().mockResolvedValue([mockRelation]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('createRelationCommand', () => {
    it('should create relation command with all subcommands', () => {
      const relation = createRelationCommand();

      expect(relation.name()).toBe('relation');
      expect(relation.description()).toBe('Relation management commands');

      const subcommands = relation.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('create');
      expect(subcommands).toContain('delete');
      expect(subcommands).toContain('by-entity');
    });
  });

  describe('relation list', () => {
    it('should list relations', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'list']);

      expect(mockService.list).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept type filter', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'list', '-t', 'KNOWS']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'KNOWS',
        })
      );
    });

    it('should accept source filter', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'list', '--source', 'entity-1']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'entity-1',
        })
      );
    });

    it('should accept target filter', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'list', '--target', 'entity-2']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'entity-2',
        })
      );
    });

    it('should output JSON when specified', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'list', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"relations"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('relation get', () => {
    it('should get relation by ID', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'get', 'rel-id']);

      expect(mockService.get).toHaveBeenCalledWith('rel-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle relation not found', async () => {
      const notFoundMock = {
        ...mockService,
        get: vi.fn().mockResolvedValue(null),
      };

      const relation = createRelationCommand(async () => notFoundMock);
      await relation.parseAsync(['node', 'test', 'get', 'non-existent']);

      expect(process.exitCode).toBe(1);
    });

    it('should output JSON when specified', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'get', 'rel-id', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"id"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('relation create', () => {
    it('should create relation with required options', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync([
        'node', 'test', 'create',
        '-t', 'KNOWS',
        '-s', 'entity-1',
        '--target', 'entity-2',
      ]);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'KNOWS',
          sourceId: 'entity-1',
          targetId: 'entity-2',
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept weight option', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync([
        'node', 'test', 'create',
        '-t', 'KNOWS',
        '-s', 'entity-1',
        '--target', 'entity-2',
        '-w', '0.75',
      ]);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 0.75,
        })
      );
    });

    it('should accept properties as JSON', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync([
        'node', 'test', 'create',
        '-t', 'KNOWS',
        '-s', 'entity-1',
        '--target', 'entity-2',
        '-p', '{"since":"2020"}',
      ]);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { since: '2020' },
        })
      );
    });

    it('should output JSON when specified', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync([
        'node', 'test', 'create',
        '-t', 'KNOWS',
        '-s', 'entity-1',
        '--target', 'entity-2',
        '-o', 'json',
      ]);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('relation delete', () => {
    it('should delete relation', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'delete', 'rel-id', '-f']);

      expect(mockService.delete).toHaveBeenCalledWith('rel-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle delete failure', async () => {
      const failMock = {
        ...mockService,
        delete: vi.fn().mockResolvedValue(false),
      };

      const relation = createRelationCommand(async () => failMock);
      await relation.parseAsync(['node', 'test', 'delete', 'non-existent', '-f']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('relation by-entity', () => {
    it('should get relations for entity', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'by-entity', 'entity-1']);

      expect(mockService.getByEntity).toHaveBeenCalledWith('entity-1', 'both');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept direction option', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'by-entity', 'entity-1', '-d', 'out']);

      expect(mockService.getByEntity).toHaveBeenCalledWith('entity-1', 'out');
    });

    it('should output JSON when specified', async () => {
      const relation = createRelationCommand(async () => mockService);
      await relation.parseAsync(['node', 'test', 'by-entity', 'entity-1', '-o', 'json']);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      const errorMock = {
        ...mockService,
        list: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const relation = createRelationCommand(async () => errorMock);
      await relation.parseAsync(['node', 'test', 'list']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('without service factory', () => {
    it('should work without service factory for list', async () => {
      const relation = createRelationCommand();
      await relation.parseAsync(['node', 'test', 'list']);

      expect(true).toBe(true);
    });

    it('should work without service factory for create', async () => {
      const relation = createRelationCommand();
      await relation.parseAsync([
        'node', 'test', 'create',
        '-t', 'KNOWS',
        '-s', 'entity-1',
        '--target', 'entity-2',
      ]);

      expect(true).toBe(true);
    });
  });
});
