import type {
  SupportedLanguage,
  TranslationResult,
  TranslationCacheEntry,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import crypto from 'node:crypto';

/**
 * Cache storage interface
 * ADR-009: Abstraction for SQLite/Redis hybrid
 */
export interface CacheStorage {
  get(key: string): Promise<TranslationCacheEntry | null>;
  set(entry: TranslationCacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<{ hits: number; misses: number; size: number }>;
}

/**
 * TranslationCache - Translation result caching
 *
 * ADR-009: SQLite (dev) + Redis (prod) hybrid cache
 */
export class TranslationCache {
  private readonly storage: CacheStorage;
  private hits = 0;
  private misses = 0;

  constructor(storage: CacheStorage) {
    this.storage = storage;
  }

  /**
   * Get cached translation
   *
   * @param text - Original text
   * @param sourceLanguage - Source language
   * @param targetLanguage - Target language
   * @returns Cached translation result or null
   */
  async get(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<TranslationResult | null> {
    const key = this.generateKey(text, sourceLanguage, targetLanguage);

    try {
      const entry = await this.storage.get(key);

      if (entry) {
        this.hits++;
        // Update access time
        entry.lastAccessedAt = new Date();
        entry.accessCount++;
        await this.storage.set(entry);

        return {
          original: entry.original,
          translated: entry.translated,
          sourceLanguage: entry.sourceLanguage,
          targetLanguage: entry.targetLanguage,
          provider: entry.provider,
          cached: true,
          timestamp: entry.createdAt,
        };
      }

      this.misses++;
      return null;
    } catch (error) {
      console.error('[TranslationCache] Get error:', error);
      this.misses++;
      return null;
    }
  }

  /**
   * Cache a translation result
   *
   * @param result - Translation result to cache
   */
  async set(result: TranslationResult): Promise<void> {
    const key = this.generateKey(
      result.original,
      result.sourceLanguage,
      result.targetLanguage
    );

    const entry: TranslationCacheEntry = {
      key,
      original: result.original,
      translated: result.translated,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      provider: result.provider,
      createdAt: result.timestamp,
      lastAccessedAt: new Date(),
      accessCount: 1,
    };

    try {
      await this.storage.set(entry);
    } catch (error) {
      console.error('[TranslationCache] Set error:', error);
    }
  }

  /**
   * Delete a cached entry
   *
   * @param text - Original text
   * @param sourceLanguage - Source language
   * @param targetLanguage - Target language
   */
  async delete(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<void> {
    const key = this.generateKey(text, sourceLanguage, targetLanguage);
    await this.storage.delete(key);
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    await this.storage.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  }> {
    const storageStats = await this.storage.getStats();
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: storageStats.size,
    };
  }

  /**
   * Generate cache key from text and languages
   */
  private generateKey(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): string {
    const input = `${sourceLanguage}:${targetLanguage}:${text}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}

/**
 * In-memory cache storage for testing/development
 */
export class MemoryCacheStorage implements CacheStorage {
  private readonly cache = new Map<string, TranslationCacheEntry>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize ?? 10000;
  }

  async get(key: string): Promise<TranslationCacheEntry | null> {
    const entry = this.cache.get(key);
    if (entry) {
      this.hits++;
      return entry;
    }
    this.misses++;
    return null;
  }

  async set(entry: TranslationCacheEntry): Promise<void> {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(entry.key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }

  private findOldestEntry(): string | null {
    let oldest: { key: string; time: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      const time = entry.lastAccessedAt.getTime();
      if (!oldest || time < oldest.time) {
        oldest = { key, time };
      }
    }

    return oldest?.key ?? null;
  }
}

/**
 * SQLite cache storage for development
 * ADR-009: SQLite for local development
 */
export class SQLiteCacheStorage implements CacheStorage {
  private db: unknown; // Would be better-sqlite3 Database
  private readonly dbPath: string;
  private initialized = false;
  private hits = 0;
  private misses = 0;

  constructor(options: { dbPath?: string } = {}) {
    this.dbPath = options.dbPath ?? DEFAULT_CONFIG.SQLITE_PATH;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamically import better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);

      // Create table if not exists
      (this.db as { exec: (sql: string) => void }).exec(`
        CREATE TABLE IF NOT EXISTS translation_cache (
          key TEXT PRIMARY KEY,
          original TEXT NOT NULL,
          translated TEXT NOT NULL,
          source_language TEXT NOT NULL,
          target_language TEXT NOT NULL,
          provider TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_accessed_at TEXT NOT NULL,
          access_count INTEGER DEFAULT 1
        )
      `);

      this.initialized = true;
    } catch (error) {
      console.error('[SQLiteCacheStorage] Failed to initialize:', error);
      throw error;
    }
  }

  async get(key: string): Promise<TranslationCacheEntry | null> {
    await this.ensureInitialized();

    interface DbRow {
      key: string;
      original: string;
      translated: string;
      source_language: string;
      target_language: string;
      provider: string;
      created_at: string;
      last_accessed_at: string;
      access_count: number;
    }

    try {
      const stmt = (this.db as { prepare: (sql: string) => { get: (key: string) => DbRow | undefined } })
        .prepare('SELECT * FROM translation_cache WHERE key = ?');
      const row = stmt.get(key);

      if (row) {
        this.hits++;
        return {
          key: row.key,
          original: row.original,
          translated: row.translated,
          sourceLanguage: row.source_language as SupportedLanguage,
          targetLanguage: row.target_language as SupportedLanguage,
          provider: row.provider as 'deepl' | 'google',
          createdAt: new Date(row.created_at),
          lastAccessedAt: new Date(row.last_accessed_at),
          accessCount: row.access_count,
        };
      }

      this.misses++;
      return null;
    } catch (error) {
      console.error('[SQLiteCacheStorage] Get error:', error);
      return null;
    }
  }

  async set(entry: TranslationCacheEntry): Promise<void> {
    await this.ensureInitialized();

    interface PreparedStatement {
      run: (...args: unknown[]) => void;
    }

    try {
      const stmt = (this.db as { prepare: (sql: string) => PreparedStatement }).prepare(`
        INSERT OR REPLACE INTO translation_cache 
        (key, original, translated, source_language, target_language, provider, created_at, last_accessed_at, access_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        entry.key,
        entry.original,
        entry.translated,
        entry.sourceLanguage,
        entry.targetLanguage,
        entry.provider,
        entry.createdAt.toISOString(),
        entry.lastAccessedAt.toISOString(),
        entry.accessCount
      );
    } catch (error) {
      console.error('[SQLiteCacheStorage] Set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    interface PreparedStatement {
      run: (key: string) => void;
    }

    try {
      const stmt = (this.db as { prepare: (sql: string) => PreparedStatement })
        .prepare('DELETE FROM translation_cache WHERE key = ?');
      stmt.run(key);
    } catch (error) {
      console.error('[SQLiteCacheStorage] Delete error:', error);
    }
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      (this.db as { exec: (sql: string) => void }).exec('DELETE FROM translation_cache');
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      console.error('[SQLiteCacheStorage] Clear error:', error);
    }
  }

  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    await this.ensureInitialized();

    interface CountRow {
      count: number;
    }

    try {
      const stmt = (this.db as { prepare: (sql: string) => { get: () => CountRow } })
        .prepare('SELECT COUNT(*) as count FROM translation_cache');
      const row = stmt.get();

      return {
        hits: this.hits,
        misses: this.misses,
        size: row.count,
      };
    } catch (error) {
      console.error('[SQLiteCacheStorage] Stats error:', error);
      return { hits: this.hits, misses: this.misses, size: 0 };
    }
  }
}

/**
 * Redis cache storage for production
 * ADR-009: Redis for production environment
 */
export class RedisCacheStorage implements CacheStorage {
  private client: unknown; // Would be Redis client
  private readonly redisUrl: string;
  private readonly ttl: number;
  private initialized = false;
  private hits = 0;
  private misses = 0;

  constructor(options: { redisUrl?: string; ttl?: number } = {}) {
    this.redisUrl = options.redisUrl ?? DEFAULT_CONFIG.REDIS_URL;
    this.ttl = options.ttl ?? DEFAULT_CONFIG.CACHE_TTL;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamically import redis
      const redis = await import('redis');
      this.client = redis.createClient({ url: this.redisUrl });
      await (this.client as { connect: () => Promise<void> }).connect();
      this.initialized = true;
    } catch (error) {
      console.error('[RedisCacheStorage] Failed to initialize:', error);
      throw error;
    }
  }

  async get(key: string): Promise<TranslationCacheEntry | null> {
    await this.ensureInitialized();

    try {
      const data = await (this.client as { get: (key: string) => Promise<string | null> }).get(
        `translation:${key}`
      );

      if (data) {
        this.hits++;
        return JSON.parse(data) as TranslationCacheEntry;
      }

      this.misses++;
      return null;
    } catch (error) {
      console.error('[RedisCacheStorage] Get error:', error);
      return null;
    }
  }

  async set(entry: TranslationCacheEntry): Promise<void> {
    await this.ensureInitialized();

    try {
      await (this.client as { 
        setEx: (key: string, ttl: number, value: string) => Promise<void> 
      }).setEx(
        `translation:${entry.key}`,
        this.ttl,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('[RedisCacheStorage] Set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await (this.client as { del: (key: string) => Promise<void> }).del(`translation:${key}`);
    } catch (error) {
      console.error('[RedisCacheStorage] Delete error:', error);
    }
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get all translation keys and delete them
      const keys = await (this.client as { 
        keys: (pattern: string) => Promise<string[]> 
      }).keys('translation:*');
      
      if (keys.length > 0) {
        await (this.client as { del: (keys: string[]) => Promise<void> }).del(keys);
      }
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      console.error('[RedisCacheStorage] Clear error:', error);
    }
  }

  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    await this.ensureInitialized();

    try {
      const keys = await (this.client as { 
        keys: (pattern: string) => Promise<string[]> 
      }).keys('translation:*');

      return {
        hits: this.hits,
        misses: this.misses,
        size: keys.length,
      };
    } catch (error) {
      console.error('[RedisCacheStorage] Stats error:', error);
      return { hits: this.hits, misses: this.misses, size: 0 };
    }
  }
}
