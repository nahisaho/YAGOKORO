/**
 * @yagokoro/mcp
 *
 * MCP (Model Context Protocol) server implementation providing
 * tools and resources for AI model integration.
 */

// Server
export { YagokoroMCPServer } from './server/index.js';
export type {
  MCPServerConfig,
  AuthConfig,
  ApiKeyConfig,
  ToolCallResult,
  ResourceReadResult,
  ToolDefinition,
  ResourceDefinition,
  GraphRAGDependencies,
  ServerCapabilities,
  ServerInfo,
  ToolContext,
  MCPEntity,
  MCPRelation,
  MCPCommunity,
  MCPEntityRepository,
  MCPRelationRepository,
  MCPCommunityRepository,
  MCPVectorStore,
  MCPVectorSearchResult,
  MCPEmbeddingService,
} from './server/index.js';

// Tools
export {
  createGraphRAGTools,
  createQueryKnowledgeGraphTool,
  createGetEntityTool,
  createGetRelationsTool,
  createGetPathTool,
  createGetCommunityTool,
  createAddEntityTool,
  createAddRelationTool,
  createSearchSimilarTool,
  QueryKnowledgeGraphInputSchema,
  GetEntityInputSchema,
  GetRelationsInputSchema,
  GetPathInputSchema,
  GetCommunityInputSchema,
  AddEntityInputSchema,
  AddRelationInputSchema,
  SearchSimilarInputSchema,
} from './tools/index.js';

// Resources
export {
  createGraphRAGResources,
  createOntologySchemaResource,
  createGraphStatisticsResource,
  createEntityListResource,
  createTimelineResource,
} from './resources/index.js';

// Health
export {
  HealthCheckService,
  Neo4jHealthChecker,
  QdrantHealthChecker,
  LLMHealthChecker,
  createHealthCheckService,
  type HealthStatus,
  type ComponentHealth,
  type SystemHealth,
  type HealthCheckConfig,
  type HealthChecker,
} from './health/index.js';

// Auth
export {
  createApiKeyAuth,
  createInMemoryApiKeyStore,
  createRBACMiddleware,
  createAllowAllMiddleware,
  createDenyAllMiddleware,
  ROLE_PERMISSIONS,
  type ApiKeyAuth,
  type ApiKeyStore,
  type ApiKeyInfo,
  type AuthResult,
  type AuthzResult,
  type Permission,
  type UserRole,
  type RBACMiddleware,
  type RBACConfig,
  type RequestContext,
} from './auth/index.js';
