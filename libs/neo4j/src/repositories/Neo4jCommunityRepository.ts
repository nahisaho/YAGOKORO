import type {
  CommunityFilter,
  CommunityHierarchy,
  CommunityRepository,
} from '@yagokoro/domain';
import { Community, EntityId } from '@yagokoro/domain';
import type { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { CypherQueryBuilder } from '../queries/CypherQueryBuilder.js';

/**
 * Neo4j Community Repository Implementation
 *
 * Implements the CommunityRepository port for Neo4j graph database.
 * Manages community entities and their hierarchical relationships.
 */
export class Neo4jCommunityRepository implements CommunityRepository {
  constructor(private readonly connection: Neo4jConnection) {}

  async save(community: Community): Promise<void> {
    const json = community.toJSON();

    const query = new CypherQueryBuilder()
      .merge('(n:Community {id: $id})')
      .onCreateSet('n = $props')
      .onMatchSet('n += $props')
      .param('id', json.id)
      .param('props', json)
      .return('n')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  async saveMany(communities: Community[]): Promise<void> {
    if (communities.length === 0) return;

    const items = communities.map((c) => c.toJSON());

    const query = new CypherQueryBuilder()
      .unwind('$items AS item')
      .merge('(n:Community {id: item.id})')
      .onCreateSet('n = item')
      .onMatchSet('n += item')
      .param('items', items)
      .return('count(n) as saved')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  async findById(id: EntityId): Promise<Community | null> {
    const query = new CypherQueryBuilder()
      .match('(n:Community)')
      .where('n.id = $id')
      .param('id', id.value)
      .return('n')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;

    const firstResult = results[0];
    if (!firstResult) return null;

    return this.mapToCommunity(firstResult.n.properties);
  }

  async findByStringId(id: string): Promise<Community | null> {
    const query = new CypherQueryBuilder()
      .match('(n:Community)')
      .where('n.id = $id')
      .param('id', id)
      .return('n')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;

    const firstResult = results[0];
    if (!firstResult) return null;

    return this.mapToCommunity(firstResult.n.properties);
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Community[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const query = new CypherQueryBuilder()
      .match('(n:Community)')
      .return('n')
      .orderBy('n.level, n.name')
      .skip(offset)
      .limit(limit)
      .build();

    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToCommunity(r.n.properties)).filter((c): c is Community => c !== null);
  }

  async findByFilter(filter: CommunityFilter): Promise<Community[]> {
    const builder = new CypherQueryBuilder().match('(n:Community)');

    const conditions: string[] = [];

    if (filter.level !== undefined) {
      conditions.push('n.level = $level');
      builder.param('level', filter.level);
    }

    if (filter.minMemberCount !== undefined) {
      conditions.push('n.memberCount >= $minMemberCount');
      builder.param('minMemberCount', filter.minMemberCount);
    }

    if (filter.nameContains) {
      conditions.push('toLower(n.name) CONTAINS toLower($nameContains)');
      builder.param('nameContains', filter.nameContains);
    }

    if (conditions.length > 0) {
      builder.where(conditions.join(' AND '));
    }

    builder.return('n').orderBy('n.level, n.name');

    if (filter.offset !== undefined) {
      builder.skip(filter.offset);
    }

    if (filter.limit !== undefined) {
      builder.limit(filter.limit);
    }

    const query = builder.build();
    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToCommunity(r.n.properties)).filter((c): c is Community => c !== null);
  }

  async findByLevel(level: number, limit?: number): Promise<Community[]> {
    const filter: CommunityFilter = { level };
    if (limit !== undefined) {
      filter.limit = limit;
    }
    return this.findByFilter(filter);
  }

  async getHierarchy(rootLevel = 0): Promise<CommunityHierarchy[]> {
    // Get root level communities
    const roots = await this.findByLevel(rootLevel);

    const buildHierarchy = async (community: Community): Promise<CommunityHierarchy> => {
      const children = await this.getChildren(community.id);
      const childHierarchies = await Promise.all(children.map(buildHierarchy));
      return {
        community,
        children: childHierarchies,
      };
    };

    return Promise.all(roots.map(buildHierarchy));
  }

  private async getChildren(parentId: EntityId): Promise<Community[]> {
    const query = new CypherQueryBuilder()
      .match('(parent:Community)-[:PARENT_OF]->(n:Community)')
      .where('parent.id = $parentId')
      .param('parentId', parentId.value)
      .return('n')
      .orderBy('n.name')
      .build();

    const results = await this.connection.executeRead<{
      n: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToCommunity(r.n.properties)).filter((c): c is Community => c !== null);
  }

  async findByEntityId(entityId: EntityId): Promise<Community[]> {
    const query = new CypherQueryBuilder()
      .match('(e)-[:BELONGS_TO]->(c:Community)')
      .where('e.id = $entityId')
      .param('entityId', entityId.value)
      .return('c')
      .orderBy('c.level')
      .build();

    const results = await this.connection.executeRead<{
      c: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToCommunity(r.c.properties)).filter((c): c is Community => c !== null);
  }

  async addMember(communityId: EntityId, entityId: EntityId): Promise<void> {
    const query = `
      MATCH (c:Community {id: $communityId})
      MATCH (e {id: $entityId})
      MERGE (e)-[:BELONGS_TO]->(c)
    `;

    await this.connection.executeWrite(query, {
      communityId: communityId.value,
      entityId: entityId.value,
    });
  }

  async removeMember(communityId: EntityId, entityId: EntityId): Promise<void> {
    const query = `
      MATCH (e {id: $entityId})-[r:BELONGS_TO]->(c:Community {id: $communityId})
      DELETE r
    `;

    await this.connection.executeWrite(query, {
      communityId: communityId.value,
      entityId: entityId.value,
    });
  }

  async getMemberIds(communityId: EntityId): Promise<EntityId[]> {
    const query = `
      MATCH (e)-[:BELONGS_TO]->(c:Community {id: $communityId})
      RETURN e.id as id
    `;

    const results = await this.connection.executeRead<{ id: string }>(query, {
      communityId: communityId.value,
    });

    return results.map((r) => EntityId.fromString(r.id));
  }

  async setParent(childId: EntityId, parentId: EntityId): Promise<void> {
    const query = `
      MATCH (child:Community {id: $childId})
      MATCH (parent:Community {id: $parentId})
      MERGE (parent)-[:PARENT_OF]->(child)
    `;

    await this.connection.executeWrite(query, {
      childId: childId.value,
      parentId: parentId.value,
    });
  }

  async delete(id: EntityId): Promise<boolean> {
    const query = `
      MATCH (n:Community {id: $id})
      DETACH DELETE n
      RETURN count(n) as deleted
    `;

    const results = await this.connection.executeWrite<{ deleted: number }>(query, {
      id: id.value,
    });

    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined && firstResult.deleted > 0;
  }

  async deleteAll(): Promise<number> {
    const query = `
      MATCH (n:Community)
      DETACH DELETE n
      RETURN count(n) as deleted
    `;

    const results = await this.connection.executeWrite<{ deleted: number }>(query, {});
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined ? firstResult.deleted : 0;
  }

  async exists(id: EntityId): Promise<boolean> {
    const query = new CypherQueryBuilder()
      .match('(n:Community)')
      .where('n.id = $id')
      .param('id', id.value)
      .return('true as exists')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{ exists: boolean }>(
      query.text,
      query.params
    );
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined && firstResult.exists;
  }

  async count(level?: number): Promise<number> {
    const builder = new CypherQueryBuilder().match('(n:Community)');

    if (level !== undefined) {
      builder.where('n.level = $level').param('level', level);
    }

    builder.return('count(n) as count');

    const query = builder.build();
    const results = await this.connection.executeRead<{ count: number }>(query.text, query.params);
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined ? firstResult.count : 0;
  }

  async updateSummary(id: EntityId, summary: string): Promise<void> {
    const query = `
      MATCH (n:Community {id: $id})
      SET n.summary = $summary
    `;

    await this.connection.executeWrite(query, {
      id: id.value,
      summary,
    });
  }

  /**
   * Map Neo4j record to Community domain entity
   */
  private mapToCommunity(props: Record<string, unknown>): Community | null {
    try {
      const id = EntityId.fromString(props.id as string);
      const communityProps: {
        name: string;
        level: number;
        summary?: string;
        memberCount?: number;
        keyEntities?: string[];
        embedding?: number[];
      } = {
        name: props.name as string,
        level: props.level as number,
      };
      if (props.summary !== undefined) {
        communityProps.summary = props.summary as string;
      }
      if (props.memberCount !== undefined) {
        communityProps.memberCount = props.memberCount as number;
      }
      if (props.keyEntities !== undefined) {
        communityProps.keyEntities = props.keyEntities as string[];
      }
      if (props.embedding !== undefined) {
        communityProps.embedding = props.embedding as number[];
      }
      return Community.restore(id, communityProps);
    } catch {
      return null;
    }
  }
}
