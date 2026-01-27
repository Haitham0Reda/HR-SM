/**
 * Migration Logging Infrastructure
 * 
 * Provides comprehensive logging for migration operations including:
 * - Console output with color coding
 * - File-based logging with rotation
 * - Structured logging for audit purposes
 * - Migration progress tracking
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MigrationLogger {
  constructor(options = {}) {
    this.logDirectory = options.logDirectory || 'logs/migrations';
    this.logLevel = options.logLevel || 'info';
    this.migrationId = this.generateMigrationId();
    
    // Ensure log directory exists
    this.ensureLogDirectory();

    // Create Winston logger
    this.logger = this.createLogger();

    // Track migration statistics
    this.stats = {
      startTime: null,
      endTime: null,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: []
    };
  }

  /**
   * Generate a unique migration ID
   */
  generateMigrationId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `migration-${timestamp}`;
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logPath = path.resolve(this.logDirectory);
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
  }

  /**
   * Create Winston logger instance
   */
  createLogger() {
    const logFilePath = path.join(this.logDirectory, `${this.migrationId}.log`);
    const errorLogPath = path.join(this.logDirectory, `${this.migrationId}-errors.log`);

    return winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'platform-data-migration',
        migrationId: this.migrationId
      },
      transports: [
        // Write all logs to file
        new winston.transports.File({ 
          filename: logFilePath,
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        // Write errors to separate file
        new winston.transports.File({ 
          filename: errorLogPath,
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        // Console output with colors
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              let output = `${timestamp} [${level}]: ${message}`;
              
              // Add metadata if present
              if (Object.keys(meta).length > 0 && meta.service !== 'platform-data-migration') {
                output += ` ${JSON.stringify(meta, null, 2)}`;
              }
              
              return output;
            })
          )
        })
      ]
    });
  }

  /**
   * Log migration start
   * Requirement: 9.1 - Log migration start time and configuration
   */
  logMigrationStart(config) {
    this.stats.startTime = new Date();
    
    this.logger.info('='.repeat(80));
    this.logger.info('PLATFORM DATA MIGRATION STARTED');
    this.logger.info('='.repeat(80));
    this.logger.info('Migration ID:', { migrationId: this.migrationId });
    this.logger.info('Start Time:', { startTime: this.stats.startTime.toISOString() });
    this.logger.info('Configuration:', config.getSummary());
    this.logger.info('='.repeat(80));
  }

  /**
   * Log migration completion
   * Requirement: 9.4 - Log summary statistics
   */
  logMigrationComplete() {
    this.stats.endTime = new Date();
    const duration = this.stats.endTime - this.stats.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    this.logger.info('='.repeat(80));
    this.logger.info('PLATFORM DATA MIGRATION COMPLETED');
    this.logger.info('='.repeat(80));
    this.logger.info('Migration ID:', { migrationId: this.migrationId });
    this.logger.info('End Time:', { endTime: this.stats.endTime.toISOString() });
    this.logger.info('Duration:', { duration: `${durationSeconds}s` });
    this.logger.info('Statistics:', {
      recordsProcessed: this.stats.recordsProcessed,
      recordsSucceeded: this.stats.recordsSucceeded,
      recordsFailed: this.stats.recordsFailed,
      successRate: this.calculateSuccessRate()
    });
    this.logger.info('='.repeat(80));
  }

  /**
   * Log tenant migration
   * Requirement: 9.2 - Log each tenant record migration
   */
  logTenantMigration(tenantId, status, details = {}) {
    this.stats.recordsProcessed++;
    
    if (status === 'success') {
      this.stats.recordsSucceeded++;
      this.logger.info('Tenant migrated successfully', {
        tenantId,
        status,
        ...details
      });
    } else {
      this.stats.recordsFailed++;
      this.logger.error('Tenant migration failed', {
        tenantId,
        status,
        ...details
      });
    }
  }

  /**
   * Log error with stack trace
   * Requirement: 9.3 - Log detailed error messages with stack traces
   */
  error(message, error = null, context = {}) {
    const errorDetails = {
      message,
      ...context
    };

    if (error) {
      errorDetails.error = {
        message: error.message,
        name: error.name,
        stack: error.stack
      };

      // Track error in statistics
      this.stats.errors.push({
        timestamp: new Date(),
        message,
        error: error.message,
        context
      });
    }

    this.logger.error(errorDetails);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log success message
   */
  success(message, meta = {}) {
    this.logger.info(`✓ ${message}`, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log progress update
   */
  logProgress(current, total, operation = 'Processing') {
    const percentage = ((current / total) * 100).toFixed(1);
    this.logger.info(`${operation}: ${current}/${total} (${percentage}%)`);
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate() {
    if (this.stats.recordsProcessed === 0) {
      return '0%';
    }
    const rate = (this.stats.recordsSucceeded / this.stats.recordsProcessed) * 100;
    return `${rate.toFixed(2)}%`;
  }

  /**
   * Get migration statistics
   */
  getStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime && this.stats.startTime 
        ? this.stats.endTime - this.stats.startTime 
        : null,
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const stats = this.getStats();
    const reportPath = path.join(this.logDirectory, `${this.migrationId}-report.json`);

    const report = {
      migrationId: this.migrationId,
      startTime: stats.startTime?.toISOString(),
      endTime: stats.endTime?.toISOString(),
      duration: stats.duration ? `${(stats.duration / 1000).toFixed(2)}s` : null,
      statistics: {
        recordsProcessed: stats.recordsProcessed,
        recordsSucceeded: stats.recordsSucceeded,
        recordsFailed: stats.recordsFailed,
        successRate: stats.successRate
      },
      errors: stats.errors
    };

    // Write report to file
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.logger.info('Migration report generated', { reportPath });

    return report;
  }

  /**
   * Get log file path
   */
  getLogFilePath() {
    return path.join(this.logDirectory, `${this.migrationId}.log`);
  }

  /**
   * Get error log file path
   */
  getErrorLogFilePath() {
    return path.join(this.logDirectory, `${this.migrationId}-errors.log`);
  }

  /**
   * Close logger and flush logs
   */
  async close() {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}
