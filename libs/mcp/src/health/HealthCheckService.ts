/**
 * Health Check Service
 *
 * Provides health status checks for all system components.
 */

/**
 * Health status enum
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health check result
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number | undefined;
  message?: string | undefined;
  details?: Record<string, unknown> | undefined;
  lastChecked: Date;
}

/**
 * System health check result
 */
export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: Date;
  components: ComponentHealth[];
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  neo4jUri?: string | undefined;
  qdrantUrl?: string | undefined;
  llmApiKey?: string | undefined;
  timeout?: number | undefined;
}

/**
 * Health checker interface for individual components
 */
export interface HealthChecker {
  name: string;
  check(): Promise<ComponentHealth>;
}

/**
 * Neo4j health checker
 */
export class Neo4jHealthChecker implements HealthChecker {
  readonly name = 'neo4j';

  constructor(
    private readonly checkConnection: () => Promise<boolean>,
    private readonly getStats?: () => Promise<{ nodeCount: number; relationCount: number }>
  ) {}

  async check(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const connected = await this.checkConnection();
      const latency = Date.now() - startTime;

      if (!connected) {
        return {
          name: this.name,
          status: 'unhealthy',
          latency,
          message: 'Unable to connect to Neo4j',
          lastChecked: new Date(),
        };
      }

      let details: Record<string, unknown> | undefined;
      if (this.getStats) {
        try {
          const stats = await this.getStats();
          details = {
            nodeCount: stats.nodeCount,
            relationCount: stats.relationCount,
          };
        } catch {
          // Stats are optional, don't fail health check
        }
      }

      return {
        name: this.name,
        status: 'healthy',
        latency,
        message: 'Connected to Neo4j',
        details,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }
}

/**
 * Qdrant health checker
 */
export class QdrantHealthChecker implements HealthChecker {
  readonly name = 'qdrant';

  constructor(
    private readonly checkConnection: () => Promise<boolean>,
    private readonly getCollectionInfo?: () => Promise<{ pointCount: number }>
  ) {}

  async check(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const connected = await this.checkConnection();
      const latency = Date.now() - startTime;

      if (!connected) {
        return {
          name: this.name,
          status: 'unhealthy',
          latency,
          message: 'Unable to connect to Qdrant',
          lastChecked: new Date(),
        };
      }

      let details: Record<string, unknown> | undefined;
      if (this.getCollectionInfo) {
        try {
          const info = await this.getCollectionInfo();
          details = {
            pointCount: info.pointCount,
          };
        } catch {
          // Collection info is optional
        }
      }

      return {
        name: this.name,
        status: 'healthy',
        latency,
        message: 'Connected to Qdrant',
        details,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }
}

/**
 * LLM service health checker
 */
export class LLMHealthChecker implements HealthChecker {
  readonly name = 'llm';

  constructor(
    private readonly checkApiKey: () => Promise<boolean>,
    private readonly provider?: string
  ) {}

  async check(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const valid = await this.checkApiKey();
      const latency = Date.now() - startTime;

      if (!valid) {
        return {
          name: this.name,
          status: 'unhealthy',
          latency,
          message: 'Invalid or missing LLM API key',
          lastChecked: new Date(),
        };
      }

      return {
        name: this.name,
        status: 'healthy',
        latency,
        message: `LLM service available${this.provider ? ` (${this.provider})` : ''}`,
        details: this.provider ? { provider: this.provider } : undefined,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'degraded',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private readonly startTime: Date;
  private readonly checkers: HealthChecker[] = [];

  constructor(private readonly version: string = '0.1.0') {
    this.startTime = new Date();
  }

  /**
   * Register a health checker
   */
  registerChecker(checker: HealthChecker): void {
    this.checkers.push(checker);
  }

  /**
   * Get system uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Check health of all components
   */
  async checkHealth(): Promise<SystemHealth> {
    const componentResults = await Promise.all(
      this.checkers.map((checker) => checker.check())
    );

    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';

    for (const component of componentResults) {
      if (component.status === 'unhealthy') {
        overallStatus = 'unhealthy';
        break;
      }
      if (component.status === 'degraded') {
        overallStatus = 'degraded';
      }
    }

    return {
      status: overallStatus,
      version: this.version,
      uptime: this.getUptime(),
      timestamp: new Date(),
      components: componentResults,
    };
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.status === 'healthy';
  }

  /**
   * Get health status as HTTP response code
   */
  async getHttpStatusCode(): Promise<number> {
    const health = await this.checkHealth();
    switch (health.status) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 207; // Multi-Status
      case 'unhealthy':
        return 503; // Service Unavailable
    }
  }
}

/**
 * Create a health check service with default checkers
 */
export function createHealthCheckService(
  config: {
    version?: string;
    neo4jChecker?: HealthChecker;
    qdrantChecker?: HealthChecker;
    llmChecker?: HealthChecker;
  } = {}
): HealthCheckService {
  const service = new HealthCheckService(config.version);

  if (config.neo4jChecker) {
    service.registerChecker(config.neo4jChecker);
  }

  if (config.qdrantChecker) {
    service.registerChecker(config.qdrantChecker);
  }

  if (config.llmChecker) {
    service.registerChecker(config.llmChecker);
  }

  return service;
}
