/**
 * @fileoverview Configuration loader for relation types
 * @module @yagokoro/extractor/config
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { RelationType, RELATION_TYPES, EntityType } from '@yagokoro/domain';

/**
 * Configuration for a single relation type
 */
export interface RelationTypeConfig {
  description: string;
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
  bidirectional: boolean;
  patterns?: string[];
  extractable: boolean;
  defaultConfidence?: number;
  conflictsWith?: RelationType[];
}

/**
 * Scoring weight configuration
 */
export interface ScoringWeights {
  cooccurrence: number;
  llm: number;
  source: number;
  graph: number;
}

/**
 * HITL threshold configuration
 */
export interface ScoringThresholds {
  autoApprove: number;
  review: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  weights: ScoringWeights;
  thresholds: ScoringThresholds;
}

/**
 * Complete relation types configuration
 */
export interface RelationTypesConfig {
  version: string;
  description?: string;
  entityTypes: EntityType[];
  relationTypes: Record<RelationType, RelationTypeConfig>;
  scoring: ScoringConfig;
  conflictingPairs: [RelationType, RelationType][];
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<RelationTypesConfig> = {
  scoring: {
    weights: {
      cooccurrence: 0.3,
      llm: 0.3,
      source: 0.2,
      graph: 0.2,
    },
    thresholds: {
      autoApprove: 0.7,
      review: 0.5,
    },
  },
  conflictingPairs: [],
};

/**
 * Validation error for configuration
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate that weights sum to 1.0
 */
function validateWeights(weights: ScoringWeights): void {
  const sum =
    weights.cooccurrence + weights.llm + weights.source + weights.graph;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new ConfigValidationError(
      `Scoring weights must sum to 1.0, got ${sum}`,
      'scoring.weights',
      weights
    );
  }
}

/**
 * Validate threshold values
 */
function validateThresholds(thresholds: ScoringThresholds): void {
  if (thresholds.autoApprove <= thresholds.review) {
    throw new ConfigValidationError(
      'autoApprove threshold must be greater than review threshold',
      'scoring.thresholds',
      thresholds
    );
  }
  if (thresholds.review < 0 || thresholds.review > 1) {
    throw new ConfigValidationError(
      'review threshold must be between 0 and 1',
      'scoring.thresholds.review',
      thresholds.review
    );
  }
  if (thresholds.autoApprove < 0 || thresholds.autoApprove > 1) {
    throw new ConfigValidationError(
      'autoApprove threshold must be between 0 and 1',
      'scoring.thresholds.autoApprove',
      thresholds.autoApprove
    );
  }
}

/**
 * Validate relation type configuration
 */
function validateRelationType(
  type: string,
  config: RelationTypeConfig
): void {
  if (!config.description) {
    throw new ConfigValidationError(
      `Missing description for relation type ${type}`,
      `relationTypes.${type}.description`
    );
  }
  if (!Array.isArray(config.sourceTypes) || config.sourceTypes.length === 0) {
    throw new ConfigValidationError(
      `Missing or empty sourceTypes for relation type ${type}`,
      `relationTypes.${type}.sourceTypes`
    );
  }
  if (!Array.isArray(config.targetTypes) || config.targetTypes.length === 0) {
    throw new ConfigValidationError(
      `Missing or empty targetTypes for relation type ${type}`,
      `relationTypes.${type}.targetTypes`
    );
  }
  if (config.defaultConfidence !== undefined) {
    if (config.defaultConfidence < 0 || config.defaultConfidence > 1) {
      throw new ConfigValidationError(
        `defaultConfidence must be between 0 and 1 for ${type}`,
        `relationTypes.${type}.defaultConfidence`,
        config.defaultConfidence
      );
    }
  }
}

/**
 * Validate conflicting pairs
 */
function validateConflictingPairs(
  pairs: [string, string][],
  validTypes: Set<string>
): void {
  for (const [type1, type2] of pairs) {
    if (!validTypes.has(type1)) {
      throw new ConfigValidationError(
        `Unknown relation type in conflicting pair: ${type1}`,
        'conflictingPairs',
        [type1, type2]
      );
    }
    if (!validTypes.has(type2)) {
      throw new ConfigValidationError(
        `Unknown relation type in conflicting pair: ${type2}`,
        'conflictingPairs',
        [type1, type2]
      );
    }
  }
}

/**
 * Validate the complete configuration
 */
export function validateConfig(config: RelationTypesConfig): void {
  // Validate version
  if (!config.version || !/^\d+\.\d+\.\d+$/.test(config.version)) {
    throw new ConfigValidationError(
      'Invalid version format, expected semantic version',
      'version',
      config.version
    );
  }

  // Validate scoring
  if (config.scoring) {
    if (config.scoring.weights) {
      validateWeights(config.scoring.weights);
    }
    if (config.scoring.thresholds) {
      validateThresholds(config.scoring.thresholds);
    }
  }

  // Validate relation types
  const validTypes = new Set<string>();
  for (const [type, typeConfig] of Object.entries(config.relationTypes)) {
    validateRelationType(type, typeConfig as RelationTypeConfig);
    validTypes.add(type);
  }

  // Validate conflicting pairs
  if (config.conflictingPairs) {
    validateConflictingPairs(
      config.conflictingPairs as [string, string][],
      validTypes
    );
  }
}

/**
 * Load configuration from a JSON file
 */
export function loadConfigFromFile(filePath: string): RelationTypesConfig {
  if (!existsSync(filePath)) {
    throw new ConfigValidationError(
      `Configuration file not found: ${filePath}`,
      'filePath',
      filePath
    );
  }

  const content = readFileSync(filePath, 'utf-8');
  const config = JSON.parse(content) as RelationTypesConfig;

  validateConfig(config);
  return config;
}

/**
 * Load configuration from JSON content
 */
export function loadConfigFromJSON(content: string): RelationTypesConfig {
  const config = JSON.parse(content) as RelationTypesConfig;
  validateConfig(config);
  return config;
}

/**
 * Get the default configuration file path
 */
export function getDefaultConfigPath(): string {
  return resolve(__dirname, '../config/relation-types.json');
}

/**
 * Configuration loader with caching
 */
export class ConfigLoader {
  private static instance: ConfigLoader | null = null;
  private config: RelationTypesConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || getDefaultConfigPath();
  }

  /**
   * Get singleton instance
   */
  static getInstance(configPath?: string): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader(configPath);
    }
    return ConfigLoader.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    ConfigLoader.instance = null;
  }

  /**
   * Load configuration (cached)
   */
  load(): RelationTypesConfig {
    if (!this.config) {
      this.config = loadConfigFromFile(this.configPath);
    }
    return this.config;
  }

  /**
   * Reload configuration from file
   */
  reload(): RelationTypesConfig {
    this.config = null;
    return this.load();
  }

  /**
   * Get relation type configuration
   */
  getRelationType(type: RelationType): RelationTypeConfig | undefined {
    const config = this.load();
    return config.relationTypes[type];
  }

  /**
   * Get all extractable relation types
   */
  getExtractableTypes(): RelationType[] {
    const config = this.load();
    return Object.entries(config.relationTypes)
      .filter(([_, typeConfig]) => typeConfig.extractable)
      .map(([type]) => type as RelationType);
  }

  /**
   * Get patterns for a relation type
   */
  getPatterns(type: RelationType): string[] {
    const typeConfig = this.getRelationType(type);
    return typeConfig?.patterns || [];
  }

  /**
   * Get scoring weights
   */
  getScoringWeights(): ScoringWeights {
    const config = this.load();
    return config.scoring?.weights || DEFAULT_CONFIG.scoring!.weights;
  }

  /**
   * Get scoring thresholds
   */
  getScoringThresholds(): ScoringThresholds {
    const config = this.load();
    return config.scoring?.thresholds || DEFAULT_CONFIG.scoring!.thresholds;
  }

  /**
   * Get conflicting pairs
   */
  getConflictingPairs(): [RelationType, RelationType][] {
    const config = this.load();
    return config.conflictingPairs || [];
  }

  /**
   * Check if two relation types conflict
   */
  areConflicting(type1: RelationType, type2: RelationType): boolean {
    const pairs = this.getConflictingPairs();
    return pairs.some(
      ([a, b]) =>
        (a === type1 && b === type2) || (a === type2 && b === type1)
    );
  }

  /**
   * Validate entity types for a relation
   */
  validateEntityTypes(
    type: RelationType,
    sourceType: EntityType,
    targetType: EntityType
  ): { valid: boolean; reason?: string } {
    const typeConfig = this.getRelationType(type);
    if (!typeConfig) {
      return { valid: false, reason: `Unknown relation type: ${type}` };
    }

    if (!typeConfig.sourceTypes.includes(sourceType)) {
      return {
        valid: false,
        reason: `Invalid source type ${sourceType} for ${type}`,
      };
    }

    if (!typeConfig.targetTypes.includes(targetType)) {
      return {
        valid: false,
        reason: `Invalid target type ${targetType} for ${type}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get default confidence for a relation type
   */
  getDefaultConfidence(type: RelationType): number {
    const typeConfig = this.getRelationType(type);
    return typeConfig?.defaultConfidence ?? 0.5;
  }
}

/**
 * Create a minimal in-memory configuration
 */
export function createMinimalConfig(
  types: Partial<Record<RelationType, Partial<RelationTypeConfig>>>
): RelationTypesConfig {
  const relationTypes: Record<string, RelationTypeConfig> = {};

  for (const [type, partial] of Object.entries(types)) {
    relationTypes[type] = {
      description: partial?.description || `${type} relation`,
      sourceTypes: partial?.sourceTypes || ['Entity' as EntityType],
      targetTypes: partial?.targetTypes || ['Entity' as EntityType],
      bidirectional: partial?.bidirectional ?? false,
      extractable: partial?.extractable ?? true,
      patterns: partial?.patterns,
      defaultConfidence: partial?.defaultConfidence,
    };
  }

  return {
    version: '1.0.0',
    entityTypes: [
      'AIModel',
      'Organization',
      'Person',
      'Technique',
      'Dataset',
      'Architecture',
      'Publication',
      'Framework',
      'Application',
      'License',
      'Hardware',
      'Task',
      'Benchmark',
    ] as EntityType[],
    relationTypes: relationTypes as Record<RelationType, RelationTypeConfig>,
    scoring: {
      weights: { ...DEFAULT_CONFIG.scoring!.weights },
      thresholds: { ...DEFAULT_CONFIG.scoring!.thresholds },
    },
    conflictingPairs: [],
  };
}
