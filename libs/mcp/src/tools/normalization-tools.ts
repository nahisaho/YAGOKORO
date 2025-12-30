/**
 * MCP Normalization Tools
 * 
 * Tools for entity name normalization within the MCP server
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for normalize entity tool
 */
export const NormalizeEntityInputSchema = z.object({
  entity: z.string().describe('The entity name to normalize'),
  entityType: z.string().optional().describe('Entity type hint (e.g., AIModel, Technique, Organization)'),
  context: z.string().optional().describe('Context text for better matching'),
  skipLLM: z.boolean().optional().default(false).describe('Skip LLM confirmation step'),
});

/**
 * Schema for normalize batch tool
 */
export const NormalizeBatchInputSchema = z.object({
  entities: z.array(z.string()).describe('Array of entity names to normalize'),
  entityType: z.string().optional().describe('Entity type hint for all entities'),
  skipLLM: z.boolean().optional().default(true).describe('Skip LLM confirmation (default true for batch)'),
});

/**
 * Schema for register alias tool
 */
export const RegisterAliasInputSchema = z.object({
  alias: z.string().describe('The alias (alternative name)'),
  canonical: z.string().describe('The canonical (standard) form'),
  confidence: z.number().min(0).max(1).optional().default(0.9).describe('Confidence score (0-1)'),
});

/**
 * Schema for resolve alias tool
 */
export const ResolveAliasInputSchema = z.object({
  alias: z.string().describe('The alias to resolve'),
});

/**
 * Schema for list aliases tool
 */
export const ListAliasesInputSchema = z.object({
  canonical: z.string().optional().describe('Filter by canonical name'),
  limit: z.number().optional().default(50).describe('Maximum number of results'),
});

/**
 * Schema for get normalization rules tool
 */
export const GetRulesInputSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of rules to return'),
});

// ============================================================================
// Types
// ============================================================================

export type NormalizeEntityInput = z.infer<typeof NormalizeEntityInputSchema>;
export type NormalizeBatchInput = z.infer<typeof NormalizeBatchInputSchema>;
export type RegisterAliasInput = z.infer<typeof RegisterAliasInputSchema>;
export type ResolveAliasInput = z.infer<typeof ResolveAliasInputSchema>;
export type ListAliasesInput = z.infer<typeof ListAliasesInputSchema>;
export type GetRulesInput = z.infer<typeof GetRulesInputSchema>;

/**
 * Result of normalization
 */
export interface NormalizationResult {
  original: string;
  normalized: string;
  wasNormalized: boolean;
  confidence: number;
  stage: 'rule' | 'similarity' | 'llm';
}

/**
 * Alias entry
 */
export interface AliasEntry {
  alias: string;
  canonical: string;
  confidence: number;
  source: string;
}

/**
 * Normalization rule
 */
export interface NormalizationRule {
  pattern: string;
  replacement: string;
  priority: number;
}

/**
 * Interface for normalization service
 */
export interface NormalizationServiceInterface {
  normalize(input: string, options?: {
    entityType?: string;
    context?: string;
    skipLLM?: boolean;
  }): Promise<NormalizationResult>;
  
  normalizeAll(inputs: string[], options?: {
    entityType?: string;
    skipLLM?: boolean;
  }): Promise<NormalizationResult[]>;
  
  registerAlias(alias: string, canonical: string, confidence: number): Promise<AliasEntry>;
  resolveAlias(alias: string): Promise<string | null>;
  listAliases(options?: { canonical?: string; limit?: number }): Promise<AliasEntry[]>;
  getRules(limit?: number): Promise<NormalizationRule[]>;
}

/**
 * Dependencies for normalization tools
 */
export interface NormalizationToolDependencies {
  normalizationService: NormalizationServiceInterface;
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definition structure (MCP compatible)
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown) => Promise<unknown>;
}

/**
 * Create normalize entity tool
 */
export function createNormalizeEntityTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'normalize_entity',
    description: `Normalize an entity name to its canonical form using rule-based matching, 
similarity matching, and optionally LLM confirmation. Returns the normalized name, 
confidence score, and which stage produced the result.`,
    inputSchema: NormalizeEntityInputSchema,
    handler: async (input: unknown) => {
      const validated = NormalizeEntityInputSchema.parse(input);
      const options: { entityType?: string; context?: string; skipLLM?: boolean } = {};
      if (validated.entityType) options.entityType = validated.entityType;
      if (validated.context) options.context = validated.context;
      if (validated.skipLLM !== undefined) options.skipLLM = validated.skipLLM;
      const result = await deps.normalizationService.normalize(validated.entity, options);
      return result;
    },
  };
}

/**
 * Create normalize batch tool
 */
export function createNormalizeBatchTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'normalize_batch',
    description: `Normalize multiple entity names at once. More efficient than calling 
normalize_entity multiple times. Returns an array of normalization results.`,
    inputSchema: NormalizeBatchInputSchema,
    handler: async (input: unknown) => {
      const validated = NormalizeBatchInputSchema.parse(input);
      const options: { entityType?: string; skipLLM?: boolean } = {};
      if (validated.entityType) options.entityType = validated.entityType;
      if (validated.skipLLM !== undefined) options.skipLLM = validated.skipLLM;
      const results = await deps.normalizationService.normalizeAll(validated.entities, options);
      return {
        total: results.length,
        normalized: results.filter(r => r.wasNormalized).length,
        results,
      };
    },
  };
}

/**
 * Create register alias tool
 */
export function createRegisterAliasTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'register_alias',
    description: `Register a new alias mapping from an alternative name to its canonical form. 
This creates a permanent mapping that will be used in future normalizations.`,
    inputSchema: RegisterAliasInputSchema,
    handler: async (input: unknown) => {
      const validated = RegisterAliasInputSchema.parse(input);
      const entry = await deps.normalizationService.registerAlias(
        validated.alias,
        validated.canonical,
        validated.confidence ?? 0.9
      );
      return {
        success: true,
        alias: entry,
      };
    },
  };
}

/**
 * Create resolve alias tool
 */
export function createResolveAliasTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'resolve_alias',
    description: `Resolve an alias to its canonical form. Returns the canonical name if found, 
or null if no alias mapping exists.`,
    inputSchema: ResolveAliasInputSchema,
    handler: async (input: unknown) => {
      const validated = ResolveAliasInputSchema.parse(input);
      const canonical = await deps.normalizationService.resolveAlias(validated.alias);
      return {
        alias: validated.alias,
        canonical,
        found: canonical !== null,
      };
    },
  };
}

/**
 * Create list aliases tool
 */
export function createListAliasesTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'list_aliases',
    description: `List registered alias mappings. Can filter by canonical name and limit results.`,
    inputSchema: ListAliasesInputSchema,
    handler: async (input: unknown) => {
      const validated = ListAliasesInputSchema.parse(input);
      const options: { canonical?: string; limit?: number } = {};
      if (validated.canonical) options.canonical = validated.canonical;
      if (validated.limit !== undefined) options.limit = validated.limit;
      const aliases = await deps.normalizationService.listAliases(options);
      return {
        total: aliases.length,
        aliases,
      };
    },
  };
}

/**
 * Create get normalization rules tool
 */
export function createGetRulesTool(
  deps: NormalizationToolDependencies
): ToolDefinition {
  return {
    name: 'get_normalization_rules',
    description: `Get the list of normalization rules currently in use. Rules are applied in 
priority order (highest first) to normalize entity names.`,
    inputSchema: GetRulesInputSchema,
    handler: async (input: unknown) => {
      const validated = GetRulesInputSchema.parse(input);
      const rules = await deps.normalizationService.getRules(validated.limit);
      return {
        total: rules.length,
        rules,
      };
    },
  };
}

// ============================================================================
// Combined Tool Factory
// ============================================================================

/**
 * Create all normalization tools
 */
export function createNormalizationTools(
  deps: NormalizationToolDependencies
): ToolDefinition[] {
  return [
    createNormalizeEntityTool(deps),
    createNormalizeBatchTool(deps),
    createRegisterAliasTool(deps),
    createResolveAliasTool(deps),
    createListAliasesTool(deps),
    createGetRulesTool(deps),
  ];
}
