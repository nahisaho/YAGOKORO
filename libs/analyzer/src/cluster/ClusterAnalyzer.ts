/**
 * ClusterAnalyzer - Research cluster analysis
 *
 * Analyzes research clusters and identifies gaps between them.
 * Based on DES-002 §5.2
 */

import type { EntityType } from '@yagokoro/domain';
import type {
  ClusterAnalyzerDependencies,
  ClusterAnalyzerInterface,
  ClusterAnalysisOptions,
  ResearchCluster,
  ClusterGap,
  ClusterEntity,
  Neo4jConnectionInterface,
  VectorStoreInterface,
  Neo4jRecord,
} from '../types.js';

/**
 * Default options for cluster analysis
 */
const DEFAULT_OPTIONS: ClusterAnalysisOptions = {
  minClusterSize: 3,
  maxClusters: 50,
  includeConnections: true,
  connectionThreshold: 0.1,
};

/**
 * Cluster Analyzer implementation
 */
export class ClusterAnalyzer implements ClusterAnalyzerInterface {
  private neo4jConnection: Neo4jConnectionInterface;
  private vectorStore: VectorStoreInterface | undefined;

  constructor(deps: ClusterAnalyzerDependencies) {
    this.neo4jConnection = deps.neo4jConnection;
    this.vectorStore = deps.vectorStore;
  }

  /**
   * Analyze existing research clusters
   */
  async analyzeExistingClusters(
    options: ClusterAnalysisOptions = {}
  ): Promise<ResearchCluster[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const cypher = `
      MATCH (c:Community)<-[:BELONGS_TO]-(e)
      WITH c, collect(e) as members, count(e) as memberCount
      WHERE memberCount >= $minClusterSize
      OPTIONAL MATCH (m)-[:AUTHORED_BY|DEVELOPED_BY]->(p:Publication)
      WHERE m IN members
      WITH c, members, memberCount, 
           avg(p.year) as avgYear, 
           count(DISTINCT p) as pubCount
      RETURN c.id as id, 
             c.name as name, 
             c.keywords as keywords,
             members,
             memberCount,
             avgYear,
             pubCount
      ORDER BY memberCount DESC
      LIMIT $maxClusters
    `;

    const result = await this.neo4jConnection.run(cypher, {
      minClusterSize: opts.minClusterSize,
      maxClusters: opts.maxClusters,
    });

    const clusters = await Promise.all(
      result.records.map(async (r: Neo4jRecord) => {
        const cluster = this.processClusterRecord(r);

        if (opts.includeConnections) {
          cluster.connectionStrength = await this.getConnectionStrengths(
            cluster.id
          );
        }

        return cluster;
      })
    );

    // Calculate growth rates
    return this.calculateGrowthRates(clusters);
  }

  /**
   * Find gaps between clusters
   */
  async findClusterGaps(): Promise<ClusterGap[]> {
    const clusters = await this.analyzeExistingClusters({
      includeConnections: true,
    });
    const gaps: ClusterGap[] = [];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const c1 = clusters[i];
        const c2 = clusters[j];
        if (!c1 || !c2) continue;

        const connectionStrength = await this.measureConnection(c1.id, c2.id);

        if (connectionStrength < 0.1) {
          const bridgeTopics = await this.suggestBridgeTopics(c1, c2);

          gaps.push({
            cluster1: c1,
            cluster2: c2,
            connectionStrength,
            potentialBridgeTopics: bridgeTopics,
          });
        }
      }
    }

    return gaps.sort((a, b) => a.connectionStrength - b.connectionStrength);
  }

  /**
   * Measure connection strength between two clusters
   */
  async measureConnection(
    cluster1Id: string,
    cluster2Id: string
  ): Promise<number> {
    const cypher = `
      MATCH (c1:Community {id: $cluster1Id})<-[:BELONGS_TO]-(e1)
      MATCH (c2:Community {id: $cluster2Id})<-[:BELONGS_TO]-(e2)
      OPTIONAL MATCH path = (e1)-[*1..3]-(e2)
      WITH count(path) as pathCount,
           count(DISTINCT e1) as c1Size,
           count(DISTINCT e2) as c2Size
      RETURN pathCount, c1Size, c2Size
    `;

    const result = await this.neo4jConnection.run(cypher, {
      cluster1Id,
      cluster2Id,
    });

    if (result.records.length === 0) {
      return 0;
    }

    const r = result.records[0]!;
    const pathCount = this.toNumber(r.get('pathCount'));
    const c1Size = this.toNumber(r.get('c1Size'));
    const c2Size = this.toNumber(r.get('c2Size'));

    // Normalize: pathCount / (maxPossiblePaths)
    const maxPossible = c1Size * c2Size;
    if (maxPossible === 0) {
      return 0;
    }

    return Math.min(pathCount / maxPossible, 1);
  }

  /**
   * Suggest bridge topics between two clusters
   */
  async suggestBridgeTopics(
    cluster1: ResearchCluster,
    cluster2: ResearchCluster
  ): Promise<string[]> {
    const keywords1 = new Set(cluster1.keywords);
    const keywords2 = new Set(cluster2.keywords);

    // Find common keywords
    const common = [...keywords1].filter((k) => keywords2.has(k));

    if (common.length > 0) {
      return common.slice(0, 5);
    }

    // Use vector similarity if available
    if (this.vectorStore) {
      return await this.findSemanticBridges(cluster1, cluster2);
    }

    // Query for shared entities
    const sharedEntities = await this.findSharedEntities(
      cluster1.id,
      cluster2.id
    );

    if (sharedEntities.length > 0) {
      return sharedEntities;
    }

    // Default suggestion
    return ['interdisciplinary research'];
  }

  /**
   * Get cluster by ID
   */
  async getClusterById(clusterId: string): Promise<ResearchCluster | null> {
    const cypher = `
      MATCH (c:Community {id: $clusterId})<-[:BELONGS_TO]-(e)
      WITH c, collect(e) as members, count(e) as memberCount
      OPTIONAL MATCH (m)-[:AUTHORED_BY|DEVELOPED_BY]->(p:Publication)
      WHERE m IN members
      WITH c, members, memberCount, 
           avg(p.year) as avgYear, 
           count(DISTINCT p) as pubCount
      RETURN c.id as id, 
             c.name as name, 
             c.keywords as keywords,
             members,
             memberCount,
             avgYear,
             pubCount
    `;

    const result = await this.neo4jConnection.run(cypher, { clusterId });

    if (result.records.length === 0) {
      return null;
    }

    return this.processClusterRecord(result.records[0]!);
  }

  /**
   * Get connection strengths for a cluster to all others
   */
  private async getConnectionStrengths(
    clusterId: string
  ): Promise<Map<string, number>> {
    const cypher = `
      MATCH (c1:Community {id: $clusterId})
      MATCH (c2:Community)
      WHERE c1 <> c2
      MATCH (c1)<-[:BELONGS_TO]-(e1)
      MATCH (c2)<-[:BELONGS_TO]-(e2)
      OPTIONAL MATCH path = (e1)-[*1..2]-(e2)
      WITH c2.id as otherId, 
           count(path) as pathCount,
           count(DISTINCT e1) * count(DISTINCT e2) as maxPaths
      RETURN otherId, 
             CASE WHEN maxPaths > 0 
                  THEN toFloat(pathCount) / maxPaths 
                  ELSE 0 
             END as strength
    `;

    const result = await this.neo4jConnection.run(cypher, { clusterId });

    const connections = new Map<string, number>();
    for (const r of result.records) {
      const otherId = String(r.get('otherId') ?? '');
      const strength = this.toNumber(r.get('strength'));
      if (otherId) {
        connections.set(otherId, Math.min(strength, 1));
      }
    }

    return connections;
  }

  /**
   * Process a cluster record from Neo4j
   */
  private processClusterRecord(r: Neo4jRecord): ResearchCluster {
    const members = r.get('members') as unknown[];
    const keywords = r.get('keywords');

    return {
      id: String(r.get('id') ?? ''),
      name: String(r.get('name') ?? `Cluster-${r.get('id')}`),
      keywords: Array.isArray(keywords)
        ? keywords.map(String)
        : keywords
          ? [String(keywords)]
          : [],
      entities: this.processClusterMembers(members),
      publicationCount: this.toNumber(r.get('pubCount')),
      avgPublicationYear: this.toNumber(r.get('avgYear')) || new Date().getFullYear(),
      growthRate: 0, // Calculated later
      connectionStrength: new Map(),
    };
  }

  /**
   * Process cluster members into entities
   */
  private processClusterMembers(members: unknown[]): ClusterEntity[] {
    if (!Array.isArray(members)) {
      return [];
    }

    return members.slice(0, 100).map((m, index) => {
      const member = m as Record<string, unknown> | null;
      return {
        id: String(member?.id ?? `entity-${index}`),
        name: String(member?.name ?? `Entity ${index}`),
        type: (member?.type as EntityType) ?? 'Concept',
        centrality: this.toNumber(member?.centrality) || 0,
      };
    });
  }

  /**
   * Calculate growth rates for clusters
   */
  private async calculateGrowthRates(
    clusters: ResearchCluster[]
  ): Promise<ResearchCluster[]> {
    const currentYear = new Date().getFullYear();

    for (const cluster of clusters) {
      const cypher = `
        MATCH (c:Community {id: $clusterId})<-[:BELONGS_TO]-(e)
        MATCH (e)-[:AUTHORED_BY|DEVELOPED_BY]->(p:Publication)
        WITH p.year as year, count(p) as count
        WHERE year IS NOT NULL
        RETURN year, count
        ORDER BY year
      `;

      const result = await this.neo4jConnection.run(cypher, {
        clusterId: cluster.id,
      });

      if (result.records.length >= 2) {
        const recentYears = result.records.filter(
          (r: Neo4jRecord) => this.toNumber(r.get('year')) >= currentYear - 3
        );
        const olderYears = result.records.filter(
          (r: Neo4jRecord) => this.toNumber(r.get('year')) < currentYear - 3
        );

        const recentAvg = this.calculateAverage(
          recentYears.map((r: Neo4jRecord) => this.toNumber(r.get('count')))
        );
        const olderAvg = this.calculateAverage(
          olderYears.map((r: Neo4jRecord) => this.toNumber(r.get('count')))
        );

        cluster.growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
      }
    }

    return clusters;
  }

  /**
   * Find semantic bridges using vector similarity
   */
  private async findSemanticBridges(
    cluster1: ResearchCluster,
    cluster2: ResearchCluster
  ): Promise<string[]> {
    if (!this.vectorStore) {
      return [];
    }

    const topics: string[] = [];

    // Compare keywords for semantic similarity
    for (const k1 of cluster1.keywords.slice(0, 5)) {
      for (const k2 of cluster2.keywords.slice(0, 5)) {
        const similarity = await this.vectorStore.similarity(k1, k2);
        if (similarity > 0.5) {
          topics.push(`${k1} ↔ ${k2}`);
        }
      }
    }

    return topics.slice(0, 5);
  }

  /**
   * Find entities shared between clusters
   */
  private async findSharedEntities(
    cluster1Id: string,
    cluster2Id: string
  ): Promise<string[]> {
    const cypher = `
      MATCH (c1:Community {id: $cluster1Id})<-[:BELONGS_TO]-(e1)
      MATCH (c2:Community {id: $cluster2Id})<-[:BELONGS_TO]-(e2)
      MATCH (e1)-[r]-(shared)-[r2]-(e2)
      WHERE e1 <> e2 AND e1 <> shared AND e2 <> shared
      RETURN DISTINCT shared.name as name
      LIMIT 5
    `;

    const result = await this.neo4jConnection.run(cypher, {
      cluster1Id,
      cluster2Id,
    });

    return result.records.map((r: Neo4jRecord) => String(r.get('name') ?? ''));
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) {
      return 0;
    }
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Convert Neo4j value to number safely
   */
  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      return (value as { toNumber(): number }).toNumber();
    }
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }
}
