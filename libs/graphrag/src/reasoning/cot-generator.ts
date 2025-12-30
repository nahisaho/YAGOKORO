/**
 * @fileoverview Chain-of-Thought Generator
 * @description Generates step-by-step reasoning chains with evidence from knowledge graph
 * @module @yagokoro/graphrag/reasoning/cot-generator
 */

import type {
  ReasoningStep,
  ReasoningPath,
  ReasoningContext,
} from './types.js';

/**
 * Chain-of-Thought step with evidence
 */
export interface CoTStep {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** The reasoning claim/statement for this step */
  claim: string;
  /** Evidence supporting this claim */
  evidence: CoTEvidence[];
  /** Confidence in this step (0-1) */
  confidence: number;
  /** Logical connector to next step (e.g., "therefore", "because") */
  connector?: string;
}

/**
 * Evidence supporting a CoT step
 */
export interface CoTEvidence {
  /** Evidence type */
  type: 'graph_edge' | 'node_property' | 'community_membership' | 'external';
  /** Human-readable description */
  description: string;
  /** Source entity ID (if applicable) */
  sourceEntityId?: string;
  /** Target entity ID (if applicable) */
  targetEntityId?: string;
  /** Relation type (if applicable) */
  relationType?: string;
  /** Raw data/value */
  value?: unknown;
  /** Evidence confidence (0-1) */
  confidence: number;
}

/**
 * Complete Chain-of-Thought reasoning chain
 */
export interface CoTChain {
  /** Original query */
  query: string;
  /** The conclusion/answer */
  conclusion: string;
  /** Reasoning steps */
  steps: CoTStep[];
  /** Total confidence (product of step confidences) */
  totalConfidence: number;
  /** Number of hops in the reasoning */
  hopCount: number;
  /** Execution time in ms */
  executionTimeMs: number;
  /** Whether the reasoning is complete and valid */
  isValid: boolean;
  /** Validation errors if any */
  validationErrors?: string[];
}

/**
 * Configuration for CoT generation
 */
export interface CoTGeneratorConfig {
  /** Maximum number of reasoning hops (default: 5) */
  maxHops?: number;
  /** Minimum confidence threshold per step (default: 0.3) */
  minStepConfidence?: number;
  /** Minimum total confidence (default: 0.1) */
  minTotalConfidence?: number;
  /** Language for explanations */
  language?: 'ja' | 'en';
  /** Include detailed evidence */
  includeEvidence?: boolean;
}

/**
 * LLM client interface for CoT generation
 */
export interface CoTLLMClient {
  /** Generate text completion */
  complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
}

/**
 * CoTGenerator - Chain-of-Thought reasoning generator
 *
 * Generates step-by-step reasoning chains backed by knowledge graph evidence.
 * Each step includes claims, supporting evidence, and confidence scores.
 *
 * @example
 * ```typescript
 * const generator = new CoTGenerator(llmClient, context, {
 *   maxHops: 5,
 *   language: 'ja',
 * });
 *
 * const chain = await generator.generateChain(
 *   "Why is Transformer important for GPT?",
 *   { startEntity: 'transformer-id', endEntity: 'gpt-id' }
 * );
 * ```
 */
export class CoTGenerator {
  private readonly config: Required<CoTGeneratorConfig>;

  constructor(
    private readonly llm: CoTLLMClient,
    private readonly context: ReasoningContext,
    config: CoTGeneratorConfig = {}
  ) {
    this.config = {
      maxHops: config.maxHops ?? 5,
      minStepConfidence: config.minStepConfidence ?? 0.3,
      minTotalConfidence: config.minTotalConfidence ?? 0.1,
      language: config.language ?? 'ja',
      includeEvidence: config.includeEvidence ?? true,
    };
  }

  /**
   * Generate a Chain-of-Thought reasoning chain
   *
   * @param query The question/query to reason about
   * @param options Additional options including start/end entities
   * @returns CoTChain with steps, evidence, and confidence
   */
  async generateChain(
    query: string,
    options?: {
      startEntityId?: string;
      endEntityId?: string;
      maxHops?: number;
    }
  ): Promise<CoTChain> {
    const startTime = Date.now();
    const maxHops = options?.maxHops ?? this.config.maxHops;

    try {
      // Step 1: Find relevant paths if entities are provided
      let graphPaths: ReasoningPath[] = [];

      if (options?.startEntityId && options?.endEntityId) {
        const rawPaths = await this.context.findPaths(
          options.startEntityId,
          options.endEntityId,
          maxHops
        );

        graphPaths = await Promise.all(
          rawPaths.map((p) => this.convertToReasoningPath(p))
        );
      }

      // Step 2: Generate reasoning steps using LLM
      const steps = await this.generateSteps(query, graphPaths);

      // Step 3: Generate conclusion
      const conclusion = await this.generateConclusion(query, steps);

      // Step 4: Calculate total confidence
      const totalConfidence = this.calculateTotalConfidence(steps);

      // Step 5: Validate chain
      const validation = this.validateChain(steps, totalConfidence);

      const result: CoTChain = {
        query,
        conclusion,
        steps,
        totalConfidence,
        hopCount: steps.length,
        executionTimeMs: Date.now() - startTime,
        isValid: validation.isValid,
      };

      if (validation.errors.length > 0) {
        result.validationErrors = validation.errors;
      }

      return result;
    } catch (error) {
      return {
        query,
        conclusion: '',
        steps: [],
        totalConfidence: 0,
        hopCount: 0,
        executionTimeMs: Date.now() - startTime,
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Generate reasoning steps from graph paths
   */
  private async generateSteps(
    query: string,
    paths: ReasoningPath[]
  ): Promise<CoTStep[]> {
    if (paths.length === 0) {
      // Generate steps using LLM without graph context
      return this.generateStepsFromLLM(query);
    }

    // Use best path (highest confidence) for reasoning
    const bestPath = paths.sort((a, b) => b.totalConfidence - a.totalConfidence)[0];

    if (!bestPath) {
      return this.generateStepsFromLLM(query);
    }

    const steps: CoTStep[] = [];

    for (let i = 0; i < bestPath.steps.length; i++) {
      const pathStep = bestPath.steps[i];
      if (!pathStep) continue;

      const evidence: CoTEvidence[] = [
        {
          type: 'graph_edge',
          description: `${pathStep.fromEntityName} → ${pathStep.relationType} → ${pathStep.toEntityName}`,
          sourceEntityId: pathStep.fromEntityId,
          targetEntityId: pathStep.toEntityId,
          relationType: pathStep.relationType,
          confidence: pathStep.confidence,
        },
      ];

      const claim = await this.generateClaim(pathStep, i + 1, bestPath.steps.length);
      const connector = this.getConnector(i, bestPath.steps.length);

      const step: CoTStep = {
        stepNumber: i + 1,
        claim,
        evidence,
        confidence: pathStep.confidence,
      };

      if (connector !== undefined) {
        step.connector = connector;
      }

      steps.push(step);
    }

    return steps;
  }

  /**
   * Generate reasoning steps using LLM when no graph paths available
   */
  private async generateStepsFromLLM(query: string): Promise<CoTStep[]> {
    const prompt = this.buildStepGenerationPrompt(query);

    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.3,
        maxTokens: 1500,
      });

      return this.parseStepsFromLLM(response);
    } catch {
      // Return empty steps on LLM failure
      return [];
    }
  }

  /**
   * Build prompt for step generation
   */
  private buildStepGenerationPrompt(query: string): string {
    const langInstructions = this.config.language === 'ja'
      ? `日本語で回答してください。`
      : `Respond in English.`;

    return `あなたは論理的推論の専門家です。以下の質問に対して、ステップバイステップの推論を生成してください。

## 質問
${query}

## 指示
1. 各ステップは明確な主張（claim）を含むこと
2. 各ステップの信頼度（0.0-1.0）を評価すること
3. 最大${this.config.maxHops}ステップまで

${langInstructions}

## 出力形式（JSON）
{
  "steps": [
    {
      "stepNumber": 1,
      "claim": "ステップの主張",
      "confidence": 0.9,
      "connector": "therefore"
    }
  ]
}

JSONのみを出力してください。`;
  }

  /**
   * Parse steps from LLM response
   */
  private parseStepsFromLLM(response: string): CoTStep[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        steps?: Array<{
          stepNumber?: number;
          claim?: string;
          confidence?: number;
          connector?: string;
        }>;
      };

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        return [];
      }

      return parsed.steps.map((s, i) => {
        const step: CoTStep = {
          stepNumber: s.stepNumber ?? i + 1,
          claim: s.claim ?? '',
          evidence: [], // No graph evidence for LLM-generated steps
          confidence: s.confidence ?? 0.5,
        };

        if (s.connector !== undefined) {
          step.connector = s.connector;
        }

        return step;
      });
    } catch {
      return [];
    }
  }

  /**
   * Generate a claim for a reasoning step
   */
  private async generateClaim(
    step: ReasoningStep,
    stepNum: number,
    totalSteps: number
  ): Promise<string> {
    const isLast = stepNum === totalSteps;

    if (this.config.language === 'ja') {
      if (isLast) {
        return `したがって、${step.fromEntityName}と${step.toEntityName}は${step.relationType}の関係にある`;
      }
      return `${step.fromEntityName}は${step.toEntityName}と${step.relationType}の関係がある`;
    }

    if (isLast) {
      return `Therefore, ${step.fromEntityName} and ${step.toEntityName} are connected through ${step.relationType}`;
    }
    return `${step.fromEntityName} has a ${step.relationType} relationship with ${step.toEntityName}`;
  }

  /**
   * Get connector word between steps
   */
  private getConnector(stepIndex: number, totalSteps: number): string | undefined {
    if (stepIndex >= totalSteps - 1) {
      return undefined; // No connector for last step
    }

    const connectors = this.config.language === 'ja'
      ? ['そして', 'さらに', 'また', 'これにより']
      : ['and', 'furthermore', 'also', 'thus'];

    return connectors[stepIndex % connectors.length];
  }

  /**
   * Generate conclusion from reasoning steps
   */
  private async generateConclusion(query: string, steps: CoTStep[]): Promise<string> {
    if (steps.length === 0) {
      return this.config.language === 'ja'
        ? '十分なエビデンスが見つかりませんでした。'
        : 'Insufficient evidence found.';
    }

    const lastStep = steps[steps.length - 1];
    if (!lastStep) {
      return '';
    }

    const prompt = `質問: ${query}

推論ステップ:
${steps.map((s) => `${s.stepNumber}. ${s.claim}`).join('\n')}

上記の推論に基づいて、1-2文で結論を述べてください。${this.config.language === 'ja' ? '日本語で。' : 'In English.'}`;

    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.2,
        maxTokens: 200,
      });
      return response.trim();
    } catch {
      return lastStep.claim;
    }
  }

  /**
   * Calculate total confidence score
   */
  private calculateTotalConfidence(steps: CoTStep[]): number {
    if (steps.length === 0) {
      return 0;
    }

    // Product of all step confidences
    return steps.reduce((acc, step) => acc * step.confidence, 1);
  }

  /**
   * Validate the reasoning chain
   */
  private validateChain(
    steps: CoTStep[],
    totalConfidence: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum steps
    if (steps.length === 0) {
      errors.push('No reasoning steps generated');
    }

    // Check total confidence
    if (totalConfidence < this.config.minTotalConfidence) {
      errors.push(
        `Total confidence (${totalConfidence.toFixed(2)}) below threshold (${this.config.minTotalConfidence})`
      );
    }

    // Check individual step confidence
    for (const step of steps) {
      if (step.confidence < this.config.minStepConfidence) {
        errors.push(
          `Step ${step.stepNumber} confidence (${step.confidence.toFixed(2)}) below threshold`
        );
      }
    }

    // Check for empty claims
    const emptyClaimSteps = steps.filter((s) => !s.claim || s.claim.trim() === '');
    if (emptyClaimSteps.length > 0) {
      errors.push(`Steps with empty claims: ${emptyClaimSteps.map((s) => s.stepNumber).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert raw graph path to ReasoningPath
   */
  private async convertToReasoningPath(graphPath: unknown): Promise<ReasoningPath> {
    // Type guard for graph path structure
    const path = graphPath as {
      nodes?: Array<{ id: string; name?: string }>;
      relationships?: Array<{ type: string; confidence?: number }>;
    };

    const nodes = path.nodes ?? [];
    const relationships = path.relationships ?? [];

    const steps: ReasoningStep[] = [];

    for (let i = 0; i < relationships.length && i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      const rel = relationships[i];

      if (!sourceNode || !targetNode || !rel) continue;

      const sourceName = sourceNode.name ?? await this.context.getEntityName(sourceNode.id) ?? sourceNode.id;
      const targetName = targetNode.name ?? await this.context.getEntityName(targetNode.id) ?? targetNode.id;

      steps.push({
        stepNumber: i + 1,
        fromEntityId: sourceNode.id,
        fromEntityName: sourceName,
        toEntityId: targetNode.id,
        toEntityName: targetName,
        relationType: rel.type as import('@yagokoro/domain').RelationType,
        confidence: rel.confidence ?? 0.8,
        explanation: `${sourceName} → ${rel.type} → ${targetName}`,
      });
    }

    const sourceId = nodes[0]?.id ?? '';
    const targetId = nodes[nodes.length - 1]?.id ?? '';

    return {
      pathId: `path-${sourceId}-${targetId}`,
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      hopCount: steps.length,
      steps,
      totalConfidence: steps.reduce((acc, s) => acc * s.confidence, 1),
      summary: steps.map((s) => s.explanation).join(' → '),
    };
  }
}
