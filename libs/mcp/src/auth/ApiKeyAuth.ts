/**
 * API Key Authentication Service
 *
 * Provides API key-based authentication for the MCP server.
 */

import {
  type ApiKeyInfo,
  type AuthResult,
  type AuthzResult,
  type Permission,
  type UserRole,
  ROLE_PERMISSIONS,
} from './types.js';
import { randomUUID } from 'crypto';

/**
 * API key store interface
 */
export interface ApiKeyStore {
  get(keyHash: string): Promise<ApiKeyInfo | undefined>;
  set(keyHash: string, info: ApiKeyInfo): Promise<void>;
  delete(keyId: string): Promise<boolean>;
  list(): Promise<ApiKeyInfo[]>;
  updateLastUsed(keyId: string): Promise<void>;
}

/**
 * API Key Authentication service
 */
export interface ApiKeyAuth {
  /**
   * Authenticate an API key
   */
  authenticate(apiKey: string): Promise<AuthResult>;

  /**
   * Check if user has required permission
   */
  authorize(apiKey: ApiKeyInfo, permission: Permission): AuthzResult;

  /**
   * Validate API key format
   */
  validateKeyFormat(apiKey: string): boolean;

  /**
   * Create a new API key
   */
  createApiKey(
    name: string,
    role: UserRole,
    expiresAt?: Date
  ): Promise<ApiKeyInfo & { rawKey: string }>;

  /**
   * Revoke an API key
   */
  revokeApiKey(keyId: string): Promise<boolean>;

  /**
   * List API keys
   */
  listApiKeys(role?: UserRole): Promise<ApiKeyInfo[]>;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(apiKey: string): string {
  // In production, use a proper crypto hash like SHA-256
  // For simplicity, we use a basic hash here
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Generate a new API key
 */
function generateApiKey(): string {
  const uuid = randomUUID().replace(/-/g, '');
  return `ykg_${uuid}`;
}

/**
 * Create API Key Authentication service
 */
export function createApiKeyAuth(store: ApiKeyStore): ApiKeyAuth {
  return {
    async authenticate(apiKey: string): Promise<AuthResult> {
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          error: 'API key is required',
        };
      }

      try {
        const keyHash = hashApiKey(apiKey);
        const keyInfo = await store.get(keyHash);

        if (!keyInfo) {
          return {
            success: false,
            error: 'Invalid API key',
          };
        }

        // Check expiration
        if (keyInfo.expiresAt && new Date() > keyInfo.expiresAt) {
          return {
            success: false,
            error: 'API key has expired',
          };
        }

        // Update last used timestamp
        await store.updateLastUsed(keyInfo.id);

        return {
          success: true,
          apiKey: keyInfo,
        };
      } catch (error) {
        return {
          success: false,
          error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },

    authorize(apiKey: ApiKeyInfo, permission: Permission): AuthzResult {
      if (apiKey.permissions.includes(permission)) {
        return { allowed: true };
      }

      // Check role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[apiKey.role];
      if (rolePermissions?.includes(permission)) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Missing required permission: ${permission}`,
      };
    },

    validateKeyFormat(apiKey: string): boolean {
      // API key format: ykg_<32+ alphanumeric chars>
      const pattern = /^ykg_[a-zA-Z0-9]{8,}$/;
      return pattern.test(apiKey);
    },

    async createApiKey(
      name: string,
      role: UserRole,
      expiresAt?: Date
    ): Promise<ApiKeyInfo & { rawKey: string }> {
      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyId = `key_${randomUUID().substring(0, 8)}`;

      const keyInfo: ApiKeyInfo = {
        id: keyId,
        name,
        role,
        permissions: ROLE_PERMISSIONS[role],
        createdAt: new Date(),
        expiresAt,
      };

      await store.set(keyHash, keyInfo);

      return {
        ...keyInfo,
        rawKey,
      };
    },

    async revokeApiKey(keyId: string): Promise<boolean> {
      return store.delete(keyId);
    },

    async listApiKeys(role?: UserRole): Promise<ApiKeyInfo[]> {
      const allKeys = await store.list();
      if (!role) {
        return allKeys;
      }
      return allKeys.filter((key) => key.role === role);
    },
  };
}

/**
 * In-memory API key store (for development/testing)
 */
export function createInMemoryApiKeyStore(): ApiKeyStore {
  const keys = new Map<string, ApiKeyInfo>();
  const keyIdToHash = new Map<string, string>();

  return {
    async get(keyHash: string): Promise<ApiKeyInfo | undefined> {
      return keys.get(keyHash);
    },

    async set(keyHash: string, info: ApiKeyInfo): Promise<void> {
      keys.set(keyHash, info);
      keyIdToHash.set(info.id, keyHash);
    },

    async delete(keyId: string): Promise<boolean> {
      const keyHash = keyIdToHash.get(keyId);
      if (!keyHash) {
        return false;
      }
      keys.delete(keyHash);
      keyIdToHash.delete(keyId);
      return true;
    },

    async list(): Promise<ApiKeyInfo[]> {
      return Array.from(keys.values());
    },

    async updateLastUsed(keyId: string): Promise<void> {
      const keyHash = keyIdToHash.get(keyId);
      if (keyHash) {
        const info = keys.get(keyHash);
        if (info) {
          info.lastUsedAt = new Date();
        }
      }
    },
  };
}
