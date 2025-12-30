/**
 * Path Tools Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFindPathsTool,
  createShortestPathTool,
  createCheckConnectionTool,
  createDegreesOfSeparationTool,
  createExplainPathTool,
  createPathTools,
  type PathToolDependencies,
  type PathServiceInterface,
  type Path,
  type PathResult,
  type PathExplanation,
} from './path-tools.js';

describe('Path Tools', () => {
  let mockPathService: PathServiceInterface;
  let deps: PathToolDependencies;

  const createMockPath = (nodes: string[], hops: number): Path => ({
    nodes: nodes.map((name, i) => ({
      id: `${i}`,
      type: 'Entity',
      name,
    })),
    relations: Array.from({ length: hops }, () => ({
      type: 'USES',
      direction: 'outgoing' as const,
    })),
    hops,
    score: 1.0,
  });

  beforeEach(() => {
    mockPathService = {
      findPaths: vi.fn().mockResolvedValue({
        paths: [createMockPath(['A', 'B', 'C'], 2)],
        totalPaths: 1,
        executionTime: 100,
      } as PathResult),
      findShortestPath: vi.fn().mockResolvedValue(createMockPath(['A', 'B'], 1)),
      areConnected: vi.fn().mockResolvedValue(true),
      getDegreesOfSeparation: vi.fn().mockResolvedValue(2),
      explainPath: vi.fn().mockImplementation((path: Path) =>
        Promise.resolve({
          path,
          naturalLanguage: 'A is connected to B',
          summary: '1-hop path',
        } as PathExplanation)
      ),
    };

    deps = {
      entityRepository: {} as PathToolDependencies['entityRepository'],
      relationRepository: {} as PathToolDependencies['relationRepository'],
      communityService: {} as PathToolDependencies['communityService'],
      pathService: mockPathService,
    };
  });

  describe('createFindPathsTool', () => {
    it('should create tool with correct name', () => {
      const tool = createFindPathsTool(deps);
      expect(tool.name).toBe('find_paths');
    });

    it('should find paths between entities', async () => {
      const tool = createFindPathsTool(deps);
      const result = await tool.handler({
        startEntity: 'EntityA',
        endEntity: 'EntityB',
        maxHops: 4,
      });

      expect(result.isError).toBeUndefined();
      expect(mockPathService.findPaths).toHaveBeenCalledWith('EntityA', 'EntityB', expect.any(Object));
      
      const content = result.content[0];
      expect(content?.type).toBe('text');
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.success).toBe(true);
      expect(parsed.totalPaths).toBe(1);
    });

    it('should return error when service unavailable', async () => {
      const tool = createFindPathsTool({ ...deps, pathService: undefined });
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'B',
        maxHops: 4,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('createShortestPathTool', () => {
    it('should create tool with correct name', () => {
      const tool = createShortestPathTool(deps);
      expect(tool.name).toBe('shortest_path');
    });

    it('should find shortest path', async () => {
      const tool = createShortestPathTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'B',
        maxHops: 6,
      });

      expect(result.isError).toBeUndefined();
      expect(mockPathService.findShortestPath).toHaveBeenCalledWith('A', 'B', 6);
      
      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.success).toBe(true);
      expect(parsed.found).toBe(true);
      expect(parsed.hops).toBe(1);
    });

    it('should handle no path found', async () => {
      vi.mocked(mockPathService.findShortestPath).mockResolvedValue(null);
      const tool = createShortestPathTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'Z',
        maxHops: 6,
      });

      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.found).toBe(false);
    });
  });

  describe('createCheckConnectionTool', () => {
    it('should create tool with correct name', () => {
      const tool = createCheckConnectionTool(deps);
      expect(tool.name).toBe('check_connection');
    });

    it('should check if entities are connected', async () => {
      const tool = createCheckConnectionTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'B',
        maxHops: 4,
      });

      expect(mockPathService.areConnected).toHaveBeenCalledWith('A', 'B', 4);
      
      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.success).toBe(true);
      expect(parsed.connected).toBe(true);
    });

    it('should return false when not connected', async () => {
      vi.mocked(mockPathService.areConnected).mockResolvedValue(false);
      const tool = createCheckConnectionTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'Z',
        maxHops: 4,
      });

      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.connected).toBe(false);
    });
  });

  describe('createDegreesOfSeparationTool', () => {
    it('should create tool with correct name', () => {
      const tool = createDegreesOfSeparationTool(deps);
      expect(tool.name).toBe('degrees_of_separation');
    });

    it('should get degrees of separation', async () => {
      const tool = createDegreesOfSeparationTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'B',
        maxHops: 6,
      });

      expect(mockPathService.getDegreesOfSeparation).toHaveBeenCalledWith('A', 'B', 6);
      
      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.success).toBe(true);
      expect(parsed.found).toBe(true);
      expect(parsed.degreesOfSeparation).toBe(2);
    });

    it('should handle no connection', async () => {
      vi.mocked(mockPathService.getDegreesOfSeparation).mockResolvedValue(null);
      const tool = createDegreesOfSeparationTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'Z',
        maxHops: 6,
      });

      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.found).toBe(false);
    });
  });

  describe('createExplainPathTool', () => {
    it('should create tool with correct name', () => {
      const tool = createExplainPathTool(deps);
      expect(tool.name).toBe('explain_path');
    });

    it('should find and explain path', async () => {
      const tool = createExplainPathTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'B',
        maxHops: 4,
        language: 'en',
      });

      expect(mockPathService.findPaths).toHaveBeenCalled();
      expect(mockPathService.explainPath).toHaveBeenCalled();
      
      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.success).toBe(true);
      expect(parsed.found).toBe(true);
      expect(parsed.explanation).toBeDefined();
    });

    it('should handle no paths found', async () => {
      vi.mocked(mockPathService.findPaths).mockResolvedValue({
        paths: [],
        totalPaths: 0,
        executionTime: 50,
      });
      const tool = createExplainPathTool(deps);
      const result = await tool.handler({
        startEntity: 'A',
        endEntity: 'Z',
        maxHops: 4,
        language: 'en',
      });

      const content = result.content[0];
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed.found).toBe(false);
    });
  });

  describe('createPathTools', () => {
    it('should create all 5 path tools', () => {
      const tools = createPathTools(deps);
      expect(tools).toHaveLength(5);
      
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('find_paths');
      expect(toolNames).toContain('shortest_path');
      expect(toolNames).toContain('check_connection');
      expect(toolNames).toContain('degrees_of_separation');
      expect(toolNames).toContain('explain_path');
    });
  });
});
