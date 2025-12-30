/**
 * AliasTableManager - Manages entity alias mappings
 * 
 * Stores and retrieves alias-to-canonical mappings in Neo4j.
 * Supports caching for performance.
 */

import type { NormalizationStage } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Single alias entry
 */
export interface AliasEntry {
  /** The alias (variant form) */
  alias: string;
  /** The canonical (normalized) form */
  canonical: string;
  /** Confidence score for this mapping (0.0 - 1.0) */
  confidence: number;
  /** How this alias was created */
  source: NormalizationStage | 'import';
  /** When this alias was created */
  createdAt: Date;
  /** When this alias was last updated */
  updatedAt: Date;
}

/**
 * Configuration for AliasTableManager
 */
export interface AliasTableConfig {
  /** Whether to enable caching */
  cacheEnabled?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Maximum cache size */
  maxCacheSize?: number;
}

/**
 * Interface for Neo4j connection
 */
export interface Neo4jConnection {
  run(query: string, params?: Record<string, unknown>): Promise<Neo4jResult>;
  close(): Promise<void>;
}

interface Neo4jResult {
  records: Neo4jRecord[];
}

interface Neo4jRecord {
  get(key: string): unknown;
  toObject(): Record<string, unknown>;
}

// ============================================================================
// AliasTableManager Class
// ============================================================================

/**
 * Manages alias-to-canonical entity mappings
 * 
 * @example
 * ```typescript
 * const manager = new AliasTableManager(neo4jConnection);
 * await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
 * const canonical = await manager.resolveAlias('GPT4');
 * console.log(canonical); // 'GPT-4'
 * ```
 */
export class AliasTableManager {
  private neo4jConnection: Neo4jConnection | null;
  private config: Required<AliasTableConfig>;
  private cache: Map<string, AliasEntry>;
  private cacheTimestamps: Map<string, number>;

  constructor(
    neo4jConnection: Neo4jConnection | null = null,
    config: AliasTableConfig = {}
  ) {
    this.neo4jConnection = neo4jConnection;
    this.config = {
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL ?? 3600000, // 1 hour default
      maxCacheSize: config.maxCacheSize ?? 10000,
    };
    this.cache = new Map();
    this.cacheTimestamps = new Map();
  }

  /**
   * Register a new alias mapping
   */
  async registerAlias(
    alias: string,
    canonical: string,
    confidence: number,
    source: NormalizationStage | 'import'
  ): Promise<AliasEntry> {
    const now = new Date();
    const entry: AliasEntry = {
      alias: alias.trim(),
      canonical: canonical.trim(),
      confidence,
      source,
      createdAt: now,
      updatedAt: now,
    };

    // Store in Neo4j if connected
    if (this.neo4jConnection) {
      await this.storeInNeo4j(entry);
    }

    // Update cache
    if (this.config.cacheEnabled) {
      this.setCache(alias, entry);
    }

    return entry;
  }

  /**
   * Resolve an alias to its canonical form
   */
  async resolveAlias(alias: string): Promise<string | null> {
    const normalizedAlias = alias.trim().toLowerCase();

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(alias);
      if (cached) {
        return cached.canonical;
      }
    }

    // Query Neo4j
    if (this.neo4jConnection) {
      const entry = await this.loadFromNeo4j(normalizedAlias);
      if (entry) {
        if (this.config.cacheEnabled) {
          this.setCache(alias, entry);
        }
        return entry.canonical;
      }
    }

    return null;
  }

  /**
   * Get full alias entry
   */
  async getAliasEntry(alias: string): Promise<AliasEntry | null> {
    const normalizedAlias = alias.trim().toLowerCase();

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(alias);
      if (cached) {
        return cached;
      }
    }

    // Query Neo4j
    if (this.neo4jConnection) {
      return await this.loadFromNeo4j(normalizedAlias);
    }

    return null;
  }

  /**
   * Get all aliases for a canonical form
   */
  async getAliasesFor(canonical: string): Promise<AliasEntry[]> {
    if (!this.neo4jConnection) {
      // Return from cache if no DB connection
      const entries: AliasEntry[] = [];
      for (const entry of this.cache.values()) {
        if (entry.canonical.toLowerCase() === canonical.toLowerCase()) {
          entries.push(entry);
        }
      }
      return entries;
    }

    const query = `
      MATCH (a:Alias {canonical: $canonical})
      RETURN a.alias as alias, a.canonical as canonical, 
             a.confidence as confidence, a.source as source,
             a.createdAt as createdAt, a.updatedAt as updatedAt
    `;

    const result = await this.neo4jConnection.run(query, { canonical });
    return result.records.map(r => this.recordToEntry(r));
  }

  /**
   * Delete an alias
   */
  async deleteAlias(alias: string): Promise<boolean> {
    const normalizedAlias = alias.trim().toLowerCase();

    // Remove from cache
    const wasInCache = this.cache.has(normalizedAlias);
    this.cache.delete(normalizedAlias);
    this.cacheTimestamps.delete(normalizedAlias);

    // Remove from Neo4j
    if (this.neo4jConnection) {
      const query = `
        MATCH (a:Alias {aliasLower: $aliasLower})
        WITH a, a.alias as aliasName
        DELETE a
        RETURN aliasName
      `;
      const result = await this.neo4jConnection.run(query, { aliasLower: normalizedAlias });
      return result.records.length > 0;
    }

    return wasInCache;
  }

  /**
   * Bulk register aliases
   */
  async registerAliases(entries: Array<{
    alias: string;
    canonical: string;
    confidence: number;
    source: NormalizationStage | 'import';
  }>): Promise<number> {
    let count = 0;
    
    if (this.neo4jConnection) {
      // Use batch insert for Neo4j
      const query = `
        UNWIND $entries as entry
        MERGE (a:Alias {aliasLower: toLower(trim(entry.alias))})
        SET a.alias = trim(entry.alias),
            a.canonical = trim(entry.canonical),
            a.confidence = entry.confidence,
            a.source = entry.source,
            a.updatedAt = datetime()
        ON CREATE SET a.createdAt = datetime()
        RETURN count(a) as count
      `;

      const result = await this.neo4jConnection.run(query, { entries });
      count = result.records[0]?.get('count') as number ?? entries.length;
    }

    // Update cache
    if (this.config.cacheEnabled) {
      for (const entry of entries) {
        const aliasEntry: AliasEntry = {
          ...entry,
          alias: entry.alias.trim(),
          canonical: entry.canonical.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.setCache(entry.alias, aliasEntry);
        count++;
      }
    }

    return count;
  }

  /**
   * Load all aliases into cache
   */
  async loadCache(): Promise<number> {
    if (!this.neo4jConnection) {
      return 0;
    }

    const query = `
      MATCH (a:Alias)
      RETURN a.alias as alias, a.canonical as canonical,
             a.confidence as confidence, a.source as source,
             a.createdAt as createdAt, a.updatedAt as updatedAt
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(query, { 
      limit: this.config.maxCacheSize 
    });

    let count = 0;
    for (const record of result.records) {
      const entry = this.recordToEntry(record);
      this.setCache(entry.alias, entry);
      count++;
    }

    return count;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; enabled: boolean } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      enabled: this.config.cacheEnabled,
    };
  }

  /**
   * Export all aliases to array
   */
  async exportAliases(): Promise<AliasEntry[]> {
    if (this.neo4jConnection) {
      const query = `
        MATCH (a:Alias)
        RETURN a.alias as alias, a.canonical as canonical,
               a.confidence as confidence, a.source as source,
               a.createdAt as createdAt, a.updatedAt as updatedAt
      `;
      const result = await this.neo4jConnection.run(query);
      return result.records.map(r => this.recordToEntry(r));
    }

    return Array.from(this.cache.values());
  }

  /**
   * Get Neo4j connection (for external use)
   */
  getNeo4jConnection(): Neo4jConnection | null {
    return this.neo4jConnection;
  }

  /**
   * Set Neo4j connection
   */
  setNeo4jConnection(connection: Neo4jConnection): void {
    this.neo4jConnection = connection;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async storeInNeo4j(entry: AliasEntry): Promise<void> {
    if (!this.neo4jConnection) return;

    const query = `
      MERGE (a:Alias {aliasLower: toLower($alias)})
      SET a.alias = $alias,
          a.canonical = $canonical,
          a.confidence = $confidence,
          a.source = $source,
          a.updatedAt = datetime()
      ON CREATE SET a.createdAt = datetime()
    `;

    await this.neo4jConnection.run(query, {
      alias: entry.alias,
      canonical: entry.canonical,
      confidence: entry.confidence,
      source: entry.source,
    });
  }

  private async loadFromNeo4j(aliasLower: string): Promise<AliasEntry | null> {
    if (!this.neo4jConnection) return null;

    const query = `
      MATCH (a:Alias {aliasLower: $aliasLower})
      RETURN a.alias as alias, a.canonical as canonical,
             a.confidence as confidence, a.source as source,
             a.createdAt as createdAt, a.updatedAt as updatedAt
    `;

    const result = await this.neo4jConnection.run(query, { aliasLower });
    
    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    if (!record) {
      return null;
    }

    return this.recordToEntry(record);
  }

  private recordToEntry(record: Neo4jRecord): AliasEntry {
    return {
      alias: record.get('alias') as string,
      canonical: record.get('canonical') as string,
      confidence: record.get('confidence') as number ?? 0.5,
      source: record.get('source') as NormalizationStage | 'import' ?? 'import',
      createdAt: new Date(record.get('createdAt') as string ?? Date.now()),
      updatedAt: new Date(record.get('updatedAt') as string ?? Date.now()),
    };
  }

  private setCache(alias: string, entry: AliasEntry): void {
    const key = alias.trim().toLowerCase();
    
    // Evict if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.cacheTimestamps.set(key, Date.now());
  }

  private getFromCache(alias: string): AliasEntry | null {
    const key = alias.trim().toLowerCase();
    const timestamp = this.cacheTimestamps.get(key);
    
    if (!timestamp) {
      return null;
    }

    // Check TTL
    if (Date.now() - timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return this.cache.get(key) ?? null;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.cacheTimestamps) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
  }
}
