/**
 * MCP Temporal Tools
 *
 * Time-series analysis tools for the MCP server.
 * Provides tools for analyzing trends, timelines, hot topics,
 * and forecasting based on temporal data.
 *
 * @since v4.0.0
 * @see T-403
 */

import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Adoption phase based on technology lifecycle
 */
export type MCPAdoptionPhase = 'emerging' | 'growing' | 'mature' | 'declining';

/**
 * Granularity for time series
 */
export type MCPGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Time range preset
 */
export type MCPTimeRangePreset = 'last7days' | 'last30days' | 'last90days' | 'last1year' | 'last3years' | 'all';

/**
 * Time range definition
 */
export interface MCPTimeRange {
  from: string;
  to: string;
}

/**
 * Daily metrics for trends
 */
export interface MCPDailyMetrics {
  date: string;
  citationCount: number;
  momentum: number;
  velocity: number;
}

/**
 * Trend summary
 */
export interface MCPTrendSummary {
  avgMomentum: number;
  avgVelocity: number;
  currentPhase: MCPAdoptionPhase;
  trend: 'rising' | 'stable' | 'declining';
}

/**
 * Trend data point
 */
export interface MCPTrendDataPoint {
  entityId: string;
  period: MCPTimeRange;
  metrics: MCPDailyMetrics[];
  summary: MCPTrendSummary;
}

/**
 * Trend analysis result
 */
export interface MCPTrendAnalysisResult {
  timeRange: MCPTimeRange;
  topTrends: MCPTrendDataPoint[];
  analyzedAt: string;
}

/**
 * Timeline data point
 */
export interface MCPTimelineDataPoint {
  date: string;
  citationCount: number;
  momentum: number;
  velocity: number;
  phase?: MCPAdoptionPhase;
}

/**
 * Entity timeline result
 */
export interface MCPTimelineResult {
  entityId: string;
  entityName?: string;
  timeRange: MCPTimeRange;
  granularity: MCPGranularity;
  dataPoints: MCPTimelineDataPoint[];
}

/**
 * Hot topic item
 */
export interface MCPHotTopic {
  entityId: string;
  entityName: string;
  momentum: number;
  velocity: number;
  citationCount: number;
  adoptionPhase: MCPAdoptionPhase;
  rank: number;
}

/**
 * Hot topics summary
 */
export interface MCPHotTopicsSummary {
  totalEmerging: number;
  avgMomentum: number;
  topField: string;
}

/**
 * Hot topics result
 */
export interface MCPHotTopicsResult {
  capturedAt: string;
  topics: MCPHotTopic[];
  summary: MCPHotTopicsSummary;
}

/**
 * Forecast prediction
 */
export interface MCPForecastPrediction {
  date: string;
  predictedCitations: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Trend forecast result
 */
export interface MCPTrendForecast {
  entityId: string;
  entityName: string;
  forecastStart: string;
  forecastEnd: string;
  predictions: MCPForecastPrediction[];
  trendDirection: 'up' | 'down' | 'stable';
  confidence: number;
  model: 'linear' | 'exponential' | 'arima';
}

/**
 * Phase distribution
 */
export interface MCPPhaseDistribution {
  emerging: number;
  growing: number;
  mature: number;
  declining: number;
}

/**
 * Temporal statistics
 */
export interface MCPTemporalStatistics {
  timeRange: MCPTimeRange;
  totalEntities: number;
  avgMomentum: number;
  avgVelocity: number;
  phaseDistribution: MCPPhaseDistribution;
  topGainers: Array<{ entityId: string; momentum: number }>;
  topDecliners: Array<{ entityId: string; momentum: number }>;
}

/**
 * Trend snapshot
 */
export interface MCPTrendSnapshot {
  id: string;
  date: string;
  totalEntities: number;
  hotTopics: MCPHotTopic[];
  summary: {
    emergingCount: number;
    growingCount: number;
    matureCount: number;
    decliningCount: number;
  };
}

/**
 * Temporal service interface
 */
export interface TemporalToolService {
  /**
   * Analyze trends over a time range
   */
  analyzeTrends(options: {
    range?: MCPTimeRangePreset;
    top?: number;
  }): Promise<MCPTrendAnalysisResult>;

  /**
   * Get timeline for a specific entity
   */
  getTimeline(
    entityId: string,
    options?: {
      range?: MCPTimeRangePreset;
      granularity?: MCPGranularity;
    }
  ): Promise<MCPTimelineResult>;

  /**
   * Detect hot topics
   */
  detectHotTopics(options?: {
    limit?: number;
    minMomentum?: number;
  }): Promise<MCPHotTopicsResult>;

  /**
   * Forecast trends for an entity
   */
  forecast(
    entityId: string,
    options?: {
      horizon?: number; // days
    }
  ): Promise<MCPTrendForecast>;

  /**
   * Get entities by adoption phase
   */
  getEntitiesByPhase(
    phase: MCPAdoptionPhase,
    options?: {
      limit?: number;
    }
  ): Promise<{ phase: MCPAdoptionPhase; entities: string[] }>;

  /**
   * Get temporal statistics
   */
  getStatistics(options?: {
    range?: MCPTimeRangePreset;
  }): Promise<MCPTemporalStatistics>;

  /**
   * Create or get snapshot
   */
  createSnapshot?(): Promise<MCPTrendSnapshot>;
  getLatestSnapshot?(): Promise<MCPTrendSnapshot>;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Temporal tool definitions
 */
export const temporalTools: Tool[] = [
  {
    name: 'temporal_analyze_trends',
    description:
      '時系列トレンドを分析し、指定期間内の上位トレンドを返します。モメンタム、速度、現在フェーズを含む詳細な分析結果を提供します。',
    inputSchema: {
      type: 'object',
      properties: {
        range: {
          type: 'string',
          enum: ['last7days', 'last30days', 'last90days', 'last1year', 'last3years', 'all'],
          description: '分析対象の時間範囲（デフォルト: last30days）',
        },
        top: {
          type: 'number',
          description: '取得する上位トレンド数（デフォルト: 10）',
        },
      },
      required: [],
    },
  },
  {
    name: 'temporal_get_timeline',
    description:
      '特定のエンティティの時系列タイムラインを取得します。引用数、モメンタム、速度の推移を確認できます。',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'タイムラインを取得するエンティティID',
        },
        range: {
          type: 'string',
          enum: ['last7days', 'last30days', 'last90days', 'last1year', 'last3years', 'all'],
          description: '取得する時間範囲（デフォルト: last1year）',
        },
        granularity: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          description: 'データの粒度（デフォルト: month）',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'temporal_hot_topics',
    description:
      '現在のホットトピック（高モメンタム・急成長中のエンティティ）を検出します。注目度の高い研究分野やテクノロジーを特定できます。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '取得する最大件数（デフォルト: 10）',
        },
        minMomentum: {
          type: 'number',
          description: '最小モメンタムフィルタ（デフォルト: 0）',
        },
      },
      required: [],
    },
  },
  {
    name: 'temporal_forecast',
    description:
      'エンティティのトレンドを予測します。過去データに基づく将来の引用数予測と信頼区間を提供します。',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: '予測対象のエンティティID',
        },
        horizon: {
          type: 'number',
          description: '予測期間（日数、デフォルト: 30）',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'temporal_by_phase',
    description:
      '採用フェーズ別にエンティティを取得します。emerging（新興）、growing（成長）、mature（成熟）、declining（衰退）の各フェーズでフィルタリングできます。',
    inputSchema: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: ['emerging', 'growing', 'mature', 'declining'],
          description: '採用フェーズ',
        },
        limit: {
          type: 'number',
          description: '取得する最大件数（デフォルト: 20）',
        },
      },
      required: ['phase'],
    },
  },
];

// =============================================================================
// Tool Handler
// =============================================================================

/**
 * Create temporal tool handlers
 */
export function createTemporalToolHandlers(service: TemporalToolService) {
  /**
   * Format text content response
   */
  function formatTextContent(data: unknown): TextContent {
    return {
      type: 'text',
      text: JSON.stringify(data, null, 2),
    };
  }

  /**
   * Handle analyze trends tool
   */
  async function handleAnalyzeTrends(args: {
    range?: MCPTimeRangePreset;
    top?: number;
  }): Promise<CallToolResult> {
    const result = await service.analyzeTrends({
      range: args.range ?? 'last30days',
      top: args.top ?? 10,
    });

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Handle get timeline tool
   */
  async function handleGetTimeline(args: {
    entityId: string;
    range?: MCPTimeRangePreset;
    granularity?: MCPGranularity;
  }): Promise<CallToolResult> {
    if (!args.entityId) {
      return {
        content: [{ type: 'text', text: 'エラー: entityId は必須です' }],
        isError: true,
      };
    }

    const result = await service.getTimeline(args.entityId, {
      range: args.range ?? 'last1year',
      granularity: args.granularity ?? 'month',
    });

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Handle hot topics tool
   */
  async function handleHotTopics(args: {
    limit?: number;
    minMomentum?: number;
  }): Promise<CallToolResult> {
    const result = await service.detectHotTopics({
      limit: args.limit ?? 10,
      minMomentum: args.minMomentum ?? 0,
    });

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Handle forecast tool
   */
  async function handleForecast(args: {
    entityId: string;
    horizon?: number;
  }): Promise<CallToolResult> {
    if (!args.entityId) {
      return {
        content: [{ type: 'text', text: 'エラー: entityId は必須です' }],
        isError: true,
      };
    }

    const result = await service.forecast(args.entityId, {
      horizon: args.horizon ?? 30,
    });

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Handle by phase tool
   */
  async function handleByPhase(args: {
    phase: MCPAdoptionPhase;
    limit?: number;
  }): Promise<CallToolResult> {
    if (!args.phase) {
      return {
        content: [{ type: 'text', text: 'エラー: phase は必須です' }],
        isError: true,
      };
    }

    const validPhases: MCPAdoptionPhase[] = ['emerging', 'growing', 'mature', 'declining'];
    if (!validPhases.includes(args.phase)) {
      return {
        content: [
          {
            type: 'text',
            text: `エラー: phase は ${validPhases.join(', ')} のいずれかである必要があります`,
          },
        ],
        isError: true,
      };
    }

    const result = await service.getEntitiesByPhase(args.phase, {
      limit: args.limit ?? 20,
    });

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Main tool handler
   */
  async function handleTemporalTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    switch (toolName) {
      case 'temporal_analyze_trends':
        return handleAnalyzeTrends(args as { range?: MCPTimeRangePreset; top?: number });

      case 'temporal_get_timeline':
        return handleGetTimeline(
          args as { entityId: string; range?: MCPTimeRangePreset; granularity?: MCPGranularity }
        );

      case 'temporal_hot_topics':
        return handleHotTopics(args as { limit?: number; minMomentum?: number });

      case 'temporal_forecast':
        return handleForecast(args as { entityId: string; horizon?: number });

      case 'temporal_by_phase':
        return handleByPhase(args as { phase: MCPAdoptionPhase; limit?: number });

      default:
        return {
          content: [{ type: 'text', text: `Unknown temporal tool: ${toolName}` }],
          isError: true,
        };
    }
  }

  return {
    handleAnalyzeTrends,
    handleGetTimeline,
    handleHotTopics,
    handleForecast,
    handleByPhase,
    handleTemporalTool,
  };
}
