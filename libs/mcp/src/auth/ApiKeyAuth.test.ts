/**
 * API Key Authentication Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiKeyAuth,
  createApiKeyAuth,
  type ApiKeyStore,
} from './ApiKeyAuth.js';
import type { ApiKeyInfo, UserRole } from './types.js';

describe('ApiKeyAuth', () => {
  let mockStore: ApiKeyStore;
  let auth: ApiKeyAuth;

  const validApiKey: ApiKeyInfo = {
    id: 'key-123',
    name: 'Test Key',
    role: 'reader',
    permissions: ['read:entities', 'read:relations'],
    createdAt: new Date('2025-01-01'),
    lastUsedAt: new Date('2025-01-01'),
  };

  const adminApiKey: ApiKeyInfo = {
    id: 'key-admin',
    name: 'Admin Key',
    role: 'admin',
    permissions: [
      'read:entities',
      'write:entities',
      'delete:entities',
      'admin:backup',
      'admin:restore',
    ],
    createdAt: new Date('2025-01-01'),
  };

  const expiredApiKey: ApiKeyInfo = {
    id: 'key-expired',
    name: 'Expired Key',
    role: 'reader',
    permissions: ['read:entities'],
    createdAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
  };

  beforeEach(() => {
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateLastUsed: vi.fn(),
    };
    auth = createApiKeyAuth(mockStore);
  });

  describe('authenticate', () => {
    it('should authenticate valid API key', async () => {
      vi.mocked(mockStore.get).mockResolvedValue(validApiKey);

      const result = await auth.authenticate('valid-key-123');

      expect(result.success).toBe(true);
      expect(result.apiKey).toEqual(validApiKey);
      expect(mockStore.updateLastUsed).toHaveBeenCalledWith('key-123');
    });

    it('should reject invalid API key', async () => {
      vi.mocked(mockStore.get).mockResolvedValue(undefined);

      const result = await auth.authenticate('invalid-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject empty API key', async () => {
      const result = await auth.authenticate('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is required');
    });

    it('should reject expired API key', async () => {
      vi.mocked(mockStore.get).mockResolvedValue(expiredApiKey);

      const result = await auth.authenticate('expired-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key has expired');
    });

    it('should handle store errors', async () => {
      vi.mocked(mockStore.get).mockRejectedValue(new Error('DB error'));

      const result = await auth.authenticate('any-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed: DB error');
    });
  });

  describe('authorize', () => {
    it('should authorize user with required permission', async () => {
      const result = auth.authorize(validApiKey, 'read:entities');

      expect(result.allowed).toBe(true);
    });

    it('should deny user without required permission', async () => {
      const result = auth.authorize(validApiKey, 'write:entities');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Missing required permission: write:entities');
    });

    it('should authorize admin for any permission', async () => {
      const result = auth.authorize(adminApiKey, 'admin:config');

      expect(result.allowed).toBe(true);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      expect(auth.validateKeyFormat('ykg_abc123def456')).toBe(true);
      expect(auth.validateKeyFormat('ykg_' + 'a'.repeat(32))).toBe(true);
    });

    it('should reject incorrect API key format', () => {
      expect(auth.validateKeyFormat('invalid')).toBe(false);
      expect(auth.validateKeyFormat('')).toBe(false);
      expect(auth.validateKeyFormat('ykg_')).toBe(false);
    });
  });

  describe('createApiKey', () => {
    it('should create new API key', async () => {
      vi.mocked(mockStore.set).mockResolvedValue(undefined);

      const result = await auth.createApiKey('Test Key', 'reader');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Key');
      expect(result.role).toBe('reader');
      expect(result.permissions).toContain('read:entities');
      expect(mockStore.set).toHaveBeenCalled();
    });

    it('should create API key with expiration', async () => {
      vi.mocked(mockStore.set).mockResolvedValue(undefined);
      const expiresAt = new Date('2026-01-01');

      const result = await auth.createApiKey('Temp Key', 'reader', expiresAt);

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke existing API key', async () => {
      vi.mocked(mockStore.delete).mockResolvedValue(true);

      const result = await auth.revokeApiKey('key-123');

      expect(result).toBe(true);
      expect(mockStore.delete).toHaveBeenCalledWith('key-123');
    });

    it('should return false for non-existent key', async () => {
      vi.mocked(mockStore.delete).mockResolvedValue(false);

      const result = await auth.revokeApiKey('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys', async () => {
      vi.mocked(mockStore.list).mockResolvedValue([validApiKey, adminApiKey]);

      const result = await auth.listApiKeys();

      expect(result).toHaveLength(2);
    });

    it('should filter by role', async () => {
      vi.mocked(mockStore.list).mockResolvedValue([validApiKey, adminApiKey]);

      const result = await auth.listApiKeys('reader');

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('reader');
    });
  });
});

describe('createApiKeyAuth', () => {
  it('should create ApiKeyAuth instance', () => {
    const mockStore: ApiKeyStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateLastUsed: vi.fn(),
    };

    const auth = createApiKeyAuth(mockStore);

    expect(auth).toBeDefined();
    expect(auth.authenticate).toBeDefined();
    expect(auth.authorize).toBeDefined();
  });
});
