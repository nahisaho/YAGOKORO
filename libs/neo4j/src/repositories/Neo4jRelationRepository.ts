import type {
  CreateRelationInput,
  GraphEdge,
  GraphPath,
  Relation,
  RelationRepository,
  RelationType,
  TraversalOptions,
} from '@yagokoro/domain';
import { v4 as uuidv4 } from 'uuid';
import type { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { CypherQueryBuilder } from '../queries/CypherQueryBuilder.js';

/**
 * Neo4j Relation Repository Implementation
 *
 * Implements the RelationRepository port for Neo4j graph database.
 */
export class Neo4jRelationRepository implements RelationRepository {
  constructor(private readonly connection: Neo4jConnection) {}

  async create(input: CreateRelationInput): Promise<Relation> {
    const id = `rel_${uuidv4()}`;
    const now = new Date();

    const query = new CypherQueryBuilder()
      .match('(source {id: $sourceId})')
      .match('(target {id: $targetId})')
      .create(`(source)-[r:${input.type} $props]->(target)`)
      .param('sourceId', input.sourceId)
      .param('targetId', input.targetId)
      .param('props', {
        id,
        confidence: input.confidence ?? 1.0,
        ...input.properties,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .return('r, $sourceId as sourceId, $targetId as targetId')
      .build();

    const results = await this.connection.executeWrite<{
      r: { type: string; properties: Record<string, unknown> };
      sourceId: string;
      targetId: string;
    }>(query.text, query.params);

    if (results.length === 0) {
      throw new Error('Failed to create relation: source or target not found');
    }

    const record = results[0];
    if (!record) {
      throw new Error('Failed to create relation: no result returned');
    }
    return this.mapToRelation(record.r, record.sourceId, record.targetId);
  }

  async createMany(inputs: CreateRelationInput[]): Promise<Relation[]> {
    const relations: Relation[] = [];
    for (const input of inputs) {
      relations.push(await this.create(input));
    }
    return relations;
  }

  async findById(id: string): Promise<Relation | null> {
    const query = new CypherQueryBuilder()
      .match('(source)-[r {id: $id}]->(target)')
      .param('id', id)
      .return('r, source.id as sourceId, target.id as targetId')
      .build();

    const results = await this.connection.executeRead<{
      r: { type: string; properties: Record<string, unknown> };
      sourceId: string;
      targetId: string;
    }>(query.text, query.params);

    if (results.length === 0) return null;

    const record = results[0];
    if (!record) return null;
    return this.mapToRelation(record.r, record.sourceId, record.targetId);
  }

  async findBySource(sourceId: string, types?: RelationType[]): Promise<Relation[]> {
    const builder = new CypherQueryBuilder()
      .match('(source {id: $sourceId})-[r]->(target)')
      .param('sourceId', sourceId);

    if (types && types.length > 0) {
      builder.where('type(r) IN $types').param('types', types);
    }

    builder.return('r, source.id as sourceId, target.id as targetId');

    const query = builder.build();
    const results = await this.connection.executeRead<{
      r: { type: string; properties: Record<string, unknown> };
      sourceId: string;
      targetId: string;
    }>(query.text, query.params);

    return results.map((record) => this.mapToRelation(record.r, record.sourceId, record.targetId));
  }

  async findByTarget(targetId: string, types?: RelationType[]): Promise<Relation[]> {
    const builder = new CypherQueryBuilder()
      .match('(source)-[r]->(target {id: $targetId})')
      .param('targetId', targetId);

    if (types && types.length > 0) {
      builder.where('type(r) IN $types').param('types', types);
    }

    builder.return('r, source.id as sourceId, target.id as targetId');

    const query = builder.build();
    const results = await this.connection.executeRead<{
      r: { type: string; properties: Record<string, unknown> };
      sourceId: string;
      targetId: string;
    }>(query.text, query.params);

    return results.map((record) => this.mapToRelation(record.r, record.sourceId, record.targetId));
  }

  async findBetween(sourceId: string, targetId: string): Promise<Relation[]> {
    const query = new CypherQueryBuilder()
      .match('(source {id: $sourceId})-[r]->(target {id: $targetId})')
      .param('sourceId', sourceId)
      .param('targetId', targetId)
      .return('r, source.id as sourceId, target.id as targetId')
      .build();

    const results = await this.connection.executeRead<{
      r: { type: string; properties: Record<string, unknown> };
      sourceId: string;
      targetId: string;
    }>(query.text, query.params);

    return results.map((record) => this.mapToRelation(record.r, record.sourceId, record.targetId));
  }

  async getNeighbors(entityId: string, options?: TraversalOptions): Promise<string[]> {
    let pattern: string;
    if (options?.direction === 'outgoing') {
      pattern = '(n {id: $entityId})-[r]->(neighbor)';
    } else if (options?.direction === 'incoming') {
      pattern = '(neighbor)-[r]->(n {id: $entityId})';
    } else {
      pattern = '(n {id: $entityId})-[r]-(neighbor)';
    }

    const builder = new CypherQueryBuilder().match(pattern).param('entityId', entityId);

    if (options?.relationTypes && options.relationTypes.length > 0) {
      builder.where('type(r) IN $types').param('types', options.relationTypes);
    }

    builder.return('DISTINCT neighbor.id as neighborId');

    if (options?.limit) {
      builder.limit(options.limit);
    }

    const query = builder.build();
    const results = await this.connection.executeRead<{ neighborId: string }>(
      query.text,
      query.params
    );

    return results.map((r) => r.neighborId);
  }

  async findShortestPath(
    sourceId: string,
    targetId: string,
    options?: TraversalOptions
  ): Promise<GraphPath | null> {
    const maxDepth = options?.maxDepth ?? 10;

    let pathPattern: string;
    if (options?.relationTypes && options.relationTypes.length > 0) {
      const types = options.relationTypes.join('|');
      pathPattern = `shortestPath((source)-[:${types}*..${maxDepth}]-(target))`;
    } else {
      pathPattern = `shortestPath((source)-[*..${maxDepth}]-(target))`;
    }

    const query = new CypherQueryBuilder()
      .match('(source {id: $sourceId}), (target {id: $targetId})')
      .param('sourceId', sourceId)
      .param('targetId', targetId)
      .raw(`WITH source, target MATCH path = ${pathPattern}`)
      .return('path')
      .build();

    const results = await this.connection.executeRead<{
      path: {
        segments: Array<{
          start: { properties: { id: string } };
          end: { properties: { id: string } };
          relationship: { type: string; properties: Record<string, unknown> };
        }>;
      };
    }>(query.text, query.params);

    if (results.length === 0) return null;

    const firstResult = results[0];
    if (!firstResult) return null;
    const pathData = firstResult.path;
    const nodes: string[] = [];
    const edges: GraphEdge[] = [];
    let totalWeight = 0;

    for (const segment of pathData.segments) {
      if (nodes.length === 0) {
        nodes.push(segment.start.properties.id);
      }
      nodes.push(segment.end.properties.id);

      const confidence = (segment.relationship.properties.confidence as number) ?? 1.0;
      edges.push({
        id: segment.relationship.properties.id as string,
        type: segment.relationship.type as RelationType,
        sourceId: segment.start.properties.id,
        targetId: segment.end.properties.id,
        weight: confidence,
        properties: segment.relationship.properties,
      });
      totalWeight += 1 - confidence; // Lower confidence = higher cost
    }

    return { nodes, edges, totalWeight };
  }

  async findAllPaths(sourceId: string, targetId: string, maxDepth: number): Promise<GraphPath[]> {
    const query = new CypherQueryBuilder()
      .match('(source {id: $sourceId}), (target {id: $targetId})')
      .param('sourceId', sourceId)
      .param('targetId', targetId)
      .raw(`MATCH path = (source)-[*..${maxDepth}]-(target)`)
      .return('path')
      .limit(100) // Safety limit
      .build();

    const results = await this.connection.executeRead<{
      path: {
        segments: Array<{
          start: { properties: { id: string } };
          end: { properties: { id: string } };
          relationship: { type: string; properties: Record<string, unknown> };
        }>;
      };
    }>(query.text, query.params);

    return results.map((result) => {
      const pathData = result.path;
      const nodes: string[] = [];
      const edges: GraphEdge[] = [];
      let totalWeight = 0;

      for (const segment of pathData.segments) {
        if (nodes.length === 0) {
          nodes.push(segment.start.properties.id);
        }
        nodes.push(segment.end.properties.id);

        const confidence = (segment.relationship.properties.confidence as number) ?? 1.0;
        edges.push({
          id: segment.relationship.properties.id as string,
          type: segment.relationship.type as RelationType,
          sourceId: segment.start.properties.id,
          targetId: segment.end.properties.id,
          weight: confidence,
          properties: segment.relationship.properties,
        });
        totalWeight += 1 - confidence;
      }

      return { nodes, edges, totalWeight };
    });
  }

  async delete(id: string): Promise<boolean> {
    const query = new CypherQueryBuilder()
      .match('()-[r {id: $id}]-()')
      .param('id', id)
      .delete('r')
      .raw('RETURN count(*) as deleted')
      .build();

    const results = await this.connection.executeWrite<{ deleted: number }>(
      query.text,
      query.params
    );
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined && firstResult.deleted > 0;
  }

  async deleteByEntity(entityId: string): Promise<number> {
    const query = new CypherQueryBuilder()
      .match('(n {id: $entityId})-[r]-()')
      .param('entityId', entityId)
      .delete('r')
      .raw('RETURN count(r) as deleted')
      .build();

    const results = await this.connection.executeWrite<{ deleted: number }>(
      query.text,
      query.params
    );
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined ? firstResult.deleted : 0;
  }

  async countByType(type?: RelationType): Promise<number> {
    let query: { text: string; params: Record<string, unknown> };

    if (type) {
      query = new CypherQueryBuilder()
        .match(`()-[r:${type}]->()`)
        .return('count(r) as count')
        .build();
    } else {
      query = new CypherQueryBuilder().match('()-[r]->()').return('count(r) as count').build();
    }

    const results = await this.connection.executeRead<{ count: number }>(query.text, query.params);
    const firstResult = results[0];
    return results.length > 0 && firstResult !== undefined ? firstResult.count : 0;
  }

  /**
   * Map Neo4j relationship to domain Relation
   */

  private mapToRelation(
    r: { type: string; properties: Record<string, unknown> },
    sourceId: string,
    targetId: string
  ): Relation {
    const props = r.properties;
    return {
      id: props.id as string,
      type: r.type as RelationType,
      sourceId,
      targetId,
      confidence: (props.confidence as number) ?? 1.0,
      properties: props,
      createdAt: new Date(props.createdAt as string),
      updatedAt: new Date(props.updatedAt as string),
    };
  }
}
