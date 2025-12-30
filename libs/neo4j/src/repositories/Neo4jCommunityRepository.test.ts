import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Community, EntityId } from '@yagokoro/domain';
import { Neo4jCommunityRepository } from './Neo4jCommunityRepository.js';
import { Neo4jConnection } from '../connection/Neo4jConnection.js';

// Mock Neo4jConnection
vi.mock('../connection/Neo4jConnection.js', () => ({
  Neo4jConnection: vi.fn().mockImplementation(() => ({
    executeWrite: vi.fn(),
    executeRead: vi.fn(),
  })),
}));

// Helper to create valid EntityId strings
const createValidId = (prefix: string) => `${prefix}_12345678-1234-1234-1234-123456789abc`;

describe('Neo4jCommunityRepository', () => {
  let connection: Neo4jConnection;
  let repository: Neo4jCommunityRepository;

  beforeEach(() => {
    connection = new Neo4jConnection({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    });
    repository = new Neo4jCommunityRepository(connection);
  });

  describe('save', () => {
    it('should save a community to Neo4j', async () => {
      const community = Community.create({
        name: 'LLM Research Community',
        summary: 'A community focused on LLM research',
        level: 0,
        memberCount: 10,
        keyEntities: ['entity-1', 'entity-2'],
      });

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.save(community);

      expect(connection.executeWrite).toHaveBeenCalled();
      const [query, params] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('MERGE');
      expect(query).toContain('Community');
      expect(params.id).toBe(community.id.value);
    });
  });

  describe('saveMany', () => {
    it('should save multiple communities in batch', async () => {
      const communities = [
        Community.create({ name: 'Community 1', level: 0 }),
        Community.create({ name: 'Community 2', level: 0 }),
        Community.create({ name: 'Community 3', level: 1 }),
      ];

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ saved: 3 }]);

      await repository.saveMany(communities);

      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
      const [query, params] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('UNWIND');
      expect(params.items).toHaveLength(3);
    });

    it('should do nothing when empty array provided', async () => {
      await repository.saveMany([]);
      expect(connection.executeWrite).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find a community by EntityId', async () => {
      const validId = createValidId('comm');
      const mockRecord = {
        n: {
          properties: {
            id: validId,
            name: 'Test Community',
            level: 1,
            summary: 'A test community',
            memberCount: 5,
          },
        },
      };

      vi.mocked(connection.executeRead).mockResolvedValueOnce([mockRecord]);

      const id = EntityId.fromString(validId);
      const result = await repository.findById(id);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Community');
      expect(result?.level).toBe(1);
    });

    it('should return null when community not found', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([]);

      const id = EntityId.fromString(createValidId('comm'));
      const result = await repository.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('findByStringId', () => {
    it('should find a community by string ID', async () => {
      const idString = createValidId('comm');
      const mockRecord = {
        n: {
          properties: {
            id: idString,
            name: 'Test Community',
            level: 0,
          },
        },
      };

      vi.mocked(connection.executeRead).mockResolvedValueOnce([mockRecord]);

      const result = await repository.findByStringId(idString);

      expect(result).not.toBeNull();
      expect(result?.id.value).toBe(idString);
    });
  });

  describe('findAll', () => {
    it('should return all communities with default limit', async () => {
      const mockRecords = [
        { n: { properties: { id: createValidId('comm'), name: 'Community 1', level: 0 } } },
        { n: { properties: { id: createValidId('comm'), name: 'Community 2', level: 1 } } },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const results = await repository.findAll();

      expect(results).toHaveLength(2);
      expect(connection.executeRead).toHaveBeenCalledTimes(1);
    });

    it('should respect limit option', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([
        { n: { properties: { id: createValidId('comm'), name: 'Community 1', level: 0 } } },
      ]);

      await repository.findAll({ limit: 1 });

      const [query] = vi.mocked(connection.executeRead).mock.calls[0];
      expect(query).toContain('LIMIT');
    });
  });

  describe('findByFilter', () => {
    it('should filter by level', async () => {
      const mockRecords = [
        { n: { properties: { id: createValidId('comm'), name: 'Community 1', level: 2 } } },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const results = await repository.findByFilter({ level: 2 });

      expect(results).toHaveLength(1);
      const [query, params] = vi.mocked(connection.executeRead).mock.calls[0];
      expect(query).toContain('n.level = $level');
      expect(params.level).toBe(2);
    });

    it('should filter by name contains', async () => {
      const mockRecords = [
        { n: { properties: { id: createValidId('comm'), name: 'LLM Research', level: 0 } } },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const results = await repository.findByFilter({ nameContains: 'LLM' });

      expect(results).toHaveLength(1);
      const [query] = vi.mocked(connection.executeRead).mock.calls[0];
      expect(query).toContain('CONTAINS');
    });

    it('should filter by minimum member count', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([]);

      await repository.findByFilter({ minMemberCount: 5 });

      const [query, params] = vi.mocked(connection.executeRead).mock.calls[0];
      expect(query).toContain('n.memberCount >= $minMemberCount');
      expect(params.minMemberCount).toBe(5);
    });
  });

  describe('findByLevel', () => {
    it('should find communities at specific level', async () => {
      const mockRecords = [
        { n: { properties: { id: createValidId('comm'), name: 'Level 0 Community', level: 0 } } },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const results = await repository.findByLevel(0);

      expect(results).toHaveLength(1);
      expect(results[0].level).toBe(0);
    });
  });

  describe('addMember', () => {
    it('should create BELONGS_TO relationship', async () => {
      const communityId = EntityId.fromString(createValidId('comm'));
      const entityId = EntityId.fromString(createValidId('model'));

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.addMember(communityId, entityId);

      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
      const [query] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('BELONGS_TO');
    });
  });

  describe('removeMember', () => {
    it('should delete BELONGS_TO relationship', async () => {
      const communityId = EntityId.fromString(createValidId('comm'));
      const entityId = EntityId.fromString(createValidId('model'));

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.removeMember(communityId, entityId);

      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
      const [query] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('DELETE');
      expect(query).toContain('BELONGS_TO');
    });
  });

  describe('getMemberIds', () => {
    it('should return member entity IDs', async () => {
      const mockResults = [
        { id: createValidId('model') },
        { id: createValidId('org') },
        { id: createValidId('tech') },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockResults);

      const communityId = EntityId.fromString(createValidId('comm'));
      const results = await repository.getMemberIds(communityId);

      expect(results).toHaveLength(3);
    });
  });

  describe('setParent', () => {
    it('should create PARENT_OF relationship', async () => {
      const childId = EntityId.fromString(createValidId('comm'));
      const parentId = EntityId.fromString(createValidId('comm'));

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.setParent(childId, parentId);

      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
      const [query] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('PARENT_OF');
    });
  });

  describe('delete', () => {
    it('should delete a community and return true', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 1 }]);

      const id = EntityId.fromString(createValidId('comm'));
      const result = await repository.delete(id);

      expect(result).toBe(true);
      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
    });

    it('should return false when community not found', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 0 }]);

      const id = EntityId.fromString(createValidId('comm'));
      const result = await repository.delete(id);

      expect(result).toBe(false);
    });
  });

  describe('deleteAll', () => {
    it('should delete all communities and return count', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 10 }]);

      const result = await repository.deleteAll();

      expect(result).toBe(10);
      const [query] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('DETACH DELETE');
    });
  });

  describe('exists', () => {
    it('should return true when community exists', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([{ exists: true }]);

      const id = EntityId.fromString(createValidId('comm'));
      const result = await repository.exists(id);

      expect(result).toBe(true);
    });

    it('should return false when community does not exist', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([]);

      const id = EntityId.fromString(createValidId('comm'));
      const result = await repository.exists(id);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all communities', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([{ count: 25 }]);

      const result = await repository.count();

      expect(result).toBe(25);
    });

    it('should count communities at specific level', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([{ count: 10 }]);

      const result = await repository.count(1);

      expect(result).toBe(10);
      const [query, params] = vi.mocked(connection.executeRead).mock.calls[0];
      expect(query).toContain('n.level = $level');
      expect(params.level).toBe(1);
    });
  });

  describe('updateSummary', () => {
    it('should update community summary', async () => {
      const id = EntityId.fromString(createValidId('comm'));
      const newSummary = 'Updated summary for the community';

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.updateSummary(id, newSummary);

      expect(connection.executeWrite).toHaveBeenCalledTimes(1);
      const [query, params] = vi.mocked(connection.executeWrite).mock.calls[0];
      expect(query).toContain('SET n.summary = $summary');
      expect(params.summary).toBe(newSummary);
    });
  });

  describe('getHierarchy', () => {
    it('should return community hierarchy starting from root level', async () => {
      // Mock root communities query (findByLevel)
      vi.mocked(connection.executeRead)
        .mockResolvedValueOnce([
          { n: { properties: { id: createValidId('comm'), name: 'Root 1', level: 0 } } },
        ])
        // Mock getChildren query (first root has no children)
        .mockResolvedValueOnce([]);

      const hierarchy = await repository.getHierarchy(0);

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].community.name).toBe('Root 1');
    });
  });

  describe('findByEntityId', () => {
    it('should find communities containing an entity', async () => {
      const mockRecords = [
        { c: { properties: { id: createValidId('comm'), name: 'AI Models Community', level: 0 } } },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const entityId = EntityId.fromString(createValidId('model'));
      const results = await repository.findByEntityId(entityId);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('AI Models Community');
    });
  });
});
