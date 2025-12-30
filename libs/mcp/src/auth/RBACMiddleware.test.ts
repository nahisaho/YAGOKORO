/**
 * RBAC Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRBACMiddleware,
  createAllowAllMiddleware,
  createDenyAllMiddleware,
  type RBACMiddleware,
  type RequestContext,
} from './RBACMiddleware.js';
import type { ApiKeyAuth } from './ApiKeyAuth.js';
import type { ApiKeyInfo, Permission } from './types.js';

describe('RBACMiddleware', () => {
  let mockAuth: ApiKeyAuth;
  let middleware: RBACMiddleware;

  const readerKey: ApiKeyInfo = {
    id: 'key-reader',
    name: 'Reader Key',
    role: 'reader',
    permissions: ['read:entities', 'read:relations'],
    createdAt: new Date(),
  };

  const writerKey: ApiKeyInfo = {
    id: 'key-writer',
    name: 'Writer Key',
    role: 'writer',
    permissions: ['read:entities', 'write:entities', 'read:relations', 'write:relations'],
    createdAt: new Date(),
  };

  const adminKey: ApiKeyInfo = {
    id: 'key-admin',
    name: 'Admin Key',
    role: 'admin',
    permissions: [
      'read:entities',
      'write:entities',
      'delete:entities',
      'admin:backup',
      'admin:restore',
      'admin:config',
    ],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockAuth = {
      authenticate: vi.fn(),
      authorize: vi.fn(),
      validateKeyFormat: vi.fn(),
      createApiKey: vi.fn(),
      revokeApiKey: vi.fn(),
      listApiKeys: vi.fn(),
    };
    middleware = createRBACMiddleware(mockAuth);
  });

  describe('checkAccess', () => {
    it('should allow reader to read entities', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: true,
        apiKey: readerKey,
      });
      vi.mocked(mockAuth.authorize).mockReturnValue({ allowed: true });

      const context: RequestContext = {
        apiKey: 'valid-key',
        operation: 'read',
        resource: 'entity',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(true);
    });

    it('should deny reader from writing entities', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: true,
        apiKey: readerKey,
      });
      vi.mocked(mockAuth.authorize).mockReturnValue({
        allowed: false,
        reason: 'Missing required permission: write:entities',
      });

      const context: RequestContext = {
        apiKey: 'valid-key',
        operation: 'write',
        resource: 'entity',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Missing required permission');
    });

    it('should allow writer to write entities', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: true,
        apiKey: writerKey,
      });
      vi.mocked(mockAuth.authorize).mockReturnValue({ allowed: true });

      const context: RequestContext = {
        apiKey: 'valid-key',
        operation: 'write',
        resource: 'entity',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(true);
    });

    it('should deny writer from admin operations', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: true,
        apiKey: writerKey,
      });
      vi.mocked(mockAuth.authorize).mockReturnValue({
        allowed: false,
        reason: 'Missing required permission: admin:backup',
      });

      const context: RequestContext = {
        apiKey: 'valid-key',
        operation: 'admin',
        resource: 'backup',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(false);
    });

    it('should allow admin for all operations', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: true,
        apiKey: adminKey,
      });
      vi.mocked(mockAuth.authorize).mockReturnValue({ allowed: true });

      const context: RequestContext = {
        apiKey: 'valid-key',
        operation: 'admin',
        resource: 'config',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(true);
    });

    it('should reject invalid API key', async () => {
      vi.mocked(mockAuth.authenticate).mockResolvedValue({
        success: false,
        error: 'Invalid API key',
      });

      const context: RequestContext = {
        apiKey: 'invalid-key',
        operation: 'read',
        resource: 'entity',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid API key');
    });

    it('should handle missing API key', async () => {
      const context: RequestContext = {
        apiKey: '',
        operation: 'read',
        resource: 'entity',
      };

      const result = await middleware.checkAccess(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('API key is required');
    });
  });

  describe('mapOperationToPermission', () => {
    it('should map read operation to read permission', () => {
      const permission = middleware.mapOperationToPermission('read', 'entity');
      expect(permission).toBe('read:entities');
    });

    it('should map write operation to write permission', () => {
      const permission = middleware.mapOperationToPermission('write', 'relation');
      expect(permission).toBe('write:relations');
    });

    it('should map delete operation to delete permission', () => {
      const permission = middleware.mapOperationToPermission('delete', 'entity');
      expect(permission).toBe('delete:entities');
    });

    it('should map admin operation', () => {
      const permission = middleware.mapOperationToPermission('admin', 'backup');
      expect(permission).toBe('admin:backup');
    });
  });

  describe('getRequiredPermissions', () => {
    it('should return required permissions for tool', () => {
      const permissions = middleware.getRequiredPermissions('entity_create');
      expect(permissions).toContain('write:entities');
    });

    it('should return read permissions for query tools', () => {
      const permissions = middleware.getRequiredPermissions('entity_get');
      expect(permissions).toContain('read:entities');
    });

    it('should return admin permissions for backup tools', () => {
      const permissions = middleware.getRequiredPermissions('backup_create');
      expect(permissions).toContain('admin:backup');
    });
  });

  describe('bypassForPublicOperations', () => {
    it('should allow health check without auth', async () => {
      const middlewareWithBypass = createRBACMiddleware(mockAuth, {
        publicOperations: ['health_check'],
      });

      const context: RequestContext = {
        apiKey: '',
        operation: 'health_check',
        resource: 'system',
      };

      const result = await middlewareWithBypass.checkAccess(context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('authentication disabled', () => {
    it('should allow all requests when auth is disabled', async () => {
      const disabledMiddleware = createRBACMiddleware(mockAuth, {
        enabled: false,
      });

      const context: RequestContext = {
        apiKey: '',
        operation: 'write',
        resource: 'entity',
      };

      const result = await disabledMiddleware.checkAccess(context);

      expect(result.allowed).toBe(true);
      expect(disabledMiddleware.isEnabled()).toBe(false);
    });

    it('should allow all requests when auth is null', async () => {
      const nullAuthMiddleware = createRBACMiddleware(null);

      const context: RequestContext = {
        apiKey: '',
        operation: 'admin',
        resource: 'backup',
      };

      const result = await nullAuthMiddleware.checkAccess(context);

      expect(result.allowed).toBe(true);
      expect(nullAuthMiddleware.isEnabled()).toBe(false);
    });

    it('should report enabled status correctly', () => {
      const enabledMiddleware = createRBACMiddleware(mockAuth, { enabled: true });
      const disabledMiddleware = createRBACMiddleware(mockAuth, { enabled: false });
      const nullMiddleware = createRBACMiddleware(null, { enabled: true });

      expect(enabledMiddleware.isEnabled()).toBe(true);
      expect(disabledMiddleware.isEnabled()).toBe(false);
      expect(nullMiddleware.isEnabled()).toBe(false);
    });
  });
});

describe('createRBACMiddleware', () => {
  it('should create middleware instance', () => {
    const mockAuth: ApiKeyAuth = {
      authenticate: vi.fn(),
      authorize: vi.fn(),
      validateKeyFormat: vi.fn(),
      createApiKey: vi.fn(),
      revokeApiKey: vi.fn(),
      listApiKeys: vi.fn(),
    };

    const middleware = createRBACMiddleware(mockAuth);

    expect(middleware).toBeDefined();
    expect(middleware.checkAccess).toBeDefined();
    expect(middleware.mapOperationToPermission).toBeDefined();
    expect(middleware.isEnabled).toBeDefined();
  });
});

describe('createAllowAllMiddleware', () => {
  it('should allow all requests', async () => {
    const middleware = createAllowAllMiddleware();

    const result = await middleware.checkAccess({
      apiKey: '',
      operation: 'admin',
      resource: 'config',
    });

    expect(result.allowed).toBe(true);
    expect(middleware.isEnabled()).toBe(false);
  });
});

describe('createDenyAllMiddleware', () => {
  it('should deny all requests', async () => {
    const middleware = createDenyAllMiddleware('Test denial');

    const result = await middleware.checkAccess({
      apiKey: 'valid-key',
      operation: 'read',
      resource: 'entity',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Test denial');
    expect(middleware.isEnabled()).toBe(true);
  });
});
