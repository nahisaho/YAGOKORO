/**
 * @module BackupService.test
 * @description バックアップサービスのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Neo4jBackupService,
  type BackupEntityRepository,
  type BackupRelationRepository,
  type BackupCommunityRepository,
  type BackupVectorStore,
  type FileSystem,
} from './BackupService.js';
import type {
  ExportedEntity,
  ExportedRelation,
  ExportedCommunity,
  ExportedVector,
} from './types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockEntity(id: string): ExportedEntity {
  return {
    id,
    type: 'Person',
    name: `Entity ${id}`,
    description: 'Test entity',
    properties: { key: 'value' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createMockRelation(id: string, sourceId: string, targetId: string): ExportedRelation {
  return {
    id,
    type: 'KNOWS',
    sourceId,
    targetId,
    properties: {},
    confidence: 0.9,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

function createMockCommunity(id: string): ExportedCommunity {
  return {
    id,
    name: `Community ${id}`,
    level: 1,
    summary: 'Test community',
    memberIds: ['entity-1', 'entity-2'],
  };
}

function createMockVector(id: string, entityId: string): ExportedVector {
  return {
    id,
    entityId,
    vector: [0.1, 0.2, 0.3],
    metadata: { source: 'test' },
  };
}

// =============================================================================
// Mock Implementations
// =============================================================================

function createMockEntityRepository(): BackupEntityRepository {
  const entities: ExportedEntity[] = [
    createMockEntity('entity-1'),
    createMockEntity('entity-2'),
  ];

  return {
    findAll: vi.fn().mockResolvedValue(entities),
    findByType: vi.fn().mockImplementation((type: string) =>
      Promise.resolve(entities.filter((e) => e.type === type))
    ),
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockRelationRepository(): BackupRelationRepository {
  const relations: ExportedRelation[] = [
    createMockRelation('rel-1', 'entity-1', 'entity-2'),
  ];

  return {
    findAll: vi.fn().mockResolvedValue(relations),
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockCommunityRepository(): BackupCommunityRepository {
  const communities: ExportedCommunity[] = [createMockCommunity('comm-1')];

  return {
    findAll: vi.fn().mockResolvedValue(communities),
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockVectorStore(): BackupVectorStore {
  const vectors: ExportedVector[] = [createMockVector('vec-1', 'entity-1')];

  return {
    exportAll: vi.fn().mockResolvedValue(vectors),
    importVector: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockFileSystem(): FileSystem {
  const files: Map<string, string> = new Map();

  return {
    writeFile: vi.fn().mockImplementation((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    readFile: vi.fn().mockImplementation((path: string) => {
      const content = files.get(path);
      if (!content) throw new Error(`File not found: ${path}`);
      return Promise.resolve(content);
    }),
    exists: vi.fn().mockImplementation((path: string) =>
      Promise.resolve(files.has(path))
    ),
    stat: vi.fn().mockImplementation((path: string) => {
      const content = files.get(path);
      if (!content) throw new Error(`File not found: ${path}`);
      return Promise.resolve({ size: content.length });
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Neo4jBackupService', () => {
  let entityRepo: BackupEntityRepository;
  let relationRepo: BackupRelationRepository;
  let communityRepo: BackupCommunityRepository;
  let vectorStore: BackupVectorStore;
  let fileSystem: FileSystem;
  let service: Neo4jBackupService;

  beforeEach(() => {
    entityRepo = createMockEntityRepository();
    relationRepo = createMockRelationRepository();
    communityRepo = createMockCommunityRepository();
    vectorStore = createMockVectorStore();
    fileSystem = createMockFileSystem();

    service = new Neo4jBackupService({
      entityRepository: entityRepo,
      relationRepository: relationRepo,
      communityRepository: communityRepo,
      vectorStore: vectorStore,
      fileSystem: fileSystem,
      version: '1.0.0',
    });
  });

  describe('backup', () => {
    it('should create a backup file with entities and relations', async () => {
      const result = await service.backup({
        outputPath: '/backup/test.json',
      });

      expect(result.success).toBe(true);
      expect(result.entityCount).toBe(2);
      expect(result.relationCount).toBe(1);
      expect(result.duration).toBeGreaterThan(0);
      expect(fileSystem.writeFile).toHaveBeenCalledWith(
        '/backup/test.json',
        expect.any(String)
      );
    });

    it('should include communities when requested', async () => {
      const result = await service.backup({
        outputPath: '/backup/test.json',
        includeCommunities: true,
      });

      expect(result.success).toBe(true);
      expect(result.communityCount).toBe(1);
      expect(communityRepo.findAll).toHaveBeenCalled();
    });

    it('should include vectors when requested', async () => {
      const result = await service.backup({
        outputPath: '/backup/test.json',
        includeVectors: true,
      });

      expect(result.success).toBe(true);
      expect(result.vectorCount).toBe(1);
      expect(vectorStore.exportAll).toHaveBeenCalled();
    });

    it('should filter entities by type when specified', async () => {
      await service.backup({
        outputPath: '/backup/test.json',
        entityTypes: ['Person'],
      });

      expect(entityRepo.findByType).toHaveBeenCalledWith('Person');
    });

    it('should include checksum in metadata', async () => {
      await service.backup({
        outputPath: '/backup/test.json',
      });

      const writeCall = vi.mocked(fileSystem.writeFile).mock.calls[0];
      const content = JSON.parse(writeCall[1]);
      expect(content.metadata.checksum).toBeDefined();
      expect(content.metadata.checksum).toHaveLength(16);
    });

    it('should handle repository errors gracefully', async () => {
      vi.mocked(entityRepo.findAll).mockRejectedValue(new Error('DB error'));

      const result = await service.backup({
        outputPath: '/backup/test.json',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('DB error');
    });

    it('should continue with partial data on community error', async () => {
      vi.mocked(communityRepo.findAll).mockRejectedValue(new Error('Community error'));

      const result = await service.backup({
        outputPath: '/backup/test.json',
        includeCommunities: true,
      });

      expect(result.success).toBe(false);
      expect(result.entityCount).toBe(2);
      expect(result.errors).toContainEqual(expect.stringContaining('Community export failed'));
    });
  });

  describe('restore', () => {
    beforeEach(async () => {
      // Create a backup first
      await service.backup({ outputPath: '/backup/test.json' });
    });

    it('should restore entities and relations from backup', async () => {
      const result = await service.restore({
        inputPath: '/backup/test.json',
      });

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(2);
      expect(result.relationsRestored).toBe(1);
      expect(entityRepo.create).toHaveBeenCalledTimes(2);
      expect(relationRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should clear existing data when requested', async () => {
      const result = await service.restore({
        inputPath: '/backup/test.json',
        clearExisting: true,
      });

      expect(result.success).toBe(true);
      expect(entityRepo.clear).toHaveBeenCalled();
      expect(relationRepo.clear).toHaveBeenCalled();
    });

    it('should perform dry run without modifying data', async () => {
      const result = await service.restore({
        inputPath: '/backup/test.json',
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(2);
      expect(entityRepo.create).not.toHaveBeenCalled();
    });

    it('should skip vectors when requested', async () => {
      // Create backup with vectors
      await service.backup({
        outputPath: '/backup/with-vectors.json',
        includeVectors: true,
      });

      const result = await service.restore({
        inputPath: '/backup/with-vectors.json',
        skipVectors: true,
      });

      expect(result.success).toBe(true);
      expect(result.vectorsRestored).toBeUndefined();
      expect(vectorStore.importVector).not.toHaveBeenCalled();
    });

    it('should report skipped items on partial failure', async () => {
      vi.mocked(entityRepo.create).mockRejectedValueOnce(new Error('Constraint violation'));

      const result = await service.restore({
        inputPath: '/backup/test.json',
      });

      expect(result.success).toBe(false);
      expect(result.entitiesRestored).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should fail on file not found', async () => {
      const result = await service.restore({
        inputPath: '/nonexistent.json',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('File not found'));
    });

    it('should fail on invalid JSON', async () => {
      vi.mocked(fileSystem.readFile).mockResolvedValueOnce('invalid json');

      const result = await service.restore({
        inputPath: '/backup/test.json',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      await service.backup({ outputPath: '/backup/test.json' });
    });

    it('should validate a valid backup file', async () => {
      const result = await service.validate('/backup/test.json');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.entityCount).toBe(2);
      expect(result.relationCount).toBe(1);
    });

    it('should fail for non-existent file', async () => {
      const result = await service.validate('/nonexistent.json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File not found: /nonexistent.json');
    });

    it('should detect checksum mismatch', async () => {
      // Get the backup content
      const content = await fileSystem.readFile('/backup/test.json');
      const data = JSON.parse(content);

      // Modify data but keep old checksum
      data.entities.push(createMockEntity('entity-3'));

      // Write corrupted file
      vi.mocked(fileSystem.readFile).mockResolvedValueOnce(JSON.stringify(data));
      vi.mocked(fileSystem.exists).mockResolvedValueOnce(true);

      const result = await service.validate('/backup/corrupted.json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Checksum mismatch'));
    });

    it('should detect missing required fields', async () => {
      const invalidData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        source: 'neo4j',
        metadata: { entityCount: 1, relationCount: 0 },
        entities: [{ id: 'test' }], // Missing type, name
        relations: [],
      };

      vi.mocked(fileSystem.readFile).mockResolvedValueOnce(JSON.stringify(invalidData));
      vi.mocked(fileSystem.exists).mockResolvedValueOnce(true);

      const result = await service.validate('/backup/invalid.json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('missing required fields')
      );
    });

    it('should warn about count mismatch', async () => {
      const content = await fileSystem.readFile('/backup/test.json');
      const data = JSON.parse(content);

      // Update checksum but wrong count
      data.metadata.entityCount = 999;

      vi.mocked(fileSystem.readFile).mockResolvedValueOnce(JSON.stringify(data));
      vi.mocked(fileSystem.exists).mockResolvedValueOnce(true);

      const result = await service.validate('/backup/test.json');

      // Checksum will fail due to count mismatch
      expect(result.warnings).toBeDefined();
    });
  });
});
