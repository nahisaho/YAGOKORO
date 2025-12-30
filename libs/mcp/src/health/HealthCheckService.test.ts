import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HealthCheckService,
  Neo4jHealthChecker,
  QdrantHealthChecker,
  LLMHealthChecker,
  createHealthCheckService,
  type HealthChecker,
  type ComponentHealth,
} from './HealthCheckService.js';

describe('HealthCheckService', () => {
  describe('constructor', () => {
    it('should initialize with version', () => {
      const service = new HealthCheckService('1.0.0');
      expect(service).toBeInstanceOf(HealthCheckService);
    });

    it('should track uptime', async () => {
      const service = new HealthCheckService();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(service.getUptime()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('registerChecker', () => {
    it('should register health checkers', async () => {
      const service = new HealthCheckService();
      const mockChecker: HealthChecker = {
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      };

      service.registerChecker(mockChecker);
      const health = await service.checkHealth();

      expect(health.components).toHaveLength(1);
      expect(health.components[0].name).toBe('test');
    });
  });

  describe('checkHealth', () => {
    it('should return healthy when all components are healthy', async () => {
      const service = new HealthCheckService('1.0.0');

      service.registerChecker({
        name: 'component1',
        check: vi.fn().mockResolvedValue({
          name: 'component1',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      service.registerChecker({
        name: 'component2',
        check: vi.fn().mockResolvedValue({
          name: 'component2',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
      expect(health.components).toHaveLength(2);
    });

    it('should return degraded when any component is degraded', async () => {
      const service = new HealthCheckService();

      service.registerChecker({
        name: 'healthy',
        check: vi.fn().mockResolvedValue({
          name: 'healthy',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      service.registerChecker({
        name: 'degraded',
        check: vi.fn().mockResolvedValue({
          name: 'degraded',
          status: 'degraded',
          lastChecked: new Date(),
        }),
      });

      const health = await service.checkHealth();
      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy when any component is unhealthy', async () => {
      const service = new HealthCheckService();

      service.registerChecker({
        name: 'healthy',
        check: vi.fn().mockResolvedValue({
          name: 'healthy',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      service.registerChecker({
        name: 'unhealthy',
        check: vi.fn().mockResolvedValue({
          name: 'unhealthy',
          status: 'unhealthy',
          lastChecked: new Date(),
        }),
      });

      const health = await service.checkHealth();
      expect(health.status).toBe('unhealthy');
    });

    it('should include timestamp and uptime', async () => {
      const service = new HealthCheckService();
      const health = await service.checkHealth();

      expect(health.timestamp).toBeInstanceOf(Date);
      expect(typeof health.uptime).toBe('number');
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', async () => {
      const service = new HealthCheckService();
      service.registerChecker({
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      expect(await service.isHealthy()).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      const service = new HealthCheckService();
      service.registerChecker({
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'unhealthy',
          lastChecked: new Date(),
        }),
      });

      expect(await service.isHealthy()).toBe(false);
    });
  });

  describe('getHttpStatusCode', () => {
    it('should return 200 for healthy', async () => {
      const service = new HealthCheckService();
      service.registerChecker({
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'healthy',
          lastChecked: new Date(),
        }),
      });

      expect(await service.getHttpStatusCode()).toBe(200);
    });

    it('should return 207 for degraded', async () => {
      const service = new HealthCheckService();
      service.registerChecker({
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'degraded',
          lastChecked: new Date(),
        }),
      });

      expect(await service.getHttpStatusCode()).toBe(207);
    });

    it('should return 503 for unhealthy', async () => {
      const service = new HealthCheckService();
      service.registerChecker({
        name: 'test',
        check: vi.fn().mockResolvedValue({
          name: 'test',
          status: 'unhealthy',
          lastChecked: new Date(),
        }),
      });

      expect(await service.getHttpStatusCode()).toBe(503);
    });
  });
});

describe('Neo4jHealthChecker', () => {
  it('should return healthy when connected', async () => {
    const checker = new Neo4jHealthChecker(
      vi.fn().mockResolvedValue(true)
    );

    const result = await checker.check();

    expect(result.name).toBe('neo4j');
    expect(result.status).toBe('healthy');
    expect(result.latency).toBeDefined();
  });

  it('should return unhealthy when not connected', async () => {
    const checker = new Neo4jHealthChecker(
      vi.fn().mockResolvedValue(false)
    );

    const result = await checker.check();

    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('Unable to connect');
  });

  it('should return unhealthy on error', async () => {
    const checker = new Neo4jHealthChecker(
      vi.fn().mockRejectedValue(new Error('Connection timeout'))
    );

    const result = await checker.check();

    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('Connection timeout');
  });

  it('should include stats when available', async () => {
    const checker = new Neo4jHealthChecker(
      vi.fn().mockResolvedValue(true),
      vi.fn().mockResolvedValue({ nodeCount: 100, relationCount: 200 })
    );

    const result = await checker.check();

    expect(result.status).toBe('healthy');
    expect(result.details).toEqual({
      nodeCount: 100,
      relationCount: 200,
    });
  });

  it('should not fail if stats throw', async () => {
    const checker = new Neo4jHealthChecker(
      vi.fn().mockResolvedValue(true),
      vi.fn().mockRejectedValue(new Error('Stats error'))
    );

    const result = await checker.check();

    expect(result.status).toBe('healthy');
    expect(result.details).toBeUndefined();
  });
});

describe('QdrantHealthChecker', () => {
  it('should return healthy when connected', async () => {
    const checker = new QdrantHealthChecker(
      vi.fn().mockResolvedValue(true)
    );

    const result = await checker.check();

    expect(result.name).toBe('qdrant');
    expect(result.status).toBe('healthy');
  });

  it('should return unhealthy when not connected', async () => {
    const checker = new QdrantHealthChecker(
      vi.fn().mockResolvedValue(false)
    );

    const result = await checker.check();

    expect(result.status).toBe('unhealthy');
  });

  it('should include collection info when available', async () => {
    const checker = new QdrantHealthChecker(
      vi.fn().mockResolvedValue(true),
      vi.fn().mockResolvedValue({ pointCount: 500 })
    );

    const result = await checker.check();

    expect(result.details).toEqual({ pointCount: 500 });
  });
});

describe('LLMHealthChecker', () => {
  it('should return healthy when API key is valid', async () => {
    const checker = new LLMHealthChecker(
      vi.fn().mockResolvedValue(true),
      'openai'
    );

    const result = await checker.check();

    expect(result.name).toBe('llm');
    expect(result.status).toBe('healthy');
    expect(result.details).toEqual({ provider: 'openai' });
  });

  it('should return unhealthy when API key is invalid', async () => {
    const checker = new LLMHealthChecker(
      vi.fn().mockResolvedValue(false)
    );

    const result = await checker.check();

    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('Invalid or missing');
  });

  it('should return degraded on error', async () => {
    const checker = new LLMHealthChecker(
      vi.fn().mockRejectedValue(new Error('Rate limited'))
    );

    const result = await checker.check();

    expect(result.status).toBe('degraded');
    expect(result.message).toContain('Rate limited');
  });
});

describe('createHealthCheckService', () => {
  it('should create service with provided checkers', async () => {
    const neo4jChecker = new Neo4jHealthChecker(vi.fn().mockResolvedValue(true));
    const qdrantChecker = new QdrantHealthChecker(vi.fn().mockResolvedValue(true));

    const service = createHealthCheckService({
      version: '2.0.0',
      neo4jChecker,
      qdrantChecker,
    });

    const health = await service.checkHealth();

    expect(health.version).toBe('2.0.0');
    expect(health.components).toHaveLength(2);
    expect(health.components.map((c) => c.name)).toContain('neo4j');
    expect(health.components.map((c) => c.name)).toContain('qdrant');
  });

  it('should create empty service when no checkers provided', async () => {
    const service = createHealthCheckService();
    const health = await service.checkHealth();

    expect(health.components).toHaveLength(0);
    expect(health.status).toBe('healthy');
  });
});
