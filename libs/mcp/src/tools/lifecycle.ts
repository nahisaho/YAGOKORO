/**
 * MCP Lifecycle Tools
 *
 * Technology lifecycle analysis tools for the MCP server.
 * Provides tools for analyzing technology maturity, detecting phases,
 * and generating lifecycle reports.
 */

import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Lifecycle phase in Hype Cycle
 */
export type LifecyclePhase =
  | 'innovation_trigger'
  | 'peak_of_expectations'
  | 'trough_of_disillusionment'
  | 'slope_of_enlightenment'
  | 'plateau_of_productivity';

/**
 * Phase detection result
 */
export interface MCPPhaseResult {
  phase: LifecyclePhase;
  phaseLabel: string;
  confidence: number;
  indicators: string[];
}

/**
 * Maturity score
 */
export interface MCPMaturityScore {
  overall: number;
  adoptionRate: number;
  publicationTrend: number;
  industryPresence: number;
  communityActivity: number;
}

/**
 * Trend forecast
 */
export interface MCPTrendForecast {
  direction: 'rising' | 'stable' | 'declining';
  momentum: number;
  projectedPhase: LifecyclePhase;
  confidence: number;
  factors: string[];
}

/**
 * Lifecycle analysis result
 */
export interface MCPLifecycleAnalysis {
  technologyId: string;
  technologyName: string;
  currentPhase: MCPPhaseResult;
  maturityScore: MCPMaturityScore;
  trendForecast: MCPTrendForecast;
  timeline: unknown;
  analyzedAt: string;
}

/**
 * Lifecycle report
 */
export interface MCPLifecycleReport {
  technologyId: string;
  technologyName: string;
  generatedAt: string;
  analysis: MCPLifecycleAnalysis;
  relatedTechnologies: string[];
  summary: string;
}

/**
 * Emerging technology result
 */
export interface MCPEmergingTechnology {
  technologyId: string;
  technologyName: string;
  phase: LifecyclePhase;
  growthRate: number;
  keyIndicators: string[];
  firstSeen: string;
  confidence: number;
}

/**
 * Declining technology result
 */
export interface MCPDecliningTechnology {
  technologyId: string;
  technologyName: string;
  phase: LifecyclePhase;
  declineRate: number;
  lastActiveDate: string;
  replacements: string[];
  confidence: number;
}

/**
 * Technology comparison result
 */
export interface MCPTechnologyComparison {
  technologies: MCPLifecycleAnalysis[];
  comparisonDate: string;
  summary: string;
}

/**
 * Lifecycle service interface
 */
export interface LifecycleToolService {
  /**
   * Analyze technology lifecycle
   */
  analyzeTechnology(technologyId: string): Promise<MCPLifecycleAnalysis>;

  /**
   * Generate lifecycle report
   */
  generateReport(technologyId: string): Promise<MCPLifecycleReport>;

  /**
   * Find emerging technologies
   */
  findEmergingTechnologies(
    limit?: number,
    minGrowthRate?: number
  ): Promise<MCPEmergingTechnology[]>;

  /**
   * Find declining technologies
   */
  findDecliningTechnologies(
    limit?: number,
    minDeclineRate?: number
  ): Promise<MCPDecliningTechnology[]>;

  /**
   * Compare technologies
   */
  compareTechnologies(technologyIds: string[]): Promise<MCPTechnologyComparison>;

  /**
   * Get technologies by phase
   */
  getTechnologiesByPhase(phase: LifecyclePhase): Promise<MCPLifecycleAnalysis[]>;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Lifecycle tool definitions
 */
export const lifecycleTools: Tool[] = [
  {
    name: 'lifecycle_analyze',
    description:
      '技術のライフサイクルを分析し、Hype Cycleにおける現在のフェーズ、成熟度スコア、トレンド予測を返します。',
    inputSchema: {
      type: 'object',
      properties: {
        technologyId: {
          type: 'string',
          description: '分析対象の技術ID',
        },
      },
      required: ['technologyId'],
    },
  },
  {
    name: 'lifecycle_report',
    description:
      '技術の詳細なライフサイクルレポートを生成します。分析結果、関連技術、サマリーを含みます。',
    inputSchema: {
      type: 'object',
      properties: {
        technologyId: {
          type: 'string',
          description: 'レポート対象の技術ID',
        },
      },
      required: ['technologyId'],
    },
  },
  {
    name: 'lifecycle_emerging',
    description:
      '新興技術（成長中の技術）を検出します。Innovation TriggerやPeak of Expectationsフェーズにある技術を特定します。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '取得する最大件数（デフォルト: 10）',
        },
        minGrowthRate: {
          type: 'number',
          description: '最小成長率フィルタ（0-1、デフォルト: 0.1）',
        },
      },
      required: [],
    },
  },
  {
    name: 'lifecycle_declining',
    description:
      '衰退中の技術を検出します。活動が減少している技術や代替技術への移行が進んでいる技術を特定します。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '取得する最大件数（デフォルト: 10）',
        },
        minDeclineRate: {
          type: 'number',
          description: '最小衰退率フィルタ（0-1、デフォルト: 0.1）',
        },
      },
      required: [],
    },
  },
  {
    name: 'lifecycle_compare',
    description:
      '複数の技術のライフサイクルを比較します。フェーズ、成熟度、トレンドの違いを分析します。',
    inputSchema: {
      type: 'object',
      properties: {
        technologyIds: {
          type: 'array',
          items: { type: 'string' },
          description: '比較する技術IDの配列（2〜5個）',
        },
      },
      required: ['technologyIds'],
    },
  },
  {
    name: 'lifecycle_by_phase',
    description:
      '指定されたHype Cycleフェーズにある技術の一覧を取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: [
            'innovation_trigger',
            'peak_of_expectations',
            'trough_of_disillusionment',
            'slope_of_enlightenment',
            'plateau_of_productivity',
          ],
          description: 'Hype Cycleフェーズ',
        },
      },
      required: ['phase'],
    },
  },
];

// =============================================================================
// Phase Labels
// =============================================================================

const PHASE_LABELS: Record<LifecyclePhase, string> = {
  innovation_trigger: '黎明期',
  peak_of_expectations: '過熱期',
  trough_of_disillusionment: '幻滅期',
  slope_of_enlightenment: '回復期',
  plateau_of_productivity: '安定期',
};

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Create lifecycle tool handler
 */
export function createLifecycleToolHandler(
  service: LifecycleToolService
): (name: string, args: Record<string, unknown>) => Promise<CallToolResult> {
  return async (name: string, args: Record<string, unknown>): Promise<CallToolResult> => {
    switch (name) {
      case 'lifecycle_analyze':
        return handleAnalyze(service, args);
      case 'lifecycle_report':
        return handleReport(service, args);
      case 'lifecycle_emerging':
        return handleEmerging(service, args);
      case 'lifecycle_declining':
        return handleDeclining(service, args);
      case 'lifecycle_compare':
        return handleCompare(service, args);
      case 'lifecycle_by_phase':
        return handleByPhase(service, args);
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown lifecycle tool: ${name}`,
            } as TextContent,
          ],
          isError: true,
        };
    }
  };
}

// =============================================================================
// Tool Handlers
// =============================================================================

async function handleAnalyze(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const technologyId = args.technologyId as string;

  if (!technologyId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: technologyId is required',
        } as TextContent,
      ],
      isError: true,
    };
  }

  try {
    const analysis = await service.analyzeTechnology(technologyId);
    const phaseLabel = PHASE_LABELS[analysis.currentPhase.phase];

    const output = [
      `# ライフサイクル分析: ${analysis.technologyName}`,
      '',
      '## 現在のフェーズ',
      `- **フェーズ**: ${phaseLabel} (${analysis.currentPhase.phase})`,
      `- **信頼度**: ${(analysis.currentPhase.confidence * 100).toFixed(1)}%`,
      `- **指標**: ${analysis.currentPhase.indicators.join(', ')}`,
      '',
      '## 成熟度スコア',
      `- **総合**: ${(analysis.maturityScore.overall * 100).toFixed(1)}%`,
      `- **採用率**: ${(analysis.maturityScore.adoptionRate * 100).toFixed(1)}%`,
      `- **論文トレンド**: ${(analysis.maturityScore.publicationTrend * 100).toFixed(1)}%`,
      `- **産業プレゼンス**: ${(analysis.maturityScore.industryPresence * 100).toFixed(1)}%`,
      `- **コミュニティ活動**: ${(analysis.maturityScore.communityActivity * 100).toFixed(1)}%`,
      '',
      '## トレンド予測',
      `- **方向**: ${formatDirection(analysis.trendForecast.direction)}`,
      `- **勢い**: ${(analysis.trendForecast.momentum * 100).toFixed(1)}%`,
      `- **予測フェーズ**: ${PHASE_LABELS[analysis.trendForecast.projectedPhase]}`,
      `- **信頼度**: ${(analysis.trendForecast.confidence * 100).toFixed(1)}%`,
      `- **要因**: ${analysis.trendForecast.factors.join(', ')}`,
      '',
      `*分析日時: ${analysis.analyzedAt}*`,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing technology: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

async function handleReport(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const technologyId = args.technologyId as string;

  if (!technologyId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: technologyId is required',
        } as TextContent,
      ],
      isError: true,
    };
  }

  try {
    const report = await service.generateReport(technologyId);
    const phaseLabel = PHASE_LABELS[report.analysis.currentPhase.phase];

    const output = [
      `# ライフサイクルレポート: ${report.technologyName}`,
      '',
      `*生成日時: ${report.generatedAt}*`,
      '',
      '---',
      '',
      '## サマリー',
      report.summary,
      '',
      '## 現在のステータス',
      `- **フェーズ**: ${phaseLabel}`,
      `- **成熟度**: ${(report.analysis.maturityScore.overall * 100).toFixed(1)}%`,
      `- **トレンド**: ${formatDirection(report.analysis.trendForecast.direction)}`,
      '',
      '## 関連技術',
      report.relatedTechnologies.length > 0
        ? report.relatedTechnologies.map((t) => `- ${t}`).join('\n')
        : '- なし',
      '',
      '## 詳細分析',
      '',
      '### フェーズ検出',
      `- **フェーズ**: ${phaseLabel} (${report.analysis.currentPhase.phase})`,
      `- **信頼度**: ${(report.analysis.currentPhase.confidence * 100).toFixed(1)}%`,
      `- **指標**: ${report.analysis.currentPhase.indicators.join(', ')}`,
      '',
      '### 成熟度スコア',
      `| 指標 | スコア |`,
      `|------|--------|`,
      `| 総合 | ${(report.analysis.maturityScore.overall * 100).toFixed(1)}% |`,
      `| 採用率 | ${(report.analysis.maturityScore.adoptionRate * 100).toFixed(1)}% |`,
      `| 論文トレンド | ${(report.analysis.maturityScore.publicationTrend * 100).toFixed(1)}% |`,
      `| 産業プレゼンス | ${(report.analysis.maturityScore.industryPresence * 100).toFixed(1)}% |`,
      `| コミュニティ活動 | ${(report.analysis.maturityScore.communityActivity * 100).toFixed(1)}% |`,
      '',
      '### トレンド予測',
      `- **方向**: ${formatDirection(report.analysis.trendForecast.direction)}`,
      `- **勢い**: ${(report.analysis.trendForecast.momentum * 100).toFixed(1)}%`,
      `- **予測フェーズ**: ${PHASE_LABELS[report.analysis.trendForecast.projectedPhase]}`,
      `- **要因**: ${report.analysis.trendForecast.factors.join(', ')}`,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating report: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

async function handleEmerging(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const limit = (args.limit as number) || 10;
  const minGrowthRate = (args.minGrowthRate as number) || 0.1;

  try {
    const technologies = await service.findEmergingTechnologies(limit, minGrowthRate);

    if (technologies.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `成長率 ${(minGrowthRate * 100).toFixed(0)}% 以上の新興技術は見つかりませんでした。`,
          } as TextContent,
        ],
      };
    }

    const output = [
      `# 新興技術一覧`,
      '',
      `*成長率 ${(minGrowthRate * 100).toFixed(0)}% 以上、上位 ${limit} 件*`,
      '',
      '| 技術名 | フェーズ | 成長率 | 信頼度 | 初出 |',
      '|--------|----------|--------|--------|------|',
      ...technologies.map(
        (t) =>
          `| ${t.technologyName} | ${PHASE_LABELS[t.phase]} | ${(t.growthRate * 100).toFixed(1)}% | ${(t.confidence * 100).toFixed(0)}% | ${t.firstSeen} |`
      ),
      '',
      '## 詳細',
      '',
      ...technologies.flatMap((t) => [
        `### ${t.technologyName}`,
        `- **フェーズ**: ${PHASE_LABELS[t.phase]}`,
        `- **成長率**: ${(t.growthRate * 100).toFixed(1)}%`,
        `- **主要指標**: ${t.keyIndicators.join(', ')}`,
        `- **初出**: ${t.firstSeen}`,
        '',
      ]),
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error finding emerging technologies: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

async function handleDeclining(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const limit = (args.limit as number) || 10;
  const minDeclineRate = (args.minDeclineRate as number) || 0.1;

  try {
    const technologies = await service.findDecliningTechnologies(limit, minDeclineRate);

    if (technologies.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `衰退率 ${(minDeclineRate * 100).toFixed(0)}% 以上の衰退中技術は見つかりませんでした。`,
          } as TextContent,
        ],
      };
    }

    const output = [
      `# 衰退中技術一覧`,
      '',
      `*衰退率 ${(minDeclineRate * 100).toFixed(0)}% 以上、上位 ${limit} 件*`,
      '',
      '| 技術名 | フェーズ | 衰退率 | 信頼度 | 最終活動 |',
      '|--------|----------|--------|--------|----------|',
      ...technologies.map(
        (t) =>
          `| ${t.technologyName} | ${PHASE_LABELS[t.phase]} | ${(t.declineRate * 100).toFixed(1)}% | ${(t.confidence * 100).toFixed(0)}% | ${t.lastActiveDate} |`
      ),
      '',
      '## 詳細',
      '',
      ...technologies.flatMap((t) => [
        `### ${t.technologyName}`,
        `- **フェーズ**: ${PHASE_LABELS[t.phase]}`,
        `- **衰退率**: ${(t.declineRate * 100).toFixed(1)}%`,
        `- **代替技術**: ${t.replacements.length > 0 ? t.replacements.join(', ') : 'なし'}`,
        `- **最終活動**: ${t.lastActiveDate}`,
        '',
      ]),
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error finding declining technologies: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

async function handleCompare(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const technologyIds = args.technologyIds as string[];

  if (!technologyIds || technologyIds.length < 2) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: technologyIds must contain at least 2 IDs',
        } as TextContent,
      ],
      isError: true,
    };
  }

  if (technologyIds.length > 5) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: technologyIds must contain at most 5 IDs',
        } as TextContent,
      ],
      isError: true,
    };
  }

  try {
    const comparison = await service.compareTechnologies(technologyIds);

    const output = [
      `# 技術ライフサイクル比較`,
      '',
      `*比較日時: ${comparison.comparisonDate}*`,
      '',
      '## サマリー',
      comparison.summary,
      '',
      '## 比較表',
      '',
      '| 技術名 | フェーズ | 成熟度 | トレンド | 勢い |',
      '|--------|----------|--------|----------|------|',
      ...comparison.technologies.map(
        (t) =>
          `| ${t.technologyName} | ${PHASE_LABELS[t.currentPhase.phase]} | ${(t.maturityScore.overall * 100).toFixed(0)}% | ${formatDirection(t.trendForecast.direction)} | ${(t.trendForecast.momentum * 100).toFixed(0)}% |`
      ),
      '',
      '## 各技術の詳細',
      '',
      ...comparison.technologies.flatMap((t) => [
        `### ${t.technologyName}`,
        '',
        '#### フェーズ',
        `- **現在**: ${PHASE_LABELS[t.currentPhase.phase]}`,
        `- **信頼度**: ${(t.currentPhase.confidence * 100).toFixed(1)}%`,
        '',
        '#### 成熟度',
        `- **総合**: ${(t.maturityScore.overall * 100).toFixed(1)}%`,
        `- **採用率**: ${(t.maturityScore.adoptionRate * 100).toFixed(1)}%`,
        `- **産業プレゼンス**: ${(t.maturityScore.industryPresence * 100).toFixed(1)}%`,
        '',
        '#### トレンド',
        `- **方向**: ${formatDirection(t.trendForecast.direction)}`,
        `- **予測フェーズ**: ${PHASE_LABELS[t.trendForecast.projectedPhase]}`,
        '',
      ]),
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error comparing technologies: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

async function handleByPhase(
  service: LifecycleToolService,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const phase = args.phase as LifecyclePhase;

  if (!phase) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: phase is required',
        } as TextContent,
      ],
      isError: true,
    };
  }

  const validPhases: LifecyclePhase[] = [
    'innovation_trigger',
    'peak_of_expectations',
    'trough_of_disillusionment',
    'slope_of_enlightenment',
    'plateau_of_productivity',
  ];

  if (!validPhases.includes(phase)) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Invalid phase. Valid phases are: ${validPhases.join(', ')}`,
        } as TextContent,
      ],
      isError: true,
    };
  }

  try {
    const technologies = await service.getTechnologiesByPhase(phase);
    const phaseLabel = PHASE_LABELS[phase];

    if (technologies.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `${phaseLabel}フェーズの技術は見つかりませんでした。`,
          } as TextContent,
        ],
      };
    }

    const output = [
      `# ${phaseLabel}フェーズの技術一覧`,
      '',
      `*${technologies.length} 件の技術が該当*`,
      '',
      '| 技術名 | 成熟度 | トレンド | 信頼度 |',
      '|--------|--------|----------|--------|',
      ...technologies.map(
        (t) =>
          `| ${t.technologyName} | ${(t.maturityScore.overall * 100).toFixed(0)}% | ${formatDirection(t.trendForecast.direction)} | ${(t.currentPhase.confidence * 100).toFixed(0)}% |`
      ),
      '',
      '## 詳細',
      '',
      ...technologies.flatMap((t) => [
        `### ${t.technologyName}`,
        `- **成熟度**: ${(t.maturityScore.overall * 100).toFixed(1)}%`,
        `- **トレンド**: ${formatDirection(t.trendForecast.direction)} (勢い: ${(t.trendForecast.momentum * 100).toFixed(0)}%)`,
        `- **予測フェーズ**: ${PHASE_LABELS[t.trendForecast.projectedPhase]}`,
        `- **指標**: ${t.currentPhase.indicators.join(', ')}`,
        '',
      ]),
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: output,
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting technologies by phase: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDirection(direction: 'rising' | 'stable' | 'declining'): string {
  const labels: Record<string, string> = {
    rising: '↑ 上昇',
    stable: '→ 安定',
    declining: '↓ 下降',
  };
  return labels[direction] || direction;
}

/**
 * Check if a tool name is a lifecycle tool
 */
export function isLifecycleTool(name: string): boolean {
  return name.startsWith('lifecycle_');
}
