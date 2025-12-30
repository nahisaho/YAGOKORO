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
  | 'SPECIALIZES_IN' // Person -> Field/Topic (v3)

  // Organization relationships
  | 'COLLABORATED_WITH' // Organization -> Organization
  | 'ACQUIRED' // Organization -> Organization
  | 'FUNDED' // Organization -> AIModel
  | 'COMPETES_WITH' // Organization -> Organization (v3)

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
  | 'PARENT_COMMUNITY' // Community -> Community

  // v3 new types for auto-extraction
  | 'INFLUENCED_BY' // Entity -> Entity (influence relationship)
  | 'EVOLVED_INTO' // Entity -> Entity (evolution/succession)
  | 'BASED_ON'; // Entity -> Entity (foundation/basis)

/**
 * Review status for relations (v3 HITL support)
 */
export type ReviewStatus =
  | 'pending' // Awaiting review
  | 'approved' // Auto or human approved
  | 'rejected' // Rejected by human
  | 'modified'; // Human modified

/**
 * Extraction method for relations (v3)
 */
export type ExtractionMethod =
  | 'manual' // Manually created
  | 'cooccurrence' // Co-occurrence analysis
  | 'pattern' // Pattern matching
  | 'llm' // LLM inference
  | 'hybrid'; // Combined methods

/**
 * Evidence for extracted relation (v3)
 */
export interface RelationEvidence {
  /** Source document ID */
  documentId: string;
  /** Position in document */
  position?: number;
  /** Context snippet */
  context: string;
  /** Method used to extract */
  method: ExtractionMethod;
  /** Raw confidence from method */
  rawConfidence: number;
} // Community -> Community

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

  // v3 HITL fields
  /** Review status for HITL workflow */
  reviewStatus?: ReviewStatus;
  /** Whether relation needs human review */
  needsReview?: boolean;
  /** How the relation was extracted */
  extractionMethod?: ExtractionMethod;
  /** Evidence supporting this relation */
  evidence?: RelationEvidence[];
  /** ID of reviewer (if manually reviewed) */
  reviewedBy?: string;
  /** Date of review */
  reviewedAt?: Date;
  /** Comments from reviewer */
  reviewComments?: string;
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
    // Model relationships
    'DEVELOPED_BY',
    'TRAINED_ON',
    'USES_TECHNIQUE',
    'SUCCESSOR_OF',
    'VARIANT_OF',
    'FINE_TUNED_FROM',
    'EVALUATED_ON',
    'DESCRIBED_IN',
    // Person relationships
    'AUTHORED',
    'INVENTED',
    'AFFILIATED_WITH',
    'CONTRIBUTED_TO',
    'SPECIALIZES_IN',
    // Organization relationships
    'COLLABORATED_WITH',
    'ACQUIRED',
    'FUNDED',
    'COMPETES_WITH',
    // Technique relationships
    'IMPROVES_UPON',
    'DERIVED_FROM',
    'APPLIED_IN',
    'INTRODUCED_IN',
    // Concept relationships
    'RELATED_TO',
    'SUBCONCEPT_OF',
    'EXEMPLIFIED_BY',
    // Publication relationships
    'CITES',
    'EXTENDS',
    // Community relationships
    'MEMBER_OF',
    'PARENT_COMMUNITY',
    // v3 new types
    'INFLUENCED_BY',
    'EVOLVED_INTO',
    'BASED_ON',
  ];
  return validTypes.includes(type as RelationType);
}

/**
 * Helper function to validate review status
 */
export function isValidReviewStatus(status: string): status is ReviewStatus {
  const validStatuses: ReviewStatus[] = ['pending', 'approved', 'rejected', 'modified'];
  return validStatuses.includes(status as ReviewStatus);
}

/**
 * Helper function to validate extraction method
 */
export function isValidExtractionMethod(method: string): method is ExtractionMethod {
  const validMethods: ExtractionMethod[] = [
    'manual',
    'cooccurrence',
    'pattern',
    'llm',
    'hybrid',
  ];
  return validMethods.includes(method as ExtractionMethod);
}
