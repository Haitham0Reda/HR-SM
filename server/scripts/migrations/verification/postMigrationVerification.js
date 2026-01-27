/**
 * Post-Migration Verification
 * 
 * Comprehensive verification after migration execution:
 * - Run verification checks
 * - Generate migration report
 * - Confirm migration success
 * 
 * Requirements: 2.5, 7.5
 */

import { verifyMigration, getVerificationStatistics } from './verifyMigration.js';
import { generateMigrationReport } from '../reporting/generateReport.js';
import { MigrationLogger } from '../utils/migrationLogger.js';

/**
 * Run comprehensive post-migration verification
 * 
 * @param {Object} migrationResult - Result from migration execution
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Comprehensive verification result
 */
export async function runPostMigrationVerification(migrationResult, sourceDb, destDb, options = {}) {
  const logger = new MigrationLogger();
  
  try {
    logger.info('Starting post-migration verification...');
    
    const verificationResult = {
      timestamp: new Date(),
      migration: {
        success: migrationResult.success,
        statistics: migrationResult.statistics
      },
      verification: null,
      report: null,
      overall: {
        success: false,
        message: ''
      }
    };

    // Step 1: Run verification checks
    logger.info('Running verification checks...');
    const verification = await verifyMigration(sourceDb, destDb, {
      checkFieldValues: options.checkFieldValues !== false,
      checkRelatedData: options.checkRelatedData !== false
    });
    
    verificationResult.verification = verification;
    
    // Step 2: Get detailed statistics
    logger.info('Gathering verification statistics...');
    const statistics = await getVerificationStatistics(sourceDb, destDb);
    verificationResult.verification.detailedStatistics = statistics;
    
    // Step 3: Generate migration report
    if (options.generateReport !== false) {
      logger.info('Generating migration report...');
      const report = await generateMigrationReport(migrationResult, verification, {
        outputDir: options.reportDir || 'logs/migrations/reports',
        format: options.reportFormat || 'all'
      });
      
      verificationResult.report = report;
      logger.success('Migration report generated');
      logger.info('Report files:', report.files);
    }
    
    // Step 4: Determine overall success
    const overallSuccess = migrationResult.success && verification.valid;
    verificationResult.overall.success = overallSuccess;
    
    if (overallSuccess) {
      verificationResult.overall.message = 'Migration completed successfully and verified';
      logger.success('✓ Post-migration verification PASSED');
    } else {
      if (!migrationResult.success) {
        verificationResult.overall.message = 'Migration completed with errors';
        logger.error('✗ Migration had errors');
      }
      if (!verification.valid) {
        verificationResult.overall.message = 'Migration verification failed';
        logger.error('✗ Verification checks failed');
      }
      if (!migrationResult.success && !verification.valid) {
        verificationResult.overall.message = 'Migration and verification both failed';
        logger.error('✗ Both migration and verification failed');
      }
    }
    
    // Step 5: Log summary
    logVerificationSummary(verificationResult, logger);
    
    return verificationResult;
    
  } catch (error) {
    logger.error('Post-migration verification failed:', error);
    throw error;
  }
}

/**
 * Log verification summary
 */
function logVerificationSummary(result, logger) {
  logger.info('');
  logger.info('='.repeat(60));
  logger.info('POST-MIGRATION VERIFICATION SUMMARY');
  logger.info('='.repeat(60));
  
  // Migration statistics
  if (result.migration.statistics) {
    logger.info('Migration Statistics:');
    logger.info(`  Total records:   ${result.migration.statistics.totalRecords || 0}`);
    logger.info(`  Imported:        ${result.migration.statistics.importedCount || 0}`);
    logger.info(`  Skipped:         ${result.migration.statistics.skippedCount || 0}`);
    logger.info(`  Failed:          ${result.migration.statistics.failedCount || 0}`);
  }
  
  // Verification results
  if (result.verification) {
    logger.info('');
    logger.info('Verification Results:');
    logger.info(`  Status:          ${result.verification.valid ? 'PASSED ✓' : 'FAILED ✗'}`);
    logger.info(`  Source count:    ${result.verification.statistics.sourceRecordCount}`);
    logger.info(`  Dest count:      ${result.verification.statistics.destRecordCount}`);
    logger.info(`  Matching:        ${result.verification.statistics.matchingRecords}`);
    logger.info(`  Missing:         ${result.verification.statistics.missingRecords}`);
    logger.info(`  Discrepancies:   ${result.verification.discrepancies.length}`);
  }
  
  // Overall status
  logger.info('');
  logger.info(`Overall Status: ${result.overall.success ? 'SUCCESS ✓' : 'FAILED ✗'}`);
  logger.info(`Message: ${result.overall.message}`);
  
  // Report location
  if (result.report && result.report.files) {
    logger.info('');
    logger.info('Reports Generated:');
    Object.entries(result.report.files).forEach(([format, filepath]) => {
      logger.info(`  ${format.toUpperCase()}: ${filepath}`);
    });
  }
  
  logger.info('='.repeat(60));
  logger.info('');
}

/**
 * Format verification results for CLI display
 */
export function formatVerificationSummary(result) {
  const lines = [];
  
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('POST-MIGRATION VERIFICATION SUMMARY');
  lines.push('═'.repeat(60));
  lines.push('');
  
  // Migration statistics
  if (result.migration.statistics) {
    lines.push('Migration Statistics:');
    lines.push(`  Total records:   ${result.migration.statistics.totalRecords || 0}`);
    lines.push(`  Imported:        ${result.migration.statistics.importedCount || 0}`);
    lines.push(`  Skipped:         ${result.migration.statistics.skippedCount || 0}`);
    lines.push(`  Failed:          ${result.migration.statistics.failedCount || 0}`);
    lines.push('');
  }
  
  // Verification results
  if (result.verification) {
    lines.push('Verification Results:');
    lines.push(`  Status:          ${result.verification.valid ? 'PASSED ✓' : 'FAILED ✗'}`);
    lines.push(`  Source count:    ${result.verification.statistics.sourceRecordCount}`);
    lines.push(`  Dest count:      ${result.verification.statistics.destRecordCount}`);
    lines.push(`  Matching:        ${result.verification.statistics.matchingRecords}`);
    lines.push(`  Missing:         ${result.verification.statistics.missingRecords}`);
    lines.push(`  Discrepancies:   ${result.verification.discrepancies.length}`);
    
    // Show discrepancies if any
    if (result.verification.discrepancies.length > 0) {
      lines.push('');
      lines.push('  Discrepancies:');
      result.verification.discrepancies.slice(0, 5).forEach(disc => {
        lines.push(`    - ${disc.type}: ${disc.message}`);
      });
      if (result.verification.discrepancies.length > 5) {
        lines.push(`    ... and ${result.verification.discrepancies.length - 5} more`);
      }
    }
    lines.push('');
  }
  
  // Overall status
  lines.push(`Overall Status: ${result.overall.success ? 'SUCCESS ✓' : 'FAILED ✗'}`);
  lines.push(`Message: ${result.overall.message}`);
  
  // Report location
  if (result.report && result.report.files) {
    lines.push('');
    lines.push('Reports Generated:');
    Object.entries(result.report.files).forEach(([format, filepath]) => {
      lines.push(`  ${format.toUpperCase()}: ${filepath}`);
    });
  }
  
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Check if migration was successful based on verification results
 */
export function isMigrationSuccessful(verificationResult) {
  return verificationResult.overall.success;
}

/**
 * Get list of critical issues from verification
 */
export function getCriticalIssues(verificationResult) {
  if (!verificationResult.verification) {
    return [];
  }
  
  return verificationResult.verification.discrepancies
    .filter(d => d.severity === 'critical')
    .map(d => ({
      type: d.type,
      message: d.message,
      details: d.details
    }));
}

/**
 * Get list of warnings from verification
 */
export function getWarnings(verificationResult) {
  if (!verificationResult.verification) {
    return [];
  }
  
  return verificationResult.verification.discrepancies
    .filter(d => d.severity === 'warning')
    .map(d => ({
      type: d.type,
      message: d.message,
      details: d.details
    }));
}
