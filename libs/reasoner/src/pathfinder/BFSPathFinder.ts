/**
 * BFS Path Finder
 *
 * Breadth-first search based path finding in Neo4j knowledge graph.
 * Supports weighted traversal and batch operations.
 */

import type {
  PathQuery,
  PathResult,
  Path,
  PathNode,
  PathRelation,
  PathStatistics,
  WeightedPath,
  WeightedPathResult,
  BatchPathOptions,
  BatchPathResult,
  BatchPathError,
  Neo4jConnection,
  Neo4jRecord,
  PathFinderStrategy,
  EntityType,
} from '../types.js';
import { CycleDetector } from './CycleDetector.js';

/**
 * BFS-based path finder for Neo4j knowledge graph
 */
export class BFSPathFinder implements PathFinderStrategy {
  private neo4jConnection: Neo4jConnection;
  private cycleDetector: CycleDetector;

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
    this.cycleDetector = new CycleDetector();
  }

  /**
   * Find paths between entities using BFS
   */
  async findPaths(query: PathQuery): Promise<PathResult> {
    const startTime = Date.now();

    // Build Cypher query
    const cypher = this.buildCypherQuery(query);
    const params = this.buildParams(query);

    const result = await this.neo4jConnection.run(cypher, params);

    const paths = this.processPaths(result.records);
    const filteredPaths = this.cycleDetector.filterCyclicPaths(paths);

    return {
      paths: filteredPaths,
      statistics: this.calculateStatistics(filteredPaths),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Find weighted paths considering relation confidence
   * FR-002-03: Weighted Traversal
   */
  async findWeightedPaths(
    query: PathQuery,
    weightFunction?: (relation: PathRelation) => number
  ): Promise<WeightedPathResult> {
    const startTime = Date.now();

    const cypher = this.buildWeightedCypherQuery(query);
    const params = this.buildParams(query);

    const result = await this.neo4jConnection.run(cypher, params);

    const defaultWeightFn = (rel: PathRelation) =>
      (rel.properties?.confidence as number) ?? 0.5;
    const weightFn = weightFunction ?? defaultWeightFn;

    const paths = this.processWeightedPaths(result.records, weightFn);
    const filteredPaths = this.cycleDetector.filterCyclicPaths(paths) as WeightedPath[];

    // Sort by total weight (descending)
    const sortedPaths = filteredPaths.sort((a, b) => b.totalWeight - a.totalWeight);

    return {
      paths: sortedPaths,
      statistics: this.calculateStatistics(sortedPaths),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Batch path finding for multiple entity pairs
   * FR-002-05: Batch Path Search
   */
  async batchFindPaths(
    pairs: Array<{ source: string; target: string }>,
    options: BatchPathOptions = {}
  ): Promise<BatchPathResult> {
    const startTime = Date.now();
    const maxConcurrency = options.maxConcurrency ?? 5;
    const maxHops = options.maxHops ?? 4;

    const results = new Map<string, PathResult>();
    const errors: BatchPathError[] = [];

    // Process in chunks to limit concurrency
    const chunks = this.chunkArray(pairs, maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (pair) => {
        const key = `${pair.source}:${pair.target}`;
        try {
          const result = await this.findPaths({
            startEntityType: 'Entity',
            startEntityName: pair.source,
            endEntityType: 'Entity',
            endEntityName: pair.target,
            maxHops,
          });
          results.set(key, result);
        } catch (error) {
          errors.push({
            source: pair.source,
            target: pair.target,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.all(promises);
    }

    return {
      results,
      totalPairs: pairs.length,
      successCount: results.size,
      errorCount: errors.length,
      errors,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Build Cypher query for path finding
   */
  private buildCypherQuery(query: PathQuery): string {
    const startLabel = query.startEntityType !== 'Entity' ? `:${query.startEntityType}` : '';
    const endLabel = query.endEntityType !== 'Entity' ? `:${query.endEntityType}` : '';
    const startNameFilter = query.startEntityName ? '{name: $startName}' : '';
    const endNameFilter = query.endEntityName ? '{name: $endName}' : '';

    const relationFilter = query.relationTypes?.length
      ? `:${query.relationTypes.join('|')}`
      : '';

    const excludeClause = query.excludeRelations?.length
      ? `AND NONE(r IN relationships(path) WHERE type(r) IN $excludeRelations)`
      : '';

    return `
      MATCH path = shortestPath(
        (start${startLabel} ${startNameFilter})-[${relationFilter}*1..${query.maxHops}]-(end${endLabel} ${endNameFilter})
      )
      WHERE start <> end ${excludeClause}
      RETURN path, length(path) as hops
      ORDER BY hops ASC
      LIMIT 100
    `;
  }

  /**
   * Build Cypher query for weighted path finding
   */
  private buildWeightedCypherQuery(query: PathQuery): string {
    const startLabel = query.startEntityType !== 'Entity' ? `:${query.startEntityType}` : '';
    const endLabel = query.endEntityType !== 'Entity' ? `:${query.endEntityType}` : '';
    const startNameFilter = query.startEntityName ? '{name: $startName}' : '';
    const endNameFilter = query.endEntityName ? '{name: $endName}' : '';

    const relationFilter = query.relationTypes?.length
      ? `:${query.relationTypes.join('|')}`
      : '';

    return `
      MATCH path = (start${startLabel} ${startNameFilter})
        -[rels${relationFilter}*1..${query.maxHops}]-
        (end${endLabel} ${endNameFilter})
      WHERE start <> end
        AND ALL(n IN nodes(path) WHERE single(x IN nodes(path) WHERE x = n))
      WITH path, relationships(path) as rels,
           reduce(weight = 0.0, r IN relationships(path) | weight + coalesce(r.confidence, 0.5)) as totalWeight
      RETURN path, totalWeight, length(path) as hops
      ORDER BY totalWeight DESC
      LIMIT 100
    `;
  }

  /**
   * Build query parameters
   */
  private buildParams(query: PathQuery): Record<string, unknown> {
    const params: Record<string, unknown> = {
      maxHops: query.maxHops,
    };

    if (query.startEntityName) {
      params.startName = query.startEntityName;
    }
    if (query.endEntityName) {
      params.endName = query.endEntityName;
    }
    if (query.excludeRelations?.length) {
      params.excludeRelations = query.excludeRelations;
    }

    return params;
  }

  /**
   * Process Neo4j records into Path objects
   */
  private processPaths(records: Neo4jRecord[]): Path[] {
    return records.map((record) => this.processPath(record));
  }

  /**
   * Process a single Neo4j record into a Path
   */
  private processPath(record: Neo4jRecord): Path {
    const pathData = record.get('path') as Neo4jPath;
    const hops = record.get('hops') as number;

    const nodes: PathNode[] = [];
    const relations: PathRelation[] = [];

    // Process segments
    for (const seg of pathData.segments) {
      if (nodes.length === 0) {
        nodes.push(this.convertNode(seg.start));
      }
      nodes.push(this.convertNode(seg.end));
      relations.push(this.convertRelation(seg.relationship));
    }

    return {
      nodes,
      relations,
      score: 1.0,
      hops,
    };
  }

  /**
   * Process weighted paths
   */
  private processWeightedPaths(
    records: Neo4jRecord[],
    weightFunction: (relation: PathRelation) => number
  ): WeightedPath[] {
    return records.map((record) => {
      const path = this.processPath(record);
      const totalWeight = path.relations.reduce(
        (sum, rel) => sum + weightFunction(rel),
        0
      );
      return { ...path, totalWeight };
    });
  }

  /**
   * Convert Neo4j node to PathNode
   */
  private convertNode(node: Neo4jNode): PathNode {
    return {
      id: node.identity?.toString() ?? node.elementId ?? '',
      type: (node.labels?.[0] ?? 'Entity') as EntityType,
      name: (node.properties?.name as string) ?? '',
      properties: node.properties ?? {},
    };
  }

  /**
   * Convert Neo4j relationship to PathRelation
   */
  private convertRelation(rel: Neo4jRelationship): PathRelation {
    return {
      type: rel.type as PathRelation['type'],
      direction: 'outgoing',
      properties: rel.properties ?? {},
    };
  }

  /**
   * Calculate statistics for path results
   */
  private calculateStatistics(paths: Path[]): PathStatistics {
    if (paths.length === 0) {
      return {
        totalPaths: 0,
        averageHops: 0,
        minHops: 0,
        maxHops: 0,
        pathsByHops: {},
      };
    }

    const hopCounts = paths.map((p) => p.hops);
    const pathsByHops: Record<number, number> = {};

    for (const hops of hopCounts) {
      pathsByHops[hops] = (pathsByHops[hops] ?? 0) + 1;
    }

    return {
      totalPaths: paths.length,
      averageHops: hopCounts.reduce((a, b) => a + b, 0) / paths.length,
      minHops: Math.min(...hopCounts),
      maxHops: Math.max(...hopCounts),
      pathsByHops,
    };
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Neo4j internal types
interface Neo4jPath {
  segments: Neo4jSegment[];
}

interface Neo4jSegment {
  start: Neo4jNode;
  end: Neo4jNode;
  relationship: Neo4jRelationship;
}

interface Neo4jNode {
  identity?: { toString(): string };
  elementId?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
}

interface Neo4jRelationship {
  type: string;
  properties?: Record<string, unknown>;
}
