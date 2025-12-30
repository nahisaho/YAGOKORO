/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
}

/**
 * Vector upsert input
 */
export interface VectorUpsertInput {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
}

/**
 * Vector Store Port (Output Port)
 *
 * Defines the interface for vector storage and similarity search.
 * This is implemented by Qdrant adapter.
 */
export interface VectorStore {
  /**
   * Upsert a vector with its associated ID and payload
   */
  upsert(input: VectorUpsertInput): Promise<void>;

  /**
   * Upsert multiple vectors in a batch
   */
  upsertMany(inputs: VectorUpsertInput[]): Promise<void>;

  /**
   * Search for similar vectors
   */
  search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Search by ID (retrieve the vector for an entity)
   */
  getById(id: string): Promise<VectorUpsertInput | null>;

  /**
   * Delete a vector by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete multiple vectors by IDs
   */
  deleteMany(ids: string[]): Promise<number>;

  /**
   * Check if a vector exists for an ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total vectors in the store
   */
  count(): Promise<number>;

  /**
   * Create collection if not exists
   */
  ensureCollection(dimension: number): Promise<void>;
}
