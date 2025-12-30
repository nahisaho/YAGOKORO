/**
 * CitationAnalyzer - Citation network analysis
 *
 * Analyzes citation patterns and networks within the knowledge graph.
 * Based on DES-002 §5.2
 */

import type {
  CitationAnalyzerDependencies,
  CitationAnalyzerInterface,
  CitationAnalysisOptions,
  CitationNetwork,
  CitationMetrics,
  CitationIsland,
  CitationNode,
  CitationEdge,
  CitationCluster,
  Neo4jConnectionInterface,
  Neo4jRecord,
} from '../types.js';

/**
 * Default options for citation analysis
 */
const DEFAULT_OPTIONS: CitationAnalysisOptions = {
  limit: 1000,
  includeEdges: true,
};

/**
 * Citation Analyzer implementation
 */
export class CitationAnalyzer implements CitationAnalyzerInterface {
  private neo4jConnection: Neo4jConnectionInterface;

  constructor(deps: CitationAnalyzerDependencies) {
    this.neo4jConnection = deps.neo4jConnection;
  }

  /**
   * Analyze the citation network within a domain
   */
  async analyzeCitationNetwork(
    options: CitationAnalysisOptions = {}
  ): Promise<CitationNetwork> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Get nodes (publications)
    const nodes = await this.getNetworkNodes(opts);

    // Get edges (citations)
    const edges = opts.includeEdges ? await this.getNetworkEdges(opts) : [];

    // Get clusters
    const clusters = await this.getNetworkClusters(opts);

    // Calculate network metrics
    const totalCitations = edges.reduce((sum, e) => sum + e.weight, 0);
    const possibleEdges = nodes.length * (nodes.length - 1);
    const density = possibleEdges > 0 ? edges.length / possibleEdges : 0;

    return {
      nodes,
      edges,
      clusters,
      totalCitations,
      density,
    };
  }

  /**
   * Get top cited entities
   */
  async getTopCited(limit = 20): Promise<CitationMetrics[]> {
    const cypher = `
      MATCH (p:Publication)<-[c:CITES]-()
      WITH p, count(c) as citations
      OPTIONAL MATCH (p)-[co:CITES]->()
      WITH p, citations, count(co) as citing
      RETURN p.id as entityId, 
             p.title as entityName, 
             'Publication' as entityType,
             citing as citationCount, 
             citations as citedByCount
      ORDER BY citations DESC
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, { limit });

    return result.records.map((r: Neo4jRecord) => ({
      entityId: String(r.get('entityId') ?? ''),
      entityName: String(r.get('entityName') ?? ''),
      entityType: 'Publication',
      citationCount: this.toNumber(r.get('citationCount')),
      citedByCount: this.toNumber(r.get('citedByCount')),
      hIndex: 0, // Calculated separately
      recentCitationGrowth: 0,
      crossDomainCitations: 0,
    }));
  }

  /**
   * Find isolated citation clusters (islands)
   */
  async findCitationIslands(): Promise<CitationIsland[]> {
    // First check if GDS is available, otherwise use simpler approach
    try {
      return await this.findIslandsWithGDS();
    } catch {
      return await this.findIslandsSimple();
    }
  }

  /**
   * Get citation metrics for a specific entity
   */
  async getCitationMetrics(entityId: string): Promise<CitationMetrics | null> {
    const cypher = `
      MATCH (p:Publication {id: $entityId})
      OPTIONAL MATCH (p)<-[cited:CITES]-()
      WITH p, count(cited) as citedByCount
      OPTIONAL MATCH (p)-[citing:CITES]->()
      WITH p, citedByCount, count(citing) as citationCount
      OPTIONAL MATCH (p)<-[recent:CITES]-(pr:Publication)
      WHERE pr.year >= date().year - 1
      WITH p, citedByCount, citationCount, count(recent) as recentCitations
      OPTIONAL MATCH (p)<-[:CITES]-(cross:Publication)
      WHERE cross.domain <> p.domain
      RETURN p.id as entityId,
             p.title as entityName,
             'Publication' as entityType,
             citationCount,
             citedByCount,
             recentCitations,
             count(cross) as crossDomainCitations
    `;

    const result = await this.neo4jConnection.run(cypher, { entityId });

    if (result.records.length === 0) {
      return null;
    }

    const r = result.records[0]!;
    const citedByCount = this.toNumber(r.get('citedByCount'));
    const recentCitations = this.toNumber(r.get('recentCitations'));

    return {
      entityId: String(r.get('entityId') ?? ''),
      entityName: String(r.get('entityName') ?? ''),
      entityType: 'Publication',
      citationCount: this.toNumber(r.get('citationCount')),
      citedByCount,
      hIndex: await this.calculateHIndex(entityId),
      recentCitationGrowth: citedByCount > 0 ? recentCitations / citedByCount : 0,
      crossDomainCitations: this.toNumber(r.get('crossDomainCitations')),
    };
  }

  /**
   * Calculate h-index for an entity
   */
  async calculateHIndex(entityId: string): Promise<number> {
    const cypher = `
      MATCH (p:Publication {id: $entityId})<-[:CITES]-(citing:Publication)
      WITH citing, count(*) as citationCount
      ORDER BY citationCount DESC
      WITH collect(citationCount) as citations
      UNWIND range(0, size(citations) - 1) as idx
      WITH idx + 1 as rank, citations[idx] as cites
      WHERE cites >= rank
      RETURN max(rank) as hIndex
    `;

    const result = await this.neo4jConnection.run(cypher, { entityId });

    if (result.records.length === 0) {
      return 0;
    }

    return this.toNumber(result.records[0]!.get('hIndex'));
  }

  /**
   * Get nodes for the citation network
   */
  private async getNetworkNodes(
    options: CitationAnalysisOptions
  ): Promise<CitationNode[]> {
    let whereClause = '';
    const params: Record<string, unknown> = { limit: options.limit };

    if (options.domain) {
      whereClause = 'WHERE p.domain = $domain';
      params.domain = options.domain;
    }

    if (options.minYear || options.maxYear) {
      const yearConditions: string[] = [];
      if (options.minYear) {
        yearConditions.push('p.year >= $minYear');
        params.minYear = options.minYear;
      }
      if (options.maxYear) {
        yearConditions.push('p.year <= $maxYear');
        params.maxYear = options.maxYear;
      }
      const yearClause = yearConditions.join(' AND ');
      whereClause = whereClause
        ? `${whereClause} AND ${yearClause}`
        : `WHERE ${yearClause}`;
    }

    const cypher = `
      MATCH (p:Publication)
      ${whereClause}
      OPTIONAL MATCH (p)<-[c:CITES]-()
      WITH p, count(c) as citationCount
      RETURN p.id as id, 
             p.title as name, 
             'Publication' as type,
             p.year as year,
             p.domain as domain,
             citationCount
      ORDER BY citationCount DESC
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, params);

    return result.records.map((r: Neo4jRecord) => {
      const year = r.get('year');
      const domain = r.get('domain');
      return {
        id: String(r.get('id') ?? ''),
        name: String(r.get('name') ?? ''),
        type: 'Publication' as const,
        ...(year != null && { year: this.toNumber(year) }),
        ...(domain != null && { domain: String(domain) }),
        citationCount: this.toNumber(r.get('citationCount')),
      };
    });
  }

  /**
   * Get edges for the citation network
   */
  private async getNetworkEdges(
    options: CitationAnalysisOptions
  ): Promise<CitationEdge[]> {
    let whereClause = '';
    const params: Record<string, unknown> = { limit: options.limit };

    if (options.domain) {
      whereClause = 'WHERE p1.domain = $domain OR p2.domain = $domain';
      params.domain = options.domain;
    }

    const cypher = `
      MATCH (p1:Publication)-[c:CITES]->(p2:Publication)
      ${whereClause}
      RETURN p1.id as source, 
             p2.id as target, 
             1 as weight,
             p1.year as year
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, params);

    return result.records.map((r: Neo4jRecord) => {
      const year = r.get('year');
      return {
        source: String(r.get('source') ?? ''),
        target: String(r.get('target') ?? ''),
        weight: this.toNumber(r.get('weight')),
        ...(year != null && { year: this.toNumber(year) }),
      };
    });
  }

  /**
   * Get clusters in the citation network
   */
  private async getNetworkClusters(
    options: CitationAnalysisOptions
  ): Promise<CitationCluster[]> {
    let whereClause = '';
    const params: Record<string, unknown> = {};

    if (options.domain) {
      whereClause = 'WHERE p.domain = $domain';
      params.domain = options.domain;
    }

    const cypher = `
      MATCH (c:Community)<-[:BELONGS_TO]-(p:Publication)
      ${whereClause}
      WITH c, collect(p) as pubs
      OPTIONAL MATCH (pub)<-[cite:CITES]-() WHERE pub IN pubs
      WITH c, pubs, count(cite) as totalCitations
      RETURN c.id as id,
             c.name as name,
             size(pubs) as nodeCount,
             CASE WHEN size(pubs) > 0 
                  THEN toFloat(totalCitations) / size(pubs) 
                  ELSE 0 
             END as avgCitationCount,
             head([p IN pubs | p.domain]) as mainDomain
      ORDER BY nodeCount DESC
      LIMIT 20
    `;

    const result = await this.neo4jConnection.run(cypher, params);

    return result.records.map((r: Neo4jRecord) => {
      const mainDomain = r.get('mainDomain');
      return {
        id: String(r.get('id') ?? ''),
        name: String(r.get('name') ?? `Cluster-${r.get('id')}`),
        nodeCount: this.toNumber(r.get('nodeCount')),
        avgCitationCount: this.toNumber(r.get('avgCitationCount')),
        ...(mainDomain != null && { mainDomain: String(mainDomain) }),
      };
    });
  }

  /**
   * Find citation islands using Graph Data Science library
   */
  private async findIslandsWithGDS(): Promise<CitationIsland[]> {
    const cypher = `
      CALL gds.wcc.stream('citationGraph')
      YIELD nodeId, componentId
      WITH componentId, count(*) as size
      WHERE size < 5
      RETURN componentId, size
      ORDER BY size DESC
      LIMIT 50
    `;

    const result = await this.neo4jConnection.run(cypher);

    return result.records.map((r: Neo4jRecord) => ({
      componentId: this.toNumber(r.get('componentId')),
      size: this.toNumber(r.get('size')),
    }));
  }

  /**
   * Find citation islands using simple query (fallback)
   */
  private async findIslandsSimple(): Promise<CitationIsland[]> {
    // Find publications with no citations in or out
    const cypher = `
      MATCH (p:Publication)
      WHERE NOT (p)-[:CITES]-() AND NOT (p)<-[:CITES]-()
      RETURN 0 as componentId, count(p) as size
      UNION
      MATCH (p1:Publication)-[:CITES]-(p2:Publication)
      WHERE NOT (p1)-[:CITES]-(:Publication)-[:CITES]-(p2)
      WITH p1, count(DISTINCT p2) as connections
      WHERE connections < 3
      RETURN 1 as componentId, count(p1) as size
    `;

    const result = await this.neo4jConnection.run(cypher);

    return result.records.map((r: Neo4jRecord, index: number) => ({
      componentId: index,
      size: this.toNumber(r.get('size')),
    }));
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
    // Handle Neo4j Integer
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      return (value as { toNumber(): number }).toNumber();
    }
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }
}
