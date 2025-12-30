/**
 * @module Auth
 * @description 認証・認可システム
 *
 * APIキー認証とRBAC（Role-Based Access Control）を提供
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// =============================================================================
// Types
// =============================================================================

/**
 * ユーザーロール
 */
export type Role = 'admin' | 'editor' | 'reader';

/**
 * パーミッション定義
 */
export type Permission =
  | 'graph:read'
  | 'graph:write'
  | 'graph:delete'
  | 'entity:read'
  | 'entity:write'
  | 'entity:delete'
  | 'relation:read'
  | 'relation:write'
  | 'relation:delete'
  | 'community:read'
  | 'community:write'
  | 'admin:backup'
  | 'admin:restore'
  | 'admin:config';

/**
 * ロールに紐づくパーミッション
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'graph:read', 'graph:write', 'graph:delete',
    'entity:read', 'entity:write', 'entity:delete',
    'relation:read', 'relation:write', 'relation:delete',
    'community:read', 'community:write',
    'admin:backup', 'admin:restore', 'admin:config',
  ],
  editor: [
    'graph:read', 'graph:write',
    'entity:read', 'entity:write',
    'relation:read', 'relation:write',
    'community:read', 'community:write',
  ],
  reader: [
    'graph:read',
    'entity:read',
    'relation:read',
    'community:read',
  ],
};

/**
 * APIキー情報
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  keyHash: string;
  role: Role;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  rateLimit?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 認証済みコンテキスト
 */
export interface AuthContext {
  keyId: string;
  role: Role;
  permissions: Permission[];
  metadata?: Record<string, unknown>;
}

/**
 * 認証結果
 */
export type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; error: AuthError };

/**
 * 認証エラー
 */
export interface AuthError {
  code: 'INVALID_KEY' | 'EXPIRED_KEY' | 'RATE_LIMITED' | 'INSUFFICIENT_PERMISSIONS';
  message: string;
}

// =============================================================================
// API Key Store Interface
// =============================================================================

/**
 * APIキー保存インターフェース
 */
export interface ApiKeyStore {
  findByKeyHash(keyHash: string): Promise<ApiKeyInfo | null>;
  create(info: ApiKeyInfo): Promise<void>;
  updateLastUsed(id: string, timestamp: Date): Promise<void>;
  delete(id: string): Promise<boolean>;
  listAll(): Promise<ApiKeyInfo[]>;
}

/**
 * インメモリAPIキーストア（テスト/開発用）
 */
export class InMemoryApiKeyStore implements ApiKeyStore {
  private readonly keys: Map<string, ApiKeyInfo> = new Map();

  async findByKeyHash(keyHash: string): Promise<ApiKeyInfo | null> {
    for (const info of this.keys.values()) {
      if (this.safeCompare(info.keyHash, keyHash)) {
        return info;
      }
    }
    return null;
  }

  async create(info: ApiKeyInfo): Promise<void> {
    this.keys.set(info.id, info);
  }

  async updateLastUsed(id: string, timestamp: Date): Promise<void> {
    const info = this.keys.get(id);
    if (info) {
      info.lastUsedAt = timestamp;
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.keys.delete(id);
  }

  async listAll(): Promise<ApiKeyInfo[]> {
    return Array.from(this.keys.values());
  }

  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

// =============================================================================
// API Key Authentication
// =============================================================================

/**
 * APIキー認証設定
 */
export interface ApiKeyAuthConfig {
  store: ApiKeyStore;
  headerName?: string;
  prefix?: string;
}

/**
 * APIキー認証サービス
 */
export class ApiKeyAuth {
  private readonly store: ApiKeyStore;
  private readonly headerName: string;
  private readonly prefix: string;

  constructor(config: ApiKeyAuthConfig) {
    this.store = config.store;
    this.headerName = config.headerName ?? 'x-api-key';
    this.prefix = config.prefix ?? 'yagokoro_';
  }

  /**
   * APIキーを生成
   */
  generateKey(): { key: string; hash: string } {
    const randomPart = randomBytes(24).toString('base64url');
    const key = `${this.prefix}${randomPart}`;
    const hash = this.hashKey(key);
    return { key, hash };
  }

  /**
   * APIキーをハッシュ化
   */
  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * APIキーを検証
   */
  async authenticate(key: string | undefined): Promise<AuthResult> {
    if (!key) {
      return {
        success: false,
        error: {
          code: 'INVALID_KEY',
          message: 'API key is required',
        },
      };
    }

    const keyHash = this.hashKey(key);
    const keyInfo = await this.store.findByKeyHash(keyHash);

    if (!keyInfo) {
      return {
        success: false,
        error: {
          code: 'INVALID_KEY',
          message: 'Invalid API key',
        },
      };
    }

    // 有効期限チェック
    if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
      return {
        success: false,
        error: {
          code: 'EXPIRED_KEY',
          message: 'API key has expired',
        },
      };
    }

    // 最終使用日時を更新
    await this.store.updateLastUsed(keyInfo.id, new Date());

    const context: AuthContext = {
      keyId: keyInfo.id,
      role: keyInfo.role,
      permissions: ROLE_PERMISSIONS[keyInfo.role],
    };
    if (keyInfo.metadata !== undefined) {
      context.metadata = keyInfo.metadata;
    }
    return {
      success: true,
      context,
    };
  }

  /**
   * ヘッダー名を取得
   */
  getHeaderName(): string {
    return this.headerName;
  }

  /**
   * 新しいAPIキーを作成
   */
  async createApiKey(
    name: string,
    role: Role,
    options?: {
      expiresIn?: number; // milliseconds
      metadata?: Record<string, unknown>;
      rateLimit?: number;
    }
  ): Promise<{ key: string; info: ApiKeyInfo }> {
    const { key, hash } = this.generateKey();
    const now = new Date();

    const info: ApiKeyInfo = {
      id: randomBytes(8).toString('hex'),
      name,
      keyHash: hash,
      role,
      createdAt: now,
    };
    if (options?.expiresIn !== undefined) {
      info.expiresAt = new Date(now.getTime() + options.expiresIn);
    }
    if (options?.metadata !== undefined) {
      info.metadata = options.metadata;
    }
    if (options?.rateLimit !== undefined) {
      info.rateLimit = options.rateLimit;
    }

    await this.store.create(info);

    return { key, info };
  }

  /**
   * APIキーを削除
   */
  async revokeApiKey(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * 全APIキーを一覧
   */
  async listApiKeys(): Promise<Omit<ApiKeyInfo, 'keyHash'>[]> {
    const keys = await this.store.listAll();
    return keys.map(({ keyHash: _, ...rest }) => rest);
  }
}

// =============================================================================
// RBAC Middleware
// =============================================================================

/**
 * 認可チェック関数
 */
export function checkPermission(context: AuthContext, required: Permission): boolean {
  return context.permissions.includes(required);
}

/**
 * 複数パーミッションのチェック（AND条件）
 */
export function checkPermissions(context: AuthContext, required: Permission[]): boolean {
  return required.every((p) => context.permissions.includes(p));
}

/**
 * 複数パーミッションのチェック（OR条件）
 */
export function checkAnyPermission(context: AuthContext, required: Permission[]): boolean {
  return required.some((p) => context.permissions.includes(p));
}

/**
 * ロールチェック
 */
export function checkRole(context: AuthContext, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(context.role);
}

/**
 * 認可結果
 */
export type AuthzResult =
  | { allowed: true }
  | { allowed: false; error: AuthError };

/**
 * RBAC認可チェッカー
 */
export class RBACChecker {
  /**
   * パーミッションをチェック
   */
  authorize(context: AuthContext, required: Permission | Permission[]): AuthzResult {
    const permissions = Array.isArray(required) ? required : [required];
    
    if (checkPermissions(context, permissions)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Missing required permissions: ${permissions.join(', ')}`,
      },
    };
  }

  /**
   * ロールをチェック
   */
  authorizeRole(context: AuthContext, allowedRoles: Role[]): AuthzResult {
    if (checkRole(context, allowedRoles)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access restricted to roles: ${allowedRoles.join(', ')}`,
      },
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 認証・認可を組み合わせたヘルパー
 */
export async function authenticateAndAuthorize(
  auth: ApiKeyAuth,
  rbac: RBACChecker,
  apiKey: string | undefined,
  requiredPermission: Permission
): Promise<{ success: true; context: AuthContext } | { success: false; error: AuthError }> {
  const authResult = await auth.authenticate(apiKey);
  
  if (!authResult.success) {
    return authResult;
  }

  const authzResult = rbac.authorize(authResult.context, requiredPermission);
  
  if (!authzResult.allowed) {
    return { success: false, error: authzResult.error };
  }

  return { success: true, context: authResult.context };
}
