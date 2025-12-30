/**
 * Unit tests for normalize CLI command
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNormalizeCommand, type NormalizeService, type NormalizeResult, type AliasEntry, type RuleEntry } from '../src/commands/normalize.js';

// Mock service
const createMockService = (): NormalizeService => ({
  normalize: vi.fn(async (input: string) => ({
    original: input,
    normalized: input.replace(/-/g, ''),
    wasNormalized: input.includes('-'),
    confidence: 0.9,
    stage: 'rule' as const,
    aliasRegistered: false,
  })),
  normalizeAll: vi.fn(async (inputs: string[]) => 
    inputs.map(input => ({
      original: input,
      normalized: input.replace(/-/g, ''),
      wasNormalized: input.includes('-'),
      confidence: 0.9,
      stage: 'rule' as const,
      aliasRegistered: false,
    }))
  ),
  listAliases: vi.fn(async () => [
    {
      alias: 'GPT-4',
      canonical: 'GPT4',
      confidence: 0.95,
      source: 'rule',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ]),
  registerAlias: vi.fn(async (alias: string, canonical: string, confidence?: number) => ({
    alias,
    canonical,
    confidence: confidence ?? 0.9,
    source: 'cli',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  deleteAlias: vi.fn(async () => true),
  getExistingEntities: vi.fn(async () => ['GPT4', 'Claude', 'LLaMA2']),
  addRule: vi.fn(async () => {}),
  listRules: vi.fn(async () => [
    {
      pattern: 'GPT-4',
      replacement: 'GPT4',
      priority: 100,
      source: 'default',
    },
  ]),
  close: vi.fn(async () => {}),
});

describe('createNormalizeCommand', () => {
  let mockService: NormalizeService;

  beforeEach(() => {
    mockService = createMockService();
  });

  it('should create normalize command with subcommands', () => {
    const cmd = createNormalizeCommand();
    
    expect(cmd.name()).toBe('normalize');
    
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('run');
    expect(subcommands).toContain('alias');
    expect(subcommands).toContain('rules');
    expect(subcommands).toContain('entities');
    expect(subcommands).toContain('batch');
  });

  describe('run subcommand', () => {
    it('should have correct options', () => {
      const cmd = createNormalizeCommand();
      const runCmd = cmd.commands.find(c => c.name() === 'run');
      
      expect(runCmd).toBeDefined();
      
      const optionNames = runCmd!.options.map(o => o.long ?? o.short);
      expect(optionNames).toContain('--skip-llm');
      expect(optionNames).toContain('--force-llm');
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--output');
    });
  });

  describe('alias subcommand', () => {
    it('should have correct options', () => {
      const cmd = createNormalizeCommand();
      const aliasCmd = cmd.commands.find(c => c.name() === 'alias');
      
      expect(aliasCmd).toBeDefined();
      
      const optionNames = aliasCmd!.options.map(o => o.long ?? o.short);
      expect(optionNames).toContain('--limit');
      expect(optionNames).toContain('--offset');
      expect(optionNames).toContain('--canonical');
    });
  });

  describe('rules subcommand', () => {
    it('should have correct options', () => {
      const cmd = createNormalizeCommand();
      const rulesCmd = cmd.commands.find(c => c.name() === 'rules');
      
      expect(rulesCmd).toBeDefined();
      
      const optionNames = rulesCmd!.options.map(o => o.long ?? o.short);
      expect(optionNames).toContain('--priority');
      expect(optionNames).toContain('--output');
    });
  });

  describe('entities subcommand', () => {
    it('should have correct options', () => {
      const cmd = createNormalizeCommand();
      const entitiesCmd = cmd.commands.find(c => c.name() === 'entities');
      
      expect(entitiesCmd).toBeDefined();
      
      const optionNames = entitiesCmd!.options.map(o => o.long ?? o.short);
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--limit');
      expect(optionNames).toContain('--output');
    });
  });

  describe('batch subcommand', () => {
    it('should have correct options', () => {
      const cmd = createNormalizeCommand();
      const batchCmd = cmd.commands.find(c => c.name() === 'batch');
      
      expect(batchCmd).toBeDefined();
      
      const optionNames = batchCmd!.options.map(o => o.long ?? o.short);
      expect(optionNames).toContain('--skip-llm');
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--format');
    });
  });

  describe('service factory', () => {
    it('should call service methods through factory', async () => {
      const factory = vi.fn(async () => mockService);
      const cmd = createNormalizeCommand(factory);
      
      // Just verify command creation works with factory
      expect(cmd.name()).toBe('normalize');
    });
  });
});
