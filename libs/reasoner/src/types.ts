/**
 * Common types for multi-hop reasoning
 */

/**
 * Entity type for path queries
 */
export type EntityType =
  | 'AIModel'
  | 'Technique'
  | 'Concept'
  | 'Organization'
  | 'Person'
  | 'Publication'
  | 'Benchmark'
  | 'Community'
  | 'Entity';

/**
 * Relation type for path queries
 */
export type RelationType =
  | 'DERIVED_FROM'
  | 'USES'
  | 'DEVELOPED_BY'
  | 'AUTHORED_BY'
  | 'AFFILIATED_WITH'
  | 'EVALUATED_ON'
  | 'CITES'
  | 'IMPROVES'
  | 'APPLIES'
  | 'BELONGS_TO'
  | 'MEMBER_OF';

/**
 * Path query parameters
 */
export interface PathQuery {
  /** Start entity type */
  startEntityType: EntityType;
  /** Start entity name (optional, if not provided, matches any) */
  startEntityName?: string;
  /** End entity type */
  endEntityType: EntityType;
  /** End entity name (optional, if not provided, matches any) */
  endEntityName?: string;
  /** Maximum number of hops */
  maxHops: number;
  /** Filter by relation types (optional) */
  relationTypes?: RelationType[];
  /** Exclude specific relation types (optional) */
  excludeRelations?: RelationType[];
}

/**
 * Node in a path
 */
export interface PathNode {
  /** Node ID */
  id: string;
  /** Entity type */
  type: EntityType;
  /** Entity name */
  name: string;
  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Relation in a path
 */
export interface PathRelation {
  /** Relation type */
  type: RelationType;
  /** Direction of the relation */
  direction: 'outgoing' | 'incoming';
  /** Additional properties including confidence */
  properties: Record<string, unknown>;
}

/**
 * A single path in the graph
 */
export interface Path {
  /** Nodes in the path */
  nodes: PathNode[];
  /** Relations connecting the nodes */
  relations: PathRelation[];
  /** Path score (relevance/quality) */
  score: number;
  /** Number of hops */
  hops: number;
}

/**
 * Weighted path with total weight
 */
export interface WeightedPath extends Path {
  /** Total weight (sum of relation weights) */
  totalWeight: number;
}

/**
 * Statistics about the path search results
 */
export interface PathStatistics {
  /** Total number of paths found */
  totalPaths: number;
  /** Average number of hops */
  averageHops: number;
  /** Minimum hops in any path */
  minHops: number;
  /** Maximum hops in any path */
  maxHops: number;
  /** Distribution of paths by hop count */
  pathsByHops: Record<number, number>;
}

/**
 * Path search result
 */
export interface PathResult {
  /** Found paths */
  paths: Path[];
  /** Statistics about the results */
  statistics: PathStatistics;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Whether result was from cache */
  fromCache?: boolean;
  /** When the result was cached */
  cachedAt?: Date;
}

/**
 * Weighted path result
 */
export interface WeightedPathResult extends Omit<PathResult, 'paths'> {
  /** Found paths with weights */
  paths: WeightedPath[];
}

/**
 * Batch path search options
 */
export interface BatchPathOptions {
  /** Maximum concurrent queries */
  maxConcurrency?: number;
  /** Maximum hops per query */
  maxHops?: number;
}

/**
 * Error from batch path search
 */
export interface BatchPathError {
  /** Source entity */
  source: string;
  /** Target entity */
  target: string;
  /** Error message */
  error: string;
}

/**
 * Batch path search result
 */
export interface BatchPathResult {
  /** Results map (key: "source:target") */
  results: Map<string, PathResult>;
  /** Total number of pairs */
  totalPairs: number;
  /** Number of successful searches */
  successCount: number;
  /** Number of failed searches */
  errorCount: number;
  /** List of errors */
  errors: BatchPathError[];
  /** Total execution time */
  executionTime: number;
}

/**
 * Explanation for a single relation
 */
export interface RelationExplanation {
  /** Source entity name */
  from: string;
  /** Target entity name */
  to: string;
  /** Relation type */
  relationType: string;
  /** Natural language explanation */
  explanation: string;
}

/**
 * Explanation for a path
 */
export interface PathExplanation {
  /** The path being explained */
  path: Path;
  /** Natural language explanation */
  naturalLanguage: string;
  /** Brief summary */
  summary: string;
  /** Key relations with explanations */
  keyRelations: RelationExplanation[];
}

/**
 * Reasoning result with explanations
 */
export interface ReasoningResult extends PathResult {
  /** Explanations for top paths */
  explanations?: PathExplanation[];
}

/**
 * Options for relation path search
 */
export interface RelationPathOptions {
  /** Type of entity 1 */
  entity1Type?: EntityType;
  /** Type of entity 2 */
  entity2Type?: EntityType;
  /** Maximum hops */
  maxHops?: number;
  /** Filter by relation types */
  relationTypes?: RelationType[];
}

/**
 * Concept connection result
 */
export interface ConceptConnectionResult {
  /** The concept being analyzed */
  concept: string;
  /** Paths to connected AI models */
  connectedModels: Path[];
  /** Paths to connected techniques */
  connectedTechniques: Path[];
  /** Summary of connections */
  summary: string;
}

/**
 * Cycle information
 */
export interface CycleInfo {
  /** Path identifier */
  pathId: string;
  /** All nodes in the path */
  nodes: PathNode[];
  /** Node IDs that form cycles */
  cycleNodes: string[];
}

/**
 * Cycle detection report
 */
export interface CycleReport {
  /** Total paths analyzed */
  totalPaths: number;
  /** Number of paths with cycles */
  cyclicPaths: number;
  /** Details of cycles found */
  cycles: CycleInfo[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Approximate hit rate (0-1) */
  hitRate: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Maximum number of entries */
  maxSize: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
}

/**
 * LLM Client interface for path explanation
 */
export interface LLMClient {
  /** Generate text from prompt */
  generate(prompt: string): Promise<string>;
}

/**
 * Neo4j connection interface
 */
export interface Neo4jConnection {
  /** Run a Cypher query */
  run(cypher: string, params?: Record<string, unknown>): Promise<{ records: Neo4jRecord[] }>;
}

/**
 * Neo4j record interface (simplified)
 */
export interface Neo4jRecord {
  /** Get a value by key */
  get(key: string): unknown;
  /** Check if key exists */
  has(key: string): boolean;
}

/**
 * Path finder strategy interface
 */
export interface PathFinderStrategy {
  /** Find paths matching the query */
  findPaths(query: PathQuery): Promise<PathResult>;
}

/**
 * Dependencies for MultiHopReasonerService
 */
export interface MultiHopReasonerDependencies {
  /** Path finder implementation */
  pathFinder: PathFinderStrategy;
  /** Path cache */
  pathCache: PathCacheInterface;
  /** Path explainer */
  pathExplainer: PathExplainerInterface;
}

/**
 * Path cache interface
 */
export interface PathCacheInterface {
  /** Get cached result */
  get(query: PathQuery): PathResult | undefined;
  /** Set cached result */
  set(query: PathQuery, result: PathResult): void;
  /** Invalidate cache entries */
  invalidate(pattern?: string): number;
  /** Get cache statistics */
  getStats(): CacheStats;
}

/**
 * Path explainer interface
 */
export interface PathExplainerInterface {
  /** Explain a path */
  explain(path: Path, context?: string): Promise<PathExplanation>;
}
