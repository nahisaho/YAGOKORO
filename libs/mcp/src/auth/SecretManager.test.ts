/**
 * @fileoverview Secret Manager Tests
 * TASK-V2-030: Tests for SecretManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSecretManager,
  EnvSecretProvider,
  InMemorySecretProvider,
  SECRET_KEYS,
} from './SecretManager.js';

describe('SecretManager', () => {
  describe('InMemorySecretProvider', () => {
    let provider: InMemorySecretProvider;

    beforeEach(() => {
      provider = new InMemorySecretProvider({
        api_key: 'test-api-key',
        password: 'secret123',
      });
    });

    it('should get existing secret', async () => {
      const value = await provider.get('api_key');
      expect(value).toBe('test-api-key');
    });

    it('should return undefined for non-existent secret', async () => {
      const value = await provider.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should check if secret exists', async () => {
      expect(await provider.has('api_key')).toBe(true);
      expect(await provider.has('nonexistent')).toBe(false);
    });

    it('should list all keys', async () => {
      const keys = await provider.list();
      expect(keys).toContain('api_key');
      expect(keys).toContain('password');
    });

    it('should be case-insensitive', async () => {
      expect(await provider.get('API_KEY')).toBe('test-api-key');
      expect(await provider.get('Api_Key')).toBe('test-api-key');
    });

    it('should set new secret', () => {
      provider.set('new_key', 'new_value');
      expect(provider.get('new_key')).resolves.toBe('new_value');
    });

    it('should delete secret', () => {
      provider.delete('api_key');
      expect(provider.has('api_key')).resolves.toBe(false);
    });

    it('should clear all secrets', () => {
      provider.clear();
      expect(provider.list()).resolves.toHaveLength(0);
    });
  });

  describe('EnvSecretProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should get secret from environment variable', async () => {
      process.env['YAGOKORO_API_KEY'] = 'env-api-key';
      const provider = new EnvSecretProvider('YAGOKORO_');

      const value = await provider.get('api_key');
      expect(value).toBe('env-api-key');
    });

    it('should return undefined for non-existent env var', async () => {
      const provider = new EnvSecretProvider('YAGOKORO_');
      const value = await provider.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should list all matching env vars', async () => {
      process.env['YAGOKORO_KEY1'] = 'value1';
      process.env['YAGOKORO_KEY2'] = 'value2';
      process.env['OTHER_KEY'] = 'other';

      const provider = new EnvSecretProvider('YAGOKORO_');
      const keys = await provider.list();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('other_key');
    });

    it('should use custom prefix', async () => {
      process.env['CUSTOM_SECRET'] = 'custom-value';
      const provider = new EnvSecretProvider('CUSTOM_');

      const value = await provider.get('secret');
      expect(value).toBe('custom-value');
    });
  });

  describe('createSecretManager', () => {
    let provider: InMemorySecretProvider;

    beforeEach(() => {
      provider = new InMemorySecretProvider({
        api_key: 'test-key',
        password: 'test-password',
      });
    });

    it('should get secret from provider', async () => {
      const manager = createSecretManager(provider);
      const value = await manager.get('api_key');
      expect(value).toBe('test-key');
    });

    it('should return default value if secret not found', async () => {
      const manager = createSecretManager(provider, {
        defaults: { missing_key: 'default-value' },
      });

      const value = await manager.get('missing_key');
      expect(value).toBe('default-value');
    });

    it('should throw on getRequired for missing secret', async () => {
      const manager = createSecretManager(provider);

      await expect(manager.getRequired('nonexistent')).rejects.toThrow(
        'Required secret not found: nonexistent'
      );
    });

    it('should return value on getRequired for existing secret', async () => {
      const manager = createSecretManager(provider);
      const value = await manager.getRequired('api_key');
      expect(value).toBe('test-key');
    });

    it('should validate required secrets', async () => {
      const manager = createSecretManager(provider, {
        required: ['api_key', 'password', 'missing'],
      });

      const result = await manager.validate();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('missing');
      expect(result.missing).not.toContain('api_key');
    });

    it('should pass validation when all required secrets exist', async () => {
      const manager = createSecretManager(provider, {
        required: ['api_key', 'password'],
      });

      const result = await manager.validate();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should list all keys', async () => {
      const manager = createSecretManager(provider, {
        defaults: { extra_key: 'extra' },
      });

      const keys = await manager.listKeys();
      expect(keys).toContain('api_key');
      expect(keys).toContain('password');
      expect(keys).toContain('extra_key');
    });

    it('should get metadata', async () => {
      const manager = createSecretManager(provider);
      const meta = await manager.getMetadata('api_key');

      expect(meta).toBeDefined();
      expect(meta?.key).toBe('api_key');
      expect(meta?.source).toBe('env');
    });

    it('should return undefined metadata for non-existent key', async () => {
      const manager = createSecretManager(provider);
      const meta = await manager.getMetadata('nonexistent');
      expect(meta).toBeUndefined();
    });

    it('should mask secret value', async () => {
      const manager = createSecretManager(provider);

      expect(manager.mask('short')).toBe('***');
      expect(manager.mask('12345678')).toBe('1234****5678');
      expect(manager.mask('1234567890123456')).toBe('1234****3456');
    });

    it('should handle needsRotation', async () => {
      const manager = createSecretManager(provider, {
        rotationIntervalDays: 90,
      });

      // Fresh secret shouldn't need rotation
      const needsRotation = await manager.needsRotation('api_key');
      expect(needsRotation).toBe(false);
    });
  });

  describe('SECRET_KEYS', () => {
    it('should have expected keys', () => {
      expect(SECRET_KEYS.NEO4J_PASSWORD).toBe('neo4j_password');
      expect(SECRET_KEYS.OPENAI_API_KEY).toBe('openai_api_key');
      expect(SECRET_KEYS.MCP_API_KEY).toBe('mcp_api_key');
    });
  });
});
