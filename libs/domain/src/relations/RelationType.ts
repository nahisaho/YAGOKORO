/**
 * Relation Types for the Knowledge Graph
 *
 * These types define the relationships between entities in the
 * Generative AI genealogy knowledge graph.
 */

/**
 * All possible relation types in the knowledge graph
 */
export type RelationType =
  // Model relationships
  | 'DEVELOPED_BY' // AIModel -> Organization
  | 'TRAINED_ON' // AIModel -> Dataset
  | 'USES_TECHNIQUE' // AIModel -> Technique
  | 'SUCCESSOR_OF' // AIModel -> AIModel
  | 'VARIANT_OF' // AIModel -> AIModel
  | 'FINE_TUNED_FROM' // AIModel -> AIModel
  | 'EVALUATED_ON' // AIModel -> Benchmark
  | 'DESCRIBED_IN' // AIModel -> Publication

  // Person relationships
  | 'AUTHORED' // Person -> Publication
  | 'INVENTED' // Person -> Technique
  | 'AFFILIATED_WITH' // Person -> Organization
  | 'CONTRIBUTED_TO' // Person -> AIModel

  // Organization relationships
  | 'COLLABORATED_WITH' // Organization -> Organization
  | 'ACQUIRED' // Organization -> Organization
  | 'FUNDED' // Organization -> AIModel

  // Technique relationships
  | 'IMPROVES_UPON' // Technique -> Technique
  | 'DERIVED_FROM' // Technique -> Technique
  | 'APPLIED_IN' // Technique -> AIModel
  | 'INTRODUCED_IN' // Technique -> Publication

  // Concept relationships
  | 'RELATED_TO' // Concept -> Concept
  | 'SUBCONCEPT_OF' // Concept -> Concept
  | 'EXEMPLIFIED_BY' // Concept -> AIModel

  // Publication relationships
  | 'CITES' // Publication -> Publication
  | 'EXTENDS' // Publication -> Publication

  // Community relationships
  | 'MEMBER_OF' // Entity -> Community
  | 'PARENT_COMMUNITY'; // Community -> Community

/**
 * Relation properties with source, target, and metadata
 */
export interface Relation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  confidence: number;
  properties?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Relation creation input
 */
export interface CreateRelationInput {
  type: RelationType;
  sourceId: string;
  targetId: string;
  confidence?: number;
  properties?: Record<string, unknown>;
}

/**
 * Edge data for graph traversal
 */
export interface GraphEdge {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  weight: number;
  properties?: Record<string, unknown>;
}

/**
 * Helper function to validate relation type
 */
export function isValidRelationType(type: string): type is RelationType {
  const validTypes: RelationType[] = [
    'DEVELOPED_BY',
    'TRAINED_ON',
    'USES_TECHNIQUE',
    'SUCCESSOR_OF',
    'VARIANT_OF',
    'FINE_TUNED_FROM',
    'EVALUATED_ON',
    'DESCRIBED_IN',
    'AUTHORED',
    'INVENTED',
    'AFFILIATED_WITH',
    'CONTRIBUTED_TO',
    'COLLABORATED_WITH',
    'ACQUIRED',
    'FUNDED',
    'IMPROVES_UPON',
    'DERIVED_FROM',
    'APPLIED_IN',
    'INTRODUCED_IN',
    'RELATED_TO',
    'SUBCONCEPT_OF',
    'EXEMPLIFIED_BY',
    'CITES',
    'EXTENDS',
    'MEMBER_OF',
    'PARENT_COMMUNITY',
  ];
  return validTypes.includes(type as RelationType);
}
