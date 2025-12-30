import type { Community } from '../entities/Community.js';
import type { EntityId } from '../value-objects/EntityId.js';

/**
 * Query filter for community searches
 */
export interface CommunityFilter {
  level?: number;
  minMemberCount?: number;
  nameContains?: string;
  limit?: number;
  offset?: number;
}

/**
 * Community hierarchy query result
 */
export interface CommunityHierarchy {
  community: Community;
  children: CommunityHierarchy[];
}

/**
 * Community Repository Port (Output Port)
 *
 * Defines the interface for persisting and retrieving communities from the knowledge graph.
 * Communities are hierarchical clusters detected by graph algorithms.
 */
export interface CommunityRepository {
  /**
   * Save a community to the repository
   */
  save(community: Community): Promise<void>;

  /**
   * Save multiple communities in a batch
   */
  saveMany(communities: Community[]): Promise<void>;

  /**
   * Find a community by ID
   */
  findById(id: EntityId): Promise<Community | null>;

  /**
   * Find a community by string ID
   */
  findByStringId(id: string): Promise<Community | null>;

  /**
   * Find all communities
   */
  findAll(options?: { limit?: number; offset?: number }): Promise<Community[]>;

  /**
   * Find communities by filter criteria
   */
  findByFilter(filter: CommunityFilter): Promise<Community[]>;

  /**
   * Find communities at a specific hierarchy level
   */
  findByLevel(level: number, limit?: number): Promise<Community[]>;

  /**
   * Get the community hierarchy (tree structure)
   */
  getHierarchy(rootLevel?: number): Promise<CommunityHierarchy[]>;

  /**
   * Find communities that contain a specific entity
   */
  findByEntityId(entityId: EntityId): Promise<Community[]>;

  /**
   * Add an entity to a community
   */
  addMember(communityId: EntityId, entityId: EntityId): Promise<void>;

  /**
   * Remove an entity from a community
   */
  removeMember(communityId: EntityId, entityId: EntityId): Promise<void>;

  /**
   * Get all entity IDs that belong to a community
   */
  getMemberIds(communityId: EntityId): Promise<EntityId[]>;

  /**
   * Set parent-child relationship between communities
   */
  setParent(childId: EntityId, parentId: EntityId): Promise<void>;

  /**
   * Delete a community
   */
  delete(id: EntityId): Promise<boolean>;

  /**
   * Delete all communities (for re-detection)
   */
  deleteAll(): Promise<number>;

  /**
   * Check if a community exists
   */
  exists(id: EntityId): Promise<boolean>;

  /**
   * Count communities, optionally by level
   */
  count(level?: number): Promise<number>;

  /**
   * Update community summary
   */
  updateSummary(id: EntityId, summary: string): Promise<void>;
}
