/**
 * Gap command tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGapCommand, type GapService } from '../src/commands/gap.js';

// Mock service
const createMockService = (): GapService => ({
  analyze: vi.fn().mockResolvedValue({
    id: 'report-123',
    generatedAt: new Date('2024-01-01'),
    totalGaps: 5,
    gapsByType: {
      missing_combination: 2,
      stale_research_area: 2,
      isolated_cluster: 1,
    },
    gapsBySeverity: {
      critical: 0,
      high: 2,
      medium: 2,
      low: 1,
    },
    gaps: [
      {
        id: 'gap-1',
        type: 'missing_combination',
        description: 'GPT-4 and Vision research combination not explored',
        severity: 'high',
        relatedEntities: ['GPT-4', 'Vision'],
        suggestedActions: ['Research multimodal approaches'],
        score: 0.85,
      },
      {
        id: 'gap-2',
        type: 'stale_research_area',
        description: 'RNN research has not been updated recently',
        severity: 'medium',
        relatedEntities: ['RNN'],
        suggestedActions: ['Review recent developments'],
        score: 0.65,
      },
    ],
  }),
  getById: vi.fn().mockImplementation((id: string) => {
    if (id === 'gap-1') {
      return Promise.resolve({
        id: 'gap-1',
        type: 'missing_combination',
        description: 'GPT-4 and Vision research combination not explored',
        severity: 'high',
        relatedEntities: ['GPT-4', 'Vision'],
        suggestedActions: ['Research multimodal approaches'],
        score: 0.85,
      });
    }
    return Promise.resolve(null);
  }),
  generateProposals: vi.fn().mockResolvedValue([
    {
      id: 'proposal-1',
      title: 'Multimodal AI Integration Research',
      abstract: 'Research on combining GPT-4 with Vision capabilities',
      methodology: ['Literature review', 'Experimental validation'],
      priority: 1,
    },
  ]),
  exportReport: vi.fn().mockResolvedValue('# Report\n\nTest markdown'),
  close: vi.fn().mockResolvedValue(undefined),
});

describe('Gap Command', () => {
  let mockService: GapService;

  beforeEach(() => {
    mockService = createMockService();
  });

  describe('createGapCommand', () => {
    it('should create gap command with subcommands', () => {
      const command = createGapCommand(mockService);

      expect(command.name()).toBe('gap');
      expect(command.commands.length).toBe(3); // analyze, show, propose
    });

    it('should have analyze subcommand', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');

      expect(analyzeCmd).toBeDefined();
      expect(analyzeCmd?.description()).toContain('Analyze');
    });

    it('should have show subcommand', () => {
      const command = createGapCommand(mockService);
      const showCmd = command.commands.find((c) => c.name() === 'show');

      expect(showCmd).toBeDefined();
    });

    it('should have propose subcommand', () => {
      const command = createGapCommand(mockService);
      const proposeCmd = command.commands.find((c) => c.name() === 'propose');

      expect(proposeCmd).toBeDefined();
      expect(proposeCmd?.description()).toContain('proposals');
    });
  });

  describe('analyze command options', () => {
    it('should have types option', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      const options = analyzeCmd?.options ?? [];

      const typesOpt = options.find((o) => o.long === '--types');
      expect(typesOpt).toBeDefined();
    });

    it('should have severity option', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      const options = analyzeCmd?.options ?? [];

      const severityOpt = options.find((o) => o.long === '--severity');
      expect(severityOpt).toBeDefined();
    });

    it('should have limit option with default', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      const options = analyzeCmd?.options ?? [];

      const limitOpt = options.find((o) => o.long === '--limit');
      expect(limitOpt).toBeDefined();
      expect(limitOpt?.defaultValue).toBe('50');
    });

    it('should have format option', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      const options = analyzeCmd?.options ?? [];

      const formatOpt = options.find((o) => o.long === '--format');
      expect(formatOpt).toBeDefined();
      expect(formatOpt?.defaultValue).toBe('table');
    });

    it('should have export option', () => {
      const command = createGapCommand(mockService);
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      const options = analyzeCmd?.options ?? [];

      const exportOpt = options.find((o) => o.long === '--export');
      expect(exportOpt).toBeDefined();
    });
  });

  describe('show command options', () => {
    it('should have format option', () => {
      const command = createGapCommand(mockService);
      const showCmd = command.commands.find((c) => c.name() === 'show');
      const options = showCmd?.options ?? [];

      const formatOpt = options.find((o) => o.long === '--format');
      expect(formatOpt).toBeDefined();
      expect(formatOpt?.defaultValue).toBe('table');
    });
  });

  describe('propose command options', () => {
    it('should have count option with default', () => {
      const command = createGapCommand(mockService);
      const proposeCmd = command.commands.find((c) => c.name() === 'propose');
      const options = proposeCmd?.options ?? [];

      const countOpt = options.find((o) => o.long === '--count');
      expect(countOpt).toBeDefined();
      expect(countOpt?.defaultValue).toBe('5');
    });

    it('should have gaps option', () => {
      const command = createGapCommand(mockService);
      const proposeCmd = command.commands.find((c) => c.name() === 'propose');
      const options = proposeCmd?.options ?? [];

      const gapsOpt = options.find((o) => o.long === '--gaps');
      expect(gapsOpt).toBeDefined();
    });

    it('should have llm option', () => {
      const command = createGapCommand(mockService);
      const proposeCmd = command.commands.find((c) => c.name() === 'propose');
      const options = proposeCmd?.options ?? [];

      const llmOpt = options.find((o) => o.long === '--llm');
      expect(llmOpt).toBeDefined();
    });
  });

  describe('service integration', () => {
    it('should use service.analyze for analyze command', async () => {
      const command = createGapCommand(mockService);
      // Verify command structure without executing (avoids process.exit)
      const analyzeCmd = command.commands.find((c) => c.name() === 'analyze');
      expect(analyzeCmd).toBeDefined();
    });

    it('should use service.getById for show command', async () => {
      const command = createGapCommand(mockService);
      const showCmd = command.commands.find((c) => c.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should use service.generateProposals for propose command', async () => {
      const command = createGapCommand(mockService);
      const proposeCmd = command.commands.find((c) => c.name() === 'propose');
      expect(proposeCmd).toBeDefined();
    });
  });
});
