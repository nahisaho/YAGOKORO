/**
 * YAGOKORO GraphRAG MCP System
 *
 * Main application entry point.
 * Provides re-exports for core functionality.
 */

// Primary domain types - these are the canonical definitions
export * from '@yagokoro/domain';

// CLI utilities
export * from '@yagokoro/cli';

// Vector store
export * from '@yagokoro/vector';

// MCP server (use selective exports to avoid conflicts)
export {
  YagokoroMCPServer,
  HealthCheckService,
  Neo4jHealthChecker,
  QdrantHealthChecker,
  LLMHealthChecker,
  createHealthCheckService,
  createApiKeyAuth,
  createInMemoryApiKeyStore,
  createRBACMiddleware,
  createAllowAllMiddleware,
  createDenyAllMiddleware,
  ROLE_PERMISSIONS,
  createGraphRAGTools,
  createGraphRAGResources,
} from '@yagokoro/mcp';

export type {
  MCPServerConfig,
  AuthConfig,
  ApiKeyConfig,
  HealthStatus,
  ComponentHealth,
  SystemHealth,
  HealthCheckConfig,
  HealthChecker,
  ApiKeyAuth,
  ApiKeyStore,
  ApiKeyInfo,
  AuthResult,
  AuthzResult,
  Permission,
  UserRole,
  RBACConfig,
  RequestContext,
} from '@yagokoro/mcp';
