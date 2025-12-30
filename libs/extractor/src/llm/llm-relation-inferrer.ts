/**
 * LLMRelationInferrer - LLM-based relation inference
 *
 * Uses LLM to:
 * - Infer relation types from context
 * - Validate extracted relations
 * - Provide confidence scores
 */

import type {
  RelationType,
  ExtractedRelation,
  DocumentEntity,
  ExtractionDocument,
} from '../types.js';

/**
 * LLM provider interface
 */
export interface LLMProvider {
  /** Provider name */
  name: string;
  /** Generate completion */
  complete(prompt: string): Promise<string>;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/**
 * LLM inference result
 */
export interface LLMInferenceResult {
  /** Inferred relation type */
  relationType: RelationType;
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Explanation from LLM */
  explanation: string;
  /** Whether relation is valid */
  isValid: boolean;
}

/**
 * LLM inferrer configuration
 */
export interface LLMInferrerConfig {
  /** LLM provider to use */
  provider?: LLMProvider | undefined;
  /** Maximum context length */
  maxContextLength: number;
  /** Temperature for generation */
  temperature: number;
  /** Whether to include explanation */
  includeExplanation: boolean;
  /** Timeout in milliseconds */
  timeout: number;
}

/**
 * Default configuration
 */
export const DEFAULT_LLM_CONFIG: LLMInferrerConfig = {
  maxContextLength: 2000,
  temperature: 0.3,
  includeExplanation: true,
  timeout: 30000,
};

/**
 * LLMRelationInferrer class
 * Uses LLM for relation inference and validation
 */
export class LLMRelationInferrer {
  private config: LLMInferrerConfig;
  private provider: LLMProvider | undefined;

  /** Valid relation types for parsing */
  private static readonly VALID_RELATION_TYPES: RelationType[] = [
    'DEVELOPED_BY',
    'TRAINED_ON',
    'USES_TECHNIQUE',
    'EVALUATED_ON',
    'CITES',
    'AFFILIATED_WITH',
    'CONTRIBUTED_TO',
    'SPECIALIZES_IN',
    'INFLUENCED_BY',
    'COLLABORATED_WITH',
    'EVOLVED_INTO',
    'COMPETES_WITH',
    'BASED_ON',
  ];

  constructor(config: Partial<LLMInferrerConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
    this.provider = config.provider;
  }

  /**
   * Set LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  /**
   * Get current provider
   */
  getProvider(): LLMProvider | undefined {
    return this.provider;
  }

  /**
   * Infer relation type between two entities
   */
  async inferRelation(
    source: DocumentEntity,
    target: DocumentEntity,
    context: string
  ): Promise<LLMInferenceResult> {
    if (!this.provider) {
      throw new Error('LLM provider not set');
    }

    const prompt = this.generatePrompt(source, target, context);

    const response = await this.callProviderWithTimeout(prompt);

    return this.parseResponse(response);
  }

  /**
   * Call provider with timeout
   */
  private async callProviderWithTimeout(prompt: string): Promise<string> {
    if (!this.provider) {
      throw new Error('LLM provider not set');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('LLM request timeout')), this.config.timeout);
    });

    return Promise.race([this.provider.complete(prompt), timeoutPromise]);
  }

  /**
   * Validate an extracted relation
   */
  async validateRelation(relation: ExtractedRelation): Promise<LLMInferenceResult> {
    if (!this.provider) {
      throw new Error('LLM provider not set');
    }

    const prompt = this.generateValidationPrompt(relation);
    const response = await this.callProviderWithTimeout(prompt);

    return this.parseValidationResponse(response, relation.relationType);
  }

  /**
   * Generate prompt for relation validation
   */
  private generateValidationPrompt(relation: ExtractedRelation): string {
    const context =
      relation.evidence.length > 0
        ? relation.evidence[0].context
        : 'No context available';

    return `You are an expert in analyzing relationships between entities in academic and technical contexts.

TASK: Validate if the following relationship is correct.

SOURCE ENTITY: ${relation.sourceId}
TARGET ENTITY: ${relation.targetId}
CLAIMED RELATION: ${relation.relationType}
CONTEXT: "${this.truncateContext(context)}"

Is this relationship valid? Provide your analysis.

RESPOND IN EXACTLY THIS FORMAT:
VALID: true/false
CONFIDENCE: 0.0-1.0
EXPLANATION: Your explanation here`;
  }

  /**
   * Parse validation response
   */
  private parseValidationResponse(
    response: string,
    originalType: RelationType
  ): LLMInferenceResult {
    const lines = response.split('\n').map((l) => l.trim());

    let isValid = false;
    let confidence = 0.5;
    let explanation = '';

    for (const line of lines) {
      if (line.toUpperCase().startsWith('VALID:')) {
        const value = line.substring(6).trim().toLowerCase();
        isValid = value === 'true' || value === 'yes';
      } else if (line.toUpperCase().startsWith('CONFIDENCE:')) {
        const value = parseFloat(line.substring(11).trim());
        if (!isNaN(value)) {
          confidence = Math.max(0, Math.min(1, value));
        }
      } else if (line.toUpperCase().startsWith('EXPLANATION:')) {
        explanation = line.substring(12).trim();
      }
    }

    // If no explicit explanation found, use the full response
    if (!explanation) {
      explanation = response.substring(0, 200);
    }

    return {
      relationType: originalType,
      confidence: isValid ? confidence : confidence * 0.5,
      explanation,
      isValid,
    };
  }

  /**
   * Batch infer relations for a document
   */
  async inferFromDocument(
    document: ExtractionDocument
  ): Promise<ExtractedRelation[]> {
    if (!this.provider) {
      throw new Error('LLM provider not set');
    }

    const entities = document.entities || [];
    if (entities.length < 2) {
      return [];
    }

    const relations: ExtractedRelation[] = [];

    // Generate entity pairs
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const source = entities[i];
        const target = entities[j];

        // Get context around both entities
        const context = this.extractPairContext(document.content, source, target);

        if (!context) continue;

        try {
          const result = await this.inferRelation(source, target, context);

          if (result.isValid && result.confidence >= 0.5) {
            relations.push({
              sourceId: source.id || source.name,
              targetId: target.id || target.name,
              relationType: result.relationType,
              method: 'llm',
              evidence: [
                {
                  documentId: document.id,
                  context,
                  method: 'llm',
                  rawConfidence: result.confidence,
                },
              ],
              rawConfidence: result.confidence,
            });
          }
        } catch {
          // Skip pairs that fail inference
          continue;
        }
      }
    }

    return relations;
  }

  /**
   * Extract context containing both entities
   */
  private extractPairContext(
    content: string,
    source: DocumentEntity,
    target: DocumentEntity
  ): string | null {
    const sourcePos = source.positions[0];
    const targetPos = target.positions[0];

    if (sourcePos === undefined || targetPos === undefined) {
      // Try to find entities in content
      const sourceIdx = content.toLowerCase().indexOf(source.name.toLowerCase());
      const targetIdx = content.toLowerCase().indexOf(target.name.toLowerCase());

      if (sourceIdx === -1 || targetIdx === -1) {
        return null;
      }

      const start = Math.max(0, Math.min(sourceIdx, targetIdx) - 100);
      const end = Math.min(
        content.length,
        Math.max(sourceIdx + source.name.length, targetIdx + target.name.length) + 100
      );

      return content.substring(start, end);
    }

    const start = Math.max(0, Math.min(sourcePos, targetPos) - 100);
    const end = Math.min(
      content.length,
      Math.max(sourcePos, targetPos) + 200
    );

    return content.substring(start, end);
  }

  /**
   * Generate prompt for relation inference
   */
  generatePrompt(
    source: DocumentEntity,
    target: DocumentEntity,
    context: string
  ): string {
    const relationTypesStr = LLMRelationInferrer.VALID_RELATION_TYPES.join(', ');

    return `You are an expert in analyzing relationships between entities in academic and technical contexts.

TASK: Determine the relationship between two entities based on the given context.

SOURCE ENTITY: ${source.name} (Type: ${source.type})
TARGET ENTITY: ${target.name} (Type: ${target.type})
CONTEXT: "${this.truncateContext(context)}"

POSSIBLE RELATION TYPES:
${relationTypesStr}

Relation type meanings:
- DEVELOPED_BY: The source was developed/created by the target
- TRAINED_ON: The source (model) was trained using the target (dataset)
- USES_TECHNIQUE: The source uses the target technique/method
- EVALUATED_ON: The source was evaluated/benchmarked on the target
- CITES: The source cites/references the target
- AFFILIATED_WITH: The source is affiliated with the target (organization)
- CONTRIBUTED_TO: The source contributed to the target
- SPECIALIZES_IN: The source specializes in the target (field/topic)
- INFLUENCED_BY: The source was influenced by the target
- COLLABORATED_WITH: The source collaborated with the target
- EVOLVED_INTO: The source evolved/developed into the target
- COMPETES_WITH: The source competes with the target
- BASED_ON: The source is based on/derived from the target

RESPOND IN EXACTLY THIS FORMAT:
RELATION_TYPE: <one of the types above, or NONE if no clear relation>
CONFIDENCE: <0.0-1.0>
${this.config.includeExplanation ? 'EXPLANATION: <brief explanation>' : ''}`;
  }

  /**
   * Truncate context to max length
   */
  private truncateContext(context: string): string {
    if (context.length <= this.config.maxContextLength) {
      return context;
    }
    return context.substring(0, this.config.maxContextLength - 3) + '...';
  }

  /**
   * Parse LLM response
   */
  parseResponse(response: string): LLMInferenceResult {
    const lines = response.split('\n').map((l) => l.trim());

    let relationType: RelationType = 'CITES'; // Default
    let confidence = 0.5;
    let explanation = '';
    let isValid = true;

    for (const line of lines) {
      if (line.toUpperCase().startsWith('RELATION_TYPE:')) {
        const value = line.substring(14).trim().toUpperCase();
        if (value === 'NONE') {
          isValid = false;
        } else if (
          LLMRelationInferrer.VALID_RELATION_TYPES.includes(value as RelationType)
        ) {
          relationType = value as RelationType;
        }
      } else if (line.toUpperCase().startsWith('CONFIDENCE:')) {
        const value = parseFloat(line.substring(11).trim());
        if (!isNaN(value)) {
          confidence = Math.max(0, Math.min(1, value));
        }
      } else if (line.toUpperCase().startsWith('EXPLANATION:')) {
        explanation = line.substring(12).trim();
      }
    }

    // If confidence is very low, mark as invalid
    if (confidence < 0.3) {
      isValid = false;
    }

    // If no explicit explanation found and config requires it, use response
    if (!explanation && this.config.includeExplanation) {
      explanation = response.substring(0, 200);
    }

    return {
      relationType,
      confidence,
      explanation,
      isValid,
    };
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.provider) return false;
    try {
      return await this.provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMInferrerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.provider !== undefined) {
      this.provider = config.provider;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMInferrerConfig {
    return { ...this.config };
  }
}
