/**
 * Community Detection Types
 *
 * Types for graph community detection and clustering algorithms.
 */

/**
 * Node representation for community detection
 */
export interface GraphNode {
  /** Unique identifier */
  id: string;
  /** Node weight (optional) */
  weight?: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Edge representation for community detection
 */
export interface GraphEdge {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight (default: 1) */
  weight?: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Graph structure for community detection
 */
export interface Graph {
  /** List of nodes */
  nodes: GraphNode[];
  /** List of edges */
  edges: GraphEdge[];
}

/**
 * Detected community
 */
export interface Community {
  /** Unique community identifier */
  id: string;
  /** Hierarchical level (0 = finest, higher = coarser) */
  level: number;
  /** Member node IDs */
  memberIds: string[];
  /** Parent community ID (for hierarchical communities) */
  parentId?: string;
  /** Child community IDs (for hierarchical communities) */
  childIds?: string[];
  /** Community metadata */
  metadata?: CommunityMetadata;
}

/**
 * Community metadata
 */
export interface CommunityMetadata {
  /** Number of nodes in the community */
  size: number;
  /** Density of internal edges */
  density?: number;
  /** Modularity contribution */
  modularity?: number;
  /** Central/representative nodes */
  centralNodes?: string[];
}

/**
 * Result from community detection
 */
export interface CommunityDetectionResult {
  /** Detected communities */
  communities: Community[];
  /** Node to community mapping at each level */
  nodeCommunities: Map<string, string[]>;
  /** Quality metrics */
  metrics: CommunityMetrics;
  /** Hierarchical levels detected */
  levels: number;
}

/**
 * Quality metrics for community detection
 */
export interface CommunityMetrics {
  /** Modularity score (range: -0.5 to 1) */
  modularity: number;
  /** Number of communities */
  numCommunities: number;
  /** Coverage (fraction of edges within communities) */
  coverage?: number;
  /** Processing time in ms */
  processingTimeMs: number;
}

/**
 * Options for Leiden algorithm
 */
export interface LeidenOptions {
  /** Resolution parameter (higher = more communities) */
  resolution?: number;
  /** Maximum iterations */
  maxIterations?: number;
  /** Minimum modularity improvement to continue */
  minModularityGain?: number;
  /** Random seed for reproducibility */
  randomSeed?: number;
  /** Enable hierarchical detection */
  hierarchical?: boolean;
  /** Maximum hierarchy levels */
  maxLevels?: number;
}

/**
 * Options for Louvain algorithm
 */
export interface LouvainOptions {
  /** Resolution parameter */
  resolution?: number;
  /** Maximum iterations */
  maxIterations?: number;
  /** Minimum modularity improvement */
  minModularityGain?: number;
}

/**
 * Options for Label Propagation
 */
export interface LabelPropagationOptions {
  /** Maximum iterations */
  maxIterations?: number;
  /** Random seed */
  randomSeed?: number;
}

/**
 * Community detector interface
 */
export interface CommunityDetector {
  /**
   * Detect communities in a graph
   */
  detect(graph: Graph): Promise<CommunityDetectionResult>;

  /**
   * Get algorithm name
   */
  getAlgorithmName(): string;
}
