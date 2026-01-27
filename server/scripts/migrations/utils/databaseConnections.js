/**
 * Database Connection Utilities
 * 
 * Manages connections to both source (hrsm_platform) and destination (hrsm-licenses) databases.
 * Provides connection pooling, health checks, and graceful disconnection.
 * 
 * Requirements: 2.1, 9.1
 */

import mongoose from 'mongoose';
import { DatabaseConnectionError } from '../errors/MigrationErrors.js';

export class DatabaseConnections {
  constructor(config) {
    this.config = config;
    this.sourceConnection = null;
    this.destinationConnection = null;
    this.isConnected = false;
  }

  /**
   * Establish connections to both databases
   * @throws {Error} If connection fails
   */
  async connect() {
    try {
      // Connect to source database (hrsm_platform)
      this.sourceConnection = await this.connectToDatabase(
        this.config.sourceDatabase,
        this.config.getSourceConnectionOptions(),
        'source'
      );

      // Connect to destination database (hrsm-licenses)
      this.destinationConnection = await this.connectToDatabase(
        this.config.destinationDatabase,
        this.config.getDestinationConnectionOptions(),
        'destination'
      );

      this.isConnected = true;
    } catch (error) {
      // Cleanup partial connections on failure
      await this.disconnect();
      throw new DatabaseConnectionError('Failed to establish database connections', error);
    }
  }

  /**
   * Connect to a specific database
   * @param {string} uri - MongoDB connection URI
   * @param {object} options - Connection options
   * @param {string} label - Connection label for logging
   * @returns {mongoose.Connection} Mongoose connection instance
   */
  async connectToDatabase(uri, options, label) {
    try {
      console.log(`[${label}] Connecting to database...`);
      console.log(`[${label}] URI: ${this.maskUri(uri)}`);
      
      const connection = await mongoose.createConnection(uri, options).asPromise();

      // Set up connection event handlers
      this.setupConnectionHandlers(connection, label);

      console.log(`[${label}] Connected successfully`);
      return connection;
    } catch (error) {
      console.error(`[${label}] Connection failed:`, error.message);
      throw new DatabaseConnectionError(
        `Failed to connect to ${label} database: ${error.message}`,
        error
      );
    }
  }

  /**
   * Mask sensitive information in URI
   */
  maskUri(uri) {
    return uri.replace(/:([^@]+)@/, ':****@');
  }

  /**
   * Set up event handlers for a database connection
   * @param {mongoose.Connection} connection - Mongoose connection
   * @param {string} label - Connection label
   */
  setupConnectionHandlers(connection, label) {
    connection.on('error', (error) => {
      console.error(`[${label}] Database connection error:`, error.message);
    });

    connection.on('disconnected', () => {
      console.warn(`[${label}] Database disconnected`);
    });

    connection.on('reconnected', () => {
      console.log(`[${label}] Database reconnected`);
    });
  }

  /**
   * Validate that both connections are healthy
   * @throws {Error} If validation fails
   */
  async validateConnections() {
    if (!this.isConnected) {
      throw new Error('Connections not established');
    }

    try {
      // Validate source connection
      await this.validateConnection(this.sourceConnection, 'source');

      // Validate destination connection
      await this.validateConnection(this.destinationConnection, 'destination');
    } catch (error) {
      throw new DatabaseConnectionError('Connection validation failed', error);
    }
  }

  /**
   * Validate a specific connection
   * @param {mongoose.Connection} connection - Connection to validate
   * @param {string} label - Connection label
   */
  async validateConnection(connection, label) {
    if (connection.readyState !== 1) {
      throw new Error(`${label} connection is not ready (state: ${connection.readyState})`);
    }

    // Perform a simple ping operation
    try {
      await connection.db.admin().ping();
    } catch (error) {
      throw new Error(`${label} connection ping failed: ${error.message}`);
    }
  }

  /**
   * Get the source database connection
   * @returns {mongoose.Connection}
   */
  getSourceConnection() {
    if (!this.sourceConnection) {
      throw new Error('Source connection not established');
    }
    return this.sourceConnection;
  }

  /**
   * Get the destination database connection
   * @returns {mongoose.Connection}
   */
  getDestinationConnection() {
    if (!this.destinationConnection) {
      throw new Error('Destination connection not established');
    }
    return this.destinationConnection;
  }

  /**
   * Get the source database instance
   * @returns {mongoose.mongo.Db}
   */
  getSourceDb() {
    return this.getSourceConnection().db;
  }

  /**
   * Get the destination database instance
   * @returns {mongoose.mongo.Db}
   */
  getDestinationDb() {
    return this.getDestinationConnection().db;
  }

  /**
   * Check if connections are established
   * @returns {boolean}
   */
  isConnectionEstablished() {
    return this.isConnected && 
           this.sourceConnection?.readyState === 1 && 
           this.destinationConnection?.readyState === 1;
  }

  /**
   * Get connection health status
   * @returns {object} Health status for both connections
   */
  getHealthStatus() {
    return {
      source: {
        connected: this.sourceConnection?.readyState === 1,
        readyState: this.sourceConnection?.readyState,
        host: this.sourceConnection?.host,
        name: this.sourceConnection?.name
      },
      destination: {
        connected: this.destinationConnection?.readyState === 1,
        readyState: this.destinationConnection?.readyState,
        host: this.destinationConnection?.host,
        name: this.destinationConnection?.name
      }
    };
  }

  /**
   * Disconnect from both databases
   */
  async disconnect() {
    const errors = [];

    // Close source connection
    if (this.sourceConnection) {
      try {
        await this.sourceConnection.close();
        this.sourceConnection = null;
      } catch (error) {
        errors.push({ connection: 'source', error });
      }
    }

    // Close destination connection
    if (this.destinationConnection) {
      try {
        await this.destinationConnection.close();
        this.destinationConnection = null;
      } catch (error) {
        errors.push({ connection: 'destination', error });
      }
    }

    this.isConnected = false;

    // Report any errors during disconnection
    if (errors.length > 0) {
      console.warn('Errors during disconnection:', errors);
    }
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise<any>} Result of the function
   */
  async withRetry(fn, operationName) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(
          `${operationName} failed (attempt ${attempt}/${this.config.maxRetries}):`,
          error.message
        );

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.config.maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Delay execution for a specified time
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
