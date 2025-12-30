/**
 * @fileoverview Confidence Scorer
 * @description Multi-dimensional confidence scoring for GraphRAG responses
 * @module @yagokoro/graphrag/reasoning/confidence-scorer
 */

import type { ReasoningPath, ReasoningContext } from './types.js';

/**
 * Individual confidence metric
 */
export interface ConfidenceMetric {
  /** Metric name */
  name: string;
  /** Score (0-1) */
  score: number;
  /** Weight for aggregation */
  weight: number;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Complete confidence score with breakdown
 */
export interface ConfidenceScore {
  /** Overall confidence (0-1) */
  overall: number;
  /** Individual metric scores */
  metrics: ConfidenceMetric[];
  /** Whether confidence is low (< threshold) */
  isLow: boolean;
  /** Warning message if low confidence */
  warning?: string;
  /** Suggestions to improve confidence */
  suggestions?: string[];
}

/**
 * Configuration for ConfidenceScorer
 */
export interface ConfidenceScorerConfig {
  /** Threshold for low confidence warning (default: 0.5) */
  lowConfidenceThreshold?: number;
  /** Custom weights for metrics */
  weights?: {
    graphCoverage?: number;
    pathConfidence?: number;
    recency?: number;
    sourceQuality?: number;
    consensus?: number;
  };
  /** Language for messages */
  language?: 'ja' | 'en';
}

/**
 * Internal resolved configuration with required weights
 */
interface ResolvedConfidenceScorerConfig {
  lowConfidenceThreshold: number;
  weights: {
    graphCoverage: number;
    pathConfidence: number;
    recency: number;
    sourceQuality: number;
    consensus: number;
  };
  language: 'ja' | 'en';
}

/**
 * Input for confidence scoring
 */
export interface ConfidenceScorerInput {
  /** Query being answered */
  query: string;
  /** Generated answer/response */
  answer: string;
  /** Reasoning paths used */
  paths?: ReasoningPath[];
  /** Entity IDs referenced */
  entityIds?: string[];
  /** Source timestamps (for recency) */
  sourceTimestamps?: Date[];
  /** Source quality ratings (0-1) */
  sourceQualityRatings?: number[];
  /** Number of agreeing sources */
  consensusCount?: number;
  /** Total sources consulted */
  totalSources?: number;
}

/**
 * ConfidenceScorer - Multi-dimensional confidence evaluation
 *
 * Evaluates response confidence across 5 dimensions:
 * 1. Graph Coverage - How well the graph covers the query
 * 2. Path Confidence - Confidence of reasoning paths
 * 3. Recency - How recent the source data is
 * 4. Source Quality - Quality of source entities/documents
 * 5. Consensus - Agreement across multiple sources
 *
 * @example
 * ```typescript
 * const scorer = new ConfidenceScorer(context, { language: 'ja' });
 * const score = await scorer.score({
 *   query: "GPT-4の開発者は？",
 *   answer: "GPT-4はOpenAIが開発しました",
 *   paths: reasoningPaths,
 *   entityIds: ['gpt4-001', 'openai-001'],
 * });
 *
 * if (score.isLow) {
 *   console.warn(score.warning);
 * }
 * ```
 */
export class ConfidenceScorer {
  private readonly config: ResolvedConfidenceScorerConfig;

  constructor(
    private readonly context: ReasoningContext,
    config: ConfidenceScorerConfig = {}
  ) {
    this.config = {
      lowConfidenceThreshold: config.lowConfidenceThreshold ?? 0.5,
      weights: {
        graphCoverage: config.weights?.graphCoverage ?? 0.25,
        pathConfidence: config.weights?.pathConfidence ?? 0.25,
        recency: config.weights?.recency ?? 0.15,
        sourceQuality: config.weights?.sourceQuality ?? 0.20,
        consensus: config.weights?.consensus ?? 0.15,
      },
      language: config.language ?? 'ja',
    };
  }

  /**
   * Calculate confidence score for a response
   */
  async score(input: ConfidenceScorerInput): Promise<ConfidenceScore> {
    const metrics: ConfidenceMetric[] = [];
    const weights = this.config.weights;

    // 1. Graph Coverage
    const graphCoverage = await this.calculateGraphCoverage(input);
    metrics.push({
      name: 'graphCoverage',
      score: graphCoverage,
      weight: weights.graphCoverage,
      explanation: this.getExplanation('graphCoverage', graphCoverage),
    });

    // 2. Path Confidence
    const pathConfidence = this.calculatePathConfidence(input);
    metrics.push({
      name: 'pathConfidence',
      score: pathConfidence,
      weight: weights.pathConfidence,
      explanation: this.getExplanation('pathConfidence', pathConfidence),
    });

    // 3. Recency
    const recency = this.calculateRecency(input);
    metrics.push({
      name: 'recency',
      score: recency,
      weight: weights.recency,
      explanation: this.getExplanation('recency', recency),
    });

    // 4. Source Quality
    const sourceQuality = this.calculateSourceQuality(input);
    metrics.push({
      name: 'sourceQuality',
      score: sourceQuality,
      weight: weights.sourceQuality,
      explanation: this.getExplanation('sourceQuality', sourceQuality),
    });

    // 5. Consensus
    const consensus = this.calculateConsensus(input);
    metrics.push({
      name: 'consensus',
      score: consensus,
      weight: weights.consensus,
      explanation: this.getExplanation('consensus', consensus),
    });

    // Calculate weighted overall score
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overall = metrics.reduce(
      (sum, m) => sum + m.score * m.weight,
      0
    ) / totalWeight;

    const isLow = overall < this.config.lowConfidenceThreshold;

    const result: ConfidenceScore = {
      overall,
      metrics,
      isLow,
    };

    if (isLow) {
      result.warning = this.generateWarning(overall, metrics);
      result.suggestions = this.generateSuggestions(metrics);
    }

    return result;
  }

  /**
   * Calculate graph coverage score
   * Measures how well the knowledge graph covers the query entities
   */
  private async calculateGraphCoverage(input: ConfidenceScorerInput): Promise<number> {
    if (!input.entityIds || input.entityIds.length === 0) {
      return 0.3; // Low score if no entities
    }

    let foundCount = 0;
    for (const entityId of input.entityIds) {
      const entity = await this.context.getEntity(entityId);
      if (entity) {
        foundCount++;
      }
    }

    return foundCount / input.entityIds.length;
  }

  /**
   * Calculate path confidence score
   * Aggregates confidence from reasoning paths
   */
  private calculatePathConfidence(input: ConfidenceScorerInput): number {
    if (!input.paths || input.paths.length === 0) {
      return 0.5; // Neutral if no paths
    }

    // Use average path confidence
    const totalConfidence = input.paths.reduce(
      (sum, path) => sum + path.totalConfidence,
      0
    );

    return totalConfidence / input.paths.length;
  }

  /**
   * Calculate recency score
   * More recent sources get higher scores
   */
  private calculateRecency(input: ConfidenceScorerInput): number {
    if (!input.sourceTimestamps || input.sourceTimestamps.length === 0) {
      return 0.5; // Neutral if no timestamps
    }

    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    const scores = input.sourceTimestamps.map((timestamp) => {
      const age = now - timestamp.getTime();
      // Score decreases with age, minimum 0.1 for very old sources
      return Math.max(0.1, 1 - age / (2 * oneYear));
    });

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  /**
   * Calculate source quality score
   * Based on provided quality ratings
   */
  private calculateSourceQuality(input: ConfidenceScorerInput): number {
    if (!input.sourceQualityRatings || input.sourceQualityRatings.length === 0) {
      return 0.5; // Neutral if no ratings
    }

    return (
      input.sourceQualityRatings.reduce((sum, r) => sum + r, 0) /
      input.sourceQualityRatings.length
    );
  }

  /**
   * Calculate consensus score
   * Higher when multiple sources agree
   */
  private calculateConsensus(input: ConfidenceScorerInput): number {
    if (input.consensusCount === undefined || input.totalSources === undefined) {
      return 0.5; // Neutral if no consensus data
    }

    if (input.totalSources === 0) {
      return 0.5;
    }

    // Basic consensus ratio
    const ratio = input.consensusCount / input.totalSources;

    // Bonus for having multiple agreeing sources
    const bonus = input.consensusCount > 1 ? 0.1 : 0;

    return Math.min(1, ratio + bonus);
  }

  /**
   * Get explanation for a metric score
   */
  private getExplanation(metric: string, score: number): string {
    const level = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';

    const explanations = {
      ja: {
        graphCoverage: {
          high: 'ナレッジグラフが十分なエンティティをカバーしています',
          medium: 'ナレッジグラフのカバレッジが部分的です',
          low: 'ナレッジグラフのカバレッジが不十分です',
        },
        pathConfidence: {
          high: '推論パスの信頼度が高いです',
          medium: '推論パスの信頼度が中程度です',
          low: '推論パスの信頼度が低いです',
        },
        recency: {
          high: 'ソースデータが最新です',
          medium: 'ソースデータがやや古いです',
          low: 'ソースデータが古い可能性があります',
        },
        sourceQuality: {
          high: 'ソースの品質が高いです',
          medium: 'ソースの品質が中程度です',
          low: 'ソースの品質が低い可能性があります',
        },
        consensus: {
          high: '複数のソースが一致しています',
          medium: 'ソース間で部分的に一致しています',
          low: 'ソース間での一致が少ないです',
        },
      },
      en: {
        graphCoverage: {
          high: 'Knowledge graph covers sufficient entities',
          medium: 'Knowledge graph coverage is partial',
          low: 'Knowledge graph coverage is insufficient',
        },
        pathConfidence: {
          high: 'Reasoning path confidence is high',
          medium: 'Reasoning path confidence is moderate',
          low: 'Reasoning path confidence is low',
        },
        recency: {
          high: 'Source data is recent',
          medium: 'Source data is somewhat dated',
          low: 'Source data may be outdated',
        },
        sourceQuality: {
          high: 'Source quality is high',
          medium: 'Source quality is moderate',
          low: 'Source quality may be low',
        },
        consensus: {
          high: 'Multiple sources agree',
          medium: 'Sources partially agree',
          low: 'Little agreement among sources',
        },
      },
    };

    type MetricKey = 'graphCoverage' | 'pathConfidence' | 'recency' | 'sourceQuality' | 'consensus';
    type LevelKey = 'high' | 'medium' | 'low';

    const langExplanations = explanations[this.config.language];
    const metricExplanations = langExplanations[metric as MetricKey];

    if (metricExplanations) {
      return metricExplanations[level as LevelKey];
    }

    return `${metric}: ${score.toFixed(2)}`;
  }

  /**
   * Generate warning message for low confidence
   */
  private generateWarning(overall: number, metrics: ConfidenceMetric[]): string {
    const lowestMetric = metrics.reduce((min, m) =>
      m.score < min.score ? m : min
    );

    if (this.config.language === 'ja') {
      return `信頼度が低い可能性があります（${(overall * 100).toFixed(0)}%）。特に「${lowestMetric.name}」のスコアが低いです。`;
    }

    return `Confidence may be low (${(overall * 100).toFixed(0)}%). "${lowestMetric.name}" score is particularly low.`;
  }

  /**
   * Generate suggestions to improve confidence
   */
  private generateSuggestions(metrics: ConfidenceMetric[]): string[] {
    const suggestions: string[] = [];
    const isJa = this.config.language === 'ja';

    for (const metric of metrics) {
      if (metric.score < 0.5) {
        switch (metric.name) {
          case 'graphCoverage':
            suggestions.push(
              isJa
                ? '関連するエンティティをナレッジグラフに追加してください'
                : 'Add relevant entities to the knowledge graph'
            );
            break;
          case 'pathConfidence':
            suggestions.push(
              isJa
                ? 'より信頼性の高い関係を確立してください'
                : 'Establish more reliable relationships'
            );
            break;
          case 'recency':
            suggestions.push(
              isJa
                ? 'より最新のソースデータを追加してください'
                : 'Add more recent source data'
            );
            break;
          case 'sourceQuality':
            suggestions.push(
              isJa
                ? '信頼性の高いソースからのデータを追加してください'
                : 'Add data from more reliable sources'
            );
            break;
          case 'consensus':
            suggestions.push(
              isJa
                ? '複数のソースで情報を検証してください'
                : 'Verify information with multiple sources'
            );
            break;
        }
      }
    }

    return suggestions;
  }
}
