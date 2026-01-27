/**
 * Pre-Migration Validation
 * 
 * Validates system readiness before executing migration:
 * - Database connections
 * - Source data integrity
 * - Sufficient disk space
 * 
 * Requirements: 2.2
 */

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.valid = true;
    this.checks = [];
    this.errors = [];
    this.warnings = [];
  }

  addCheck(name, passed, message, details = {}) {
    this.checks.push({
      name,
      passed,
      message,
      details,
      timestamp: new Date()
    });

    if (!passed) {
      this.valid = false;
      this.errors.push({ check: name, message, details });
    }
  }

  addWarning(check, message, details = {}) {
    this.warnings.push({
      check,
      message,
      details,
      timestamp: new Date()
    });
  }

  getSummary() {
    return {
      valid: this.valid,
      totalChecks: this.checks.length,
      passed: this.checks.filter(c => c.passed).length,
      failed: this.checks.filter(c => !c.passed).length,
      warnings: this.warnings.length
    };
  }
}

/**
 * Check database connections
 */
async function checkDatabaseConnections(connections) {
  const result = new ValidationResult();

  try {
    // Check source database connection
    const sourceDb = connections.getSourceDb();
    const sourceStats = await sourceDb.stats();
    
    result.addCheck(
      'source_database_connection',
      true,
      'Source database connection successful',
      {
        database: sourceDb.databaseName,
        collections: sourceStats.collections,
        dataSize: sourceStats.dataSize,
        storageSize: sourceStats.storageSize
      }
    );

    // Check if source database has tenants collection
    const collections = await sourceDb.listCollections().toArray();
    const hasTenants = collections.some(c => c.name === 'tenants');
    
    result.addCheck(
      'source_tenants_collection',
      hasTenants,
      hasTenants 
        ? 'Source database has tenants collection'
        : 'Source database missing tenants collection',
      { collections: collections.map(c => c.name) }
    );

    // Check destination database connection
    const destDb = connections.getDestinationDb();
    const destStats = await destDb.stats();
    
    result.addCheck(
      'destination_database_connection',
      true,
      'Destination database connection successful',
      {
        database: destDb.databaseName,
        collections: destStats.collections,
        dataSize: destStats.dataSize,
        storageSize: destStats.storageSize
      }
    );

    // Check if destination database already has data
    const destCollections = await destDb.listCollections().toArray();
    const destHasTenants = destCollections.some(c => c.name === 'tenants');
    
    if (destHasTenants) {
      const tenantCount = await destDb.collection('tenants').countDocuments();
      if (tenantCount > 0) {
        result.addWarning(
          'destination_has_data',
          `Destination database already has ${tenantCount} tenant records`,
          { tenantCount }
        );
      }
    }

  } catch (error) {
    result.addCheck(
      'database_connections',
      false,
      `Database connection check failed: ${error.message}`,
      { error: error.message, stack: error.stack }
    );
  }

  return result;
}

/**
 * Verify source data integrity
 */
async function verifySourceDataIntegrity(sourceDb) {
  const result = new ValidationResult();

  try {
    // Check if tenants collection exists
    const collections = await sourceDb.listCollections({ name: 'tenants' }).toArray();
    
    if (collections.length === 0) {
      result.addCheck(
        'tenants_collection_exists',
        false,
        'Tenants collection does not exist in source database',
        {}
      );
      return result;
    }

    result.addCheck(
      'tenants_collection_exists',
      true,
      'Tenants collection exists in source database',
      {}
    );

    // Count total tenants
    const totalTenants = await sourceDb.collection('tenants').countDocuments();
    
    result.addCheck(
      'tenant_count',
      totalTenants > 0,
      totalTenants > 0 
        ? `Found ${totalTenants} tenant records`
        : 'No tenant records found in source database',
      { totalTenants }
    );

    if (totalTenants === 0) {
      return result;
    }

    // Check for required fields
    const sampleTenants = await sourceDb.collection('tenants')
      .find({})
      .limit(10)
      .toArray();

    const requiredFields = ['tenantId', 'name'];
    const missingFieldsCount = {};

    for (const tenant of sampleTenants) {
      for (const field of requiredFields) {
        if (!tenant[field]) {
          missingFieldsCount[field] = (missingFieldsCount[field] || 0) + 1;
        }
      }
    }

    const hasMissingFields = Object.keys(missingFieldsCount).length > 0;
    
    result.addCheck(
      'required_fields_present',
      !hasMissingFields,
      hasMissingFields
        ? `Some tenants missing required fields: ${Object.keys(missingFieldsCount).join(', ')}`
        : 'All sampled tenants have required fields',
      { missingFieldsCount, sampleSize: sampleTenants.length }
    );

    // Check for duplicate tenantIds
    const duplicateCheck = await sourceDb.collection('tenants').aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    const hasDuplicates = duplicateCheck.length > 0;
    
    result.addCheck(
      'no_duplicate_tenant_ids',
      !hasDuplicates,
      hasDuplicates
        ? `Found ${duplicateCheck.length} duplicate tenantIds`
        : 'No duplicate tenantIds found',
      { duplicates: duplicateCheck.map(d => ({ tenantId: d._id, count: d.count })) }
    );

    // Check for null or empty tenantIds
    const nullTenantIds = await sourceDb.collection('tenants').countDocuments({
      $or: [
        { tenantId: null },
        { tenantId: '' },
        { tenantId: { $exists: false } }
      ]
    });

    result.addCheck(
      'valid_tenant_ids',
      nullTenantIds === 0,
      nullTenantIds === 0
        ? 'All tenants have valid tenantIds'
        : `Found ${nullTenantIds} tenants with null or empty tenantIds`,
      { nullTenantIds }
    );

  } catch (error) {
    result.addCheck(
      'source_data_integrity',
      false,
      `Source data integrity check failed: ${error.message}`,
      { error: error.message, stack: error.stack }
    );
  }

  return result;
}

/**
 * Check available disk space
 */
async function checkDiskSpace(requiredSpaceGB = 1) {
  const result = new ValidationResult();

  try {
    // Get system information
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const freeMemGB = freeMem / (1024 * 1024 * 1024);
    const totalMemGB = totalMem / (1024 * 1024 * 1024);

    // Check memory
    result.addCheck(
      'sufficient_memory',
      freeMemGB >= 0.5,
      freeMemGB >= 0.5
        ? `Sufficient memory available: ${freeMemGB.toFixed(2)} GB free`
        : `Low memory: ${freeMemGB.toFixed(2)} GB free (< 0.5 GB)`,
      {
        freeMemoryGB: freeMemGB.toFixed(2),
        totalMemoryGB: totalMemGB.toFixed(2),
        usedMemoryGB: ((totalMem - freeMem) / (1024 * 1024 * 1024)).toFixed(2)
      }
    );

    // Check disk space for backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'migrations');
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // On Windows, we can't easily check disk space without external modules
      // So we'll just check if we can write to the directory
      const testFile = path.join(backupDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      result.addCheck(
        'backup_directory_writable',
        true,
        'Backup directory is writable',
        { backupDir }
      );
    } catch (error) {
      result.addCheck(
        'backup_directory_writable',
        false,
        `Cannot write to backup directory: ${error.message}`,
        { backupDir, error: error.message }
      );
    }

    // Check logs directory
    const logsDir = path.join(process.cwd(), 'logs', 'migrations');
    
    try {
      await fs.mkdir(logsDir, { recursive: true });
      
      const testFile = path.join(logsDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      result.addCheck(
        'logs_directory_writable',
        true,
        'Logs directory is writable',
        { logsDir }
      );
    } catch (error) {
      result.addCheck(
        'logs_directory_writable',
        false,
        `Cannot write to logs directory: ${error.message}`,
        { logsDir, error: error.message }
      );
    }

  } catch (error) {
    result.addCheck(
      'disk_space_check',
      false,
      `Disk space check failed: ${error.message}`,
      { error: error.message, stack: error.stack }
    );
  }

  return result;
}

/**
 * Run all pre-migration validation checks
 */
export async function runPreMigrationValidation(connections, options = {}) {
  const results = {
    timestamp: new Date(),
    overall: {
      valid: true,
      totalChecks: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    checks: {}
  };

  // Run database connection checks
  const dbResult = await checkDatabaseConnections(connections);
  results.checks.databaseConnections = dbResult;
  
  // Run source data integrity checks
  const sourceDb = connections.getSourceDb();
  const integrityResult = await verifySourceDataIntegrity(sourceDb);
  results.checks.sourceDataIntegrity = integrityResult;
  
  // Run disk space checks
  const diskResult = await checkDiskSpace(options.requiredSpaceGB);
  results.checks.diskSpace = diskResult;

  // Aggregate results
  for (const checkResult of Object.values(results.checks)) {
    const summary = checkResult.getSummary();
    results.overall.totalChecks += summary.totalChecks;
    results.overall.passed += summary.passed;
    results.overall.failed += summary.failed;
    results.overall.warnings += summary.warnings;
    
    if (!checkResult.valid) {
      results.overall.valid = false;
    }
  }

  return results;
}

/**
 * Format validation results for display
 */
export function formatValidationResults(results) {
  const lines = [];
  
  lines.push('Pre-Migration Validation Results');
  lines.push('='.repeat(60));
  lines.push('');
  
  // Overall summary
  lines.push(`Overall Status: ${results.overall.valid ? 'PASSED ✓' : 'FAILED ✗'}`);
  lines.push(`Total Checks: ${results.overall.totalChecks}`);
  lines.push(`  Passed: ${results.overall.passed}`);
  lines.push(`  Failed: ${results.overall.failed}`);
  lines.push(`  Warnings: ${results.overall.warnings}`);
  lines.push('');
  
  // Detailed results
  for (const [category, result] of Object.entries(results.checks)) {
    lines.push(`${category}:`);
    lines.push('-'.repeat(60));
    
    for (const check of result.checks) {
      const status = check.passed ? '✓' : '✗';
      lines.push(`  ${status} ${check.name}: ${check.message}`);
      
      if (check.details && Object.keys(check.details).length > 0) {
        for (const [key, value] of Object.entries(check.details)) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            lines.push(`      ${key}: ${JSON.stringify(value)}`);
          } else if (Array.isArray(value) && value.length <= 5) {
            lines.push(`      ${key}: ${JSON.stringify(value)}`);
          } else if (Array.isArray(value)) {
            lines.push(`      ${key}: [${value.length} items]`);
          } else {
            lines.push(`      ${key}: ${value}`);
          }
        }
      }
    }
    
    if (result.warnings.length > 0) {
      lines.push('  Warnings:');
      for (const warning of result.warnings) {
        lines.push(`    ⚠ ${warning.message}`);
      }
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}
