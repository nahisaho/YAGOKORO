import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantConfigError } from '@yagokoro/domain';

/**
 * Qdrant connection configuration
 */
export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Qdrant Connection Manager
 *
 * Manages the Qdrant client instance and provides connection utilities.
 */
export class QdrantConnection {
  private client: QdrantClient | null = null;
  private readonly config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Create connection from URL string
   */
  static fromUrl(url: string, apiKey?: string): QdrantConnection {
    const config: QdrantConfig = { url };
    if (apiKey) {
      config.apiKey = apiKey;
    }
    return new QdrantConnection(config);
  }

  /**
   * Create connection from environment variables
   */
  static fromEnv(): QdrantConnection {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
      throw new QdrantConfigError(['QDRANT_URL']);
    }

    const config: QdrantConfig = { url };
    if (apiKey) {
      config.apiKey = apiKey;
    }
    return new QdrantConnection(config);
  }

  /**
   * Get or create the Qdrant client
   */
  getClient(): QdrantClient {
    if (!this.client) {
      const clientOptions: { url: string; apiKey?: string; timeout?: number } = {
        url: this.config.url,
      };
      if (this.config.apiKey) {
        clientOptions.apiKey = this.config.apiKey;
      }
      if (this.config.timeout) {
        clientOptions.timeout = this.config.timeout;
      }
      this.client = new QdrantClient(clientOptions);
    }
    return this.client;
  }

  /**
   * Get the URL
   */
  getUrl(): string {
    return this.config.url;
  }

  /**
   * Check if Qdrant is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the connection (cleanup)
   */
  close(): void {
    this.client = null;
  }
}
