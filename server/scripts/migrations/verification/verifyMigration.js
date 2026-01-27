/**
 * Migration Verification Module
 * 
 * Compares source and destination databases to verify migration success.
 * Checks record counts, tenant IDs, and data consistency.
 * 
 * Requirements: 2.5, 7.1, 7.2, 7.4
 */

import { MigrationLogger } from '../utils/migrationLogger.js';

/**
 * Verify migration by comparing source and destination databases
 * 
 * Requirements:
 * - 2.5: Generate verification report comparing source and destination data
 * - 7.1: Verify all tenant records exist in destination
 * - 7.2: Compare record counts between databases
 * - 7.4: Detect and report data inconsistencies
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {Object} options - Verification options
 * @param {boolean} options.checkFieldValues - Whether to verify field values match
 * @param {boolean} options.checkRelatedData - Whether to verify subscriptions and modules
 * @returns {Promise<Object>} Verification result with detailed findings
 */
export async function verifyMigration(sourceDb, destDb, options = {}) {
  const logger = new MigrationLogger();
  const checkFieldValues = options.checkFieldValues !== undefined ? options.checkFieldValues : true;
  const checkRelatedData = options.checkRelatedData !== undefined ? options.checkRelatedData : true;

  try {
    logger.info('Starting migration verification...');
    logger.info('Verification options:', { checkFieldValues, checkRelatedData });

    const verificationResult = {
      valid: true,
      timestamp: new Date(),
      checks: {
        recordCount: null,
        tenantIds: null,
        fieldValues: null,
        relatedData: null
      },
      discrepancies: [],
      statistics: {
        sourceRecordCount: 0,
        destRecordCount: 0,
        matchingRecords: 0,
        missingRecords: 0,
        extraRecords: 0,
        fieldMismatches: 0
      }
    };

    // Check 1: Compare record counts
    logger.info('Checking record counts...');
    const recordCountCheck = await compareRecordCounts(sourceDb, destDb, logger);
    verificationResult.checks.recordCount = recordCountCheck;
    verificationResult.statistics.sourceRecordCount = recordCountCheck.sourceCount;
    verificationResult.statistics.destRecordCount = recordCountCheck.destCount;

    if (!recordCountCheck.match) {
      verificationResult.valid = false;
      verificationResult.discrepancies.push({
        type: 'RECORD_COUNT_MISMATCH',
        severity: 'critical',
        message: `Record count mismatch: source has ${recordCountCheck.sourceCount}, destination has ${recordCountCheck.destCount}`,
        details: recordCountCheck
      });
    }

    // Check 2: Verify all tenant IDs exist in destination
    logger.info('Verifying tenant IDs...');
    const tenantIdCheck = await verifyTenantIds(sourceDb, destDb, logger);
    verificationResult.checks.tenantIds = tenantIdCheck;
    verificationResult.statistics.matchingRecords = tenantIdCheck.matchingCount;
    verificationResult.statistics.missingRecords = tenantIdCheck.missingInDest.length;
    verificationResult.statistics.extraRecords = tenantIdCheck.extraInDest.length;

    if (tenantIdCheck.missingInDest.length > 0) {
      verificationResult.valid = false;
      verificationResult.discrepancies.push({
        type: 'MISSING_TENANTS',
        severity: 'critical',
        message: `${tenantIdCheck.missingInDest.length} tenant(s) missing in destination`,
        details: {
          missingTenantIds: tenantIdCheck.missingInDest,
          count: tenantIdCheck.missingInDest.length
        }
      });
    }

    if (tenantIdCheck.extraInDest.length > 0) {
      verificationResult.discrepancies.push({
        type: 'EXTRA_TENANTS',
        severity: 'warning',
        message: `${tenantIdCheck.extraInDest.length} extra tenant(s) in destination (not in source)`,
        details: {
          extraTenantIds: tenantIdCheck.extraInDest,
          count: tenantIdCheck.extraInDest.length
        }
      });
    }

    // Check 3: Verify field values match (if enabled)
    if (checkFieldValues) {
      logger.info('Verifying field values...');
      const fieldValueCheck = await verifyFieldValues(sourceDb, destDb, logger);
      verificationResult.checks.fieldValues = fieldValueCheck;
      verificationResult.statistics.fieldMismatches = fieldValueCheck.mismatches.length;

      if (fieldValueCheck.mismatches.length > 0) {
        verificationResult.valid = false;
        verificationResult.discrepancies.push({
          type: 'FIELD_VALUE_MISMATCHES',
          severity: 'critical',
          message: `${fieldValueCheck.mismatches.length} field value mismatch(es) detected`,
          details: {
            mismatches: fieldValueCheck.mismatches.slice(0, 10), // Limit to first 10
            totalCount: fieldValueCheck.mismatches.length
          }
        });
      }
    } else {
      logger.warn('Skipping field value verification (disabled)');
    }

    // Check 4: Verify related data (subscriptions, modules) if enabled
    if (checkRelatedData) {
      logger.info('Verifying related data (subscriptions and modules)...');
      const relatedDataCheck = await verifyRelatedData(destDb, logger);
      verificationResult.checks.relatedData = relatedDataCheck;

      if (!relatedDataCheck.valid) {
        verificationResult.valid = false;
        verificationResult.discrepancies.push({
          type: 'RELATED_DATA_ISSUES',
          severity: 'warning',
          message: 'Issues found in related data (subscriptions/modules)',
          details: relatedDataCheck.issues
        });
      }
    } else {
      logger.warn('Skipping related data verification (disabled)');
    }

    // Log verification summary
    if (verificationResult.valid) {
      logger.success('Migration verification PASSED');
    } else {
      logger.error('Migration verification FAILED');
      logger.error(`Found ${verificationResult.discrepancies.length} discrepancies`);
    }

    logger.info('Verification statistics:', verificationResult.statistics);

    return verificationResult;

  } catch (error) {
    logger.error('Migration verification failed:', error);
    throw new MigrationVerificationError('Verification process failed', error);
  }
}

/**
 * Compare record counts between source and destination databases
 * 
 * Requirement: 7.2 - Compare record counts between databases
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Record count comparison result
 */
async function compareRecordCounts(sourceDb, destDb, logger) {
  try {
    // Count active tenants in source (exclude deleted)
    const sourceCount = await sourceDb.collection('tenants').countDocuments({
      status: { $nin: ['cancelled', 'deleted'] }
    });

    // Count all tenants in destination
    const destCount = await destDb.collection('tenants').countDocuments();

    const match = sourceCount === destCount;

    logger.info('Record count comparison:', {
      source: sourceCount,
      destination: destCount,
      match
    });

    return {
      sourceCount,
      destCount,
      match,
      difference: Math.abs(sourceCount - destCount)
    };

  } catch (error) {
    logger.error('Failed to compare record counts:', error);
    throw new MigrationVerificationError('Record count comparison failed', error);
  }
}

/**
 * Verify all tenant IDs from source exist in destination
 * 
 * Requirement: 7.1 - Verify all tenant records exist in destination
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Tenant ID verification result
 */
async function verifyTenantIds(sourceDb, destDb, logger) {
  try {
    // Get all tenant IDs from source (exclude deleted)
    const sourceTenants = await sourceDb.collection('tenants')
      .find(
        { status: { $nin: ['cancelled', 'deleted'] } },
        { projection: { tenantId: 1, _id: 0 } }
      )
      .toArray();

    const sourceTenantIds = new Set(sourceTenants.map(t => t.tenantId));

    // Get all tenant IDs from destination
    const destTenants = await destDb.collection('tenants')
      .find({}, { projection: { tenantId: 1, _id: 0 } })
      .toArray();

    const destTenantIds = new Set(destTenants.map(t => t.tenantId));

    // Find missing tenant IDs (in source but not in destination)
    const missingInDest = Array.from(sourceTenantIds).filter(id => !destTenantIds.has(id));

    // Find extra tenant IDs (in destination but not in source)
    const extraInDest = Array.from(destTenantIds).filter(id => !sourceTenantIds.has(id));

    // Count matching tenant IDs
    const matchingCount = Array.from(sourceTenantIds).filter(id => destTenantIds.has(id)).length;

    logger.info('Tenant ID verification:', {
      sourceCount: sourceTenantIds.size,
      destCount: destTenantIds.size,
      matchingCount,
      missingCount: missingInDest.length,
      extraCount: extraInDest.length
    });

    if (missingInDest.length > 0) {
      logger.error('Missing tenant IDs in destination:', missingInDest);
    }

    if (extraInDest.length > 0) {
      logger.warn('Extra tenant IDs in destination:', extraInDest);
    }

    return {
      sourceTenantIds: Array.from(sourceTenantIds),
      destTenantIds: Array.from(destTenantIds),
      matchingCount,
      missingInDest,
      extraInDest,
      allPresent: missingInDest.length === 0
    };

  } catch (error) {
    logger.error('Failed to verify tenant IDs:', error);
    throw new MigrationVerificationError('Tenant ID verification failed', error);
  }
}

/**
 * Verify field values match between source and destination
 * 
 * Requirement: 7.4 - Detect and report data inconsistencies
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Field value verification result
 */
async function verifyFieldValues(sourceDb, destDb, logger) {
  try {
    const mismatches = [];

    // Get all active tenants from source
    const sourceTenants = await sourceDb.collection('tenants')
      .find({ status: { $nin: ['cancelled', 'deleted'] } })
      .toArray();

    logger.info(`Verifying field values for ${sourceTenants.length} tenants...`);

    // Check each tenant
    for (const sourceTenant of sourceTenants) {
      const destTenant = await destDb.collection('tenants')
        .findOne({ tenantId: sourceTenant.tenantId });

      if (!destTenant) {
        // Already caught by tenant ID verification
        continue;
      }

      // Compare critical fields
      const fieldChecks = [
        { field: 'name', source: sourceTenant.name, dest: destTenant.name },
        { field: 'domain', source: sourceTenant.domain, dest: destTenant.domain },
        { field: 'status', source: sourceTenant.status, dest: destTenant.status },
        { 
          field: 'subscription.status', 
          source: sourceTenant.subscription?.status, 
          dest: destTenant.subscription?.status 
        },
        { 
          field: 'subscription.planId', 
          source: sourceTenant.subscription?.planId, 
          dest: destTenant.subscription?.planId 
        }
      ];

      for (const check of fieldChecks) {
        if (check.source !== check.dest) {
          // Allow null/undefined equivalence
          if ((check.source === null || check.source === undefined) && 
              (check.dest === null || check.dest === undefined)) {
            continue;
          }

          mismatches.push({
            tenantId: sourceTenant.tenantId,
            field: check.field,
            sourceValue: check.source,
            destValue: check.dest
          });
        }
      }

      // Compare enabled modules (array comparison)
      const sourceModules = new Set(
        (sourceTenant.enabledModules || []).map(m => 
          typeof m === 'string' ? m : m.moduleId
        ).filter(Boolean)
      );
      const destModules = new Set(destTenant.enabledModules || []);

      if (sourceModules.size !== destModules.size || 
          !Array.from(sourceModules).every(m => destModules.has(m))) {
        mismatches.push({
          tenantId: sourceTenant.tenantId,
          field: 'enabledModules',
          sourceValue: Array.from(sourceModules),
          destValue: Array.from(destModules)
        });
      }
    }

    if (mismatches.length > 0) {
      logger.error(`Found ${mismatches.length} field value mismatches`);
      logger.error('Sample mismatches:', mismatches.slice(0, 5));
    } else {
      logger.success('All field values match');
    }

    return {
      valid: mismatches.length === 0,
      tenantsChecked: sourceTenants.length,
      mismatches
    };

  } catch (error) {
    logger.error('Failed to verify field values:', error);
    throw new MigrationVerificationError('Field value verification failed', error);
  }
}

/**
 * Verify related data (subscriptions and enabled modules) in destination
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Related data verification result
 */
async function verifyRelatedData(destDb, logger) {
  try {
    const issues = [];

    // Get all tenants from destination
    const tenants = await destDb.collection('tenants').find({}).toArray();

    logger.info(`Verifying related data for ${tenants.length} tenants...`);

    for (const tenant of tenants) {
      // Check if subscription record exists
      const subscription = await destDb.collection('subscriptions')
        .findOne({ tenantId: tenant.tenantId });

      if (!subscription && tenant.subscription && Object.keys(tenant.subscription).length > 0) {
        issues.push({
          tenantId: tenant.tenantId,
          type: 'MISSING_SUBSCRIPTION',
          message: 'Tenant has subscription data but no subscription record'
        });
      }

      // Check if enabled modules records exist
      if (Array.isArray(tenant.enabledModules) && tenant.enabledModules.length > 0) {
        const moduleRecords = await destDb.collection('enabled_modules')
          .find({ tenantId: tenant.tenantId })
          .toArray();

        const moduleRecordIds = new Set(moduleRecords.map(m => m.moduleId));
        const missingModules = tenant.enabledModules.filter(m => !moduleRecordIds.has(m));

        if (missingModules.length > 0) {
          issues.push({
            tenantId: tenant.tenantId,
            type: 'MISSING_MODULE_RECORDS',
            message: `Missing module records for: ${missingModules.join(', ')}`,
            missingModules
          });
        }
      }
    }

    if (issues.length > 0) {
      logger.warn(`Found ${issues.length} related data issues`);
      logger.warn('Sample issues:', issues.slice(0, 5));
    } else {
      logger.success('All related data verified');
    }

    return {
      valid: issues.length === 0,
      tenantsChecked: tenants.length,
      issues
    };

  } catch (error) {
    logger.error('Failed to verify related data:', error);
    throw new MigrationVerificationError('Related data verification failed', error);
  }
}

/**
 * Get verification statistics for a completed migration
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @returns {Promise<Object>} Verification statistics
 */
export async function getVerificationStatistics(sourceDb, destDb) {
  const logger = new MigrationLogger();

  try {
    const stats = {
      source: {
        tenants: await sourceDb.collection('tenants').countDocuments({
          status: { $nin: ['cancelled', 'deleted'] }
        }),
        totalTenants: await sourceDb.collection('tenants').countDocuments()
      },
      destination: {
        tenants: await destDb.collection('tenants').countDocuments(),
        subscriptions: await destDb.collection('subscriptions').countDocuments(),
        enabledModules: await destDb.collection('enabled_modules').countDocuments()
      },
      timestamp: new Date()
    };

    logger.info('Verification statistics:', stats);
    return stats;

  } catch (error) {
    logger.error('Failed to get verification statistics:', error);
    throw new MigrationVerificationError('Failed to get statistics', error);
  }
}

/**
 * Custom error class for migration verification errors
 */
export class MigrationVerificationError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'MigrationVerificationError';
    this.originalError = originalError;
    this.recoverable = false;

    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}
