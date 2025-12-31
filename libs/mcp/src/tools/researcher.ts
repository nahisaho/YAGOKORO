/**
 * MCP Researcher Tools
 *
 * Researcher network analysis tools for the MCP server.
 * Provides tools for searching researchers, analyzing influence,
 * exploring collaborations, and career analysis.
 *
 * @since v4.0.0
 * @see T-404
 */

import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Researcher details
 */
export interface MCPResearcherDetails {
  id: string;
  name: string;
  affiliation?: string;
  orcid?: string;
  paperCount: number;
  coauthorCount: number;
  communityId?: number;
  influenceScore?: number;
}

/**
 * Influence ranking item
 */
export interface MCPInfluenceRankingItem {
  id: string;
  name: string;
  influenceScore: number;
  hIndex: number;
  pageRank: number;
}

/**
 * Community info
 */
export interface MCPCommunityInfo {
  id: string | number;
  memberCount: number;
  representative?: string;
  density?: number;
}

/**
 * Network statistics
 */
export interface MCPNetworkStats {
  totalResearchers: number;
  totalEdges: number;
  totalPapers: number;
  averageDegree: number;
  communityCount: number;
}

/**
 * Graph export format
 */
export interface MCPGraphExport {
  nodes: Array<{
    id: string;
    name: string;
    affiliation?: string;
    communityId?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

/**
 * Career stage
 */
export type MCPCareerStage = 'early' | 'mid' | 'senior' | 'emeritus';

/**
 * Career timeline
 */
export interface MCPCareerTimeline {
  researcherId: string;
  stages: Array<{
    period: string;
    publications: number;
    avgImpact: number;
    topVenue?: string;
  }>;
  currentStage: MCPCareerStage;
}

/**
 * Career prediction
 */
export interface MCPCareerPrediction {
  researcherId: string;
  projectedHIndex: number;
  projectedPublications: number;
  trendDirection: 'rising' | 'stable' | 'declining';
  confidence: number;
}

/**
 * Collaboration path
 */
export interface MCPCollaborationPath {
  path: string[];
  distance: number;
}

/**
 * Researcher service interface
 */
export interface ResearcherToolService {
  /**
   * Search researchers
   */
  searchResearchers(options?: {
    nameQuery?: string;
    affiliation?: string;
    minCoauthors?: number;
    limit?: number;
  }): MCPResearcherDetails[];

  /**
   * Get researcher details
   */
  getResearcher(researcherId: string): MCPResearcherDetails | undefined;

  /**
   * Get coauthors
   */
  getCoauthors(researcherId: string): MCPResearcherDetails[];

  /**
   * Find collaboration path
   */
  findPath(fromId: string, toId: string): string[] | null;

  /**
   * Get influence ranking
   */
  getInfluenceRanking(options?: {
    limit?: number;
    communityId?: number;
  }): MCPInfluenceRankingItem[];

  /**
   * Get communities
   */
  getCommunities(): MCPCommunityInfo[];

  /**
   * Get network statistics
   */
  getNetworkStats(): MCPNetworkStats;

  /**
   * Export graph
   */
  exportToGraph(): MCPGraphExport;

  /**
   * Analyze career
   */
  analyzeCareer(researcherId: string): MCPCareerTimeline | null;

  /**
   * Predict career
   */
  predictCareer(researcherId: string): MCPCareerPrediction | null;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Researcher tool definitions
 */
export const researcherTools: Tool[] = [
  {
    name: 'researcher_search',
    description:
      '研究者を検索します。名前、所属機関、共著者数でフィルタリングできます。',
    inputSchema: {
      type: 'object',
      properties: {
        nameQuery: {
          type: 'string',
          description: '研究者名（部分一致）',
        },
        affiliation: {
          type: 'string',
          description: '所属機関でフィルタ',
        },
        minCoauthors: {
          type: 'number',
          description: '最小共著者数',
        },
        limit: {
          type: 'number',
          description: '最大結果数（デフォルト: 20）',
        },
      },
      required: [],
    },
  },
  {
    name: 'researcher_get',
    description:
      '研究者の詳細情報を取得します。論文数、共著者数、影響度スコア、コミュニティIDを含みます。',
    inputSchema: {
      type: 'object',
      properties: {
        researcherId: {
          type: 'string',
          description: '研究者ID',
        },
      },
      required: ['researcherId'],
    },
  },
  {
    name: 'researcher_coauthors',
    description:
      '研究者の共著者リストを取得します。コラボレーションネットワークを探索するのに使用します。',
    inputSchema: {
      type: 'object',
      properties: {
        researcherId: {
          type: 'string',
          description: '研究者ID',
        },
        limit: {
          type: 'number',
          description: '最大結果数（デフォルト: 全件）',
        },
      },
      required: ['researcherId'],
    },
  },
  {
    name: 'researcher_path',
    description:
      '2人の研究者間の最短共著パスを探索します（Six Degrees of Separation）。',
    inputSchema: {
      type: 'object',
      properties: {
        fromId: {
          type: 'string',
          description: '開始研究者ID',
        },
        toId: {
          type: 'string',
          description: '終了研究者ID',
        },
      },
      required: ['fromId', 'toId'],
    },
  },
  {
    name: 'researcher_ranking',
    description:
      '影響度ランキングを取得します。h-index、PageRankに基づいた研究者ランキングを表示します。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '表示件数（デフォルト: 10）',
        },
        communityId: {
          type: 'number',
          description: 'コミュニティIDでフィルタ',
        },
      },
      required: [],
    },
  },
  {
    name: 'researcher_communities',
    description:
      'コミュニティ一覧を取得します。Louvainアルゴリズムで検出された研究者コミュニティを表示します。',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'researcher_career',
    description:
      '研究者のキャリアを分析します。キャリアステージ、出版履歴、インパクトの推移を分析し、将来予測も提供します。',
    inputSchema: {
      type: 'object',
      properties: {
        researcherId: {
          type: 'string',
          description: '研究者ID',
        },
        predict: {
          type: 'boolean',
          description: 'キャリア予測も含める（デフォルト: false）',
        },
      },
      required: ['researcherId'],
    },
  },
];

// =============================================================================
// Tool Handler
// =============================================================================

/**
 * Create researcher tool handlers
 */
export function createResearcherToolHandlers(service: ResearcherToolService) {
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
   * Handle search tool
   */
  async function handleSearch(args: {
    nameQuery?: string;
    affiliation?: string;
    minCoauthors?: number;
    limit?: number;
  }): Promise<CallToolResult> {
    const results = service.searchResearchers({
      nameQuery: args.nameQuery,
      affiliation: args.affiliation,
      minCoauthors: args.minCoauthors,
      limit: args.limit ?? 20,
    });

    return {
      content: [formatTextContent({ total: results.length, researchers: results })],
      isError: false,
    };
  }

  /**
   * Handle get researcher tool
   */
  async function handleGetResearcher(args: { researcherId: string }): Promise<CallToolResult> {
    if (!args.researcherId) {
      return {
        content: [{ type: 'text', text: 'エラー: researcherId は必須です' }],
        isError: true,
      };
    }

    const researcher = service.getResearcher(args.researcherId);
    if (!researcher) {
      return {
        content: [{ type: 'text', text: `研究者が見つかりません: ${args.researcherId}` }],
        isError: true,
      };
    }

    return {
      content: [formatTextContent(researcher)],
      isError: false,
    };
  }

  /**
   * Handle coauthors tool
   */
  async function handleCoauthors(args: {
    researcherId: string;
    limit?: number;
  }): Promise<CallToolResult> {
    if (!args.researcherId) {
      return {
        content: [{ type: 'text', text: 'エラー: researcherId は必須です' }],
        isError: true,
      };
    }

    let coauthors = service.getCoauthors(args.researcherId);
    if (args.limit !== undefined) {
      coauthors = coauthors.slice(0, args.limit);
    }

    return {
      content: [formatTextContent({ researcherId: args.researcherId, coauthors })],
      isError: false,
    };
  }

  /**
   * Handle path tool
   */
  async function handlePath(args: { fromId: string; toId: string }): Promise<CallToolResult> {
    if (!args.fromId || !args.toId) {
      return {
        content: [{ type: 'text', text: 'エラー: fromId と toId は必須です' }],
        isError: true,
      };
    }

    const path = service.findPath(args.fromId, args.toId);
    if (!path) {
      return {
        content: [
          {
            type: 'text',
            text: `パスが見つかりませんでした。（研究者が接続されていないか、存在しません）`,
          },
        ],
        isError: true,
      };
    }

    const result: MCPCollaborationPath = {
      path,
      distance: path.length - 1,
    };

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Handle ranking tool
   */
  async function handleRanking(args: {
    limit?: number;
    communityId?: number;
  }): Promise<CallToolResult> {
    const ranking = service.getInfluenceRanking({
      limit: args.limit ?? 10,
      communityId: args.communityId,
    });

    return {
      content: [formatTextContent({ ranking })],
      isError: false,
    };
  }

  /**
   * Handle communities tool
   */
  async function handleCommunities(): Promise<CallToolResult> {
    const communities = service.getCommunities();

    return {
      content: [formatTextContent({ communities })],
      isError: false,
    };
  }

  /**
   * Handle career tool
   */
  async function handleCareer(args: {
    researcherId: string;
    predict?: boolean;
  }): Promise<CallToolResult> {
    if (!args.researcherId) {
      return {
        content: [{ type: 'text', text: 'エラー: researcherId は必須です' }],
        isError: true,
      };
    }

    const timeline = service.analyzeCareer(args.researcherId);
    if (!timeline) {
      return {
        content: [{ type: 'text', text: `キャリアデータが見つかりません: ${args.researcherId}` }],
        isError: true,
      };
    }

    const result: { timeline: MCPCareerTimeline; prediction?: MCPCareerPrediction | null } = {
      timeline,
    };

    if (args.predict) {
      result.prediction = service.predictCareer(args.researcherId);
    }

    return {
      content: [formatTextContent(result)],
      isError: false,
    };
  }

  /**
   * Main tool handler
   */
  async function handleResearcherTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    switch (toolName) {
      case 'researcher_search':
        return handleSearch(
          args as {
            nameQuery?: string;
            affiliation?: string;
            minCoauthors?: number;
            limit?: number;
          }
        );

      case 'researcher_get':
        return handleGetResearcher(args as { researcherId: string });

      case 'researcher_coauthors':
        return handleCoauthors(args as { researcherId: string; limit?: number });

      case 'researcher_path':
        return handlePath(args as { fromId: string; toId: string });

      case 'researcher_ranking':
        return handleRanking(args as { limit?: number; communityId?: number });

      case 'researcher_communities':
        return handleCommunities();

      case 'researcher_career':
        return handleCareer(args as { researcherId: string; predict?: boolean });

      default:
        return {
          content: [{ type: 'text', text: `Unknown researcher tool: ${toolName}` }],
          isError: true,
        };
    }
  }

  return {
    handleSearch,
    handleGetResearcher,
    handleCoauthors,
    handlePath,
    handleRanking,
    handleCommunities,
    handleCareer,
    handleResearcherTool,
  };
}
