/**
 * EntityNormalizerService - Main normalization pipeline
 * 
 * Orchestrates the 3-stage normalization process:
 * 1. Rule-based normalization
 * 2. Similarity matching
 * 3. LLM confirmation (optional)
 */

import { RuleNormalizer, type NormalizationResult } from '../rules/RuleNormalizer.js';
import { SimilarityMatcher, type SimilarityResult, type VectorStoreClient } from '../similarity/SimilarityMatcher.js';
import { AliasTableManager, type Neo4jConnection } from '../alias/AliasTableManager.js';
import type { NormalizationStage, NormalizationConfidence } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for EntityNormalizerService
 */
export interface EntityNormalizerConfig {
  /** Path to normalization rules YAML file */
  rulesPath?: string;
  /** Similarity threshold (0.0 - 1.0) */
  similarityThreshold?: number;
  /** Whether to use LLM confirmation for uncertain matches */
  useLLMConfirmation?: boolean;
  /** Minimum confidence to skip LLM confirmation */
  llmConfirmationThreshold?: number;
  /** Whether to auto-register new aliases */
  autoRegisterAliases?: boolean;
}

/**
 * Options for normalization operation
 */
export interface NormalizationOptions {
  /** Skip LLM confirmation even if enabled */
  skipLLM?: boolean;
  /** Force LLM confirmation even for high-confidence matches */
  forceLLM?: boolean;
  /** Entity type hint for better matching */
  entityType?: string;
  /** Context for LLM (surrounding text) */
  context?: string;
}

/**
 * Result of the normalization pipeline
 */
export interface NormalizationPipelineResult {
  /** Original input */
  original: string;
  /** Final normalized form */
  normalized: string;
  /** Whether normalization changed the input */
  wasNormalized: boolean;
  /** Overall confidence */
  confidence: NormalizationConfidence;
  /** Results from each stage */
  stages: {
    rule?: NormalizationResult;
    similarity?: SimilarityResult;
    llm?: LLMConfirmationResult;
  };
  /** Whether a new alias was registered */
  aliasRegistered: boolean;
}

/**
 * Result of LLM confirmation
 */
export interface LLMConfirmationResult {
  /** Whether LLM confirmed the normalization */
  confirmed: boolean;
  /** Suggested canonical form (may differ from similarity match) */
  suggestion?: string;
  /** Confidence score */
  confidence: number;
  /** LLM's explanation */
  explanation?: string;
}

/**
 * Interface for LLM client
 */
export interface LLMClient {
  generate(prompt: string): Promise<string>;
}

// ============================================================================
// EntityNormalizerService Class
// ============================================================================

/**
 * Main entity normalization service
 * 
 * @example
 * ```typescript
 * const service = new EntityNormalizerService({
 *   neo4jConnection,
 *   existingEntities: ['GPT-4', 'Claude', 'LLaMA2'],
 * });
 * 
 * const result = await service.normalize('GPT4');
 * console.log(result.normalized); // 'GPT-4'
 * ```
 */
export class EntityNormalizerService {
  private ruleNormalizer: RuleNormalizer;
  private similarityMatcher: SimilarityMatcher;
  private aliasManager: AliasTableManager;
  private config: Required<EntityNormalizerConfig>;
  private llmClient: LLMClient | undefined;
  private existingEntities: Set<string>;

  constructor(deps: {
    neo4jConnection?: Neo4jConnection | null;
    vectorStore?: VectorStoreClient;
    llmClient?: LLMClient;
    existingEntities?: string[];
    config?: EntityNormalizerConfig;
  }) {
    this.config = {
      rulesPath: deps.config?.rulesPath ?? '',
      similarityThreshold: deps.config?.similarityThreshold ?? 0.8,
      useLLMConfirmation: deps.config?.useLLMConfirmation ?? false,
      llmConfirmationThreshold: deps.config?.llmConfirmationThreshold ?? 0.9,
      autoRegisterAliases: deps.config?.autoRegisterAliases ?? true,
    };

    this.existingEntities = new Set(deps.existingEntities ?? []);
    this.llmClient = deps.llmClient;

    // Initialize components
    this.ruleNormalizer = new RuleNormalizer(
      this.config.rulesPath ? { rulesPath: this.config.rulesPath } : undefined
    );

    this.similarityMatcher = new SimilarityMatcher(
      Array.from(this.existingEntities),
      { threshold: this.config.similarityThreshold },
      deps.vectorStore
    );

    this.aliasManager = new AliasTableManager(
      deps.neo4jConnection ?? null
    );
  }

  /**
   * Normalize a single entity
   */
  async normalize(
    input: string,
    options: NormalizationOptions = {}
  ): Promise<NormalizationPipelineResult> {
    const trimmedInput = input.trim();
    
    const result: NormalizationPipelineResult = {
      original: input,
      normalized: trimmedInput,
      wasNormalized: false,
      confidence: { score: 0, stage: 'rule' },
      stages: {},
      aliasRegistered: false,
    };

    // Check alias table first
    const existingAlias = await this.aliasManager.resolveAlias(trimmedInput);
    if (existingAlias) {
      result.normalized = existingAlias;
      result.wasNormalized = trimmedInput !== existingAlias;
      result.confidence = { score: 0.95, stage: 'rule', explanation: 'Found in alias table' };
      return result;
    }

    // Stage 1: Rule-based normalization
    const ruleResult = this.ruleNormalizer.normalize(trimmedInput);
    result.stages.rule = ruleResult;
    result.normalized = ruleResult.normalized;

    if (ruleResult.appliedRules.length > 0) {
      result.wasNormalized = true;
      result.confidence = { 
        score: ruleResult.confidence, 
        stage: 'rule',
        explanation: `Applied ${ruleResult.appliedRules.length} rule(s)`,
      };

      // If confidence is high enough, we're done
      if (ruleResult.confidence >= this.config.llmConfirmationThreshold) {
        await this.maybeRegisterAlias(trimmedInput, result.normalized, ruleResult.confidence, 'rule');
        result.aliasRegistered = true;
        return result;
      }
    }

    // Stage 2: Similarity matching
    const similarityResult = await this.similarityMatcher.findMatches(result.normalized);
    result.stages.similarity = similarityResult;

    if (similarityResult.canonical && similarityResult.confidence >= this.config.similarityThreshold) {
      result.normalized = similarityResult.canonical;
      result.wasNormalized = trimmedInput !== similarityResult.canonical;
      result.confidence = {
        score: similarityResult.confidence,
        stage: 'similarity',
        explanation: `Matched with ${similarityResult.candidates.length} candidate(s)`,
      };

      // If confidence is high enough, we're done
      if (similarityResult.confidence >= this.config.llmConfirmationThreshold) {
        await this.maybeRegisterAlias(trimmedInput, result.normalized, similarityResult.confidence, 'similarity');
        result.aliasRegistered = true;
        return result;
      }
    }

    // Stage 3: LLM confirmation (if enabled and needed)
    if (this.shouldUseLLM(result.confidence.score, options)) {
      const llmResult = await this.confirmWithLLM(
        trimmedInput,
        result.normalized,
        options.context
      );
      result.stages.llm = llmResult;

      if (llmResult.confirmed) {
        if (llmResult.suggestion && llmResult.suggestion !== result.normalized) {
          result.normalized = llmResult.suggestion;
        }
        result.wasNormalized = trimmedInput !== result.normalized;
        result.confidence = {
          score: llmResult.confidence,
          stage: 'llm',
          explanation: llmResult.explanation ?? 'LLM confirmed',
        };

        await this.maybeRegisterAlias(trimmedInput, result.normalized, llmResult.confidence, 'llm');
        result.aliasRegistered = true;
      }
    }

    return result;
  }

  /**
   * Normalize multiple entities in batch
   */
  async normalizeAll(
    inputs: string[],
    options: NormalizationOptions = {}
  ): Promise<NormalizationPipelineResult[]> {
    const results: NormalizationPipelineResult[] = [];
    
    for (const input of inputs) {
      const result = await this.normalize(input, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get existing entities from the graph database
   */
  async getExistingEntities(): Promise<string[]> {
    const neo4j = this.aliasManager.getNeo4jConnection();
    if (!neo4j) {
      return Array.from(this.existingEntities);
    }

    const query = `
      MATCH (e)
      WHERE e:AIModel OR e:Technique OR e:Organization OR e:Person OR e:Concept OR e:Publication OR e:Benchmark
      RETURN DISTINCT e.name as name
      ORDER BY name
    `;

    const result = await neo4j.run(query);
    const names = result.records.map(r => r.get('name') as string).filter(Boolean);
    
    // Update internal set
    for (const name of names) {
      this.existingEntities.add(name);
    }
    
    // Update similarity matcher
    this.similarityMatcher.addEntities(names);

    return names;
  }

  /**
   * Add entities to the known set
   */
  addKnownEntities(entities: string[]): void {
    for (const entity of entities) {
      this.existingEntities.add(entity);
    }
    this.similarityMatcher.addEntities(entities);
  }

  /**
   * Get the alias manager instance
   */
  getAliasManager(): AliasTableManager {
    return this.aliasManager;
  }

  /**
   * Get the rule normalizer instance
   */
  getRuleNormalizer(): RuleNormalizer {
    return this.ruleNormalizer;
  }

  /**
   * Get the similarity matcher instance
   */
  getSimilarityMatcher(): SimilarityMatcher {
    return this.similarityMatcher;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private shouldUseLLM(currentConfidence: number, options: NormalizationOptions): boolean {
    if (options.skipLLM) return false;
    if (options.forceLLM) return true;
    if (!this.config.useLLMConfirmation) return false;
    if (!this.llmClient) return false;
    return currentConfidence < this.config.llmConfirmationThreshold;
  }

  private async confirmWithLLM(
    original: string,
    normalized: string,
    context?: string
  ): Promise<LLMConfirmationResult> {
    if (!this.llmClient) {
      return { confirmed: false, confidence: 0 };
    }

    const prompt = this.buildLLMPrompt(original, normalized, context);
    
    try {
      const response = await this.llmClient.generate(prompt);
      return this.parseLLMResponse(response);
    } catch (error) {
      console.warn('LLM confirmation failed:', error);
      return { confirmed: false, confidence: 0 };
    }
  }

  private buildLLMPrompt(original: string, normalized: string, context?: string): string {
    return `
You are an AI/ML entity normalization expert. Determine if the following entity name normalization is correct.

Original: "${original}"
Normalized to: "${normalized}"
${context ? `Context: "${context}"` : ''}

Respond in JSON format:
{
  "confirmed": true/false,
  "suggestion": "suggested canonical form if different",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation"
}

Consider:
1. Are these referring to the same entity?
2. Is the normalized form the standard/canonical name?
3. Could there be ambiguity (e.g., GPT could mean different versions)?

Respond with JSON only:
`;
  }

  private parseLLMResponse(response: string): LLMConfirmationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { confirmed: false, confidence: 0 };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        confirmed: Boolean(parsed.confirmed),
        suggestion: parsed.suggestion || undefined,
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
        explanation: parsed.explanation || undefined,
      };
    } catch {
      return { confirmed: false, confidence: 0 };
    }
  }

  private async maybeRegisterAlias(
    alias: string,
    canonical: string,
    confidence: number,
    source: NormalizationStage
  ): Promise<void> {
    if (!this.config.autoRegisterAliases) return;
    if (alias.toLowerCase() === canonical.toLowerCase()) return;

    await this.aliasManager.registerAlias(alias, canonical, confidence, source);
  }
}
