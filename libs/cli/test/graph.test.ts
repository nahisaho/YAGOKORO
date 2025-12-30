import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGraphCommand, type GraphService } from '../src/commands/graph.js';
import type {
  GraphStats,
  QueryResult,
  ValidationResult,
  IngestResult,
} from '../src/utils/types.js';

// Mock console methods
const originalLog = console.log;
const originalExitCode = process.exitCode;

describe('Graph Command', () => {
  let mockService: GraphService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock service
    mockService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        entityCount: 100,
        relationCount: 250,
        communityCount: 10,
        entityTypes: { Person: 50, Organization: 30, Concept: 20 },
        relationTypes: { KNOWS: 100, WORKS_FOR: 80, RELATED_TO: 70 },
        avgRelationsPerEntity: 2.5,
      } as GraphStats),
      query: vi.fn().mockResolvedValue({
        entities: [
          { id: '12345678', name: 'Test Entity', type: 'Person' },
        ],
        relations: [],
        executionTime: 42,
      } as QueryResult),
      validate: vi.fn().mockResolvedValue({
        valid: true,
        errors: [],
        stats: {
          entitiesChecked: 100,
          relationsChecked: 250,
          orphanedEntities: 0,
          danglingRelations: 0,
        },
      } as ValidationResult),
      importData: vi.fn().mockResolvedValue({ imported: 50, skipped: 5 }),
      exportData: vi.fn().mockResolvedValue({ exported: 100 }),
      ingest: vi.fn().mockResolvedValue({
        documentsProcessed: 10,
        entitiesCreated: 50,
        relationsCreated: 100,
        communitiesDetected: 5,
        duration: 5000,
        errors: [],
      } as IngestResult),
      close: vi.fn().mockResolvedValue(undefined),
    };

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('createGraphCommand', () => {
    it('should create graph command with all subcommands', () => {
      const graph = createGraphCommand();

      expect(graph.name()).toBe('graph');
      expect(graph.description()).toBe('Knowledge graph management commands');

      const subcommands = graph.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('init');
      expect(subcommands).toContain('ingest');
      expect(subcommands).toContain('query');
      expect(subcommands).toContain('stats');
      expect(subcommands).toContain('export');
      expect(subcommands).toContain('import');
      expect(subcommands).toContain('validate');
    });

    it('should have global options', () => {
      const graph = createGraphCommand();
      const options = graph.options.map((opt) => opt.long);

      expect(options).toContain('--config');
      expect(options).toContain('--verbose');
    });
  });

  describe('graph init', () => {
    it('should initialize the knowledge graph', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'init']);

      expect(mockService.initialize).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should have --force option', () => {
      const graph = createGraphCommand();
      const initCmd = graph.commands.find((cmd) => cmd.name() === 'init');

      expect(initCmd).toBeDefined();
      const forceOpt = initCmd!.options.find((opt) => opt.long === '--force');
      expect(forceOpt).toBeDefined();
    });
  });

  describe('graph ingest', () => {
    it('should ingest documents from source', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'ingest', '/path/to/docs']);

      expect(mockService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          source: '/path/to/docs',
          format: 'text',
          extractEntities: true,
          extractRelations: true,
          detectCommunities: true,
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept format option', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'ingest', '/docs', '-f', 'markdown']);

      expect(mockService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'markdown',
        })
      );
    });

    it('should accept chunk size options', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync([
        'node', 'test', 'ingest', '/docs',
        '--chunk-size', '500',
        '--chunk-overlap', '100',
      ]);

      expect(mockService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkSize: 500,
          chunkOverlap: 100,
        })
      );
    });

    it('should allow disabling entity extraction', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'ingest', '/docs', '--no-entities']);

      expect(mockService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          extractEntities: false,
        })
      );
    });
  });

  describe('graph query', () => {
    it('should execute cypher query', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'query', 'MATCH (n) RETURN n LIMIT 10']);

      expect(mockService.query).toHaveBeenCalledWith('MATCH (n) RETURN n LIMIT 10');
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should output JSON when specified', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'query', 'MATCH (n) RETURN n', '-o', 'json']);

      expect(consoleSpy).toHaveBeenCalled();
      // JSON output should include the result
      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"entities"')
      );
      expect(jsonCall).toBeDefined();
    });

    it('should accept limit option', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'query', 'MATCH (n) RETURN n', '-l', '5']);

      expect(mockService.query).toHaveBeenCalled();
    });
  });

  describe('graph stats', () => {
    it('should display statistics', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'stats']);

      expect(mockService.getStats).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should output JSON when specified', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'stats', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"entityCount"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('graph export', () => {
    it('should export data to file', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'export', '/output/graph.json']);

      expect(mockService.exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'json',
          outputPath: '/output/graph.json',
          includeProperties: true,
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept format option', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'export', '/output/graph.csv', '-f', 'csv']);

      expect(mockService.exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
        })
      );
    });

    it('should accept entity type filter', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync([
        'node', 'test', 'export', '/output/graph.json',
        '--entity-types', 'Person,Organization',
      ]);

      expect(mockService.exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          entityTypes: ['Person', 'Organization'],
        })
      );
    });

    it('should allow excluding properties', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'export', '/output/graph.json', '--no-properties']);

      expect(mockService.exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          includeProperties: false,
        })
      );
    });
  });

  describe('graph import', () => {
    it('should import data from file', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'import', '/input/graph.json']);

      expect(mockService.importData).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'json',
          filePath: '/input/graph.json',
        })
      );
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should accept merge option', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'import', '/input/graph.json', '--merge']);

      expect(mockService.importData).toHaveBeenCalledWith(
        expect.objectContaining({
          merge: true,
        })
      );
    });

    it('should accept dry-run option', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'import', '/input/graph.json', '--dry-run']);

      expect(mockService.importData).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
        })
      );
    });
  });

  describe('graph validate', () => {
    it('should validate the knowledge graph', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'validate']);

      expect(mockService.validate).toHaveBeenCalled();
      expect(mockService.close).toHaveBeenCalled();
    });

    it('should output JSON when specified', async () => {
      const graph = createGraphCommand(async () => mockService);
      await graph.parseAsync(['node', 'test', 'validate', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"valid"')
      );
      expect(jsonCall).toBeDefined();
    });

    it('should set exit code on invalid graph', async () => {
      const invalidMock = {
        ...mockService,
        validate: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ type: 'error', message: 'Orphaned entity found' }],
          stats: {
            entitiesChecked: 100,
            relationsChecked: 250,
            orphanedEntities: 5,
            danglingRelations: 3,
          },
        } as ValidationResult),
      };

      const graph = createGraphCommand(async () => invalidMock);
      await graph.parseAsync(['node', 'test', 'validate']);

      expect(process.exitCode).toBe(1);
    });

    it('should have --fix option', () => {
      const graph = createGraphCommand();
      const validateCmd = graph.commands.find((cmd) => cmd.name() === 'validate');

      expect(validateCmd).toBeDefined();
      const fixOpt = validateCmd!.options.find((opt) => opt.long === '--fix');
      expect(fixOpt).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const errorMock = {
        ...mockService,
        initialize: vi.fn().mockRejectedValue(new Error('Connection failed')),
      };

      const graph = createGraphCommand(async () => errorMock);
      await graph.parseAsync(['node', 'test', 'init']);

      expect(process.exitCode).toBe(1);
    });

    it('should handle query errors', async () => {
      const errorMock = {
        ...mockService,
        query: vi.fn().mockRejectedValue(new Error('Invalid Cypher syntax')),
      };

      const graph = createGraphCommand(async () => errorMock);
      await graph.parseAsync(['node', 'test', 'query', 'INVALID QUERY']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('without service factory', () => {
    it('should work without service factory for stats', async () => {
      const graph = createGraphCommand();
      await graph.parseAsync(['node', 'test', 'stats']);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should work without service factory for init', async () => {
      const graph = createGraphCommand();
      await graph.parseAsync(['node', 'test', 'init']);

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
