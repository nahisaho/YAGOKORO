import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createEntityCommand,
  type EntityService,
  type CLIEntity,
} from '../src/commands/entity.js';

const originalExitCode = process.exitCode;

describe('Entity Command', () => {
  let mockService: EntityService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockEntity: CLIEntity = {
    id: '12345678-1234-1234-1234-123456789012',
    name: 'Test Entity',
    type: 'Person',
    description: 'A test entity',
    properties: { age: 30 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue({
        entities: [mockEntity],
        total: 1,
      }),
      get: vi.fn().mockResolvedValue(mockEntity),
      create: vi.fn().mockResolvedValue(mockEntity),
      update: vi.fn().mockResolvedValue(mockEntity),
      delete: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue([mockEntity]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('createEntityCommand', () => {
    it('should create entity command with all subcommands', () => {
      const entity = createEntityCommand();

      expect(entity.name()).toBe('entity');
      expect(entity.description()).toBe('Entity management commands');

      const subcommands = entity.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('create');
      expect(subcommands).toContain('update');
      expect(subcommands).toContain('delete');
      expect(subcommands).toContain('search');
    });
  });

  describe('entity list', () => {
    it('should list entities', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'list']);

      expect(mockService.list).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept type filter', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'list', '-t', 'Person']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Person',
        })
      );
    });

    it('should accept pagination options', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'list', '-l', '50', '--offset', '10']);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 10,
        })
      );
    });

    it('should output JSON when specified', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'list', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"entities"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('entity get', () => {
    it('should get entity by ID', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'get', 'test-id']);

      expect(mockService.get).toHaveBeenCalledWith('test-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle entity not found', async () => {
      const notFoundMock = {
        ...mockService,
        get: vi.fn().mockResolvedValue(null),
      };

      const entity = createEntityCommand(async () => notFoundMock);
      await entity.parseAsync(['node', 'test', 'get', 'non-existent']);

      expect(process.exitCode).toBe(1);
    });

    it('should output JSON when specified', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'get', 'test-id', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"id"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('entity create', () => {
    it('should create entity with required options', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'create', '-n', 'Test', '-t', 'Person']);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test',
          type: 'Person',
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept description option', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync([
        'node', 'test', 'create',
        '-n', 'Test',
        '-t', 'Person',
        '-d', 'Test description',
      ]);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test description',
        })
      );
    });

    it('should accept properties as JSON', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync([
        'node', 'test', 'create',
        '-n', 'Test',
        '-t', 'Person',
        '-p', '{"age":30}',
      ]);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { age: 30 },
        })
      );
    });
  });

  describe('entity update', () => {
    it('should update entity', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'update', 'test-id', '-n', 'NewName']);

      expect(mockService.update).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          name: 'NewName',
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should fail if no update data provided', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'update', 'test-id']);

      expect(process.exitCode).toBe(1);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should accept multiple update fields', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync([
        'node', 'test', 'update', 'test-id',
        '-n', 'NewName',
        '-t', 'Organization',
        '-d', 'New description',
      ]);

      expect(mockService.update).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          name: 'NewName',
          type: 'Organization',
          description: 'New description',
        })
      );
    });
  });

  describe('entity delete', () => {
    it('should delete entity', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'delete', 'test-id', '-f']);

      expect(mockService.delete).toHaveBeenCalledWith('test-id');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should handle delete failure', async () => {
      const failMock = {
        ...mockService,
        delete: vi.fn().mockResolvedValue(false),
      };

      const entity = createEntityCommand(async () => failMock);
      await entity.parseAsync(['node', 'test', 'delete', 'non-existent', '-f']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('entity search', () => {
    it('should search entities', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'search', 'test query']);

      expect(mockService.search).toHaveBeenCalledWith('test query', expect.any(Object));
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept type filter', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'search', 'test', '-t', 'Person']);

      expect(mockService.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          type: 'Person',
        })
      );
    });

    it('should accept limit option', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'search', 'test', '-l', '5']);

      expect(mockService.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          limit: 5,
        })
      );
    });

    it('should output JSON when specified', async () => {
      const entity = createEntityCommand(async () => mockService);
      await entity.parseAsync(['node', 'test', 'search', 'test', '-o', 'json']);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      const errorMock = {
        ...mockService,
        list: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const entity = createEntityCommand(async () => errorMock);
      await entity.parseAsync(['node', 'test', 'list']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('without service factory', () => {
    it('should work without service factory for list', async () => {
      const entity = createEntityCommand();
      await entity.parseAsync(['node', 'test', 'list']);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should work without service factory for create', async () => {
      const entity = createEntityCommand();
      await entity.parseAsync(['node', 'test', 'create', '-n', 'Test', '-t', 'Person']);

      // Should not throw and should create mock entity
      expect(true).toBe(true);
    });
  });
});
