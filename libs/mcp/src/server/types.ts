/**
 * MCP Server Types
 *
 * Type definitions for the MCP (Model Context Protocol) server implementation.
 */

import type { z } from 'zod';

/**
 * Tool call result content types
 */
export type TextContent = {
  type: 'text';
  text: string;
};

export type ImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
};

export type ResourceLinkContent = {
  type: 'resource_link';
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

export type ToolResultContent = TextContent | ImageContent | ResourceLinkContent;

/**
 * Tool call result
 */
export interface ToolCallResult {
  content: ToolResultContent[];
  isError?: boolean;
}

/**
 * Resource read result
 */
export interface ResourceReadResult {
  contents: Array<{
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  }>;
}

/**
 * Tool definition
 */
export interface ToolDefinition<TInput extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: TInput;
  handler: (input: z.infer<TInput>, context: ToolContext) => Promise<ToolCallResult>;
}

/**
 * Resource definition
 */
export interface ResourceDefinition {
  name: string;
  uri: string;
  description: string;
  mimeType?: string | undefined;
  handler: (context: ResourceContext) => Promise<ResourceReadResult>;
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  /** Session ID for the current request */
  sessionId?: string | undefined;
  /** Send a logging message to the client */
  sendLog?: ((level: LogLevel, message: string) => Promise<void>) | undefined;
}

/**
 * Context passed to resource handlers
 */
export interface ResourceContext {
  /** Session ID for the current request */
  sessionId?: string;
  /** Request URI (may include query parameters) */
  uri: string;
}

/**
 * Log levels for MCP logging
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server description */
  description?: string;
  /** Enable logging capability */
  enableLogging?: boolean;
  /** Authentication configuration */
  auth?: AuthConfig | undefined;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Enable API key authentication (default: false) */
  enabled: boolean;
  /** List of operations that don't require authentication */
  publicOperations?: string[];
  /** API keys (for simple configuration) */
  apiKeys?: ApiKeyConfig[];
}

/**
 * Simple API key configuration
 */
export interface ApiKeyConfig {
  /** API key value */
  key: string;
  /** Name/description for the key */
  name: string;
  /** Role: admin, writer, reader */
  role: 'admin' | 'writer' | 'reader';
  /** Expiration date (optional) */
  expiresAt?: Date;
}

/**
 * Server transport type
 */
export type TransportType = 'stdio' | 'http';

/**
 * Server capabilities
 */
export interface ServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

/**
 * Server info returned during initialization
 */
export interface ServerInfo {
  name: string;
  version: string;
  capabilities: ServerCapabilities;
}

/**
 * Generic entity for MCP tools (not domain-specific)
 */
export interface MCPEntity {
  id: string;
  name: string;
  type: string;
  description?: string | undefined;
  properties?: Record<string, unknown> | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
}

/**
 * Generic relation for MCP tools
 */
export interface MCPRelation {
  id: string;
  type: string;
  sourceEntityId: string;
  targetEntityId: string;
  weight?: number | undefined;
  properties?: Record<string, unknown> | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
}

/**
 * Generic community for MCP tools
 */
export interface MCPCommunity {
  id: string;
  level: number;
  memberEntityIds: string[];
  summary?: string | undefined;
  properties?: Record<string, unknown> | undefined;
}

/**
 * Vector search result
 */
export interface MCPVectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Generic entity repository interface for MCP tools
 */
export interface MCPEntityRepository {
  findById(id: string): Promise<MCPEntity | null>;
  findAll(options?: { limit?: number }): Promise<MCPEntity[]>;
  save(entity: MCPEntity): Promise<void>;
}

/**
 * Generic relation repository interface for MCP tools
 */
export interface MCPRelationRepository {
  findByEntityId(entityId: string): Promise<MCPRelation[]>;
  findAll(options?: { limit?: number }): Promise<MCPRelation[]>;
  save(relation: MCPRelation): Promise<void>;
}

/**
 * Generic community repository interface for MCP tools
 */
export interface MCPCommunityRepository {
  findById(id: string): Promise<MCPCommunity | null>;
  findAll(options?: { limit?: number }): Promise<MCPCommunity[]>;
}

/**
 * Generic vector store interface for MCP tools
 */
export interface MCPVectorStore {
  search(query: string, limit: number): Promise<MCPVectorSearchResult[]>;
  upsert(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void>;
}

/**
 * Generic embedding service interface for MCP tools
 */
export interface MCPEmbeddingService {
  embed(text: string): Promise<number[]>;
}

/**
 * Dependencies for GraphRAG tools
 */
export interface GraphRAGDependencies {
  entityRepository: MCPEntityRepository;
  relationRepository: MCPRelationRepository;
  communityRepository: MCPCommunityRepository;
  vectorStore: MCPVectorStore;
  embeddingService?: MCPEmbeddingService;
}

