#!/usr/bin/env node

/**
 * Platform Data Migration Script
 * 
 * Migrates tenant metadata from hrsm_platform database to hrsm-licenses database.
 * This establishes proper separation of concerns between platform control (license server)
 * and business data (main application).
 * 
 * Requirements: 2.1, 9.1
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationConfig } from './config/migrationConfig.js';
import { DatabaseConnections } from './utils/databaseConnections.js';
import { MigrationLogger } from './utils/migrationLogger.js';
import { exportTenants, getTenantCount } from './export/exportTenants.js';
import { validateExportedData } from './validation/validateExportData.js';
import { importTenants, getImportStatistics } from './import/importTenants.js';
import { verifyMigration, getVerificationStatistics } from './verification/verifyMigration.js';
import { generateMigrationReport } from './reporting/generateReport.js';
import { createBackup } from './backup/createBackup.js';
import { rollbackMigration } from './rollback/rollbackMigration.js';
import { ErrorLogger } from './errors/errorLogger.js';
import {
  MigrationValidationError,
  DatabaseConnectionError,
  CriticalMigrationError
} from './errors/MigrationErrors.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main migration orchestrator
 * Coordinates the entire migration process with proper error handling
 */
async function migratePlatformData(options = {}) {
  const logger = new MigrationLogger();
  const errorLogger = new ErrorLogger({ logger });
  const config = new MigrationConfig(options);
  let connections = null;
  let backupResult = null;

  try {
    logger.logMigrationStart(config);

    // Step 1: Establish database connections
    logger.info('Connecting to databases...');
    try {
      connections = new DatabaseConnections(config);
      await connections.connect();
      logger.success('Database connections established');
    } catch (connectionError) {
      // Wrap connection errors in DatabaseConnectionError
      const dbError = new DatabaseConnectionError(
        config.sourceDatabase || 'source/destination',
        connectionError
      );
      errorLogger.logConnectionError(dbError, {
        phase: 'initialization',
        operation: 'database_connection'
      });
      throw dbError;
    }

    // Step 2: Validate connections
    logger.info('Validating database connections...');
    try {
      await connections.validateConnections();
      logger.success('Database connections validated');
    } catch (validationError) {
      const dbError = new DatabaseConnectionError(
        'connection validation',
        validationError
      );
      errorLogger.logConnectionError(dbError, {
        phase: 'initialization',
        operation: 'connection_validation'
      });
      throw dbError;
    }

    // Step 2.5: Create backup before migration (if enabled)
    if (config.shouldBackup() && !config.isDryRun()) {
      logger.info('Creating backup before migration...');
      backupResult = await createBackup(
        connections.getSourceDb(),
        connections.getDestinationDb(),
        {
          backupDir: 'backups/migrations',
          verifyIntegrity: true
        }
      );
      logger.success('Backup created successfully');
      logger.info('Backup ID:', backupResult.backupId);
      logger.info('Backup location:', backupResult.metadata.backupDirectory);
    } else if (config.isDryRun()) {
      logger.warn('Skipping backup creation (dry-run mode)');
    } else {
      logger.warn('Skipping backup creation (disabled in config)');
    }

    // Log configuration summary
    logger.info('Migration configuration:', {
      sourceDatabase: config.sourceDatabase,
      destinationDatabase: config.destinationDatabase,
      dryRun: config.dryRun,
      batchSize: config.batchSize
    });

    // Step 3: Export tenant data from source database
    logger.info('Exporting tenant data from source database...');
    const sourceDb = connections.getSourceDb();
    
    const exportData = await exportTenants(sourceDb, {
      batchSize: config.batchSize,
      includeDeleted: false
    });
    
    logger.success(`Exported ${exportData.tenants.length} tenant records`);
    logger.info('Export metadata:', exportData.metadata);

    // Step 4: Validate exported data
    if (config.shouldValidateBeforeMigration()) {
      logger.info('Validating exported data...');
      
      const validationResult = await validateExportedData(exportData);
      
      // Log validation results
      logger.info('Validation results:', {
        valid: validationResult.valid,
        totalRecords: validationResult.statistics.totalRecords,
        validRecords: validationResult.statistics.validRecords,
        invalidRecords: validationResult.statistics.invalidRecords,
        recordsWithWarnings: validationResult.statistics.recordsWithWarnings,
        totalErrors: validationResult.errors.length,
        totalWarnings: validationResult.warnings.length
      });

      // Log errors if any
      if (validationResult.errors.length > 0) {
        logger.error('Validation errors found:');
        validationResult.errors.slice(0, 10).forEach(error => {
          logger.error(`  - ${error.message}`, {
            type: error.type,
            field: error.field,
            tenantId: error.tenantId
          });
        });
        
        if (validationResult.errors.length > 10) {
          logger.error(`  ... and ${validationResult.errors.length - 10} more errors`);
        }
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        logger.warn(`Found ${validationResult.warnings.length} warnings`);
        validationResult.warnings.slice(0, 5).forEach(warning => {
          logger.warn(`  - ${warning.message}`);
        });
        
        if (validationResult.warnings.length > 5) {
          logger.warn(`  ... and ${validationResult.warnings.length - 5} more warnings`);
        }
      }

      // Fail migration if validation failed
      if (!validationResult.valid) {
        const validationError = new MigrationValidationError(
          'Export data validation failed. Migration aborted.',
          {
            validationType: 'export_data',
            totalRecords: validationResult.statistics.totalRecords,
            invalidRecords: validationResult.statistics.invalidRecords,
            validationErrors: validationResult.errors,
            failedRecords: validationResult.errors.map(e => e.tenantId).filter(Boolean)
          }
        );
        
        errorLogger.logValidationError(validationError, {
          phase: 'validation',
          operation: 'export_data_validation'
        });
        
        throw validationError;
      }
      
      logger.success('Export data validation passed');
    } else {
      logger.warn('Skipping export data validation (disabled in config)');
    }

    // Step 5: Import tenant data to destination database
    if (!config.isDryRun()) {
      logger.info('Importing tenant data to destination database...');
      const destDb = connections.getDestinationDb();
      
      const importResult = await importTenants(destDb, exportData, {
        batchSize: config.batchSize,
        createIndexes: true,
        useTransaction: false // Transactions require replica set
      });
      
      logger.success(`Imported ${importResult.importedCount} tenant records`);
      
      if (importResult.skippedCount > 0) {
        logger.warn(`Skipped ${importResult.skippedCount} records (already exist)`);
      }
      
      if (importResult.failedCount > 0) {
        logger.error(`Failed to import ${importResult.failedCount} records`);
        if (importResult.failedRecords) {
          logger.error('Failed records:', importResult.failedRecords.slice(0, 10));
        }
      }
      
      // Log import statistics
      logger.info('Import metadata:', importResult.metadata);
      
      // Get final statistics
      logger.info('Fetching import statistics...');
      const stats = await getImportStatistics(destDb);
      logger.info('Final database statistics:', stats);
      
      // Step 6: Verify migration
      logger.info('Verifying migration...');
      const verificationResult = await verifyMigration(sourceDb, destDb, {
        checkFieldValues: true,
        checkRelatedData: true
      });
      
      if (verificationResult.valid) {
        logger.success('Migration verification passed');
      } else {
        logger.error('Migration verification failed');
        logger.error(`Found ${verificationResult.discrepancies.length} discrepancies`);
      }
      
      // Build complete migration result
      const migrationResult = {
        success: importResult.success && verificationResult.valid,
        message: importResult.success && verificationResult.valid 
          ? 'Data migration completed successfully and verified'
          : 'Data migration completed with issues',
        exportData,
        importResult,
        backup: backupResult ? {
          backupId: backupResult.backupId,
          backupDirectory: backupResult.metadata?.backupDirectory,
          timestamp: backupResult.metadata?.timestamp
        } : null,
        statistics: {
          totalRecords: exportData.tenants.length,
          exportedAt: exportData.metadata.exportedAt,
          importedCount: importResult.importedCount,
          skippedCount: importResult.skippedCount,
          failedCount: importResult.failedCount,
          importedAt: importResult.metadata.importedAt,
          finalStats: stats
        }
      };
      
      // Step 7: Generate migration report
      logger.info('Generating migration report...');
      const report = await generateMigrationReport(migrationResult, verificationResult, {
        outputDir: 'logs/migrations/reports',
        format: 'all' // Generate JSON, HTML, and text reports
      });
      
      logger.success('Migration report generated');
      logger.info('Report files:', report.files);
      
      // Return complete migration results with verification and report
      return {
        ...migrationResult,
        verification: verificationResult,
        report
      };
    } else {
      logger.warn('DRY RUN MODE: Skipping import step');
      
      // Return export data for dry-run
      return {
        success: true,
        message: 'Data export and validation completed successfully (DRY RUN)',
        exportData,
        statistics: {
          totalRecords: exportData.tenants.length,
          exportedAt: exportData.metadata.exportedAt
        }
      };
    }

    // Return export data for further processing
    return {
      success: true,
      message: 'Data export and validation completed successfully',
      exportData,
      statistics: {
        totalRecords: exportData.tenants.length,
        exportedAt: exportData.metadata.exportedAt
      }
    };

  } catch (error) {
    logger.error('Migration failed:', error);
    
    // Log error with appropriate handler
    if (error instanceof MigrationValidationError) {
      errorLogger.logValidationError(error, {
        phase: 'migration',
        operation: 'data_migration'
      });
    } else if (error instanceof DatabaseConnectionError) {
      errorLogger.logConnectionError(error, {
        phase: 'migration',
        operation: 'data_migration'
      });
    } else {
      errorLogger.logError(error, {
        phase: 'migration',
        operation: 'data_migration'
      });
    }
    
    // Attempt rollback if backup exists
    if (backupResult && connections) {
      logger.warn('Attempting automatic rollback...');
      try {
        const rollbackResult = await rollbackMigration(
          connections.getSourceDb(),
          connections.getDestinationDb(),
          backupResult.metadata,
          {
            backupDir: 'backups/migrations',
            verifyRestoration: true,
            removeDestinationData: true
          }
        );
        logger.success('Automatic rollback completed successfully');
        logger.info('Rollback statistics:', rollbackResult.statistics);
      } catch (rollbackError) {
        logger.error('Automatic rollback failed:', rollbackError);
        logger.error('Manual intervention required');
        
        // Create critical error with rollback failure details
        const criticalError = new CriticalMigrationError(
          'Migration and rollback both failed - manual intervention required',
          {
            phase: 'rollback',
            operation: 'automatic_rollback',
            originalError: error,
            rollbackError: rollbackError,
            rollbackAttempted: true,
            rollbackSucceeded: false,
            systemState: 'inconsistent'
          }
        );
        
        errorLogger.logCriticalError(criticalError, {
          phase: 'rollback',
          operation: 'automatic_rollback',
          originalError: error.message,
          rollbackError: rollbackError.message
        });
        
        throw criticalError;
      }
    }
    
    throw error;
  } finally {
    // Cleanup: Close database connections
    if (connections) {
      logger.info('Closing database connections...');
      await connections.disconnect();
      logger.success('Database connections closed');
    }
  }
}

/**
 * CLI entry point
 * Parses command-line arguments and executes migration
 */
async function main() {
  const logger = new MigrationLogger();

  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    const options = {};

    // Parse flags
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--batch-size' && args[i + 1]) {
        options.batchSize = parseInt(args[i + 1], 10);
        i++;
      } else if (arg === '--help' || arg === '-h') {
        printUsage();
        process.exit(0);
      }
    }

    // Execute migration
    const result = await migratePlatformData(options);
    
    logger.success('Migration completed successfully');
    logger.info('Result:', result);
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed with error:', error);
    process.exit(1);
  }
}

/**
 * Print CLI usage information
 */
function printUsage() {
  console.log(`
Platform Data Migration Tool

Usage:
  node migrate-platform-data.js [options]

Options:
  --dry-run              Run migration without making changes
  --batch-size <number>  Number of records to process per batch (default: 100)
  --help, -h             Show this help message

Examples:
  # Run migration in dry-run mode
  node migrate-platform-data.js --dry-run

  # Run migration with custom batch size
  node migrate-platform-data.js --batch-size 50

  # Run actual migration
  node migrate-platform-data.js
  `);
}

// Execute if run directly
const isMainModule = process.argv[1] && 
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  main();
}

export { migratePlatformData };
