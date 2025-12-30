/**
 * Multi-Hop Reasoner Service
 *
 * Orchestrates multi-hop reasoning across the knowledge graph.
 * Combines path finding, caching, and explanation generation.
 */

import type {
  PathQuery,
  PathResult,
  Path,
  PathExplanation,
  ReasoningResult,
  RelationPathOptions,
  ConceptConnectionResult,
  EntityType,
  MultiHopReasonerDependencies,
  PathFinderStrategy,
  PathCacheInterface,
  PathExplainerInterface,
} from '../types.js';

/**
 * Options for reasoning queries
 */
export interface ReasoningOptions {
  /** Whether to use cache */
  useCache?: boolean;
  /** Whether to generate explanations */
  explain?: boolean;
  /** Number of paths to explain */
  explainLimit?: number;
  /** Additional context for explanations */
  context?: string;
}

/**
 * Service for multi-hop reasoning in knowledge graphs
 */
export class MultiHopReasonerService {
  private pathFinder: PathFinderStrategy;
  private pathCache: PathCacheInterface;
  private pathExplainer: PathExplainerInterface;

  constructor(deps: MultiHopReasonerDependencies) {
    this.pathFinder = deps.pathFinder;
    this.pathCache = deps.pathCache;
    this.pathExplainer = deps.pathExplainer;
  }

  /**
   * Find paths and optionally explain them
   */
  async findAndExplain(
    query: PathQuery,
    options: ReasoningOptions = {}
  ): Promise<ReasoningResult> {
    const {
      useCache = true,
      explain = true,
      explainLimit = 10,
      context,
    } = options;

    // Check cache first
    if (useCache) {
      const cached = this.pathCache.get(query);
      if (cached) {
        const result: ReasoningResult = {
          ...cached,
          fromCache: true,
        };

        if (explain && cached.paths.length > 0) {
          result.explanations = await this.explainPaths(
            cached.paths.slice(0, explainLimit),
            context
          );
        }

        return result;
      }
    }

    // Find paths
    const result = await this.pathFinder.findPaths(query);

    // Cache result
    if (useCache) {
      this.pathCache.set(query, result);
    }

    // Generate explanations
    const reasoningResult: ReasoningResult = { ...result };

    if (explain && result.paths.length > 0) {
      reasoningResult.explanations = await this.explainPaths(
        result.paths.slice(0, explainLimit),
        context
      );
    }

    return reasoningResult;
  }

  /**
   * Find paths between two named entities
   */
  async findRelationPaths(
    entity1: string,
    entity2: string,
    options: RelationPathOptions = {}
  ): Promise<ReasoningResult> {
    const query: PathQuery = {
      startEntityType: options.entity1Type ?? 'Entity',
      startEntityName: entity1,
      endEntityType: options.entity2Type ?? 'Entity',
      endEntityName: entity2,
      maxHops: options.maxHops ?? 4,
      ...(options.relationTypes && { relationTypes: options.relationTypes }),
    };

    return this.findAndExplain(query);
  }

  /**
   * Find connections from a concept to related entities
   */
  async findConceptConnections(
    concept: string,
    options: ReasoningOptions = {}
  ): Promise<ConceptConnectionResult> {
    // Find paths to AI models
    const modelQuery: PathQuery = {
      startEntityType: 'Concept',
      startEntityName: concept,
      endEntityType: 'AIModel',
      maxHops: 3,
    };
    const aiModels = await this.pathFinder.findPaths(modelQuery);

    // Find paths to techniques
    const techniqueQuery: PathQuery = {
      startEntityType: 'Concept',
      startEntityName: concept,
      endEntityType: 'Technique',
      maxHops: 3,
    };
    const techniques = await this.pathFinder.findPaths(techniqueQuery);

    // Generate summary
    const summary = await this.generateConnectionSummary(
      concept,
      aiModels,
      techniques,
      options.context
    );

    return {
      concept,
      connectedModels: aiModels.paths,
      connectedTechniques: techniques.paths,
      summary,
    };
  }

  /**
   * Find all paths from an entity to entities of a specific type
   */
  async findAllConnectionsToType(
    entityName: string,
    entityType: EntityType,
    targetType: EntityType,
    maxHops: number = 3
  ): Promise<PathResult> {
    const query: PathQuery = {
      startEntityType: entityType,
      startEntityName: entityName,
      endEntityType: targetType,
      maxHops,
    };

    return this.pathFinder.findPaths(query);
  }

  /**
   * Find the shortest path between two entities
   */
  async findShortestPath(
    entity1: string,
    entity2: string,
    maxHops: number = 6
  ): Promise<Path | null> {
    const result = await this.findRelationPaths(entity1, entity2, { maxHops });

    if (result.paths.length === 0) {
      return null;
    }

    // Return the path with minimum hops
    return result.paths.reduce((shortest, path) =>
      path.hops < shortest.hops ? path : shortest
    );
  }

  /**
   * Check if two entities are connected within a given hop limit
   */
  async areConnected(
    entity1: string,
    entity2: string,
    maxHops: number = 4
  ): Promise<boolean> {
    const result = await this.findRelationPaths(entity1, entity2, { maxHops });
    return result.paths.length > 0;
  }

  /**
   * Get the degree of separation between two entities
   */
  async getDegreesOfSeparation(
    entity1: string,
    entity2: string,
    maxHops: number = 6
  ): Promise<number | null> {
    const shortestPath = await this.findShortestPath(entity1, entity2, maxHops);
    return shortestPath?.hops ?? null;
  }

  /**
   * Find common connections between two entities
   */
  async findCommonConnections(
    entity1: string,
    entity2: string,
    _options: ReasoningOptions = {}
  ): Promise<CommonConnectionsResult> {
    // Find paths from entity1
    const paths1Query: PathQuery = {
      startEntityType: 'Entity',
      startEntityName: entity1,
      endEntityType: 'Entity',
      maxHops: 2,
    };
    const paths1 = await this.pathFinder.findPaths(paths1Query);

    // Find paths from entity2
    const paths2Query: PathQuery = {
      startEntityType: 'Entity',
      startEntityName: entity2,
      endEntityType: 'Entity',
      maxHops: 2,
    };
    const paths2 = await this.pathFinder.findPaths(paths2Query);

    // Find common end nodes
    const endNodes1 = new Set(
      paths1.paths
        .map((p) => p.nodes[p.nodes.length - 1]?.name)
        .filter((n): n is string => n !== undefined)
    );
    const endNodes2 = new Set(
      paths2.paths
        .map((p) => p.nodes[p.nodes.length - 1]?.name)
        .filter((n): n is string => n !== undefined)
    );

    const commonNodes = [...endNodes1].filter((n) => endNodes2.has(n));

    // Find direct path between entities
    const directPath = await this.findShortestPath(entity1, entity2);

    return {
      entity1,
      entity2,
      commonConnections: commonNodes,
      pathsFromEntity1: paths1.paths.filter((p) => {
        const endName = p.nodes[p.nodes.length - 1]?.name;
        return endName !== undefined && commonNodes.includes(endName);
      }),
      pathsFromEntity2: paths2.paths.filter((p) => {
        const endName = p.nodes[p.nodes.length - 1]?.name;
        return endName !== undefined && commonNodes.includes(endName);
      }),
      directPath,
    };
  }

  /**
   * Explain a single path
   */
  async explainPath(path: Path, context?: string): Promise<PathExplanation> {
    return this.pathExplainer.explain(path, context);
  }

  /**
   * Explain multiple paths
   */
  private async explainPaths(
    paths: Path[],
    context?: string
  ): Promise<PathExplanation[]> {
    return Promise.all(
      paths.map((path) => this.pathExplainer.explain(path, context))
    );
  }

  /**
   * Generate a summary of concept connections
   */
  private async generateConnectionSummary(
    concept: string,
    aiModels: PathResult,
    techniques: PathResult,
    _context?: string
  ): Promise<string> {
    const modelCount = aiModels.paths.length;
    const techniqueCount = techniques.paths.length;

    // Extract unique connected entities
    const connectedModelNames = [
      ...new Set(
        aiModels.paths
          .map((p) => p.nodes[p.nodes.length - 1]?.name)
          .filter((n): n is string => n !== undefined)
      ),
    ];
    const connectedTechniqueNames = [
      ...new Set(
        techniques.paths
          .map((p) => p.nodes[p.nodes.length - 1]?.name)
          .filter((n): n is string => n !== undefined)
      ),
    ];

    const summary = `Concept "${concept}" is connected to ${modelCount} AI model paths ` +
      `(${connectedModelNames.slice(0, 5).join(', ')}${connectedModelNames.length > 5 ? '...' : ''}) ` +
      `and ${techniqueCount} technique paths ` +
      `(${connectedTechniqueNames.slice(0, 5).join(', ')}${connectedTechniqueNames.length > 5 ? '...' : ''}).`;

    return summary;
  }

  /**
   * Invalidate cache for an entity
   */
  invalidateCacheForEntity(entityName: string): number {
    return this.pathCache.invalidate(entityName);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.pathCache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.pathCache.invalidate();
  }
}

/**
 * Result of finding common connections
 */
export interface CommonConnectionsResult {
  /** First entity */
  entity1: string;
  /** Second entity */
  entity2: string;
  /** Names of common connections */
  commonConnections: string[];
  /** Paths from entity1 to common connections */
  pathsFromEntity1: Path[];
  /** Paths from entity2 to common connections */
  pathsFromEntity2: Path[];
  /** Direct path between entities (if exists) */
  directPath: Path | null;
}
