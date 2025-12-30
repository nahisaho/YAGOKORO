import type {
  VectorSearchOptions,
  VectorSearchResult,
  VectorStore,
  VectorUpsertInput,
} from '@yagokoro/domain';
import type { QdrantConnection } from '../connection/QdrantConnection.js';

/**
 * Qdrant Vector Store Implementation
 *
 * Implements the VectorStore port for Qdrant vector database.
 */
export class QdrantVectorStore implements VectorStore {
  constructor(
    private readonly connection: QdrantConnection,
    private readonly collectionName: string
  ) {}

  async upsert(input: VectorUpsertInput): Promise<void> {
    const client = this.connection.getClient();
    const point: { id: string; vector: number[]; payload?: Record<string, unknown> } = {
      id: input.id,
      vector: input.vector,
    };
    if (input.payload) {
      point.payload = input.payload;
    }
    await client.upsert(this.collectionName, {
      wait: true,
      points: [point],
    });
  }

  async upsertMany(inputs: VectorUpsertInput[]): Promise<void> {
    if (inputs.length === 0) return;

    const client = this.connection.getClient();
    const points = inputs.map((input) => {
      const point: { id: string; vector: number[]; payload?: Record<string, unknown> } = {
        id: input.id,
        vector: input.vector,
      };
      if (input.payload) {
        point.payload = input.payload;
      }
      return point;
    });

    // Batch in chunks of 100
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await client.upsert(this.collectionName, {
        wait: true,
        points: batch,
      });
    }
  }

  async search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const client = this.connection.getClient();
    const limit = options?.limit ?? 10;

    const searchParams: {
      vector: number[];
      limit: number;
      filter?: Record<string, unknown>;
      with_payload: boolean;
    } = {
      vector,
      limit,
      with_payload: true,
    };

    if (options?.filter) {
      searchParams.filter = options.filter;
    }

    const results = await client.search(this.collectionName, searchParams);

    let searchResults: VectorSearchResult[] = results.map((result) => {
      const searchResult: VectorSearchResult = {
        id: result.id as string,
        score: result.score,
      };
      if (result.payload) {
        searchResult.payload = result.payload as Record<string, unknown>;
      }
      return searchResult;
    });

    // Apply score threshold if specified
    if (options?.scoreThreshold !== undefined) {
      const threshold = options.scoreThreshold;
      searchResults = searchResults.filter((r) => r.score >= threshold);
    }

    return searchResults;
  }

  async getById(id: string): Promise<VectorUpsertInput | null> {
    const client = this.connection.getClient();
    const results = await client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });

    if (results.length === 0) return null;

    const point = results[0];
    if (!point) return null;
    
    const result: VectorUpsertInput = {
      id: point.id as string,
      vector: point.vector as number[],
    };
    if (point.payload) {
      result.payload = point.payload as Record<string, unknown>;
    }
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.connection.getClient();
    await client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
    return true;
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const client = this.connection.getClient();
    await client.delete(this.collectionName, {
      wait: true,
      points: ids,
    });
    return ids.length;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.getById(id);
    return result !== null;
  }

  async count(): Promise<number> {
    const client = this.connection.getClient();
    const result = await client.count(this.collectionName);
    return result.count;
  }

  async ensureCollection(dimension: number): Promise<void> {
    const client = this.connection.getClient();
    const exists = await client.collectionExists(this.collectionName);

    if (!exists.exists) {
      await client.createCollection(this.collectionName, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
      });
    }
  }
}
