/**
 * Migration Runner for Neo4j Schema Updates
 *
 * Executes Cypher migration scripts against the Neo4j database.
 * Tracks executed migrations to prevent duplicate runs.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Neo4jConnection } from '../connection/Neo4jConnection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration metadata stored in Neo4j
 */
interface MigrationRecord {
  name: string;
  appliedAt: Date;
  checksum: string;
}

/**
 * Compute simple checksum for migration content
 */
function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Parse Cypher file into individual statements
 * Handles comments and multi-line statements
 */
function parseCypherStatements(content: string): string[] {
  // Remove single-line comments
  const withoutComments = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  // Split by semicolon, filter empty
  return withoutComments
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

/**
 * Neo4j Migration Runner
 */
export class MigrationRunner {
  private readonly migrationsPath: string;

  constructor(
    private readonly connection: Neo4jConnection,
    migrationsPath?: string,
  ) {
    this.migrationsPath = migrationsPath ?? join(__dirname, 'migrations');
  }

  /**
   * Initialize migration tracking node
   */
  private async ensureMigrationTracking(): Promise<void> {
    await this.connection.executeWrite(`
      MERGE (m:_Migration {type: 'tracker'})
      ON CREATE SET m.createdAt = datetime()
      RETURN m
    `);
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<Map<string, MigrationRecord>> {
    const results = await this.connection.executeRead<{
      name: string;
      appliedAt: { toStandardDate(): Date };
      checksum: string;
    }>(`
      MATCH (m:_MigrationRecord)
      RETURN m.name as name, m.appliedAt as appliedAt, m.checksum as checksum
      ORDER BY m.appliedAt
    `);

    const map = new Map<string, MigrationRecord>();
    for (const record of results) {
      map.set(record.name, {
        name: record.name,
        appliedAt: record.appliedAt.toStandardDate(),
        checksum: record.checksum,
      });
    }
    return map;
  }

  /**
   * Record migration as applied
   */
  private async recordMigration(name: string, checksum: string): Promise<void> {
    await this.connection.executeWrite(
      `
      CREATE (m:_MigrationRecord {
        name: $name,
        appliedAt: datetime(),
        checksum: $checksum
      })
    `,
      { name, checksum },
    );
  }

  /**
   * Get pending migration files
   */
  async getPendingMigrations(): Promise<string[]> {
    await this.ensureMigrationTracking();
    const applied = await this.getAppliedMigrations();

    const files = readdirSync(this.migrationsPath)
      .filter((f) => f.endsWith('.cypher'))
      .sort();

    return files.filter((f) => !applied.has(f));
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<{
    applied: string[];
    skipped: string[];
    errors: Array<{ file: string; error: string }>;
  }> {
    await this.ensureMigrationTracking();
    const appliedMap = await this.getAppliedMigrations();

    const files = readdirSync(this.migrationsPath)
      .filter((f) => f.endsWith('.cypher'))
      .sort();

    const result: {
      applied: string[];
      skipped: string[];
      errors: Array<{ file: string; error: string }>;
    } = {
      applied: [],
      skipped: [],
      errors: [],
    };

    for (const file of files) {
      const existing = appliedMap.get(file);
      const content = readFileSync(join(this.migrationsPath, file), 'utf-8');
      const checksum = computeChecksum(content);

      if (existing) {
        if (existing.checksum !== checksum) {
          result.errors.push({
            file,
            error: `Migration checksum mismatch. Expected: ${existing.checksum}, Got: ${checksum}. Migration may have been modified after application.`,
          });
        } else {
          result.skipped.push(file);
        }
        continue;
      }

      // Run migration
      const statements = parseCypherStatements(content);

      try {
        for (const stmt of statements) {
          await this.connection.executeWrite(stmt);
        }
        await this.recordMigration(file, checksum);
        result.applied.push(file);
      } catch (error) {
        result.errors.push({
          file,
          error: error instanceof Error ? error.message : String(error),
        });
        // Stop on first error
        break;
      }
    }

    return result;
  }

  /**
   * Run a specific migration file
   */
  async runMigration(filename: string): Promise<void> {
    const content = readFileSync(join(this.migrationsPath, filename), 'utf-8');
    const checksum = computeChecksum(content);
    const statements = parseCypherStatements(content);

    for (const stmt of statements) {
      await this.connection.executeWrite(stmt);
    }

    await this.recordMigration(filename, checksum);
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: MigrationRecord[];
    pending: string[];
  }> {
    await this.ensureMigrationTracking();
    const appliedMap = await this.getAppliedMigrations();

    const files = readdirSync(this.migrationsPath)
      .filter((f) => f.endsWith('.cypher'))
      .sort();

    const pending = files.filter((f) => !appliedMap.has(f));
    const applied = Array.from(appliedMap.values()).sort(
      (a, b) => a.appliedAt.getTime() - b.appliedAt.getTime(),
    );

    return { applied, pending };
  }
}

export { computeChecksum, parseCypherStatements };
