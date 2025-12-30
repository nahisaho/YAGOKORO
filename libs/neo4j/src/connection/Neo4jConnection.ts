import neo4j, { type Driver, type Session, type SessionConfig } from 'neo4j-driver';
import {
  Neo4jConfigError,
  Neo4jNotConnectedError,
  Neo4jConnectionError,
} from '@yagokoro/domain';

/**
 * Neo4j connection configuration
 */
export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
  connectionAcquisitionTimeout?: number;
}

/**
 * Neo4j Connection Manager
 *
 * Manages the Neo4j driver instance and provides session management.
 */
export class Neo4jConnection {
  private driver: Driver | null = null;
  private readonly config: Neo4jConfig;

  constructor(config: Neo4jConfig) {
    this.config = {
      database: 'neo4j',
      maxConnectionPoolSize: 100,
      connectionAcquisitionTimeout: 30000,
      ...config,
    };
  }

  /**
   * Create connection from URI and credentials
   */
  static fromUri(
    uri: string,
    username: string,
    password: string,
    database?: string
  ): Neo4jConnection {
    const config: Neo4jConfig = { uri, username, password };
    if (database) {
      config.database = database;
    }
    return new Neo4jConnection(config);
  }

  /**
   * Create connection from environment variables
   */
  static fromEnv(): Neo4jConnection {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;
    const database = process.env.NEO4J_DATABASE;

    const missing: string[] = [];
    if (!uri) missing.push('NEO4J_URI');
    if (!username) missing.push('NEO4J_USERNAME');
    if (!password) missing.push('NEO4J_PASSWORD');

    if (missing.length > 0) {
      throw new Neo4jConfigError(missing);
    }

    const config: Neo4jConfig = { uri: uri!, username: username!, password: password! };
    if (database) {
      config.database = database;
    }
    return new Neo4jConnection(config);
  }

  /**
   * Connect to Neo4j
   */
  async connect(): Promise<void> {
    if (this.driver) {
      return;
    }

    try {
      const driverConfig: { maxConnectionPoolSize?: number; connectionAcquisitionTimeout?: number } = {};
      if (this.config.maxConnectionPoolSize) {
        driverConfig.maxConnectionPoolSize = this.config.maxConnectionPoolSize;
      }
      if (this.config.connectionAcquisitionTimeout) {
        driverConfig.connectionAcquisitionTimeout = this.config.connectionAcquisitionTimeout;
      }
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        driverConfig
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();
    } catch (error) {
      this.driver = null;
      throw new Neo4jConnectionError(
        `Failed to connect to Neo4j at ${this.config.uri}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.driver !== null;
  }

  /**
   * Get the driver instance
   */
  getDriver(): Driver {
    if (!this.driver) {
      throw new Neo4jNotConnectedError();
    }
    return this.driver;
  }

  /**
   * Get a session for read operations
   */
  getReadSession(): Session {
    const config: SessionConfig = {
      defaultAccessMode: neo4j.session.READ,
    };
    if (this.config.database) {
      config.database = this.config.database;
    }
    return this.getDriver().session(config);
  }

  /**
   * Get a session for write operations
   */
  getWriteSession(): Session {
    const config: SessionConfig = {
      defaultAccessMode: neo4j.session.WRITE,
    };
    if (this.config.database) {
      config.database = this.config.database;
    }
    return this.getDriver().session(config);
  }

  /**
   * Execute a query with automatic session management
   */
  async executeRead<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    const session = this.getReadSession();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query with automatic session management
   */
  async executeWrite<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    const session = this.getWriteSession();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }
}
