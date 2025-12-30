/**
 * CLI Configuration Types
 */

/**
 * Database configuration for CLI commands
 */
export interface DatabaseConfig {
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database?: string;
  };
  qdrant: {
    url: string;
    apiKey?: string;
    collectionName: string;
  };
}

/**
 * LLM configuration for CLI commands
 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Full CLI configuration
 */
export interface CLIConfig {
  database: DatabaseConfig;
  llm: LLMConfig;
  workspace?: string;
}

/**
 * Graph statistics result
 */
export interface GraphStats {
  entityCount: number;
  relationCount: number;
  communityCount: number;
  entityTypes: Record<string, number>;
  relationTypes: Record<string, number>;
  avgRelationsPerEntity: number;
}

/**
 * Import/Export options
 */
export interface ImportOptions {
  format: 'json' | 'csv' | 'graphml';
  filePath: string;
  merge?: boolean;
  dryRun?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'graphml';
  outputPath: string;
  entityTypes?: string[];
  relationTypes?: string[];
  includeProperties?: boolean;
}

/**
 * Query result
 */
export interface QueryResult {
  entities: Array<{
    id: string;
    name: string;
    type: string;
    properties?: Record<string, unknown>;
  }>;
  relations: Array<{
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
  }>;
  executionTime: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'error' | 'warning';
    message: string;
    entityId?: string;
    relationId?: string;
  }>;
  stats: {
    entitiesChecked: number;
    relationsChecked: number;
    orphanedEntities: number;
    danglingRelations: number;
  };
}

/**
 * Ingest options
 */
export interface IngestOptions {
  source: string;
  format: 'text' | 'json' | 'markdown' | 'html';
  chunkSize?: number;
  chunkOverlap?: number;
  extractEntities?: boolean;
  extractRelations?: boolean;
  detectCommunities?: boolean;
}

/**
 * Ingest result
 */
export interface IngestResult {
  documentsProcessed: number;
  entitiesCreated: number;
  relationsCreated: number;
  communitiesDetected: number;
  duration: number;
  errors: string[];
}
