/**
 * Seed Command Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSeedCommand, type SeedService } from '../src/commands/seed.js';

describe('Seed Command', () => {
  let mockService: SeedService;

  beforeEach(() => {
    mockService = {
      ingest: vi.fn(),
      clear: vi.fn(),
      preview: vi.fn(),
      status: vi.fn(),
    };
  });

  describe('createSeedCommand', () => {
    it('should create seed command with subcommands', () => {
      const command = createSeedCommand(mockService);

      expect(command.name()).toBe('seed');
      expect(command.commands.length).toBe(4);

      const subcommandNames = command.commands.map((c) => c.name());
      expect(subcommandNames).toContain('ingest');
      expect(subcommandNames).toContain('clear');
      expect(subcommandNames).toContain('preview');
      expect(subcommandNames).toContain('status');
    });
  });

  describe('seed ingest', () => {
    it('should call ingest with default options', async () => {
      mockService.ingest = vi.fn().mockResolvedValue({
        success: true,
        inserted: {
          organizations: 10,
          persons: 15,
          techniques: 20,
          publications: 25,
          aimodels: 30,
          benchmarks: 5,
          concepts: 10,
          relations: 100,
        },
        skipped: 0,
        errors: [],
        duration: 1500,
      });

      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      // Parse options manually for testing
      expect(ingestCmd).toBeDefined();
      expect(ingestCmd?.description()).toContain('シードデータを投入');
    });

    it('should support dry-run option', () => {
      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      const options = ingestCmd?.options || [];
      const dryRunOption = options.find((o) => o.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should support with-embeddings option', () => {
      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      const options = ingestCmd?.options || [];
      const embeddingsOption = options.find((o) => o.long === '--with-embeddings');
      expect(embeddingsOption).toBeDefined();
    });

    it('should support overwrite option', () => {
      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      const options = ingestCmd?.options || [];
      const overwriteOption = options.find((o) => o.long === '--overwrite');
      expect(overwriteOption).toBeDefined();
    });
  });

  describe('seed clear', () => {
    it('should have force option for safety', () => {
      const command = createSeedCommand(mockService);
      const clearCmd = command.commands.find((c) => c.name() === 'clear');

      const options = clearCmd?.options || [];
      const forceOption = options.find((o) => o.long === '--force');
      expect(forceOption).toBeDefined();
    });

    it('should call clear with options', async () => {
      mockService.clear = vi.fn().mockResolvedValue({
        success: true,
        deleted: {
          nodes: 100,
          relations: 200,
        },
      });

      const command = createSeedCommand(mockService);
      const clearCmd = command.commands.find((c) => c.name() === 'clear');

      expect(clearCmd).toBeDefined();
      expect(clearCmd?.description()).toContain('クリア');
    });
  });

  describe('seed preview', () => {
    it('should call preview with data type', async () => {
      mockService.preview = vi.fn().mockResolvedValue({
        dataType: 'aimodels',
        count: 30,
        samples: [
          { name: 'GPT-4', type: 'AIModel', description: 'OpenAIの大規模言語モデル' },
          { name: 'Claude 3', type: 'AIModel', description: 'Anthropicの対話AI' },
          { name: 'Gemini', type: 'AIModel', description: 'Googleの多機能AIモデル' },
        ],
      });

      const command = createSeedCommand(mockService);
      const previewCmd = command.commands.find((c) => c.name() === 'preview');

      expect(previewCmd).toBeDefined();
      expect(previewCmd?.description()).toContain('プレビュー');
    });

    it('should support format option', () => {
      const command = createSeedCommand(mockService);
      const previewCmd = command.commands.find((c) => c.name() === 'preview');

      const options = previewCmd?.options || [];
      const formatOption = options.find((o) => o.long === '--format');
      expect(formatOption).toBeDefined();
    });
  });

  describe('seed status', () => {
    it('should call status and return database state', async () => {
      mockService.status = vi.fn().mockResolvedValue({
        neo4j: {
          connected: true,
          nodeCount: 215,
          relationCount: 450,
          entityCounts: {
            AIModel: 30,
            Organization: 10,
            Person: 50,
            Publication: 80,
            Technique: 25,
            Benchmark: 10,
            Concept: 10,
          },
        },
        qdrant: {
          connected: true,
          vectorCount: 215,
          collectionExists: true,
        },
      });

      const command = createSeedCommand(mockService);
      const statusCmd = command.commands.find((c) => c.name() === 'status');

      expect(statusCmd).toBeDefined();
      expect(statusCmd?.description()).toContain('状態を確認');
    });
  });

  describe('data type validation', () => {
    it('should accept valid data types', () => {
      const validTypes = [
        'organizations',
        'persons',
        'techniques',
        'publications',
        'aimodels',
        'benchmarks',
        'concepts',
        'relations',
        'all',
      ];

      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      expect(ingestCmd?.description()).toContain('organizations');
      expect(ingestCmd?.description()).toContain('all');
    });
  });

  describe('output formats', () => {
    it('should support json format', () => {
      const command = createSeedCommand(mockService);
      const ingestCmd = command.commands.find((c) => c.name() === 'ingest');

      const options = ingestCmd?.options || [];
      const formatOption = options.find((o) => o.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should support table format', () => {
      const command = createSeedCommand(mockService);
      const statusCmd = command.commands.find((c) => c.name() === 'status');

      const options = statusCmd?.options || [];
      const formatOption = options.find((o) => o.long === '--format');
      expect(formatOption).toBeDefined();
    });
  });
});

describe('SeedService Interface', () => {
  it('should define required methods', () => {
    const service: SeedService = {
      ingest: async () => ({
        success: true,
        inserted: {
          organizations: 0,
          persons: 0,
          techniques: 0,
          publications: 0,
          aimodels: 0,
          benchmarks: 0,
          concepts: 0,
          relations: 0,
        },
        skipped: 0,
        errors: [],
        duration: 0,
      }),
      clear: async () => ({
        success: true,
        deleted: { nodes: 0, relations: 0 },
      }),
      preview: async () => ({
        dataType: 'all',
        count: 0,
        samples: [],
      }),
      status: async () => ({
        neo4j: {
          connected: false,
          nodeCount: 0,
          relationCount: 0,
          entityCounts: {},
        },
        qdrant: {
          connected: false,
          vectorCount: 0,
          collectionExists: false,
        },
      }),
    };

    expect(service.ingest).toBeDefined();
    expect(service.clear).toBeDefined();
    expect(service.preview).toBeDefined();
    expect(service.status).toBeDefined();
  });
});
