/**
 * Migration Report Generation Module
 * 
 * Generates comprehensive reports for migration operations including:
 * - Success reports with statistics
 * - Error reports with discrepancies
 * - Performance metrics and timing information
 * 
 * Requirements: 2.5, 7.5, 9.4
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationLogger } from '../utils/migrationLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate comprehensive migration report
 * 
 * Requirements:
 * - 2.5: Generate verification report comparing source and destination data
 * - 7.5: Generate success report with migration statistics
 * - 9.4: Include migration timing and performance metrics
 * 
 * @param {Object} migrationResult - Result from migration execution
 * @param {Object} verificationResult - Result from verification process
 * @param {Object} options - Report generation options
 * @param {string} options.outputDir - Directory to save reports
 * @param {string} options.format - Report format ('json', 'html', 'text')
 * @returns {Promise<Object>} Generated report with file paths
 */
export async function generateMigrationReport(migrationResult, verificationResult, options = {}) {
  const logger = new MigrationLogger();
  const outputDir = options.outputDir || 'logs/migrations/reports';
  const format = options.format || 'json';

  try {
    logger.info('Generating migration report...');
    logger.info('Report options:', { outputDir, format });

    // Ensure output directory exists
    ensureDirectoryExists(outputDir);

    // Generate timestamp for report files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportId = `migration-report-${timestamp}`;

    // Build comprehensive report data
    const reportData = buildReportData(migrationResult, verificationResult);

    // Generate reports in requested formats
    const generatedFiles = [];

    if (format === 'json' || format === 'all') {
      const jsonPath = await generateJsonReport(reportData, reportId, outputDir, logger);
      generatedFiles.push({ format: 'json', path: jsonPath });
    }

    if (format === 'html' || format === 'all') {
      const htmlPath = await generateHtmlReport(reportData, reportId, outputDir, logger);
      generatedFiles.push({ format: 'html', path: htmlPath });
    }

    if (format === 'text' || format === 'all') {
      const textPath = await generateTextReport(reportData, reportId, outputDir, logger);
      generatedFiles.push({ format: 'text', path: textPath });
    }

    logger.success(`Migration report generated: ${reportId}`);
    logger.info('Generated files:', generatedFiles);

    return {
      reportId,
      timestamp: reportData.timestamp,
      success: reportData.summary.success,
      files: generatedFiles,
      summary: reportData.summary
    };

  } catch (error) {
    logger.error('Failed to generate migration report:', error);
    throw new ReportGenerationError('Report generation failed', error);
  }
}

/**
 * Build comprehensive report data structure
 * 
 * @param {Object} migrationResult - Migration execution result
 * @param {Object} verificationResult - Verification result
 * @returns {Object} Structured report data
 */
function buildReportData(migrationResult, verificationResult) {
  const timestamp = new Date();
  
  // Calculate timing metrics
  const timingMetrics = calculateTimingMetrics(migrationResult);
  
  // Build summary
  const summary = {
    success: migrationResult.success && verificationResult.valid,
    migrationSuccess: migrationResult.success,
    verificationSuccess: verificationResult.valid,
    totalRecords: migrationResult.statistics?.totalRecords || 0,
    importedRecords: migrationResult.statistics?.importedCount || 0,
    skippedRecords: migrationResult.statistics?.skippedCount || 0,
    failedRecords: migrationResult.statistics?.failedCount || 0,
    verificationDiscrepancies: verificationResult.discrepancies?.length || 0
  };

  // Build detailed report structure
  return {
    reportId: `migration-${timestamp.toISOString()}`,
    timestamp,
    summary,
    
    migration: {
      status: migrationResult.success ? 'SUCCESS' : 'FAILED',
      message: migrationResult.message,
      statistics: migrationResult.statistics || {},
      exportData: {
        totalRecords: migrationResult.exportData?.tenants?.length || 0,
        exportedAt: migrationResult.exportData?.metadata?.exportedAt,
        sourceDatabase: migrationResult.exportData?.metadata?.sourceDatabase
      },
      importResult: {
        importedCount: migrationResult.importResult?.importedCount || 0,
        skippedCount: migrationResult.importResult?.skippedCount || 0,
        failedCount: migrationResult.importResult?.failedCount || 0,
        failedRecords: migrationResult.importResult?.failedRecords || [],
        importedAt: migrationResult.importResult?.metadata?.importedAt,
        destinationDatabase: migrationResult.importResult?.metadata?.destinationDatabase
      }
    },
    
    verification: {
      status: verificationResult.valid ? 'PASSED' : 'FAILED',
      timestamp: verificationResult.timestamp,
      checks: verificationResult.checks || {},
      statistics: verificationResult.statistics || {},
      discrepancies: verificationResult.discrepancies || []
    },
    
    performance: {
      timing: timingMetrics,
      throughput: calculateThroughput(migrationResult, timingMetrics)
    },
    
    recommendations: generateRecommendations(migrationResult, verificationResult)
  };
}

/**
 * Calculate timing metrics from migration result
 * 
 * Requirement: 9.4 - Include migration timing and performance metrics
 * 
 * @param {Object} migrationResult - Migration result
 * @returns {Object} Timing metrics
 */
function calculateTimingMetrics(migrationResult) {
  const exportedAt = migrationResult.statistics?.exportedAt;
  const importedAt = migrationResult.statistics?.importedAt;

  if (!exportedAt || !importedAt) {
    return {
      totalDuration: null,
      exportDuration: null,
      importDuration: null,
      verificationDuration: null
    };
  }

  const exportTime = new Date(exportedAt);
  const importTime = new Date(importedAt);
  const totalDuration = importTime - exportTime;

  return {
    totalDuration: totalDuration,
    totalDurationFormatted: formatDuration(totalDuration),
    exportStarted: exportedAt,
    importCompleted: importedAt,
    exportDuration: null, // Would need more detailed timing
    importDuration: null,
    verificationDuration: null
  };
}

/**
 * Calculate throughput metrics
 * 
 * @param {Object} migrationResult - Migration result
 * @param {Object} timingMetrics - Timing metrics
 * @returns {Object} Throughput metrics
 */
function calculateThroughput(migrationResult, timingMetrics) {
  const totalRecords = migrationResult.statistics?.totalRecords || 0;
  const totalDuration = timingMetrics.totalDuration;

  if (!totalDuration || totalDuration === 0) {
    return {
      recordsPerSecond: null,
      recordsPerMinute: null
    };
  }

  const durationSeconds = totalDuration / 1000;
  const recordsPerSecond = totalRecords / durationSeconds;
  const recordsPerMinute = recordsPerSecond * 60;

  return {
    recordsPerSecond: recordsPerSecond.toFixed(2),
    recordsPerMinute: recordsPerMinute.toFixed(2),
    totalRecords,
    totalDurationSeconds: durationSeconds.toFixed(2)
  };
}

/**
 * Generate recommendations based on migration and verification results
 * 
 * @param {Object} migrationResult - Migration result
 * @param {Object} verificationResult - Verification result
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(migrationResult, verificationResult) {
  const recommendations = [];

  // Check for failed records
  if (migrationResult.statistics?.failedCount > 0) {
    recommendations.push({
      type: 'ERROR',
      priority: 'HIGH',
      message: 'Migration had failed records. Review failed records and retry migration for those tenants.',
      action: 'Review failedRecords in migration.importResult and investigate errors.'
    });
  }

  // Check for verification failures
  if (!verificationResult.valid) {
    recommendations.push({
      type: 'ERROR',
      priority: 'CRITICAL',
      message: 'Verification failed. Data inconsistencies detected between source and destination.',
      action: 'Review verification discrepancies and consider rollback if critical data is missing.'
    });
  }

  // Check for missing tenants
  const missingTenants = verificationResult.discrepancies?.find(d => d.type === 'MISSING_TENANTS');
  if (missingTenants) {
    recommendations.push({
      type: 'ERROR',
      priority: 'CRITICAL',
      message: `${missingTenants.details.count} tenant(s) missing in destination database.`,
      action: 'Re-run migration for missing tenants or investigate why they were not migrated.'
    });
  }

  // Check for field mismatches
  const fieldMismatches = verificationResult.discrepancies?.find(d => d.type === 'FIELD_VALUE_MISMATCHES');
  if (fieldMismatches) {
    recommendations.push({
      type: 'WARNING',
      priority: 'HIGH',
      message: `${fieldMismatches.details.totalCount} field value mismatch(es) detected.`,
      action: 'Review field mismatches and update destination records if necessary.'
    });
  }

  // Check for skipped records
  if (migrationResult.statistics?.skippedCount > 0) {
    recommendations.push({
      type: 'INFO',
      priority: 'LOW',
      message: `${migrationResult.statistics.skippedCount} record(s) were skipped (already exist in destination).`,
      action: 'This is normal for re-runs. Verify that existing records have correct data.'
    });
  }

  // Success case
  if (migrationResult.success && verificationResult.valid) {
    recommendations.push({
      type: 'SUCCESS',
      priority: 'INFO',
      message: 'Migration completed successfully with no issues detected.',
      action: 'Proceed with updating main backend to use License Server API.'
    });
  }

  return recommendations;
}

/**
 * Generate JSON format report
 * 
 * @param {Object} reportData - Report data
 * @param {string} reportId - Report ID
 * @param {string} outputDir - Output directory
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<string>} Path to generated file
 */
async function generateJsonReport(reportData, reportId, outputDir, logger) {
  const filePath = path.join(outputDir, `${reportId}.json`);
  
  try {
    const jsonContent = JSON.stringify(reportData, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf8');
    
    logger.success(`JSON report generated: ${filePath}`);
    return filePath;
    
  } catch (error) {
    logger.error('Failed to generate JSON report:', error);
    throw error;
  }
}

/**
 * Generate HTML format report
 * 
 * @param {Object} reportData - Report data
 * @param {string} reportId - Report ID
 * @param {string} outputDir - Output directory
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<string>} Path to generated file
 */
async function generateHtmlReport(reportData, reportId, outputDir, logger) {
  const filePath = path.join(outputDir, `${reportId}.html`);
  
  try {
    const htmlContent = buildHtmlReport(reportData);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    
    logger.success(`HTML report generated: ${filePath}`);
    return filePath;
    
  } catch (error) {
    logger.error('Failed to generate HTML report:', error);
    throw error;
  }
}

/**
 * Generate text format report
 * 
 * @param {Object} reportData - Report data
 * @param {string} reportId - Report ID
 * @param {string} outputDir - Output directory
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<string>} Path to generated file
 */
async function generateTextReport(reportData, reportId, outputDir, logger) {
  const filePath = path.join(outputDir, `${reportId}.txt`);
  
  try {
    const textContent = buildTextReport(reportData);
    fs.writeFileSync(filePath, textContent, 'utf8');
    
    logger.success(`Text report generated: ${filePath}`);
    return filePath;
    
  } catch (error) {
    logger.error('Failed to generate text report:', error);
    throw error;
  }
}

/**
 * Build HTML report content
 * 
 * @param {Object} reportData - Report data
 * @returns {string} HTML content
 */
function buildHtmlReport(reportData) {
  const statusColor = reportData.summary.success ? '#28a745' : '#dc3545';
  const statusText = reportData.summary.success ? 'SUCCESS' : 'FAILED';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Report - ${reportData.reportId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 10px 0;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      background-color: ${statusColor};
      color: white;
    }
    .section {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      margin-top: 0;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .stat-label {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 1.8em;
      font-weight: bold;
      color: #333;
    }
    .discrepancy {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .discrepancy.critical {
      background: #f8d7da;
      border-left-color: #dc3545;
    }
    .recommendation {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .recommendation.error {
      background: #f8d7da;
      border-left-color: #dc3545;
    }
    .recommendation.success {
      background: #d4edda;
      border-left-color: #28a745;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #667eea;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Platform Data Migration Report</h1>
    <p class="timestamp">Generated: ${reportData.timestamp.toISOString()}</p>
    <p>Report ID: ${reportData.reportId}</p>
    <div class="status">${statusText}</div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Records</div>
        <div class="stat-value">${reportData.summary.totalRecords}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Imported</div>
        <div class="stat-value">${reportData.summary.importedRecords}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Skipped</div>
        <div class="stat-value">${reportData.summary.skippedRecords}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${reportData.summary.failedRecords}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Migration Details</h2>
    <p><strong>Status:</strong> ${reportData.migration.status}</p>
    <p><strong>Message:</strong> ${reportData.migration.message}</p>
    <p><strong>Source Database:</strong> ${reportData.migration.exportData.sourceDatabase || 'N/A'}</p>
    <p><strong>Destination Database:</strong> ${reportData.migration.importResult.destinationDatabase || 'N/A'}</p>
    <p><strong>Exported At:</strong> ${reportData.migration.exportData.exportedAt || 'N/A'}</p>
    <p><strong>Imported At:</strong> ${reportData.migration.importResult.importedAt || 'N/A'}</p>
  </div>

  <div class="section">
    <h2>Verification Results</h2>
    <p><strong>Status:</strong> ${reportData.verification.status}</p>
    <p><strong>Discrepancies Found:</strong> ${reportData.summary.verificationDiscrepancies}</p>
    
    ${reportData.verification.discrepancies.length > 0 ? `
      <h3>Discrepancies</h3>
      ${reportData.verification.discrepancies.map(d => `
        <div class="discrepancy ${d.severity === 'critical' ? 'critical' : ''}">
          <strong>${d.type}</strong> (${d.severity})<br>
          ${d.message}
        </div>
      `).join('')}
    ` : '<p>No discrepancies found.</p>'}
  </div>

  <div class="section">
    <h2>Performance Metrics</h2>
    <p><strong>Total Duration:</strong> ${reportData.performance.timing.totalDurationFormatted || 'N/A'}</p>
    <p><strong>Throughput:</strong> ${reportData.performance.throughput.recordsPerSecond || 'N/A'} records/second</p>
    <p><strong>Records Per Minute:</strong> ${reportData.performance.throughput.recordsPerMinute || 'N/A'}</p>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    ${reportData.recommendations.map(r => `
      <div class="recommendation ${r.type.toLowerCase()}">
        <strong>${r.type}</strong> (Priority: ${r.priority})<br>
        <strong>Message:</strong> ${r.message}<br>
        <strong>Action:</strong> ${r.action}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

/**
 * Build text report content
 * 
 * @param {Object} reportData - Report data
 * @returns {string} Text content
 */
function buildTextReport(reportData) {
  const lines = [];
  const separator = '='.repeat(80);

  lines.push(separator);
  lines.push('PLATFORM DATA MIGRATION REPORT');
  lines.push(separator);
  lines.push(`Report ID: ${reportData.reportId}`);
  lines.push(`Generated: ${reportData.timestamp.toISOString()}`);
  lines.push(`Status: ${reportData.summary.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push(separator);
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Records:              ${reportData.summary.totalRecords}`);
  lines.push(`Imported Records:           ${reportData.summary.importedRecords}`);
  lines.push(`Skipped Records:            ${reportData.summary.skippedRecords}`);
  lines.push(`Failed Records:             ${reportData.summary.failedRecords}`);
  lines.push(`Verification Discrepancies: ${reportData.summary.verificationDiscrepancies}`);
  lines.push('');

  // Migration Details
  lines.push('MIGRATION DETAILS');
  lines.push('-'.repeat(80));
  lines.push(`Status:              ${reportData.migration.status}`);
  lines.push(`Message:             ${reportData.migration.message}`);
  lines.push(`Source Database:     ${reportData.migration.exportData.sourceDatabase || 'N/A'}`);
  lines.push(`Destination Database: ${reportData.migration.importResult.destinationDatabase || 'N/A'}`);
  lines.push(`Exported At:         ${reportData.migration.exportData.exportedAt || 'N/A'}`);
  lines.push(`Imported At:         ${reportData.migration.importResult.importedAt || 'N/A'}`);
  lines.push('');

  // Verification Results
  lines.push('VERIFICATION RESULTS');
  lines.push('-'.repeat(80));
  lines.push(`Status:              ${reportData.verification.status}`);
  lines.push(`Discrepancies Found: ${reportData.summary.verificationDiscrepancies}`);
  lines.push('');

  if (reportData.verification.discrepancies.length > 0) {
    lines.push('Discrepancies:');
    reportData.verification.discrepancies.forEach((d, i) => {
      lines.push(`  ${i + 1}. [${d.severity.toUpperCase()}] ${d.type}`);
      lines.push(`     ${d.message}`);
    });
    lines.push('');
  }

  // Performance Metrics
  lines.push('PERFORMANCE METRICS');
  lines.push('-'.repeat(80));
  lines.push(`Total Duration:      ${reportData.performance.timing.totalDurationFormatted || 'N/A'}`);
  lines.push(`Throughput:          ${reportData.performance.throughput.recordsPerSecond || 'N/A'} records/second`);
  lines.push(`Records Per Minute:  ${reportData.performance.throughput.recordsPerMinute || 'N/A'}`);
  lines.push('');

  // Recommendations
  lines.push('RECOMMENDATIONS');
  lines.push('-'.repeat(80));
  reportData.recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.type}] Priority: ${r.priority}`);
    lines.push(`   Message: ${r.message}`);
    lines.push(`   Action:  ${r.action}`);
    lines.push('');
  });

  lines.push(separator);
  lines.push('END OF REPORT');
  lines.push(separator);

  return lines.join('\n');
}

/**
 * Format duration in milliseconds to human-readable string
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Ensure directory exists, create if not
 * 
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Custom error class for report generation errors
 */
export class ReportGenerationError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'ReportGenerationError';
    this.originalError = originalError;
    this.recoverable = false;

    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}
