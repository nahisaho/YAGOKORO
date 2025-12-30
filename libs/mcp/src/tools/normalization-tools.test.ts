/**
 * Unit tests for normalization MCP tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNormalizeEntityTool,
  createNormalizeBatchTool,
  createRegisterAliasTool,
  createResolveAliasTool,
  createListAliasesTool,
  createGetRulesTool,
  createNormalizationTools,
  type NormalizationServiceInterface,
  type NormalizationToolDependencies,
} from './normalization-tools.js';

// Mock normalization service
const createMockService = (): NormalizationServiceInterface => ({
  normalize: vi.fn(async (input: string) => ({
    original: input,
    normalized: input.replace(/-/g, ''),
    wasNormalized: input.includes('-'),
    confidence: 0.9,
    stage: 'rule' as const,
  })),
  normalizeAll: vi.fn(async (inputs: string[]) =>
    inputs.map(input => ({
      original: input,
      normalized: input.replace(/-/g, ''),
      wasNormalized: input.includes('-'),
      confidence: 0.9,
      stage: 'rule' as const,
    }))
  ),
  registerAlias: vi.fn(async (alias: string, canonical: string, confidence: number) => ({
    alias,
    canonical,
    confidence,
    source: 'mcp',
  })),
  resolveAlias: vi.fn(async (alias: string) =>
    alias === 'GPT-4' ? 'GPT4' : null
  ),
  listAliases: vi.fn(async () => [
    { alias: 'GPT-4', canonical: 'GPT4', confidence: 0.95, source: 'rule' },
    { alias: 'Open AI', canonical: 'OpenAI', confidence: 0.9, source: 'rule' },
  ]),
  getRules: vi.fn(async () => [
    { pattern: 'GPT-4', replacement: 'GPT4', priority: 100 },
    { pattern: 'Open AI', replacement: 'OpenAI', priority: 100 },
  ]),
});

describe('Normalization MCP Tools', () => {
  let mockService: NormalizationServiceInterface;
  let deps: NormalizationToolDependencies;

  beforeEach(() => {
    mockService = createMockService();
    deps = { normalizationService: mockService };
  });

  describe('createNormalizeEntityTool', () => {
    it('should create tool with correct name and description', () => {
      const tool = createNormalizeEntityTool(deps);
      
      expect(tool.name).toBe('normalize_entity');
      expect(tool.description).toContain('Normalize an entity name');
    });

    it('should normalize entity through handler', async () => {
      const tool = createNormalizeEntityTool(deps);
      
      const result = await tool.handler({
        entity: 'GPT-4',
        entityType: 'AIModel',
      });

      expect(mockService.normalize).toHaveBeenCalledWith('GPT-4', {
        entityType: 'AIModel',
        context: undefined,
        skipLLM: false,
      });
      expect(result).toMatchObject({
        original: 'GPT-4',
        normalized: 'GPT4',
        wasNormalized: true,
      });
    });

    it('should pass skipLLM option', async () => {
      const tool = createNormalizeEntityTool(deps);
      
      await tool.handler({
        entity: 'GPT-4',
        skipLLM: true,
      });

      expect(mockService.normalize).toHaveBeenCalledWith('GPT-4', {
        entityType: undefined,
        context: undefined,
        skipLLM: true,
      });
    });
  });

  describe('createNormalizeBatchTool', () => {
    it('should create tool with correct name', () => {
      const tool = createNormalizeBatchTool(deps);
      expect(tool.name).toBe('normalize_batch');
    });

    it('should normalize multiple entities', async () => {
      const tool = createNormalizeBatchTool(deps);
      
      const result = await tool.handler({
        entities: ['GPT-4', 'Claude', 'LLaMA-2'],
      }) as { total: number; normalized: number; results: unknown[] };

      expect(mockService.normalizeAll).toHaveBeenCalledWith(
        ['GPT-4', 'Claude', 'LLaMA-2'],
        { entityType: undefined, skipLLM: true }
      );
      expect(result.total).toBe(3);
      expect(result.normalized).toBe(2); // GPT-4 and LLaMA-2 have hyphens
    });
  });

  describe('createRegisterAliasTool', () => {
    it('should create tool with correct name', () => {
      const tool = createRegisterAliasTool(deps);
      expect(tool.name).toBe('register_alias');
    });

    it('should register alias through handler', async () => {
      const tool = createRegisterAliasTool(deps);
      
      const result = await tool.handler({
        alias: 'GPT-4',
        canonical: 'GPT4',
        confidence: 0.95,
      }) as { success: boolean; alias: unknown };

      expect(mockService.registerAlias).toHaveBeenCalledWith('GPT-4', 'GPT4', 0.95);
      expect(result.success).toBe(true);
    });

    it('should use default confidence if not provided', async () => {
      const tool = createRegisterAliasTool(deps);
      
      await tool.handler({
        alias: 'GPT-4',
        canonical: 'GPT4',
      });

      expect(mockService.registerAlias).toHaveBeenCalledWith('GPT-4', 'GPT4', 0.9);
    });
  });

  describe('createResolveAliasTool', () => {
    it('should create tool with correct name', () => {
      const tool = createResolveAliasTool(deps);
      expect(tool.name).toBe('resolve_alias');
    });

    it('should resolve existing alias', async () => {
      const tool = createResolveAliasTool(deps);
      
      const result = await tool.handler({
        alias: 'GPT-4',
      }) as { alias: string; canonical: string | null; found: boolean };

      expect(mockService.resolveAlias).toHaveBeenCalledWith('GPT-4');
      expect(result.canonical).toBe('GPT4');
      expect(result.found).toBe(true);
    });

    it('should return null for unknown alias', async () => {
      const tool = createResolveAliasTool(deps);
      
      const result = await tool.handler({
        alias: 'UnknownModel',
      }) as { alias: string; canonical: string | null; found: boolean };

      expect(result.canonical).toBeNull();
      expect(result.found).toBe(false);
    });
  });

  describe('createListAliasesTool', () => {
    it('should create tool with correct name', () => {
      const tool = createListAliasesTool(deps);
      expect(tool.name).toBe('list_aliases');
    });

    it('should list all aliases', async () => {
      const tool = createListAliasesTool(deps);
      
      const result = await tool.handler({}) as { total: number; aliases: unknown[] };

      expect(mockService.listAliases).toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.aliases).toHaveLength(2);
    });

    it('should pass filter options', async () => {
      const tool = createListAliasesTool(deps);
      
      await tool.handler({
        canonical: 'GPT4',
        limit: 10,
      });

      expect(mockService.listAliases).toHaveBeenCalledWith({
        canonical: 'GPT4',
        limit: 10,
      });
    });
  });

  describe('createGetRulesTool', () => {
    it('should create tool with correct name', () => {
      const tool = createGetRulesTool(deps);
      expect(tool.name).toBe('get_normalization_rules');
    });

    it('should return rules', async () => {
      const tool = createGetRulesTool(deps);
      
      const result = await tool.handler({}) as { total: number; rules: unknown[] };

      expect(mockService.getRules).toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.rules).toHaveLength(2);
    });
  });

  describe('createNormalizationTools', () => {
    it('should create all normalization tools', () => {
      const tools = createNormalizationTools(deps);
      
      expect(tools).toHaveLength(6);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('normalize_entity');
      expect(toolNames).toContain('normalize_batch');
      expect(toolNames).toContain('register_alias');
      expect(toolNames).toContain('resolve_alias');
      expect(toolNames).toContain('list_aliases');
      expect(toolNames).toContain('get_normalization_rules');
    });
  });
});
