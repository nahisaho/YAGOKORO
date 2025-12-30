/**
 * MultiHopReasoner
 *
 * Performs multi-hop reasoning over knowledge graphs to find connections
 * and explain relationships between entities.
 *
 * Inspired by GraphRAG's approach to path-based reasoning with confidence scoring.
 */

import type { GraphPath } from '@yagokoro/domain';
import {
  DEFAULT_REASONING_OPTIONS,
  type ReasoningContext,
  type ReasoningMetrics,
  type ReasoningOptions,
  type ReasoningPath,
  type ReasoningResult,
  type ReasoningStep,
} from './types.js';

/**
 * Relation type display names for explanations
 */
const RELATION_EXPLANATIONS: Record<string, string> = {
  DEVELOPED_BY: 'was developed by',
  TRAINED_ON: 'was trained on',
  USES_TECHNIQUE: 'uses the technique',
  DERIVED_FROM: 'is derived from',
  EVALUATED_ON: 'was evaluated on',
  PUBLISHED_IN: 'was published in',
  AFFILIATED_WITH: 'is affiliated with',
  AUTHORED_BY: 'was authored by',
  CITES: 'cites',
  PART_OF: 'is part of',
  RELATED_TO: 'is related to',
  PARENT_OF: 'is parent of',
  BELONGS_TO: 'belongs to',
};

/**
 * Multi-hop reasoner for knowledge graph traversal
 *
 * @example
 * ```typescript
 * const reasoner = new MultiHopReasoner(context, { maxHops: 5 });
 * const result = await reasoner.reason(sourceId, targetId);
 *
 * if (result.success) {
 *   console.log(`Found ${result.paths.length} paths`);
 *   console.log(`Best path: ${result.bestPath?.summary}`);
 * }
 * ```
 */
export class MultiHopReasoner {
  private readonly context: ReasoningContext;
  private readonly options: Required<ReasoningOptions>;

  constructor(context: ReasoningContext, options: ReasoningOptions = {}) {
    this.context = context;
    this.options = { ...DEFAULT_REASONING_OPTIONS, ...options };
  }

  /**
   * Find and explain reasoning paths between two entities
   *
   * @param sourceId - Starting entity ID
   * @param targetId - Target entity ID
   * @param options - Override default options for this query
   * @returns Reasoning result with paths and explanations
   */
  async reason(
    sourceId: string,
    targetId: string,
    options?: ReasoningOptions
  ): Promise<ReasoningResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = performance.now();

    const metrics: ReasoningMetrics = {
      pathsExplored: 0,
      validPathsFound: 0,
      pathsPruned: 0,
      processingTimeMs: 0,
    };

    try {
      // Validate source entity exists
      const sourceEntity = await this.context.getEntity(sourceId);
      if (!sourceEntity) {
        return this.createErrorResult(
          '',
          `Source entity not found: ${sourceId}`,
          metrics,
          startTime
        );
      }

      // Validate target entity exists
      const targetEntity = await this.context.getEntity(targetId);
      if (!targetEntity) {
        return this.createErrorResult(
          '',
          `Target entity not found: ${targetId}`,
          metrics,
          startTime
        );
      }

      // Handle self-referential query
      if (sourceId === targetId) {
        const selfPath = await this.createSelfPath(sourceEntity);
        return this.createSuccessResult('', [selfPath], metrics, startTime);
      }

      // Find paths using context provider
      const graphPaths = await this.context.findPaths(sourceId, targetId, mergedOptions.maxHops);

      metrics.pathsExplored = graphPaths.length;

      // Convert and filter paths
      const reasoningPaths: ReasoningPath[] = [];

      for (const graphPath of graphPaths) {
        // Skip paths with no edges
        if (graphPath.edges.length === 0) {
          metrics.pathsPruned++;
          continue;
        }

        // Calculate confidence
        const confidence = this.calculatePathConfidence(graphPath);

        // Filter by minimum confidence
        if (confidence < mergedOptions.minConfidence) {
          metrics.pathsPruned++;
          continue;
        }

        // Filter by hop count
        if (
          graphPath.edges.length < mergedOptions.minHops ||
          graphPath.edges.length > mergedOptions.maxHops
        ) {
          metrics.pathsPruned++;
          continue;
        }

        // Convert to reasoning path
        const reasoningPath = await this.convertToReasoningPath(
          graphPath,
          mergedOptions.includeExplanations
        );

        reasoningPaths.push(reasoningPath);
      }

      metrics.validPathsFound = reasoningPaths.length;

      // Sort by confidence (highest first) and limit
      reasoningPaths.sort((a, b) => b.totalConfidence - a.totalConfidence);
      const limitedPaths = reasoningPaths.slice(0, mergedOptions.maxPaths);

      // Calculate additional metrics
      if (limitedPaths.length > 0) {
        metrics.minHops = Math.min(...limitedPaths.map((p) => p.hopCount));
        metrics.maxHops = Math.max(...limitedPaths.map((p) => p.hopCount));
        metrics.averageConfidence =
          limitedPaths.reduce((sum, p) => sum + p.totalConfidence, 0) / limitedPaths.length;
      }

      return this.createSuccessResult('', limitedPaths, metrics, startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult('', `Reasoning failed: ${errorMessage}`, metrics, startTime);
    }
  }

  /**
   * Reason with a natural language query context
   *
   * @param query - Natural language query
   * @param sourceId - Starting entity ID
   * @param targetId - Target entity ID
   * @param options - Override default options
   * @returns Reasoning result with query context
   */
  async reasonWithQuery(
    query: string,
    sourceId: string,
    targetId: string,
    options?: ReasoningOptions
  ): Promise<ReasoningResult> {
    const result = await this.reason(sourceId, targetId, options);
    result.query = query;
    return result;
  }

  /**
   * Calculate combined confidence score for a path
   */
  private calculatePathConfidence(path: GraphPath): number {
    if (path.edges.length === 0) return 0;

    // Use pre-calculated totalWeight if available
    if (path.totalWeight !== undefined && path.totalWeight > 0) {
      return path.totalWeight;
    }

    // Otherwise calculate as product of edge weights (normalized as confidence)
    return path.edges.reduce((conf, edge) => conf * (edge.weight ?? 1), 1);
  }

  /**
   * Convert graph path to reasoning path with explanations
   */
  private async convertToReasoningPath(
    graphPath: GraphPath,
    includeExplanations: boolean
  ): Promise<ReasoningPath> {
    const pathId = this.generatePathId();
    const steps: ReasoningStep[] = [];

    for (let i = 0; i < graphPath.edges.length; i++) {
      const edge = graphPath.edges[i];
      if (!edge) continue;
      
      const fromName =
        (await this.context.getEntityName(edge.sourceId)) ?? edge.sourceId;
      const toName = (await this.context.getEntityName(edge.targetId)) ?? edge.targetId;

      const step: ReasoningStep = {
        stepNumber: i + 1,
        fromEntityId: edge.sourceId,
        fromEntityName: fromName,
        toEntityId: edge.targetId,
        toEntityName: toName,
        relationType: edge.type,
        confidence: edge.weight ?? 1,
        explanation: includeExplanations
          ? this.generateStepExplanation(fromName, toName, edge.type)
          : '',
      };

      steps.push(step);
    }

    const totalConfidence = this.calculatePathConfidence(graphPath);
    const summary = includeExplanations
      ? this.generatePathSummary(steps)
      : '';

    const sourceEntityId = graphPath.nodes[0];
    const targetEntityId = graphPath.nodes[graphPath.nodes.length - 1];

    return {
      pathId,
      sourceEntityId: sourceEntityId ?? '',
      targetEntityId: targetEntityId ?? '',
      hopCount: graphPath.edges.length,
      steps,
      totalConfidence,
      summary,
      graphPath,
    };
  }

  /**
   * Create a self-referential path (source === target)
   */
  private async createSelfPath(entity: { id: string; name: string }): Promise<ReasoningPath> {
    return {
      pathId: this.generatePathId(),
      sourceEntityId: entity.id,
      targetEntityId: entity.id,
      hopCount: 0,
      steps: [],
      totalConfidence: 1,
      summary: `${entity.name} is the same entity as itself.`,
    };
  }

  /**
   * Generate explanation for a single reasoning step
   */
  private generateStepExplanation(
    fromName: string,
    toName: string,
    relationType: string
  ): string {
    const relationText = RELATION_EXPLANATIONS[relationType] ?? `is ${relationType.toLowerCase().replace(/_/g, ' ')} to`;
    return `${fromName} ${relationText} ${toName}`;
  }

  /**
   * Generate summary explanation for entire path
   */
  private generatePathSummary(steps: ReasoningStep[]): string {
    if (steps.length === 0) return '';

    const firstStep = steps[0];
    if (steps.length === 1 && firstStep) {
      return firstStep.explanation;
    }

    const explanations = steps.map((s) => s.explanation);
    const firstEntity = firstStep?.fromEntityName ?? '';
    const lastStep = steps[steps.length - 1];
    const lastEntity = lastStep?.toEntityName ?? '';

    return `${firstEntity} is connected to ${lastEntity} through ${steps.length} steps: ${explanations.join(', then ')}.`;
  }

  /**
   * Generate unique path ID
   */
  private generatePathId(): string {
    return `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    query: string,
    error: string,
    metrics: ReasoningMetrics,
    startTime: number
  ): ReasoningResult {
    metrics.processingTimeMs = performance.now() - startTime;
    return {
      query,
      paths: [],
      bestPath: null,
      metrics,
      success: false,
      error,
    };
  }

  /**
   * Create success result
   */
  private createSuccessResult(
    query: string,
    paths: ReasoningPath[],
    metrics: ReasoningMetrics,
    startTime: number
  ): ReasoningResult {
    metrics.processingTimeMs = performance.now() - startTime;
    const bestPath = paths.length > 0 ? paths[0] ?? null : null;
    return {
      query,
      paths,
      bestPath,
      metrics,
      success: paths.length > 0,
    };
  }
}
