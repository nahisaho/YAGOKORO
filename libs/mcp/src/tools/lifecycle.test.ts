/**
 * MCP Lifecycle Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  lifecycleTools,
  createLifecycleToolHandler,
  isLifecycleTool,
  type LifecycleToolService,
  type MCPLifecycleAnalysis,
  type MCPLifecycleReport,
  type MCPEmergingTechnology,
  type MCPDecliningTechnology,
  type MCPTechnologyComparison,
  type MCPAlert,
  type MCPPeriodicReport,
} from './lifecycle.js';

// =============================================================================
// Mock Service Factory
// =============================================================================

function createMockService(): LifecycleToolService {
  const mockAnalysis: MCPLifecycleAnalysis = {
    technologyId: 'tech-001',
    technologyName: 'Transformer',
    currentPhase: {
      phase: 'peak_of_expectations',
      phaseLabel: '過熱期',
      confidence: 0.85,
      indicators: ['急成長する論文数', '産業界での広範な採用'],
    },
    maturityScore: {
      overall: 0.72,
      adoptionRate: 0.8,
      publicationTrend: 0.9,
      industryPresence: 0.7,
      communityActivity: 0.5,
    },
    trendForecast: {
      direction: 'rising',
      momentum: 0.65,
      projectedPhase: 'slope_of_enlightenment',
      confidence: 0.75,
      factors: ['産業界での採用増加', 'ベンチマーク性能向上'],
    },
    timeline: [],
    analyzedAt: '2024-01-15T12:00:00Z',
  };

  const mockReport: MCPLifecycleReport = {
    technologyId: 'tech-001',
    technologyName: 'Transformer',
    generatedAt: '2024-01-15T12:00:00Z',
    analysis: mockAnalysis,
    relatedTechnologies: ['BERT', 'GPT', 'Attention Mechanism'],
    summary: 'Transformerは現在過熱期にあり、急速な成長を続けています。',
  };

  const mockEmerging: MCPEmergingTechnology[] = [
    {
      technologyId: 'tech-002',
      technologyName: 'Diffusion Models',
      phase: 'innovation_trigger',
      growthRate: 0.45,
      keyIndicators: ['新しい応用分野', '論文数の急増'],
      firstSeen: '2020-06',
      confidence: 0.8,
    },
    {
      technologyId: 'tech-003',
      technologyName: 'Mamba',
      phase: 'innovation_trigger',
      growthRate: 0.35,
      keyIndicators: ['効率的なアーキテクチャ', 'Transformerの代替'],
      firstSeen: '2023-12',
      confidence: 0.7,
    },
  ];

  const mockDeclining: MCPDecliningTechnology[] = [
    {
      technologyId: 'tech-004',
      technologyName: 'LSTM',
      phase: 'plateau_of_productivity',
      declineRate: 0.25,
      lastActiveDate: '2023-06',
      replacements: ['Transformer', 'Mamba'],
      confidence: 0.75,
    },
  ];

  const mockComparison: MCPTechnologyComparison = {
    technologies: [mockAnalysis],
    comparisonDate: '2024-01-15T12:00:00Z',
    summary: 'TransformerとLSTMの比較分析',
  };

  // TASK-V2-028: Mock alerts and reports
  const mockAlerts: MCPAlert[] = [
    {
      id: 'alert-001',
      type: 'phase_transition',
      severity: 'warning',
      technologyId: 'tech-001',
      technologyName: 'Transformer',
      title: 'フェーズ遷移: Transformer',
      message: 'Transformerが過熱期から回復期へ移行しました',
      createdAt: '2024-01-15T10:00:00Z',
      acknowledged: false,
    },
    {
      id: 'alert-002',
      type: 'emerging_technology',
      severity: 'info',
      technologyId: 'tech-003',
      technologyName: 'Mamba',
      title: '新興技術検出: Mamba',
      message: 'Mambaが急成長中です',
      createdAt: '2024-01-14T08:00:00Z',
      acknowledged: true,
      acknowledgedAt: '2024-01-14T09:00:00Z',
    },
  ];

  const mockPeriodicReport: MCPPeriodicReport = {
    id: 'report-001',
    title: '技術ライフサイクル月次レポート (2024/01)',
    period: 'monthly',
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31',
    generatedAt: '2024-02-01T00:00:00Z',
    executiveSummary: '今月は3件の技術を監視しました。1件の技術で改善が見られました。',
    highlights: ['Transformerが最も顕著な成長を示しました', '1件の技術が安定期に到達'],
    technologies: [
      {
        id: 'tech-001',
        name: 'Transformer',
        phase: 'slope_of_enlightenment',
        phaseLabel: '回復期',
        maturityScore: 75,
        change: 'improved',
      },
    ],
    recommendations: ['衰退傾向のLSTMについて代替技術の検討を推奨します'],
  };

  return {
    analyzeTechnology: vi.fn().mockResolvedValue(mockAnalysis),
    generateReport: vi.fn().mockResolvedValue(mockReport),
    findEmergingTechnologies: vi.fn().mockResolvedValue(mockEmerging),
    findDecliningTechnologies: vi.fn().mockResolvedValue(mockDeclining),
    compareTechnologies: vi.fn().mockResolvedValue(mockComparison),
    getTechnologiesByPhase: vi.fn().mockResolvedValue([mockAnalysis]),
    // TASK-V2-028: Alert & Report methods
    getAlerts: vi.fn().mockResolvedValue(mockAlerts),
    acknowledgeAlert: vi.fn().mockResolvedValue(undefined),
    generatePeriodicReport: vi.fn().mockResolvedValue(mockPeriodicReport),
  };
}

// =============================================================================
// Tool Definitions Tests
// =============================================================================

describe('lifecycleTools', () => {
  it('should define all lifecycle tools', () => {
    expect(lifecycleTools).toHaveLength(9);

    const toolNames = lifecycleTools.map((t) => t.name);
    expect(toolNames).toContain('lifecycle_analyze');
    expect(toolNames).toContain('lifecycle_report');
    expect(toolNames).toContain('lifecycle_emerging');
    expect(toolNames).toContain('lifecycle_declining');
    expect(toolNames).toContain('lifecycle_compare');
    expect(toolNames).toContain('lifecycle_by_phase');
    // TASK-V2-028: Alert & Report tools
    expect(toolNames).toContain('lifecycle_alerts');
    expect(toolNames).toContain('lifecycle_acknowledge_alert');
    expect(toolNames).toContain('lifecycle_periodic_report');
  });

  it('should have Japanese descriptions', () => {
    for (const tool of lifecycleTools) {
      expect(tool.description).toBeDefined();
      // Japanese descriptions should contain Japanese characters
      expect(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(tool.description)).toBe(true);
    }
  });

  it('should have valid input schemas', () => {
    for (const tool of lifecycleTools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });
});

// =============================================================================
// isLifecycleTool Tests
// =============================================================================

describe('isLifecycleTool', () => {
  it('should return true for lifecycle tools', () => {
    expect(isLifecycleTool('lifecycle_analyze')).toBe(true);
    expect(isLifecycleTool('lifecycle_report')).toBe(true);
    expect(isLifecycleTool('lifecycle_emerging')).toBe(true);
    expect(isLifecycleTool('lifecycle_declining')).toBe(true);
    expect(isLifecycleTool('lifecycle_compare')).toBe(true);
    expect(isLifecycleTool('lifecycle_by_phase')).toBe(true);
    // TASK-V2-028: Alert & Report tools
    expect(isLifecycleTool('lifecycle_alerts')).toBe(true);
    expect(isLifecycleTool('lifecycle_acknowledge_alert')).toBe(true);
    expect(isLifecycleTool('lifecycle_periodic_report')).toBe(true);
  });

  it('should return false for non-lifecycle tools', () => {
    expect(isLifecycleTool('gap_analyze')).toBe(false);
    expect(isLifecycleTool('path_find')).toBe(false);
    expect(isLifecycleTool('query_knowledge_graph')).toBe(false);
  });
});

// =============================================================================
// Tool Handler Tests
// =============================================================================

describe('createLifecycleToolHandler', () => {
  let service: LifecycleToolService;
  let handler: ReturnType<typeof createLifecycleToolHandler>;

  beforeEach(() => {
    service = createMockService();
    handler = createLifecycleToolHandler(service);
  });

  describe('lifecycle_analyze', () => {
    it('should analyze technology successfully', async () => {
      const result = await handler('lifecycle_analyze', { technologyId: 'tech-001' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Transformer');
      expect(text).toContain('過熱期');
      expect(text).toContain('成熟度スコア');
      expect(text).toContain('トレンド予測');
    });

    it('should return error when technologyId is missing', async () => {
      const result = await handler('lifecycle_analyze', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('technologyId is required');
    });
  });

  describe('lifecycle_report', () => {
    it('should generate report successfully', async () => {
      const result = await handler('lifecycle_report', { technologyId: 'tech-001' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('ライフサイクルレポート');
      expect(text).toContain('サマリー');
      expect(text).toContain('関連技術');
      expect(text).toContain('BERT');
    });

    it('should return error when technologyId is missing', async () => {
      const result = await handler('lifecycle_report', {});

      expect(result.isError).toBe(true);
    });
  });

  describe('lifecycle_emerging', () => {
    it('should find emerging technologies', async () => {
      const result = await handler('lifecycle_emerging', {});

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('新興技術一覧');
      expect(text).toContain('Diffusion Models');
      expect(text).toContain('Mamba');
    });

    it('should apply limit and minGrowthRate', async () => {
      await handler('lifecycle_emerging', { limit: 5, minGrowthRate: 0.2 });

      expect(service.findEmergingTechnologies).toHaveBeenCalledWith(5, 0.2);
    });

    it('should handle empty results', async () => {
      vi.mocked(service.findEmergingTechnologies).mockResolvedValue([]);

      const result = await handler('lifecycle_emerging', { minGrowthRate: 0.9 });

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('見つかりませんでした');
    });
  });

  describe('lifecycle_declining', () => {
    it('should find declining technologies', async () => {
      const result = await handler('lifecycle_declining', {});

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('衰退中技術一覧');
      expect(text).toContain('LSTM');
      expect(text).toContain('代替技術');
    });

    it('should apply limit and minDeclineRate', async () => {
      await handler('lifecycle_declining', { limit: 5, minDeclineRate: 0.15 });

      expect(service.findDecliningTechnologies).toHaveBeenCalledWith(5, 0.15);
    });

    it('should handle empty results', async () => {
      vi.mocked(service.findDecliningTechnologies).mockResolvedValue([]);

      const result = await handler('lifecycle_declining', {});

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('見つかりませんでした');
    });
  });

  describe('lifecycle_compare', () => {
    it('should compare technologies successfully', async () => {
      const result = await handler('lifecycle_compare', {
        technologyIds: ['tech-001', 'tech-002'],
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('技術ライフサイクル比較');
      expect(text).toContain('比較表');
      expect(text).toContain('サマリー');
    });

    it('should return error when fewer than 2 IDs provided', async () => {
      const result = await handler('lifecycle_compare', {
        technologyIds: ['tech-001'],
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('at least 2 IDs');
    });

    it('should return error when more than 5 IDs provided', async () => {
      const result = await handler('lifecycle_compare', {
        technologyIds: ['t1', 't2', 't3', 't4', 't5', 't6'],
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('at most 5 IDs');
    });
  });

  describe('lifecycle_by_phase', () => {
    it('should get technologies by phase', async () => {
      const result = await handler('lifecycle_by_phase', {
        phase: 'peak_of_expectations',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('過熱期フェーズの技術一覧');
      expect(text).toContain('Transformer');
    });

    it('should return error for missing phase', async () => {
      const result = await handler('lifecycle_by_phase', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('phase is required');
    });

    it('should return error for invalid phase', async () => {
      const result = await handler('lifecycle_by_phase', {
        phase: 'invalid_phase',
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Invalid phase');
    });

    it('should handle empty results', async () => {
      vi.mocked(service.getTechnologiesByPhase).mockResolvedValue([]);

      const result = await handler('lifecycle_by_phase', {
        phase: 'trough_of_disillusionment',
      });

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('見つかりませんでした');
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const result = await handler('lifecycle_unknown', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Unknown lifecycle tool');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(service.analyzeTechnology).mockRejectedValue(new Error('Database error'));

      const result = await handler('lifecycle_analyze', { technologyId: 'tech-001' });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Database error');
    });
  });

  // TASK-V2-028: Alert & Report handler tests
  describe('lifecycle_alerts', () => {
    it('should get all alerts', async () => {
      const result = await handler('lifecycle_alerts', {});

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('ライフサイクルアラート');
      expect(text).toContain('2 件');
      expect(text).toContain('Transformer');
      expect(text).toContain('Mamba');
    });

    it('should filter by technology ID', async () => {
      const result = await handler('lifecycle_alerts', {
        technologyId: 'tech-001',
      });

      expect(result.isError).toBeUndefined();
      expect(service.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ technologyId: 'tech-001' })
      );
    });

    it('should filter unacknowledged only', async () => {
      const result = await handler('lifecycle_alerts', {
        unacknowledgedOnly: true,
      });

      expect(result.isError).toBeUndefined();
      expect(service.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ unacknowledgedOnly: true })
      );
    });

    it('should handle empty alerts', async () => {
      vi.mocked(service.getAlerts).mockResolvedValue([]);

      const result = await handler('lifecycle_alerts', {});

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('アラートはありません');
    });

    it('should display severity icons', async () => {
      const result = await handler('lifecycle_alerts', {});

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('⚠️'); // warning icon
      expect(text).toContain('ℹ️'); // info icon
    });
  });

  describe('lifecycle_acknowledge_alert', () => {
    it('should acknowledge alert successfully', async () => {
      const result = await handler('lifecycle_acknowledge_alert', {
        alertId: 'alert-001',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('確認済み');
      expect(text).toContain('alert-001');
      expect(service.acknowledgeAlert).toHaveBeenCalledWith('alert-001');
    });

    it('should return error when alertId is missing', async () => {
      const result = await handler('lifecycle_acknowledge_alert', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('alertId is required');
    });

    it('should handle service errors', async () => {
      vi.mocked(service.acknowledgeAlert).mockRejectedValue(new Error('Alert not found'));

      const result = await handler('lifecycle_acknowledge_alert', {
        alertId: 'invalid-id',
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Alert not found');
    });
  });

  describe('lifecycle_periodic_report', () => {
    it('should generate monthly report by default', async () => {
      const result = await handler('lifecycle_periodic_report', {});

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('月次レポート');
      expect(text).toContain('エグゼクティブサマリー');
      expect(service.generatePeriodicReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: 'monthly' })
      );
    });

    it('should generate quarterly report', async () => {
      const result = await handler('lifecycle_periodic_report', {
        period: 'quarterly',
      });

      expect(result.isError).toBeUndefined();
      expect(service.generatePeriodicReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: 'quarterly' })
      );
    });

    it('should include recommendations', async () => {
      const result = await handler('lifecycle_periodic_report', {
        includeRecommendations: true,
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('推奨事項');
      expect(text).toContain('LSTM');
    });

    it('should filter by technology IDs', async () => {
      const result = await handler('lifecycle_periodic_report', {
        technologyIds: ['tech-001', 'tech-002'],
      });

      expect(result.isError).toBeUndefined();
      expect(service.generatePeriodicReport).toHaveBeenCalledWith(
        expect.objectContaining({ technologyIds: ['tech-001', 'tech-002'] })
      );
    });

    it('should return JSON format', async () => {
      const mockJsonReport = {
        id: 'report-001',
        title: 'Test Report',
        period: 'monthly' as const,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        generatedAt: '2024-02-01T00:00:00Z',
        executiveSummary: 'Test summary',
        highlights: [],
        technologies: [],
        recommendations: [],
      };
      vi.mocked(service.generatePeriodicReport).mockResolvedValue(mockJsonReport);

      const result = await handler('lifecycle_periodic_report', {
        format: 'json',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      // Should be valid JSON
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should handle service errors', async () => {
      vi.mocked(service.generatePeriodicReport).mockRejectedValue(
        new Error('Report generation failed')
      );

      const result = await handler('lifecycle_periodic_report', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Report generation failed');
    });
  });
});
