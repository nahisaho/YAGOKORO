/**
 * @module Auth.test
 * @description 認証・認可システムのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiKeyAuth,
  InMemoryApiKeyStore,
  RBACChecker,
  ROLE_PERMISSIONS,
  checkPermission,
  checkPermissions,
  checkAnyPermission,
  checkRole,
  authenticateAndAuthorize,
  type AuthContext,
  type Role,
  type Permission,
} from './Auth.js';

describe('ApiKeyAuth', () => {
  let store: InMemoryApiKeyStore;
  let auth: ApiKeyAuth;

  beforeEach(() => {
    store = new InMemoryApiKeyStore();
    auth = new ApiKeyAuth({ store });
  });

  describe('generateKey', () => {
    it('should generate unique keys', () => {
      const key1 = auth.generateKey();
      const key2 = auth.generateKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.hash).not.toBe(key2.hash);
    });

    it('should generate keys with prefix', () => {
      const { key } = auth.generateKey();
      expect(key.startsWith('yagokoro_')).toBe(true);
    });

    it('should generate consistent hashes', () => {
      const { key, hash } = auth.generateKey();
      const rehash = auth.hashKey(key);
      expect(hash).toBe(rehash);
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const result = await auth.createApiKey('Test Key', 'reader');

      expect(result.key).toBeDefined();
      expect(result.info.name).toBe('Test Key');
      expect(result.info.role).toBe('reader');
      expect(result.info.createdAt).toBeInstanceOf(Date);
    });

    it('should create key with expiration', async () => {
      const result = await auth.createApiKey('Expiring Key', 'admin', {
        expiresIn: 3600000, // 1 hour
      });

      expect(result.info.expiresAt).toBeInstanceOf(Date);
      expect(result.info.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create key with metadata', async () => {
      const result = await auth.createApiKey('Meta Key', 'editor', {
        metadata: { app: 'test-app', version: '1.0' },
      });

      expect(result.info.metadata).toEqual({ app: 'test-app', version: '1.0' });
    });
  });

  describe('authenticate', () => {
    it('should authenticate valid key', async () => {
      const { key } = await auth.createApiKey('Valid Key', 'admin');
      const result = await auth.authenticate(key);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.role).toBe('admin');
        expect(result.context.permissions).toEqual(ROLE_PERMISSIONS.admin);
      }
    });

    it('should reject missing key', async () => {
      const result = await auth.authenticate(undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_KEY');
      }
    });

    it('should reject invalid key', async () => {
      const result = await auth.authenticate('invalid_key_12345');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_KEY');
      }
    });

    it('should reject expired key', async () => {
      const { key } = await auth.createApiKey('Expired Key', 'reader', {
        expiresIn: -1000, // Already expired
      });

      const result = await auth.authenticate(key);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('EXPIRED_KEY');
      }
    });

    it('should update last used timestamp', async () => {
      const { key, info } = await auth.createApiKey('Used Key', 'reader');
      expect(info.lastUsedAt).toBeUndefined();

      await auth.authenticate(key);

      const keys = await auth.listApiKeys();
      const updatedInfo = keys.find((k) => k.id === info.id);
      expect(updatedInfo?.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke existing key', async () => {
      const { key, info } = await auth.createApiKey('To Revoke', 'reader');

      const revoked = await auth.revokeApiKey(info.id);
      expect(revoked).toBe(true);

      const result = await auth.authenticate(key);
      expect(result.success).toBe(false);
    });

    it('should return false for non-existent key', async () => {
      const revoked = await auth.revokeApiKey('non-existent-id');
      expect(revoked).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    it('should list all keys without hash', async () => {
      await auth.createApiKey('Key 1', 'admin');
      await auth.createApiKey('Key 2', 'reader');

      const keys = await auth.listApiKeys();

      expect(keys).toHaveLength(2);
      expect(keys.every((k) => !('keyHash' in k))).toBe(true);
    });
  });
});

describe('InMemoryApiKeyStore', () => {
  let store: InMemoryApiKeyStore;

  beforeEach(() => {
    store = new InMemoryApiKeyStore();
  });

  it('should find key by hash', async () => {
    const info = {
      id: 'test-id',
      name: 'Test',
      keyHash: 'abc123',
      role: 'reader' as Role,
      createdAt: new Date(),
    };

    await store.create(info);
    const found = await store.findByKeyHash('abc123');

    expect(found).toEqual(info);
  });

  it('should return null for unknown hash', async () => {
    const found = await store.findByKeyHash('unknown');
    expect(found).toBeNull();
  });

  it('should handle timing-safe comparison', async () => {
    const info = {
      id: 'test-id',
      name: 'Test',
      keyHash: 'a'.repeat(64), // Valid hex
      role: 'reader' as Role,
      createdAt: new Date(),
    };

    await store.create(info);
    
    // Different length should not match
    const found = await store.findByKeyHash('abc');
    expect(found).toBeNull();
  });
});

describe('RBAC Functions', () => {
  const adminContext: AuthContext = {
    keyId: 'admin-key',
    role: 'admin',
    permissions: ROLE_PERMISSIONS.admin,
  };

  const readerContext: AuthContext = {
    keyId: 'reader-key',
    role: 'reader',
    permissions: ROLE_PERMISSIONS.reader,
  };

  describe('checkPermission', () => {
    it('should return true for granted permission', () => {
      expect(checkPermission(adminContext, 'admin:backup')).toBe(true);
    });

    it('should return false for missing permission', () => {
      expect(checkPermission(readerContext, 'admin:backup')).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should require all permissions', () => {
      expect(
        checkPermissions(adminContext, ['graph:read', 'graph:write', 'admin:backup'])
      ).toBe(true);

      expect(
        checkPermissions(readerContext, ['graph:read', 'graph:write'])
      ).toBe(false);
    });
  });

  describe('checkAnyPermission', () => {
    it('should pass if any permission is granted', () => {
      expect(
        checkAnyPermission(readerContext, ['admin:backup', 'graph:read'])
      ).toBe(true);
    });

    it('should fail if no permissions are granted', () => {
      expect(
        checkAnyPermission(readerContext, ['admin:backup', 'admin:restore'])
      ).toBe(false);
    });
  });

  describe('checkRole', () => {
    it('should check role membership', () => {
      expect(checkRole(adminContext, ['admin', 'editor'])).toBe(true);
      expect(checkRole(readerContext, ['admin', 'editor'])).toBe(false);
    });
  });
});

describe('RBACChecker', () => {
  let rbac: RBACChecker;

  beforeEach(() => {
    rbac = new RBACChecker();
  });

  const editorContext: AuthContext = {
    keyId: 'editor-key',
    role: 'editor',
    permissions: ROLE_PERMISSIONS.editor,
  };

  describe('authorize', () => {
    it('should allow authorized permission', () => {
      const result = rbac.authorize(editorContext, 'entity:write');
      expect(result.allowed).toBe(true);
    });

    it('should deny unauthorized permission', () => {
      const result = rbac.authorize(editorContext, 'admin:backup');

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });

    it('should check multiple permissions', () => {
      const result = rbac.authorize(editorContext, ['entity:read', 'entity:write']);
      expect(result.allowed).toBe(true);

      const denied = rbac.authorize(editorContext, ['entity:read', 'admin:config']);
      expect(denied.allowed).toBe(false);
    });
  });

  describe('authorizeRole', () => {
    it('should allow matching role', () => {
      const result = rbac.authorizeRole(editorContext, ['admin', 'editor']);
      expect(result.allowed).toBe(true);
    });

    it('should deny non-matching role', () => {
      const result = rbac.authorizeRole(editorContext, ['admin']);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error.message).toContain('admin');
      }
    });
  });
});

describe('authenticateAndAuthorize', () => {
  let store: InMemoryApiKeyStore;
  let auth: ApiKeyAuth;
  let rbac: RBACChecker;

  beforeEach(() => {
    store = new InMemoryApiKeyStore();
    auth = new ApiKeyAuth({ store });
    rbac = new RBACChecker();
  });

  it('should authenticate and authorize successfully', async () => {
    const { key } = await auth.createApiKey('Full Access', 'admin');

    const result = await authenticateAndAuthorize(
      auth,
      rbac,
      key,
      'admin:backup'
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.context.role).toBe('admin');
    }
  });

  it('should fail on authentication error', async () => {
    const result = await authenticateAndAuthorize(
      auth,
      rbac,
      'invalid-key',
      'graph:read'
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_KEY');
    }
  });

  it('should fail on authorization error', async () => {
    const { key } = await auth.createApiKey('Reader Only', 'reader');

    const result = await authenticateAndAuthorize(
      auth,
      rbac,
      key,
      'admin:backup'
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    }
  });
});

describe('ROLE_PERMISSIONS', () => {
  it('should define admin with all permissions', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('admin:backup');
    expect(ROLE_PERMISSIONS.admin).toContain('entity:delete');
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(10);
  });

  it('should define editor with write but not admin permissions', () => {
    expect(ROLE_PERMISSIONS.editor).toContain('entity:write');
    expect(ROLE_PERMISSIONS.editor).not.toContain('admin:backup');
  });

  it('should define reader with read-only permissions', () => {
    expect(ROLE_PERMISSIONS.reader).toContain('graph:read');
    expect(ROLE_PERMISSIONS.reader).not.toContain('graph:write');
    expect(ROLE_PERMISSIONS.reader.every((p) => p.endsWith(':read'))).toBe(true);
  });
});
