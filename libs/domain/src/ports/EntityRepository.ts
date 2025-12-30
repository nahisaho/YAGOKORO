import type { AIModel } from '../entities/AIModel.js';
import type { Benchmark } from '../entities/Benchmark.js';
import type { Community } from '../entities/Community.js';
import type { Concept } from '../entities/Concept.js';
import type { Organization } from '../entities/Organization.js';
import type { Person } from '../entities/Person.js';
import type { Publication } from '../entities/Publication.js';
import type { Technique } from '../entities/Technique.js';
import type { EntityId } from '../value-objects/EntityId.js';

/**
 * Union type of all domain entities
 */
export type DomainEntity =
  | AIModel
  | Organization
  | Technique
  | Publication
  | Person
  | Benchmark
  | Concept
  | Community;

/**
 * Entity type discriminator
 */
export type EntityType =
  | 'AIModel'
  | 'Organization'
  | 'Technique'
  | 'Publication'
  | 'Person'
  | 'Benchmark'
  | 'Concept'
  | 'Community';

/**
 * Query filter for entity searches
 */
export interface EntityFilter {
  entityType?: EntityType;
  ids?: string[];
  nameContains?: string;
  limit?: number;
  offset?: number;
}

/**
 * Entity Repository Port (Output Port)
 *
 * Defines the interface for persisting and retrieving entities from the knowledge graph.
 * This is implemented by Neo4j adapter.
 */
export interface EntityRepository {
  /**
   * Save an entity to the repository
   */
  save(entity: DomainEntity): Promise<void>;

  /**
   * Save multiple entities in a batch
   */
  saveMany(entities: DomainEntity[]): Promise<void>;

  /**
   * Find an entity by ID
   */
  findById(id: EntityId): Promise<DomainEntity | null>;

  /**
   * Find entities by filter criteria
   */
  findByFilter(filter: EntityFilter): Promise<DomainEntity[]>;

  /**
   * Find all entities of a specific type
   */
  findByType(type: EntityType, limit?: number, offset?: number): Promise<DomainEntity[]>;

  /**
   * Search entities by name
   */
  findByName(name: string, entityType?: EntityType): Promise<DomainEntity[]>;

  /**
   * Delete an entity by ID
   */
  delete(id: EntityId): Promise<boolean>;

  /**
   * Check if an entity exists
   */
  exists(id: EntityId): Promise<boolean>;

  /**
   * Count entities by type
   */
  count(entityType?: EntityType): Promise<number>;
}
