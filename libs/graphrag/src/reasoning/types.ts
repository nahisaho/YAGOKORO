/**
 * Reasoning Types
 *
 * Types for multi-hop reasoning and path analysis in knowledge graphs.
 */

import type { GraphPath, RelationType } from '@yagokoro/domain';

/**
 * Reasoning step in a multi-hop chain
 */
export interface ReasoningStep {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Source entity ID */
  fromEntityId: string;
  /** Source entity name */
  fromEntityName: string;
  /** Target entity ID */
  toEntityId: string;
  /** Target entity name */
  toEntityName: string;
  /** Relation type used in this step */
  relationType: RelationType;
  /** Confidence score for this step (0-1) */
  confidence: number;
  /** Human-readable explanation of this reasoning step */
  explanation: string;
}

/**
 * Result of a single reasoning path
 */
export interface ReasoningPath {
  /** Unique path identifier */
  pathId: string;
  /** Starting entity ID */
  sourceEntityId: string;
  /** Ending entity ID */
  targetEntityId: string;
  /** Number of hops */
  hopCount: number;
  /** Sequence of reasoning steps */
  steps: ReasoningStep[];
  /** Combined confidence score (product of step confidences) */
  totalConfidence: number;
  /** Overall explanation of the reasoning path */
  summary: string;
  /** Raw graph path data */
  graphPath?: GraphPath;
}

/**
 * Result of multi-hop reasoning
 */
export interface ReasoningResult {
  /** Query that initiated the reasoning */
  query: string;
  /** Found reasoning paths */
  paths: ReasoningPath[];
  /** Best/most confident path */
  bestPath: ReasoningPath | null;
  /** Processing metrics */
  metrics: ReasoningMetrics;
  /** Whether the reasoning found valid connections */
  success: boolean;
  /** Error message if reasoning failed */
  error?: string;
}

/**
 * Metrics for reasoning operations
 */
export interface ReasoningMetrics {
  /** Total paths explored */
  pathsExplored: number;
  /** Valid paths found */
  validPathsFound: number;
  /** Paths pruned (too long, low confidence, etc.) */
  pathsPruned: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Number of hops in shortest path */
  minHops?: number;
  /** Number of hops in longest path */
  maxHops?: number;
  /** Average confidence across all paths */
  averageConfidence?: number;
}

/**
 * Options for multi-hop reasoning
 */
export interface ReasoningOptions {
  /** Maximum number of hops to explore (default: 5) */
  maxHops?: number;
  /** Minimum number of hops required (default: 1) */
  minHops?: number;
  /** Maximum number of paths to return (default: 10) */
  maxPaths?: number;
  /** Minimum confidence threshold for paths (default: 0.1) */
  minConfidence?: number;
  /** Relation types to consider (empty = all) */
  relationTypes?: RelationType[];
  /** Whether to include explanations (default: true) */
  includeExplanations?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Entity information for reasoning context
 */
export interface ReasoningEntity {
  /** Entity ID */
  id: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: string;
  /** Entity description */
  description?: string;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Relation information for reasoning context
 */
export interface ReasoningRelation {
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Relation type */
  type: RelationType;
  /** Confidence score */
  confidence: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Context provider for reasoning operations
 */
export interface ReasoningContext {
  /** Get entity by ID */
  getEntity(id: string): Promise<ReasoningEntity | null>;
  /** Get outgoing relations from an entity */
  getOutgoingRelations(entityId: string, types?: RelationType[]): Promise<ReasoningRelation[]>;
  /** Get incoming relations to an entity */
  getIncomingRelations(entityId: string, types?: RelationType[]): Promise<ReasoningRelation[]>;
  /** Find paths between two entities */
  findPaths(sourceId: string, targetId: string, maxHops: number): Promise<GraphPath[]>;
  /** Get entity name by ID */
  getEntityName(id: string): Promise<string | null>;
}

/**
 * Default reasoning options
 */
export const DEFAULT_REASONING_OPTIONS: Required<ReasoningOptions> = {
  maxHops: 5,
  minHops: 1,
  maxPaths: 10,
  minConfidence: 0.1,
  relationTypes: [],
  includeExplanations: true,
  timeout: 30000,
};
