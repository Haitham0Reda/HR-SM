/**
 * Migration Configuration Management
 * 
 * Manages configuration parameters for the platform data migration.
 * Provides defaults and validation for migration settings.
 * 
 * Requirements: 2.1, 9.1
 */

export class MigrationConfig {
  constructor(options = {}) {
    // Source database (main application)
    this.sourceDatabase = options.sourceDatabase || 
      process.env.MONGODB_URI || 
      'mongodb://localhost:27017/hrsm_platform';

    // Destination database (license server)
    this.destinationDatabase = options.destinationDatabase || 
      process.env.LICENSE_SERVER_MONGODB_URI || 
      'mongodb://localhost:27017/hrsm-licenses';

    // Migration options
    this.dryRun = options.dryRun !== undefined ? options.dryRun : false;
    this.batchSize = options.batchSize || 100;
    this.backupBeforeMigration = options.backupBeforeMigration !== undefined ? 
      options.backupBeforeMigration : true;

    // Timeout settings (in milliseconds)
    this.connectionTimeout = options.connectionTimeout || 30000; // 30 seconds
    this.operationTimeout = options.operationTimeout || 60000; // 60 seconds

    // Retry settings
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds

    // Logging settings
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.logToFile = options.logToFile !== undefined ? options.logToFile : true;
    this.logDirectory = options.logDirectory || 'logs/migrations';

    // Validation settings
    this.validateBeforeMigration = options.validateBeforeMigration !== undefined ? 
      options.validateBeforeMigration : true;
    this.validateAfterMigration = options.validateAfterMigration !== undefined ? 
      options.validateAfterMigration : true;

    // Collections to migrate
    this.collectionsToMigrate = options.collectionsToMigrate || [
      'tenants',
      'subscriptions',
      'enabled_modules'
    ];

    // Validate configuration
    this.validate();
  }

  /**
   * Validate configuration parameters
   * @throws {Error} If configuration is invalid
   */
  validate() {
    if (!this.sourceDatabase) {
      throw new Error('Source database URI is required');
    }

    if (!this.destinationDatabase) {
      throw new Error('Destination database URI is required');
    }

    if (this.sourceDatabase === this.destinationDatabase) {
      throw new Error('Source and destination databases must be different');
    }

    if (this.batchSize < 1) {
      throw new Error('Batch size must be at least 1');
    }

    if (this.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }

    if (this.connectionTimeout < 1000) {
      throw new Error('Connection timeout must be at least 1000ms');
    }
  }

  /**
   * Get MongoDB connection options for source database
   */
  getSourceConnectionOptions() {
    return {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: this.connectionTimeout,
      socketTimeoutMS: this.operationTimeout,
      connectTimeoutMS: this.connectionTimeout,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        journal: true
      }
    };
  }

  /**
   * Get MongoDB connection options for destination database
   */
  getDestinationConnectionOptions() {
    return {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: this.connectionTimeout,
      socketTimeoutMS: this.operationTimeout,
      connectTimeoutMS: this.connectionTimeout,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        journal: true
      }
    };
  }

  /**
   * Get configuration summary for logging
   */
  getSummary() {
    return {
      sourceDatabase: this.maskConnectionString(this.sourceDatabase),
      destinationDatabase: this.maskConnectionString(this.destinationDatabase),
      dryRun: this.dryRun,
      batchSize: this.batchSize,
      backupBeforeMigration: this.backupBeforeMigration,
      validateBeforeMigration: this.validateBeforeMigration,
      validateAfterMigration: this.validateAfterMigration,
      collectionsToMigrate: this.collectionsToMigrate,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Mask sensitive information in connection strings
   * @param {string} connectionString - MongoDB connection string
   * @returns {string} Masked connection string
   */
  maskConnectionString(connectionString) {
    // Replace password in connection string with asterisks
    return connectionString.replace(/:([^@]+)@/, ':****@');
  }

  /**
   * Check if running in dry-run mode
   */
  isDryRun() {
    return this.dryRun;
  }

  /**
   * Check if backup is required before migration
   */
  shouldBackup() {
    return this.backupBeforeMigration;
  }

  /**
   * Check if validation is required before migration
   */
  shouldValidateBeforeMigration() {
    return this.validateBeforeMigration;
  }

  /**
   * Check if validation is required after migration
   */
  shouldValidateAfterMigration() {
    return this.validateAfterMigration;
  }
}
