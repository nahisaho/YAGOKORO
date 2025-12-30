/**
 * @fileoverview Schema Provider for NLQ
 * @description Provides and caches Neo4j graph schema for LLM prompt generation
 * @module @yagokoro/nlq/schema-provider
 */

import type { GraphSchema } from './types.js';

/**
 * Configuration for SchemaProvider
 */
export interface SchemaProviderConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
}

/**
 * Neo4j connection interface (port)
 * Allows dependency injection for testing
 */
export interface Neo4jConnectionPort {
  executeRead<T>(query: string, params?: Record<string, unknown>): Promise<T[]>;
  isConnected(): boolean;
}

/**
 * SchemaProvider - Fetches and caches Neo4j graph schema
 *
 * Provides schema information for LLM prompt construction.
 * Implements caching to minimize database queries.
 *
 * @example
 * ```typescript
 * const provider = new SchemaProvider(neo4jConnection);
 * const schema = await provider.getSchema();
 * const prompt = provider.formatForPrompt(schema);
 * ```
 */
export class SchemaProvider {
  private cache: GraphSchema | null = null;
  private cacheTime = 0;
  private readonly cacheTTL: number;

  constructor(
    private readonly neo4j: Neo4jConnectionPort,
    config: SchemaProviderConfig = {}
  ) {
    this.cacheTTL = config.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get the current graph schema
   *
   * Returns cached schema if still valid, otherwise fetches from Neo4j.
   *
   * @returns Promise<GraphSchema> The graph schema
   * @throws Error if not connected to Neo4j
   */
  async getSchema(): Promise<GraphSchema> {
    // Return cached schema if still valid
    if (this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }

    // Fetch fresh schema from Neo4j
    this.cache = await this.fetchSchema();
    this.cacheTime = Date.now();
    return this.cache;
  }

  /**
   * Invalidate the cached schema
   *
   * Forces the next getSchema() call to fetch fresh data.
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }

  /**
   * Check if schema is cached and valid
   */
  isCacheValid(): boolean {
    return this.cache !== null && Date.now() - this.cacheTime < this.cacheTTL;
  }

  /**
   * Format schema for LLM prompt
   *
   * Generates a human-readable schema description for use in LLM prompts.
   *
   * @param schema The graph schema to format
   * @returns Formatted schema string
   */
  formatForPrompt(schema: GraphSchema): string {
    const lines: string[] = [];

    // Node labels section
    lines.push('## ノードラベル (Node Labels)');
    for (const label of schema.nodeLabels) {
      const properties = schema.propertyKeys[label] || [];
      if (properties.length > 0) {
        lines.push(`- ${label}: [${properties.join(', ')}]`);
      } else {
        lines.push(`- ${label}`);
      }
    }

    lines.push('');

    // Relation types section
    lines.push('## リレーションタイプ (Relation Types)');
    for (const relType of schema.relationTypes) {
      lines.push(`- ${relType}`);
    }

    return lines.join('\n');
  }

  /**
   * Format schema as compact JSON for LLM prompt
   *
   * @param schema The graph schema to format
   * @returns JSON string representation
   */
  formatAsJson(schema: GraphSchema): string {
    return JSON.stringify(schema, null, 2);
  }

  /**
   * Fetch schema from Neo4j
   */
  private async fetchSchema(): Promise<GraphSchema> {
    if (!this.neo4j.isConnected()) {
      throw new Error('Not connected to Neo4j');
    }

    // Fetch node labels
    const nodeLabels = await this.fetchNodeLabels();

    // Fetch relation types
    const relationTypes = await this.fetchRelationTypes();

    // Fetch property keys for each node label
    const propertyKeys = await this.fetchPropertyKeys(nodeLabels);

    return {
      nodeLabels,
      relationTypes,
      propertyKeys,
    };
  }

  /**
   * Fetch all node labels from Neo4j
   */
  private async fetchNodeLabels(): Promise<string[]> {
    const query = 'CALL db.labels() YIELD label RETURN label ORDER BY label';
    const results = await this.neo4j.executeRead<{ label: string }>(query);
    return results.map((r) => r.label);
  }

  /**
   * Fetch all relationship types from Neo4j
   */
  private async fetchRelationTypes(): Promise<string[]> {
    const query = 'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType';
    const results = await this.neo4j.executeRead<{ relationshipType: string }>(query);
    return results.map((r) => r.relationshipType);
  }

  /**
   * Fetch property keys for given node labels
   *
   * Uses APOC if available, falls back to sampling otherwise.
   */
  private async fetchPropertyKeys(labels: string[]): Promise<Record<string, string[]>> {
    const propertyKeys: Record<string, string[]> = {};

    for (const label of labels) {
      try {
        // Try using APOC for efficient property key retrieval
        const apocQuery = `
          CALL apoc.meta.nodeTypeProperties()
          YIELD nodeType, propertyName
          WHERE nodeType = $label
          RETURN propertyName
          ORDER BY propertyName
        `;
        const results = await this.neo4j.executeRead<{ propertyName: string }>(
          apocQuery,
          { label: `:\`${label}\`` }
        );
        propertyKeys[label] = results.map((r) => r.propertyName);
      } catch {
        // Fallback: sample nodes to get property keys
        propertyKeys[label] = await this.samplePropertyKeys(label);
      }
    }

    return propertyKeys;
  }

  /**
   * Sample property keys from nodes (fallback method)
   */
  private async samplePropertyKeys(label: string): Promise<string[]> {
    const query = `
      MATCH (n:\`${label}\`)
      WITH n LIMIT 10
      UNWIND keys(n) AS key
      RETURN DISTINCT key
      ORDER BY key
    `;
    const results = await this.neo4j.executeRead<{ key: string }>(query);
    return results.map((r) => r.key);
  }
}
