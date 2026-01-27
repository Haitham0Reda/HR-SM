/**
 * Migration Error Classes
 * 
 * Custom error classes for migration failures with proper error handling,
 * context preservation, and recovery instructions.
 * 
 * Requirements: 2.4
 */

/**
 * Base class for all migration errors
 * Provides common functionality for error handling and logging
 */
export class MigrationError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'MigrationError';
    this.originalError = originalError;
    this.timestamp = new Date();
    this.recoverable = false;
    this.retryable = false;
    this.context = {};

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Chain stack traces if original error exists
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Add context information to the error
   * @param {Object} context - Additional context information
   * @returns {MigrationError} This error instance for chaining
   */
  addContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Get full error details for logging
   * @returns {Object} Complete error information
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      retryable: this.retryable,
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null,
      stack: this.stack
    };
  }

  /**
   * Get a user-friendly error message
   * @returns {string} Formatted error message
   */
  getUserMessage() {
    return this.message;
  }

  /**
   * Get recovery instructions
   * @returns {string[]} Array of recovery steps
   */
  getRecoveryInstructions() {
    return [
      'Review the error logs for detailed information',
      'Check the migration configuration',
      'Verify database connections',
      'Contact support if the issue persists'
    ];
  }
}

/**
 * MigrationValidationError
 * 
 * Thrown when data validation fails during migration.
 * This error indicates that the data does not meet the required
 * quality standards and the migration should not proceed.
 * 
 * Requirements: 2.4
 */
export class MigrationValidationError extends MigrationError {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MigrationValidationError';
    this.details = details;
    this.recoverable = false; // Cannot recover from validation errors
    this.retryable = false; // Retrying won't fix validation issues
    
    // Add validation-specific context
    this.context = {
      validationType: details.validationType || 'unknown',
      failedRecords: details.failedRecords || [],
      validationErrors: details.validationErrors || [],
      totalRecords: details.totalRecords || 0,
      invalidRecords: details.invalidRecords || 0
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    const { invalidRecords, totalRecords } = this.context;
    return `Data validation failed: ${invalidRecords} of ${totalRecords} records are invalid. ${this.message}`;
  }

  /**
   * Get recovery instructions specific to validation errors
   */
  getRecoveryInstructions() {
    return [
      'Review the validation errors in the error log',
      'Fix the data quality issues in the source database',
      'Common issues:',
      '  - Missing required fields (tenantId, name, status)',
      '  - Invalid data types or formats',
      '  - Duplicate tenantIds or domains',
      '  - Invalid enum values',
      'Run the migration again after fixing the data',
      'Use --dry-run flag to validate without making changes'
    ];
  }

  /**
   * Get detailed validation report
   */
  getValidationReport() {
    return {
      summary: {
        totalRecords: this.context.totalRecords,
        invalidRecords: this.context.invalidRecords,
        validationErrors: this.context.validationErrors.length
      },
      errors: this.context.validationErrors.slice(0, 50), // Limit to first 50 errors
      failedRecords: this.context.failedRecords.slice(0, 20) // Limit to first 20 records
    };
  }
}

/**
 * DatabaseConnectionError
 * 
 * Thrown when database connection fails.
 * This error is recoverable and retryable as connection issues
 * are often temporary.
 * 
 * Requirements: 2.4
 */
export class DatabaseConnectionError extends MigrationError {
  constructor(database, originalError = null) {
    super(`Failed to connect to database: ${database}`);
    this.name = 'DatabaseConnectionError';
    this.database = database;
    this.originalError = originalError;
    this.recoverable = true; // Connection issues can be recovered
    this.retryable = true; // Can retry connection
    
    // Add connection-specific context
    this.context = {
      database,
      connectionString: this.sanitizeConnectionString(database),
      errorCode: originalError?.code,
      errorMessage: originalError?.message
    };
  }

  /**
   * Sanitize connection string to remove sensitive information
   */
  sanitizeConnectionString(database) {
    if (typeof database === 'string') {
      // Remove password from connection string
      return database.replace(/:[^:@]+@/, ':****@');
    }
    return database;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    const { database, errorCode } = this.context;
    let message = `Cannot connect to database: ${database}`;
    
    if (errorCode) {
      message += ` (Error code: ${errorCode})`;
    }
    
    return message;
  }

  /**
   * Get recovery instructions specific to connection errors
   */
  getRecoveryInstructions() {
    const instructions = [
      'Verify database connection details:',
      '  - Check hostname/IP address',
      '  - Verify port number',
      '  - Confirm database name',
      '  - Validate credentials',
      'Check network connectivity:',
      '  - Ensure database server is reachable',
      '  - Verify firewall rules',
      '  - Check VPN connection if required',
      'Verify database server status:',
      '  - Ensure database server is running',
      '  - Check for maintenance windows',
      '  - Review database server logs'
    ];

    // Add error-specific instructions
    if (this.context.errorCode === 'ECONNREFUSED') {
      instructions.push('Connection refused - database server may not be running');
    } else if (this.context.errorCode === 'ETIMEDOUT') {
      instructions.push('Connection timeout - check network connectivity and firewall rules');
    } else if (this.context.errorCode === 'ENOTFOUND') {
      instructions.push('Host not found - verify hostname/IP address');
    } else if (this.context.errorCode === 'EAUTH') {
      instructions.push('Authentication failed - verify username and password');
    }

    instructions.push('Retry the migration after resolving connection issues');

    return instructions;
  }

  /**
   * Check if error is retryable based on error code
   */
  isRetryable() {
    const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ENOTFOUND'];
    return this.retryable && retryableErrors.includes(this.context.errorCode);
  }
}

/**
 * CriticalMigrationError
 * 
 * Thrown when a critical, unrecoverable error occurs during migration.
 * This error indicates that the migration has failed in a way that
 * requires manual intervention and cannot be automatically recovered.
 * 
 * Requirements: 2.4
 */
export class CriticalMigrationError extends MigrationError {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CriticalMigrationError';
    this.details = details;
    this.recoverable = false; // Critical errors cannot be automatically recovered
    this.retryable = false; // Should not retry without manual intervention
    this.requiresManualIntervention = true;
    
    // Add critical error context
    this.context = {
      phase: details.phase || 'unknown',
      operation: details.operation || 'unknown',
      affectedRecords: details.affectedRecords || [],
      systemState: details.systemState || 'unknown',
      rollbackAttempted: details.rollbackAttempted || false,
      rollbackSucceeded: details.rollbackSucceeded || false,
      originalError: details.originalError,
      rollbackError: details.rollbackError
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    const { phase, operation, rollbackAttempted, rollbackSucceeded } = this.context;
    
    let message = `CRITICAL ERROR: Migration failed during ${phase} phase (${operation}). `;
    
    if (rollbackAttempted) {
      if (rollbackSucceeded) {
        message += 'Automatic rollback completed successfully. System restored to previous state.';
      } else {
        message += 'AUTOMATIC ROLLBACK FAILED. Manual intervention required immediately.';
      }
    } else {
      message += 'Manual intervention required.';
    }
    
    return message;
  }

  /**
   * Get recovery instructions specific to critical errors
   */
  getRecoveryInstructions() {
    const { rollbackAttempted, rollbackSucceeded, phase } = this.context;
    
    const instructions = [
      '⚠️  CRITICAL ERROR - IMMEDIATE ACTION REQUIRED ⚠️',
      '',
      'This is a critical migration failure that requires manual intervention.'
    ];

    if (rollbackAttempted && !rollbackSucceeded) {
      instructions.push(
        '',
        '🚨 ROLLBACK FAILED - DATA INTEGRITY AT RISK 🚨',
        '',
        'The automatic rollback failed. Follow these steps immediately:',
        '',
        '1. DO NOT attempt to run the migration again',
        '2. DO NOT make any manual changes to the databases',
        '3. Contact the database administrator immediately',
        '4. Preserve all log files for investigation:',
        `   - Migration log: logs/migrations/${this.timestamp.toISOString()}.log`,
        `   - Error log: logs/migrations/${this.timestamp.toISOString()}-errors.log`,
        '5. Review the backup files in backups/migrations/',
        '6. Follow the manual recovery procedure:',
        '   a. Stop all application services',
        '   b. Verify database state',
        '   c. Restore from backup if necessary',
        '   d. Validate data integrity',
        '   e. Resume services only after validation',
        '',
        '7. Document all actions taken for audit purposes'
      );
    } else if (rollbackAttempted && rollbackSucceeded) {
      instructions.push(
        '',
        '✓ Automatic rollback completed successfully',
        '✓ System restored to previous state',
        '',
        'Next steps:',
        '1. Review the error logs to identify the root cause',
        '2. Fix the underlying issue',
        '3. Verify database connections and permissions',
        '4. Run migration in dry-run mode to validate',
        '5. Attempt migration again after resolving issues'
      );
    } else {
      instructions.push(
        '',
        'Recovery steps:',
        '1. Review the error logs for detailed information',
        '2. Identify the root cause of the failure',
        '3. Check database state and integrity',
        '4. If data corruption is suspected:',
        '   a. Stop all application services',
        '   b. Restore from backup',
        '   c. Validate data integrity',
        '5. Fix the underlying issue before retrying',
        '6. Consider running in dry-run mode first'
      );
    }

    instructions.push(
      '',
      'For assistance, contact:',
      '  - Database Administrator',
      '  - Platform Engineering Team',
      '  - Include all log files and error details'
    );

    return instructions;
  }

  /**
   * Generate detailed incident report
   */
  generateIncidentReport() {
    return {
      severity: 'CRITICAL',
      timestamp: this.timestamp.toISOString(),
      error: {
        name: this.name,
        message: this.message,
        phase: this.context.phase,
        operation: this.context.operation
      },
      systemState: this.context.systemState,
      rollback: {
        attempted: this.context.rollbackAttempted,
        succeeded: this.context.rollbackSucceeded,
        error: this.context.rollbackError
      },
      affectedRecords: this.context.affectedRecords.length,
      requiresManualIntervention: this.requiresManualIntervention,
      recoveryInstructions: this.getRecoveryInstructions(),
      originalError: this.context.originalError ? {
        name: this.context.originalError.name,
        message: this.context.originalError.message,
        stack: this.context.originalError.stack
      } : null
    };
  }
}

/**
 * Helper function to determine error type from an error object
 * @param {Error} error - Error to classify
 * @returns {string} Error type classification
 */
export function classifyError(error) {
  if (error instanceof MigrationValidationError) {
    return 'validation';
  } else if (error instanceof DatabaseConnectionError) {
    return 'connection';
  } else if (error instanceof CriticalMigrationError) {
    return 'critical';
  } else if (error instanceof MigrationError) {
    return 'migration';
  } else {
    return 'unknown';
  }
}

/**
 * Helper function to check if an error is recoverable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is recoverable
 */
export function isRecoverableError(error) {
  if (error instanceof MigrationError) {
    return error.recoverable;
  }
  return false;
}

/**
 * Helper function to check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
export function isRetryableError(error) {
  if (error instanceof MigrationError) {
    return error.retryable;
  }
  return false;
}

/**
 * Helper function to format error for logging
 * @param {Error} error - Error to format
 * @returns {Object} Formatted error object
 */
export function formatErrorForLogging(error) {
  if (error instanceof MigrationError) {
    return error.toJSON();
  }
  
  return {
    name: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
}
