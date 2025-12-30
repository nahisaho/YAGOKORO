/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Provides authorization middleware for the MCP server.
 */

import type { ApiKeyAuth } from './ApiKeyAuth.js';
import type { AuthzResult, Permission } from './types.js';

/**
 * Request context for authorization
 */
export interface RequestContext {
  apiKey: string;
  operation: string;
  resource: string;
  resourceId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * RBAC middleware configuration
 */
export interface RBACConfig {
  /** Enable authentication (default: true when middleware is used) */
  enabled?: boolean;
  /** Operations that don't require authentication */
  publicOperations?: string[];
  /** Default behavior when no permission found (default: true = deny) */
  defaultDeny?: boolean;
}

/**
 * Tool permission mapping
 */
interface ToolPermissionMap {
  [toolName: string]: Permission[];
}

/**
 * Default tool permission mappings
 */
const DEFAULT_TOOL_PERMISSIONS: ToolPermissionMap = {
  // Entity operations
  entity_get: ['read:entities'],
  entity_list: ['read:entities'],
  entity_search: ['read:entities'],
  entity_create: ['write:entities'],
  entity_update: ['write:entities'],
  entity_delete: ['delete:entities'],

  // Relation operations
  relation_get: ['read:relations'],
  relation_list: ['read:relations'],
  relation_create: ['write:relations'],
  relation_update: ['write:relations'],
  relation_delete: ['delete:relations'],

  // Community operations
  community_get: ['read:communities'],
  community_list: ['read:communities'],
  community_detect: ['write:communities'],
  community_summarize: ['write:communities'],

  // Vector operations
  vector_search: ['read:vectors'],
  vector_upsert: ['write:vectors'],

  // Admin operations
  backup_create: ['admin:backup'],
  backup_restore: ['admin:restore'],
  config_get: ['admin:config'],
  config_update: ['admin:config'],
};

/**
 * Resource to permission suffix mapping
 */
const RESOURCE_SUFFIXES: Record<string, string> = {
  entity: 'entities',
  entities: 'entities',
  relation: 'relations',
  relations: 'relations',
  community: 'communities',
  communities: 'communities',
  vector: 'vectors',
  vectors: 'vectors',
  backup: 'backup',
  restore: 'restore',
  config: 'config',
};

/**
 * RBAC Middleware interface
 */
export interface RBACMiddleware {
  /**
   * Check if authentication is enabled
   */
  isEnabled(): boolean;

  /**
   * Check if request is authorized
   */
  checkAccess(context: RequestContext): Promise<AuthzResult>;

  /**
   * Map operation and resource to permission
   */
  mapOperationToPermission(operation: string, resource: string): Permission;

  /**
   * Get required permissions for a tool
   */
  getRequiredPermissions(toolName: string): Permission[];
}

/**
 * Create RBAC middleware
 */
export function createRBACMiddleware(
  auth: ApiKeyAuth | null,
  config: RBACConfig = {}
): RBACMiddleware {
  const { enabled = true, publicOperations = [], defaultDeny: _defaultDeny = true } = config;

  return {
    isEnabled(): boolean {
      return enabled && auth !== null;
    },

    async checkAccess(context: RequestContext): Promise<AuthzResult> {
      // If authentication is disabled, allow all requests
      if (!enabled || auth === null) {
        return { allowed: true };
      }

      // Check for public operations (no auth required)
      if (publicOperations.includes(context.operation)) {
        return { allowed: true };
      }

      // Require API key
      if (!context.apiKey || context.apiKey.trim() === '') {
        return {
          allowed: false,
          reason: 'API key is required',
        };
      }

      // Authenticate
      const authResult = await auth.authenticate(context.apiKey);
      if (!authResult.success || !authResult.apiKey) {
        return {
          allowed: false,
          reason: authResult.error || 'Authentication failed',
        };
      }

      // Map operation to permission
      const permission = this.mapOperationToPermission(
        context.operation,
        context.resource
      );

      // Authorize
      const authzResult = auth.authorize(authResult.apiKey, permission);
      return authzResult;
    },

    mapOperationToPermission(operation: string, resource: string): Permission {
      const resourceSuffix = RESOURCE_SUFFIXES[resource] || resource;

      // Admin operations have different format
      if (operation === 'admin') {
        return `admin:${resourceSuffix}` as Permission;
      }

      // Standard operations: read, write, delete
      return `${operation}:${resourceSuffix}` as Permission;
    },

    getRequiredPermissions(toolName: string): Permission[] {
      return DEFAULT_TOOL_PERMISSIONS[toolName] || [];
    },
  };
}

/**
 * Create a simple allow-all middleware (for development/auth disabled)
 */
export function createAllowAllMiddleware(): RBACMiddleware {
  return {
    isEnabled(): boolean {
      return false;
    },
    async checkAccess(): Promise<AuthzResult> {
      return { allowed: true };
    },
    mapOperationToPermission(operation: string, resource: string): Permission {
      return `${operation}:${resource}` as Permission;
    },
    getRequiredPermissions(): Permission[] {
      return [];
    },
  };
}

/**
 * Create a deny-all middleware (for testing)
 */
export function createDenyAllMiddleware(reason = 'Access denied'): RBACMiddleware {
  return {
    isEnabled(): boolean {
      return true;
    },
    async checkAccess(): Promise<AuthzResult> {
      return { allowed: false, reason };
    },
    mapOperationToPermission(operation: string, resource: string): Permission {
      return `${operation}:${resource}` as Permission;
    },
    getRequiredPermissions(): Permission[] {
      return [];
    },
  };
}
