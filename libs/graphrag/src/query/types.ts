/**
 * Query Types
 *
 * Types for query engines and response generation in GraphRAG.
 */

import type { RelationType } from '@yagokoro/domain';

/**
 * Query type indicating search strategy
 */
export type QueryType = 'local' | 'global' | 'hybrid';

/**
 * Search mode for hybrid queries
 */
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

/**
 * Community summary for global queries (query-specific version with relevance)
 */
export interface QueryCommunitySummary {
  /** Community ID */
  communityId: string;
  /** Community level */
  level: number;
  /** Summary text */
  summary: string;
  /** Key entities in community */
  keyEntities: string[];
  /** Relevance to query (0-1) */
  relevance: number;
}

/**
 * Source citation in a response
 */
export interface Citation {
  /** Source entity ID */
  entityId: string;
  /** Source entity name */
  entityName: string;
  /** Source type (entity, community, document) */
  sourceType: 'entity' | 'community' | 'document';
  /** Relevance score (0-1) */
  relevance: number;
  /** Excerpt or snippet from source */
  excerpt?: string;
}

/**
 * Query context containing relevant entities and relations
 */
export interface QueryContext {
  /** Relevant entities */
  entities: QueryEntity[];
  /** Relevant relations */
  relations: QueryRelation[];
  /** Community summaries */
  communitySummaries: QueryCommunitySummary[];
  /** Raw text chunks for context */
  textChunks: string[];
}

/**
 * Entity info for query context
 */
export interface QueryEntity {
  /** Entity ID */
  id: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: string;
  /** Entity description */
  description?: string;
  /** Relevance score to query (0-1) */
  relevance: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Relation info for query context
 */
export interface QueryRelation {
  /** Source entity ID */
  sourceId: string;
  /** Source entity name */
  sourceName: string;
  /** Target entity ID */
  targetId: string;
  /** Target entity name */
  targetName: string;
  /** Relation type */
  type: RelationType;
  /** Confidence score */
  confidence: number;
}

/**
 * Query request
 */
export interface QueryRequest {
  /** Natural language query */
  query: string;
  /** Query type (local, global, hybrid) */
  type?: QueryType;
  /** Maximum results to return */
  maxResults?: number;
  /** Minimum relevance threshold (0-1) */
  minRelevance?: number;
  /** Entity types to include (empty = all) */
  entityTypes?: string[];
  /** Include community summaries */
  includeCommunities?: boolean;
  /** Community level for global queries */
  communityLevel?: number;
  /** Search mode for hybrid queries */
  searchMode?: SearchMode;
  /** Conversation history for context */
  conversationHistory?: ConversationMessage[];
}

/**
 * Conversation message for context
 */
export interface ConversationMessage {
  /** Role (user, assistant, system) */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
}

/**
 * Query response
 */
export interface QueryResponse {
  /** Original query */
  query: string;
  /** Generated answer */
  answer: string;
  /** Query type used */
  queryType: QueryType;
  /** Citations supporting the answer */
  citations: Citation[];
  /** Context used for generation */
  context: QueryContext;
  /** Processing metrics */
  metrics: QueryMetrics;
  /** Whether query was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Query processing metrics
 */
export interface QueryMetrics {
  /** Total processing time in ms */
  totalTimeMs: number;
  /** Time spent on retrieval in ms */
  retrievalTimeMs: number;
  /** Time spent on generation in ms */
  generationTimeMs: number;
  /** Number of entities retrieved */
  entitiesRetrieved: number;
  /** Number of relations retrieved */
  relationsRetrieved: number;
  /** Number of communities consulted */
  communitiesConsulted: number;
  /** Token count for generation */
  tokenCount?: number;
}

/**
 * Local query options
 */
export interface LocalQueryOptions {
  /** Maximum entities to retrieve */
  maxEntities?: number;
  /** Maximum relations to retrieve */
  maxRelations?: number;
  /** Hop depth for local search */
  hopDepth?: number;
  /** Minimum similarity for vector search (0-1) */
  minSimilarity?: number;
}

/**
 * Global query options
 */
export interface GlobalQueryOptions {
  /** Community level to query */
  communityLevel?: number;
  /** Maximum communities to consider */
  maxCommunities?: number;
  /** Include child community details */
  includeChildren?: boolean;
  /** Map-reduce batch size */
  batchSize?: number;
}

/**
 * Hybrid query options
 */
export interface HybridQueryOptions extends LocalQueryOptions, GlobalQueryOptions {
  /** Weight for local results (0-1) */
  localWeight?: number;
  /** Weight for global results (0-1) */
  globalWeight?: number;
  /** Search mode */
  searchMode?: SearchMode;
}

/**
 * Entity retriever interface
 */
export interface EntityRetriever {
  /** Retrieve entities relevant to query */
  retrieve(query: string, options?: LocalQueryOptions): Promise<QueryEntity[]>;
  /** Retrieve entities by IDs */
  retrieveByIds(ids: string[]): Promise<QueryEntity[]>;
  /** Retrieve neighbors of an entity */
  retrieveNeighbors(entityId: string, depth?: number): Promise<QueryEntity[]>;
}

/**
 * Community retriever interface
 */
export interface CommunityRetriever {
  /** Retrieve communities at a level */
  retrieveByLevel(level: number, limit?: number): Promise<QueryCommunitySummary[]>;
  /** Retrieve communities relevant to query */
  retrieveRelevant(query: string, level?: number): Promise<QueryCommunitySummary[]>;
  /** Retrieve community by ID */
  retrieveById(communityId: string): Promise<QueryCommunitySummary | null>;
}

/**
 * Vector search interface
 */
export interface VectorSearcher {
  /** Search by text query */
  search(query: string, limit?: number, minSimilarity?: number): Promise<QueryEntity[]>;
  /** Search by embedding vector */
  searchByVector(vector: number[], limit?: number): Promise<QueryEntity[]>;
}

/**
 * Default query options
 */
export const DEFAULT_QUERY_OPTIONS = {
  maxResults: 10,
  minRelevance: 0.3,
  includeCommunities: true,
  communityLevel: 0,
  searchMode: 'hybrid' as SearchMode,
} as const;

/**
 * Default local query options
 */
export const DEFAULT_LOCAL_OPTIONS: Required<LocalQueryOptions> = {
  maxEntities: 20,
  maxRelations: 50,
  hopDepth: 2,
  minSimilarity: 0.5,
};

/**
 * Default global query options
 */
export const DEFAULT_GLOBAL_OPTIONS: Required<GlobalQueryOptions> = {
  communityLevel: 0,
  maxCommunities: 10,
  includeChildren: false,
  batchSize: 5,
};
