/**
 * @fileoverview Secret Manager
 * TASK-V2-030: Secure secret management for API keys and credentials
 *
 * Provides secure handling of secrets from environment variables,
 * configuration files, or external secret stores.
 */

/**
 * Secret source types
 */
export type SecretSource = 'env' | 'config' | 'vault';

/**
 * Secret metadata
 */
export interface SecretMetadata {
  key: string;
  source: SecretSource;
  encrypted: boolean;
  lastRotated?: Date;
  expiresAt?: Date;
}

/**
 * Secret provider interface
 */
export interface SecretProvider {
  /**
   * Get a secret value
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Check if secret exists
   */
  has(key: string): Promise<boolean>;

  /**
   * List available secret keys
   */
  list(): Promise<string[]>;
}

/**
 * Secret manager configuration
 */
export interface SecretManagerConfig {
  /** Prefix for environment variables (default: 'YAGOKORO_') */
  envPrefix?: string;
  /** Required secrets that must be present */
  required?: string[];
  /** Default values for secrets */
  defaults?: Record<string, string>;
  /** Secret rotation interval in days */
  rotationIntervalDays?: number;
}

/**
 * Secret manager interface
 */
export interface SecretManager {
  /**
   * Get a secret value
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Get a secret value or throw if not found
   */
  getRequired(key: string): Promise<string>;

  /**
   * Get secret metadata
   */
  getMetadata(key: string): Promise<SecretMetadata | undefined>;

  /**
   * Check if all required secrets are present
   */
  validate(): Promise<{ valid: boolean; missing: string[] }>;

  /**
   * List all secret keys (not values)
   */
  listKeys(): Promise<string[]>;

  /**
   * Check if secret is expired or needs rotation
   */
  needsRotation(key: string): Promise<boolean>;

  /**
   * Mask secret value for logging
   */
  mask(value: string): string;
}

/**
 * Environment variable secret provider
 */
export class EnvSecretProvider implements SecretProvider {
  constructor(private readonly prefix: string = 'YAGOKORO_') {}

  async get(key: string): Promise<string | undefined> {
    const envKey = `${this.prefix}${key.toUpperCase()}`;
    return process.env[envKey];
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    const prefixUpper = this.prefix.toUpperCase();

    for (const envKey of Object.keys(process.env)) {
      if (envKey.startsWith(prefixUpper)) {
        keys.push(envKey.substring(prefixUpper.length).toLowerCase());
      }
    }

    return keys;
  }
}

/**
 * In-memory secret provider for testing
 */
export class InMemorySecretProvider implements SecretProvider {
  private readonly secrets = new Map<string, string>();

  constructor(initialSecrets?: Record<string, string>) {
    if (initialSecrets) {
      for (const [key, value] of Object.entries(initialSecrets)) {
        this.secrets.set(key.toLowerCase(), value);
      }
    }
  }

  async get(key: string): Promise<string | undefined> {
    return this.secrets.get(key.toLowerCase());
  }

  async has(key: string): Promise<boolean> {
    return this.secrets.has(key.toLowerCase());
  }

  async list(): Promise<string[]> {
    return Array.from(this.secrets.keys());
  }

  /** Set a secret (for testing) */
  set(key: string, value: string): void {
    this.secrets.set(key.toLowerCase(), value);
  }

  /** Delete a secret (for testing) */
  delete(key: string): void {
    this.secrets.delete(key.toLowerCase());
  }

  /** Clear all secrets (for testing) */
  clear(): void {
    this.secrets.clear();
  }
}

/**
 * Create a secret manager
 */
export function createSecretManager(
  provider: SecretProvider,
  config: SecretManagerConfig = {}
): SecretManager {
  const { required = [], defaults = {}, rotationIntervalDays = 90 } = config;

  // Track metadata for secrets
  const metadata = new Map<string, SecretMetadata>();

  return {
    async get(key: string): Promise<string | undefined> {
      const value = await provider.get(key);
      if (value !== undefined) {
        return value;
      }
      return defaults[key];
    },

    async getRequired(key: string): Promise<string> {
      const value = await this.get(key);
      if (value === undefined) {
        throw new Error(`Required secret not found: ${key}`);
      }
      return value;
    },

    async getMetadata(key: string): Promise<SecretMetadata | undefined> {
      const exists = await provider.has(key);
      if (!exists && !(key in defaults)) {
        return undefined;
      }

      const cached = metadata.get(key);
      if (cached) {
        return cached;
      }

      // Determine source
      const source: SecretSource = (await provider.has(key)) ? 'env' : 'config';

      const meta: SecretMetadata = {
        key,
        source,
        encrypted: false,
      };

      metadata.set(key, meta);
      return meta;
    },

    async validate(): Promise<{ valid: boolean; missing: string[] }> {
      const missing: string[] = [];

      for (const key of required) {
        const value = await this.get(key);
        if (value === undefined) {
          missing.push(key);
        }
      }

      return {
        valid: missing.length === 0,
        missing,
      };
    },

    async listKeys(): Promise<string[]> {
      const providerKeys = await provider.list();
      const defaultKeys = Object.keys(defaults);
      const allKeys = new Set([...providerKeys, ...defaultKeys]);
      return Array.from(allKeys);
    },

    async needsRotation(key: string): Promise<boolean> {
      const meta = await this.getMetadata(key);
      if (!meta?.lastRotated) {
        return false;
      }

      const now = new Date();
      const rotationThreshold = new Date(meta.lastRotated);
      rotationThreshold.setDate(
        rotationThreshold.getDate() + rotationIntervalDays
      );

      return now > rotationThreshold;
    },

    mask(value: string): string {
      if (!value || value.length < 8) {
        return '***';
      }
      // Show first 4 and last 4 characters
      return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
    },
  };
}

// ============================================================================
// Common Secret Keys
// ============================================================================

/**
 * Well-known secret keys used by YAGOKORO
 */
export const SECRET_KEYS = {
  /** Neo4j database password */
  NEO4J_PASSWORD: 'neo4j_password',
  /** Neo4j URI */
  NEO4J_URI: 'neo4j_uri',
  /** OpenAI API key */
  OPENAI_API_KEY: 'openai_api_key',
  /** Azure OpenAI API key */
  AZURE_OPENAI_KEY: 'azure_openai_key',
  /** MCP server API key */
  MCP_API_KEY: 'mcp_api_key',
  /** Encryption key for data at rest */
  ENCRYPTION_KEY: 'encryption_key',
  /** JWT secret for token signing */
  JWT_SECRET: 'jwt_secret',
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];
