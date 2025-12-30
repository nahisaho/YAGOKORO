/**
 * @fileoverview CLI Lifecycle Command Tests
 * TASK-V2-029: Lifecycle CLI command integration tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLifecycleCommand, LifecycleService, CLILifecycleAnalysis, CLILifecycleReport, CLIEmergingTechnology, CLIDecliningTechnology, CLIAlert, CLIPeriodicReport, LifecyclePhase } from '../src/commands/lifecycle.js';

// Mock console
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Lifecycle Command', () => {
  let mockService: LifecycleService;
  let command: ReturnType<typeof createLifecycleCommand>;

  const mockAnalysis: CLILifecycleAnalysis = {
    technologyId: 'tech-001',
    technologyName: 'GPT-4',
    phase: {
      phase: 'peak_of_expectations',
      phaseLabel: 'Peak of Expectations',
      phaseLabelJa: '過熱期',
      confidence: 0.85,
      daysInPhase: 180,
      estimatedDaysToNextPhase: 90,
      indicators: [
        { name: 'Research Activity', value: 0.9, supports: true },
        { name: 'Industry Adoption', value: 0.7, supports: true },
      ],
    },
    maturity: {
      overall: 0.72,
      researchActivity: 0.9,
      industryAdoption: 0.7,
      communityEngagement: 0.8,
      documentationQuality: 0.6,
      stability: 0.6,
    },
    forecast: {
      currentTrend: 'rising',
      confidence: 0.8,
      horizonDays: 365,
      predictedTransitions: [
        {
          toPhase: 'trough_of_disillusionment',
          estimatedDate: '2025-06-01',
          probability: 0.65,
        },
      ],
      factors: [
        {
          name: 'High Research Activity',
          type: 'positive',
          impact: 0.3,
          description: 'Strong academic interest',
        },
      ],
      risks: [
        {
          name: 'Hype Cycle Risk',
          probability: 0.4,
          impact: 0.6,
        },
      ],
    },
    analyzedAt: '2025-01-15T10:00:00Z',
  };

  const mockReport: CLILifecycleReport = {
    ...mockAnalysis,
    generatedAt: '2025-01-15T10:00:00Z',
    relatedTechnologies: [
      { id: 'tech-002', phase: 'innovation_trigger' },
      { id: 'tech-003', phase: 'slope_of_enlightenment' },
    ],
    summary: 'GPT-4 is currently in the Peak of Expectations phase.',
  };

  const mockEmerging: CLIEmergingTechnology[] = [
    {
      technologyId: 'tech-010',
      technologyName: 'Emerging Tech',
      phase: 'innovation_trigger',
      growthRate: 0.8,
      keyIndicators: ['papers', 'github_stars'],
      firstSeen: '2025-01-01',
      confidence: 0.9,
    },
  ];

  const mockDeclining: CLIDecliningTechnology[] = [
    {
      technologyId: 'tech-020',
      technologyName: 'Legacy Tech',
      phase: 'plateau_of_productivity',
      declineRate: 0.3,
      lastActiveDate: '2024-12-01',
      replacements: [{ id: 'tech-021', name: 'New Tech' }],
      confidence: 0.85,
    },
  ];

  const mockAlerts: CLIAlert[] = [
    {
      id: 'alert-001',
      type: 'phase_transition',
      severity: 'warning',
      technologyId: 'tech-001',
      technologyName: 'GPT-4',
      title: 'Phase Transition Detected',
      message: 'GPT-4 is transitioning to a new phase',
      createdAt: '2025-01-15T09:00:00Z',
      acknowledged: false,
    },
    {
      id: 'alert-002',
      type: 'emerging_technology',
      severity: 'info',
      technologyId: 'tech-010',
      technologyName: 'New AI',
      title: 'Emerging Technology',
      message: 'New AI technology detected',
      createdAt: '2025-01-15T08:00:00Z',
      acknowledged: false,
    },
    {
      id: 'alert-003',
      type: 'anomaly_detected',
      severity: 'critical',
      technologyId: 'tech-005',
      technologyName: 'Critical Tech',
      title: 'Anomaly Detected',
      message: 'Unusual pattern detected',
      createdAt: '2025-01-15T07:00:00Z',
      acknowledged: true,
      acknowledgedAt: '2025-01-15T07:30:00Z',
    },
  ];

  const mockPeriodicReport: CLIPeriodicReport = {
    id: 'report-001',
    period: 'monthly',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    generatedAt: '2025-01-15T10:00:00Z',
    summary: {
      totalTechnologies: 100,
      newTechnologies: 5,
      transitionedTechnologies: 8,
      alerts: {
        total: 25,
        critical: 2,
        warning: 10,
        info: 13,
      },
    },
    content: '# Monthly Report\n\nThis is the report content.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    process.exitCode = 0;

    mockService = {
      analyzeTechnology: vi.fn().mockResolvedValue(mockAnalysis),
      generateReport: vi.fn().mockResolvedValue(mockReport),
      findEmergingTechnologies: vi.fn().mockResolvedValue(mockEmerging),
      findDecliningTechnologies: vi.fn().mockResolvedValue(mockDeclining),
      compareTechnologies: vi.fn().mockResolvedValue([mockAnalysis]),
      getTechnologiesByPhase: vi.fn().mockResolvedValue([mockAnalysis]),
      getAlerts: vi.fn().mockResolvedValue(mockAlerts),
      acknowledgeAlert: vi.fn().mockResolvedValue(true),
      generatePeriodicReport: vi.fn().mockResolvedValue(mockPeriodicReport),
    };

    command = createLifecycleCommand(mockService);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('lifecycle analyze', () => {
    it('should analyze technology lifecycle', async () => {
      await command.parseAsync(['node', 'test', 'analyze', 'tech-001']);

      expect(mockService.analyzeTechnology).toHaveBeenCalledWith('tech-001', {
        horizonDays: 365,
      });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should support custom horizon days', async () => {
      await command.parseAsync(['node', 'test', 'analyze', 'tech-001', '-h', '180']);

      expect(mockService.analyzeTechnology).toHaveBeenCalledWith('tech-001', {
        horizonDays: 180,
      });
    });

    it('should output JSON format', async () => {
      await command.parseAsync(['node', 'test', 'analyze', 'tech-001', '-f', 'json']);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"technologyId"'));
    });

    it('should handle errors', async () => {
      vi.mocked(mockService.analyzeTechnology).mockRejectedValue(new Error('Analysis failed'));

      await command.parseAsync(['node', 'test', 'analyze', 'tech-001']);

      expect(mockConsole.error).toHaveBeenCalledWith('Error: Analysis failed');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('lifecycle report', () => {
    it('should generate lifecycle report', async () => {
      await command.parseAsync(['node', 'test', 'report', 'tech-001']);

      expect(mockService.generateReport).toHaveBeenCalledWith('tech-001');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should output JSON format', async () => {
      await command.parseAsync(['node', 'test', 'report', 'tech-001', '-f', 'json']);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
    });
  });

  describe('lifecycle emerging', () => {
    it('should find emerging technologies', async () => {
      await command.parseAsync(['node', 'test', 'emerging']);

      expect(mockService.findEmergingTechnologies).toHaveBeenCalledWith(10);
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should support limit option', async () => {
      await command.parseAsync(['node', 'test', 'emerging', '-l', '5']);

      expect(mockService.findEmergingTechnologies).toHaveBeenCalledWith(5);
    });
  });

  describe('lifecycle declining', () => {
    it('should find declining technologies', async () => {
      await command.parseAsync(['node', 'test', 'declining']);

      expect(mockService.findDecliningTechnologies).toHaveBeenCalledWith(10);
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('lifecycle compare', () => {
    it('should compare technologies', async () => {
      await command.parseAsync(['node', 'test', 'compare', 'tech-001', 'tech-002']);

      expect(mockService.compareTechnologies).toHaveBeenCalledWith(['tech-001', 'tech-002']);
    });
  });

  describe('lifecycle by-phase', () => {
    it('should list technologies by phase', async () => {
      await command.parseAsync(['node', 'test', 'by-phase', 'peak_of_expectations']);

      expect(mockService.getTechnologiesByPhase).toHaveBeenCalledWith('peak_of_expectations');
    });

    it('should reject invalid phase', async () => {
      await command.parseAsync(['node', 'test', 'by-phase', 'invalid_phase']);

      expect(mockConsole.error).toHaveBeenCalledWith('Invalid phase: invalid_phase');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('lifecycle alerts', () => {
    it('should list unacknowledged alerts by default', async () => {
      await command.parseAsync(['node', 'test', 'alerts']);

      expect(mockService.getAlerts).toHaveBeenCalledWith({
        acknowledged: false,
        severity: undefined,
        limit: 20,
      });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should include acknowledged alerts with flag', async () => {
      await command.parseAsync(['node', 'test', 'alerts', '-a']);

      expect(mockService.getAlerts).toHaveBeenCalledWith({
        acknowledged: undefined,
        severity: undefined,
        limit: 20,
      });
    });

    it('should filter by severity', async () => {
      await command.parseAsync(['node', 'test', 'alerts', '-s', 'critical']);

      expect(mockService.getAlerts).toHaveBeenCalledWith({
        acknowledged: false,
        severity: 'critical',
        limit: 20,
      });
    });

    it('should support limit option', async () => {
      await command.parseAsync(['node', 'test', 'alerts', '-l', '5']);

      expect(mockService.getAlerts).toHaveBeenCalledWith({
        acknowledged: false,
        severity: undefined,
        limit: 5,
      });
    });

    it('should output JSON format', async () => {
      await command.parseAsync(['node', 'test', 'alerts', '-f', 'json']);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"id"'));
    });

    it('should display alert summary', async () => {
      await command.parseAsync(['node', 'test', 'alerts']);

      // Check summary output
      const calls = mockConsole.log.mock.calls.flat().join('\n');
      expect(calls).toContain('アラート一覧');
    });
  });

  describe('lifecycle acknowledge', () => {
    it('should acknowledge alert', async () => {
      await command.parseAsync(['node', 'test', 'acknowledge', 'alert-001']);

      expect(mockService.acknowledgeAlert).toHaveBeenCalledWith('alert-001');
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('確認済み'));
    });

    it('should use ack alias', async () => {
      await command.parseAsync(['node', 'test', 'ack', 'alert-001']);

      expect(mockService.acknowledgeAlert).toHaveBeenCalledWith('alert-001');
    });

    it('should handle not found alert', async () => {
      vi.mocked(mockService.acknowledgeAlert).mockResolvedValue(false);

      await command.parseAsync(['node', 'test', 'acknowledge', 'nonexistent']);

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('見つかりません'));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('lifecycle periodic-report', () => {
    it('should generate monthly report by default', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'monthly',
        format: 'markdown',
        language: 'ja',
      });
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should use pr alias', async () => {
      await command.parseAsync(['node', 'test', 'pr']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalled();
    });

    it('should support weekly period', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-p', 'weekly']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'weekly',
        format: 'markdown',
        language: 'ja',
      });
    });

    it('should support quarterly period', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-p', 'quarterly']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'quarterly',
        format: 'markdown',
        language: 'ja',
      });
    });

    it('should support annual period', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-p', 'annual']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'annual',
        format: 'markdown',
        language: 'ja',
      });
    });

    it('should support HTML output', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-o', 'html']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'monthly',
        format: 'html',
        language: 'ja',
      });
    });

    it('should support English language', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-l', 'en']);

      expect(mockService.generatePeriodicReport).toHaveBeenCalledWith({
        period: 'monthly',
        format: 'markdown',
        language: 'en',
      });
    });

    it('should output JSON format', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report', '-f', 'json']);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"period"'));
    });

    it('should display report summary', async () => {
      await command.parseAsync(['node', 'test', 'periodic-report']);

      const calls = mockConsole.log.mock.calls.flat().join('\n');
      expect(calls).toContain('月次レポート');
      expect(calls).toContain('技術総数');
    });

    it('should handle errors', async () => {
      vi.mocked(mockService.generatePeriodicReport).mockRejectedValue(new Error('Report failed'));

      await command.parseAsync(['node', 'test', 'periodic-report']);

      expect(mockConsole.error).toHaveBeenCalledWith('Error: Report failed');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('empty results', () => {
    it('should handle no alerts', async () => {
      vi.mocked(mockService.getAlerts).mockResolvedValue([]);

      await command.parseAsync(['node', 'test', 'alerts']);

      const calls = mockConsole.log.mock.calls.flat().join('\n');
      expect(calls).toContain('未確認のアラートはありません');
    });

    it('should handle no emerging technologies', async () => {
      vi.mocked(mockService.findEmergingTechnologies).mockResolvedValue([]);

      await command.parseAsync(['node', 'test', 'emerging']);

      const calls = mockConsole.log.mock.calls.flat().join('\n');
      expect(calls).toContain('新興技術は検出されませんでした');
    });

    it('should handle no declining technologies', async () => {
      vi.mocked(mockService.findDecliningTechnologies).mockResolvedValue([]);

      await command.parseAsync(['node', 'test', 'declining']);

      const calls = mockConsole.log.mock.calls.flat().join('\n');
      expect(calls).toContain('衰退中の技術は検出されませんでした');
    });
  });
});
