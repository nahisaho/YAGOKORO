import type {
  CreateRelationInput,
  GraphEdge,
  Relation,
  RelationType,
} from '../relations/RelationType.js';

/**
 * Traversal direction for graph queries
 */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

/**
 * Options for graph traversal
 */
export interface TraversalOptions {
  direction?: TraversalDirection;
  relationTypes?: RelationType[];
  maxDepth?: number;
  limit?: number;
}

/**
 * Path in the graph (sequence of nodes and edges)
 */
export interface GraphPath {
  nodes: string[];
  edges: GraphEdge[];
  totalWeight: number;
}

/**
 * Relation Repository Port (Output Port)
 *
 * Defines the interface for managing relations between entities.
 * This is implemented by Neo4j adapter.
 */
export interface RelationRepository {
  /**
   * Create a new relation between entities
   */
  create(input: CreateRelationInput): Promise<Relation>;

  /**
   * Create multiple relations in a batch
   */
  createMany(inputs: CreateRelationInput[]): Promise<Relation[]>;

  /**
   * Find a relation by ID
   */
  findById(id: string): Promise<Relation | null>;

  /**
   * Find relations by source entity
   */
  findBySource(sourceId: string, types?: RelationType[]): Promise<Relation[]>;

  /**
   * Find relations by target entity
   */
  findByTarget(targetId: string, types?: RelationType[]): Promise<Relation[]>;

  /**
   * Find relations between two entities
   */
  findBetween(sourceId: string, targetId: string): Promise<Relation[]>;

  /**
   * Get neighbors of an entity (entities connected by relations)
   */
  getNeighbors(entityId: string, options?: TraversalOptions): Promise<string[]>;

  /**
   * Find shortest path between two entities
   */
  findShortestPath(
    sourceId: string,
    targetId: string,
    options?: TraversalOptions
  ): Promise<GraphPath | null>;

  /**
   * Find all paths between two entities within max depth
   */
  findAllPaths(sourceId: string, targetId: string, maxDepth: number): Promise<GraphPath[]>;

  /**
   * Delete a relation by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete all relations for an entity
   */
  deleteByEntity(entityId: string): Promise<number>;

  /**
   * Count relations by type
   */
  countByType(type?: RelationType): Promise<number>;
}
