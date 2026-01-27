/**
 * Error Logging Module
 * 
 * Provides comprehensive error logging with stack traces, context preservation,
 * and recovery instruction generation for migration operations.
 * 
 * Requirements: 2.4, 9.3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationLogger } from '../utils/migrationLogger.js';
import {
  MigrationError,
  MigrationValidationError,
  DatabaseConnectionError,
  CriticalMigrationError,
  classifyError,
  isRecoverableError,
  isRetryableError,
  formatErrorForLogging
} from './MigrationErrors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ErrorLogger class for comprehensive error logging
 * 
 * Handles logging of migration errors with full context, stack traces,
 * and recovery instructions.
 */
export class ErrorLogger {
  constructor(options = {}) {
    this.logger = options.logger || new MigrationLogger();
    this.errorLogDirectory = options.errorLogDirectory || 'logs/migrations/errors';
    this.generateRecoveryFiles = options.generateRecoveryFiles !== undefined 
      ? options.generateRecoveryFiles 
      : true;
    
    // Ensure error log directory exists
    this.ensureErrorLogDirectory();
    
    // Track errors for reporting
    this.errorHistory = [];
  }

  /**
   * Ensure error log directory exists
   */
  ensureErrorLogDirectory() {
    const errorLogPath = path.resolve(this.errorLogDirectory);
    if (!fs.existsSync(errorLogPath)) {
      fs.mkdirSync(errorLogPath, { recursive: true });
    }
  }

  /**
   * Log error with full context and stack trace
   * 
   * Requirements: 2.4, 9.3 - Log errors with full context and stack traces
   * 
   * @param {Error} error - Error to log
   * @param {Object} context - Additional context information
   * @param {Object} options - Logging options
   */
  logError(error, context = {}, options = {}) {
    const errorType = classifyError(error);
    const timestamp = new Date();
    
    // Build comprehensive error log entry
    const errorEntry = {
      timestamp: timestamp.toISOString(),
      errorType,
      error: formatErrorForLogging(error),
      context: {
        ...context,
        tenantId: context.tenantId || 'unknown',
        operation: context.operation || 'unknown',
        phase: context.phase || 'unknown'
      },
      classification: {
        recoverable: isRecoverableError(error),
        retryable: isRetryableError(error),
        requiresManualIntervention: error instanceof CriticalMigrationError
      },
      stackTrace: error.stack,
      originalError: error.originalError ? {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack
      } : null
    };

    // Add error to history
    this.errorHistory.push(errorEntry);

    // Log to console and file via MigrationLogger
    this.logger.error(
      `${errorType.toUpperCase()} ERROR: ${error.message}`,
      error,
      errorEntry.context
    );

    // Log stack trace separately for better visibility
    if (error.stack) {
      this.logger.debug('Stack trace:', { stack: error.stack });
    }

    // Log original error stack if present
    if (error.originalError && error.originalError.stack) {
      this.logger.debug('Original error stack trace:', { 
        stack: error.originalError.stack 
      });
    }

    // Log context details
    if (Object.keys(context).length > 0) {
      this.logger.info('Error context:', context);
    }

    // Log recovery information
    if (error instanceof MigrationError) {
      this.logger.info('Error classification:', {
        recoverable: error.recoverable,
        retryable: error.retryable
      });
    }

    // Write detailed error file
    if (options.writeDetailedLog !== false) {
      this.writeDetailedErrorLog(errorEntry, timestamp);
    }

    // Generate recovery instructions for critical errors
    if (error instanceof CriticalMigrationError && this.generateRecoveryFiles) {
      this.generateRecoveryInstructions(error, context, timestamp);
    }

    return errorEntry;
  }

  /**
   * Log validation error with detailed validation report
   * 
   * @param {MigrationValidationError} error - Validation error
   * @param {Object} context - Additional context
   */
  logValidationError(error, context = {}) {
    this.logError(error, {
      ...context,
      operation: 'validation',
      phase: 'pre-migration'
    });

    // Log validation report if available
    if (error instanceof MigrationValidationError) {
      const report = error.getValidationReport();
      
      this.logger.error('Validation Report:', {
        summary: report.summary,
        errorCount: report.errors.length,
        failedRecordCount: report.failedRecords.length
      });

      // Log first few validation errors
      if (report.errors.length > 0) {
        this.logger.error('Sample validation errors:');
        report.errors.slice(0, 10).forEach((err, index) => {
          this.logger.error(`  ${index + 1}. ${err.message}`, {
            type: err.type,
            field: err.field,
            tenantId: err.tenantId
          });
        });
      }

      // Write full validation report to file
      this.writeValidationReport(error, report);
    }
  }

  /**
   * Log database connection error with connection details
   * 
   * @param {DatabaseConnectionError} error - Connection error
   * @param {Object} context - Additional context
   */
  logConnectionError(error, context = {}) {
    this.logError(error, {
      ...context,
      operation: 'database_connection',
      phase: 'initialization'
    });

    // Log connection-specific details
    if (error instanceof DatabaseConnectionError) {
      this.logger.error('Connection details:', {
        database: error.database,
        errorCode: error.context.errorCode,
        retryable: error.isRetryable()
      });

      // Log recovery instructions
      const instructions = error.getRecoveryInstructions();
      this.logger.info('Recovery instructions:');
      instructions.forEach((instruction, index) => {
        this.logger.info(`  ${index + 1}. ${instruction}`);
      });
    }
  }

  /**
   * Log critical error with incident report
   * 
   * Requirements: 2.4, 9.3 - Generate recovery instructions on critical failures
   * 
   * @param {CriticalMigrationError} error - Critical error
   * @param {Object} context - Additional context
   */
  logCriticalError(error, context = {}) {
    this.logError(error, {
      ...context,
      operation: 'critical_failure',
      severity: 'CRITICAL'
    });

    // Log critical error banner
    this.logger.error('='.repeat(80));
    this.logger.error('🚨 CRITICAL MIGRATION ERROR 🚨');
    this.logger.error('='.repeat(80));
    this.logger.error(error.getUserMessage());
    this.logger.error('='.repeat(80));

    // Generate and log incident report
    if (error instanceof CriticalMigrationError) {
      const incidentReport = error.generateIncidentReport();
      
      this.logger.error('Incident Report:', {
        severity: incidentReport.severity,
        phase: incidentReport.error.phase,
        operation: incidentReport.error.operation,
        rollbackAttempted: incidentReport.rollback.attempted,
        rollbackSucceeded: incidentReport.rollback.succeeded,
        affectedRecords: incidentReport.affectedRecords,
        requiresManualIntervention: incidentReport.requiresManualIntervention
      });

      // Write incident report to file
      this.writeIncidentReport(incidentReport);

      // Log recovery instructions
      this.logger.error('Recovery Instructions:');
      incidentReport.recoveryInstructions.forEach(instruction => {
        this.logger.error(instruction);
      });
    }
  }

  /**
   * Write detailed error log to file
   * 
   * @param {Object} errorEntry - Error entry to write
   * @param {Date} timestamp - Error timestamp
   */
  writeDetailedErrorLog(errorEntry, timestamp) {
    try {
      const filename = `error-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.errorLogDirectory, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(errorEntry, null, 2));
      
      this.logger.debug(`Detailed error log written to: ${filepath}`);
    } catch (writeError) {
      this.logger.error('Failed to write detailed error log:', writeError);
    }
  }

  /**
   * Write validation report to file
   * 
   * @param {MigrationValidationError} error - Validation error
   * @param {Object} report - Validation report
   */
  writeValidationReport(error, report) {
    try {
      const timestamp = error.timestamp || new Date();
      const filename = `validation-report-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.errorLogDirectory, filename);
      
      const fullReport = {
        timestamp: timestamp.toISOString(),
        errorMessage: error.message,
        summary: report.summary,
        errors: report.errors,
        failedRecords: report.failedRecords,
        recoveryInstructions: error.getRecoveryInstructions()
      };
      
      fs.writeFileSync(filepath, JSON.stringify(fullReport, null, 2));
      
      this.logger.info(`Validation report written to: ${filepath}`);
    } catch (writeError) {
      this.logger.error('Failed to write validation report:', writeError);
    }
  }

  /**
   * Write incident report to file
   * 
   * @param {Object} incidentReport - Incident report
   */
  writeIncidentReport(incidentReport) {
    try {
      const timestamp = new Date(incidentReport.timestamp);
      const filename = `incident-report-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.errorLogDirectory, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(incidentReport, null, 2));
      
      this.logger.error(`Incident report written to: ${filepath}`);
    } catch (writeError) {
      this.logger.error('Failed to write incident report:', writeError);
    }
  }

  /**
   * Generate recovery instructions file
   * 
   * Requirements: 2.4, 9.3 - Generate recovery instructions on critical failures
   * 
   * @param {CriticalMigrationError} error - Critical error
   * @param {Object} context - Error context
   * @param {Date} timestamp - Error timestamp
   */
  generateRecoveryInstructions(error, context, timestamp) {
    try {
      const filename = `RECOVERY-INSTRUCTIONS-${timestamp.toISOString().replace(/[:.]/g, '-')}.txt`;
      const filepath = path.join(this.errorLogDirectory, filename);
      
      const instructions = error.getRecoveryInstructions();
      const content = [
        '='.repeat(80),
        'MIGRATION RECOVERY INSTRUCTIONS',
        '='.repeat(80),
        '',
        `Timestamp: ${timestamp.toISOString()}`,
        `Error: ${error.name}`,
        `Message: ${error.message}`,
        '',
        '='.repeat(80),
        'RECOVERY STEPS',
        '='.repeat(80),
        '',
        ...instructions,
        '',
        '='.repeat(80),
        'ERROR DETAILS',
        '='.repeat(80),
        '',
        `Phase: ${context.phase || 'unknown'}`,
        `Operation: ${context.operation || 'unknown'}`,
        `Tenant ID: ${context.tenantId || 'unknown'}`,
        '',
        'Stack Trace:',
        error.stack,
        '',
        '='.repeat(80),
        'LOG FILES',
        '='.repeat(80),
        '',
        `Error log: ${this.errorLogDirectory}`,
        `Migration log: ${this.logger.getLogFilePath()}`,
        `Error details: ${filepath.replace('.txt', '.json')}`,
        '',
        '='.repeat(80),
        'END OF RECOVERY INSTRUCTIONS',
        '='.repeat(80)
      ].join('\n');
      
      fs.writeFileSync(filepath, content);
      
      this.logger.error(`Recovery instructions written to: ${filepath}`);
      this.logger.error('Please follow the recovery instructions immediately.');
    } catch (writeError) {
      this.logger.error('Failed to write recovery instructions:', writeError);
    }
  }

  /**
   * Get error summary for reporting
   * 
   * @returns {Object} Error summary
   */
  getErrorSummary() {
    const summary = {
      totalErrors: this.errorHistory.length,
      errorsByType: {},
      recoverableErrors: 0,
      retryableErrors: 0,
      criticalErrors: 0
    };

    this.errorHistory.forEach(entry => {
      // Count by type
      summary.errorsByType[entry.errorType] = 
        (summary.errorsByType[entry.errorType] || 0) + 1;
      
      // Count by classification
      if (entry.classification.recoverable) {
        summary.recoverableErrors++;
      }
      if (entry.classification.retryable) {
        summary.retryableErrors++;
      }
      if (entry.classification.requiresManualIntervention) {
        summary.criticalErrors++;
      }
    });

    return summary;
  }

  /**
   * Write error summary report
   * 
   * @returns {string} Path to summary report file
   */
  writeErrorSummary() {
    try {
      const summary = this.getErrorSummary();
      const timestamp = new Date();
      const filename = `error-summary-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.errorLogDirectory, filename);
      
      const report = {
        timestamp: timestamp.toISOString(),
        summary,
        errors: this.errorHistory
      };
      
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      
      this.logger.info(`Error summary written to: ${filepath}`);
      
      return filepath;
    } catch (writeError) {
      this.logger.error('Failed to write error summary:', writeError);
      return null;
    }
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Get all logged errors
   * 
   * @returns {Array} Array of error entries
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }
}

/**
 * Create a singleton error logger instance
 */
let errorLoggerInstance = null;

/**
 * Get or create error logger instance
 * 
 * @param {Object} options - Logger options
 * @returns {ErrorLogger} Error logger instance
 */
export function getErrorLogger(options = {}) {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger(options);
  }
  return errorLoggerInstance;
}

/**
 * Reset error logger instance (useful for testing)
 */
export function resetErrorLogger() {
  errorLoggerInstance = null;
}
