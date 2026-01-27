/**
 * Migration Rollback Module
 * 
 * Restores tenant data to hrsm_platform database and removes migrated data
 * from hrsm-licenses database in case of migration failure.
 * 
 * Requirements: 2.6, 12.1, 12.3
 */

import fs from 'fs';
import path from 'path';
import { MigrationLogger } from '../utils/migrationLogger.js';
import { loadBackupMetadata } from '../backup/createBackup.js';

/**
 * Rollback migration using backup data
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection (hrsm_platform)
 * @param {mongoose.mongo.Db} destDb - Destination database connection (hrsm-licenses)
 * @param {string|Object} backupIdOrMetadata - Backup ID or metadata object
 * @param {Object} options - Rollback options
 * @param {string} options.backupDir - Base backup directory
 * @param {boolean} options.verifyRestoration - Whether to verify restoration success
 * @param {boolean} options.removeDestinationData - Whether to remove data from destination
 * @returns {Promise<Object>} Rollback result
 */
export async function rollbackMigration(sourceDb, destDb, backupIdOrMetadata, options = {}) {
  const logger = new MigrationLogger();
  const backupDir = options.backupDir || 'backups/migrations';
  const verifyRestoration = options.verifyRestoration !== undefined ? options.verifyRestoration : true;
  const removeDestinationData = options.removeDestinationData !== undefined ? 
    options.removeDestinationData : true;

  try {
    logger.info('='.repeat(80));
    logger.info('STARTING MIGRATION ROLLBACK');
    logger.info('='.repeat(80));

    // Load backup metadata
    const metadata = typeof backupIdOrMetadata === 'string' ?
      loadBackupMetadata(backupIdOrMetadata, backupDir) :
      backupIdOrMetadata;

    logger.info('Rollback configuration:', {
      backupId: metadata.backupId,
      backupTimestamp: metadata.timestamp,
      sourceDatabase: metadata.source.database,
      destinationDatabase: metadata.destination.database,
      verifyRestoration,
      removeDestinationData
    });

    // Verify backup files exist
    if (!fs.existsSync(metadata.source.filePath)) {
      throw new RollbackError(`Source backup file not found: ${metadata.source.filePath}`);
    }
    if (!fs.existsSync(metadata.destination.filePath)) {
      throw new RollbackError(`Destination backup file not found: ${metadata.destination.filePath}`);
    }

    const rollbackStartTime = new Date();

    // Step 1: Restore tenant data to source database (hrsm_platform)
    logger.info('Step 1: Restoring tenant data to source database...');
    const sourceRestoreResult = await restoreToSourceDatabase(
      sourceDb,
      metadata.source.filePath,
      logger
    );
    logger.success(`Restored ${sourceRestoreResult.restoredCount} records to source database`);

    // Step 2: Remove migrated data from destination database (hrsm-licenses)
    let destRemovalResult = null;
    if (removeDestinationData) {
      logger.info('Step 2: Removing migrated data from destination database...');
      destRemovalResult = await removeFromDestinationDatabase(
        destDb,
        metadata.destination.filePath,
        logger
      );
      logger.success(`Removed ${destRemovalResult.removedCount} records from destination database`);
    } else {
      logger.warn('Step 2: Skipping destination data removal (disabled in options)');
    }

    // Step 3: Verify restoration success
    if (verifyRestoration) {
      logger.info('Step 3: Verifying restoration success...');
      const verificationResult = await verifyRollback(
        sourceDb,
        destDb,
        metadata,
        logger
      );

      if (!verificationResult.valid) {
        logger.error('Rollback verification failed');
        logger.error('Discrepancies:', verificationResult.discrepancies);
        throw new RollbackError('Rollback verification failed', verificationResult.discrepancies);
      }

      logger.success('Rollback verification passed');
    } else {
      logger.warn('Step 3: Skipping rollback verification (disabled in options)');
    }

    const rollbackEndTime = new Date();
    const rollbackDuration = (rollbackEndTime - rollbackStartTime) / 1000;

    logger.info('='.repeat(80));
    logger.info('MIGRATION ROLLBACK COMPLETED SUCCESSFULLY');
    logger.info('='.repeat(80));
    logger.info('Rollback statistics:', {
      duration: `${rollbackDuration.toFixed(2)}s`,
      sourceRestored: sourceRestoreResult.restoredCount,
      destinationRemoved: removeDestinationData ? destRemovalResult?.removedCount || 0 : 0
    });

    return {
      success: true,
      message: 'Migration rollback completed successfully',
      backupId: metadata.backupId,
      statistics: {
        duration: rollbackDuration,
        sourceRestored: sourceRestoreResult.restoredCount,
        destinationRemoved: removeDestinationData ? destRemovalResult?.removedCount || 0 : 0,
        startTime: rollbackStartTime.toISOString(),
        endTime: rollbackEndTime.toISOString()
      },
      verification: verifyRestoration ? {
        valid: true,
        message: 'Rollback verification passed'
      } : null
    };

  } catch (error) {
    logger.error('Migration rollback failed:', error);
    throw new RollbackError('Migration rollback failed', error);
  }
}

/**
 * Restore tenant data to source database from backup
 * 
 * Requirements: 2.6, 12.1 - Restore tenant data to hrsm_platform
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {string} backupFilePath - Path to backup file
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Restoration result
 */
async function restoreToSourceDatabase(sourceDb, backupFilePath, logger) {
  try {
    // Load backup data
    logger.info(`Loading backup from: ${backupFilePath}`);
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    let restoredCount = 0;
    const errors = [];

    // Restore each collection
    for (const collectionName in backupData.collections) {
      const collectionData = backupData.collections[collectionName];
      
      if (collectionData.error) {
        logger.warn(`Skipping collection ${collectionName} (backup error: ${collectionData.error})`);
        continue;
      }

      if (collectionData.recordCount === 0) {
        logger.info(`Skipping empty collection: ${collectionName}`);
        continue;
      }

      try {
        logger.info(`Restoring collection: ${collectionName} (${collectionData.recordCount} records)`);
        
        const collection = sourceDb.collection(collectionName);
        const records = collectionData.records;

        // Restore records one by one to handle duplicates gracefully
        for (const record of records) {
          try {
            // Check if record already exists
            const existing = await collection.findOne({ tenantId: record.tenantId });
            
            if (existing) {
              // Update existing record to restore original state
              // Remove _id from the record to avoid immutable field error
              const { _id, ...recordWithoutId } = record;
              
              const updateResult = await collection.replaceOne(
                { tenantId: record.tenantId },
                recordWithoutId
              );
              
              if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
                logger.debug(`Updated existing record: ${record.tenantId}`);
                restoredCount++;
              } else {
                logger.warn(`No changes made to existing record: ${record.tenantId}`);
              }
            } else {
              // Insert new record
              await collection.insertOne(record);
              logger.debug(`Inserted record: ${record.tenantId}`);
              restoredCount++;
            }
            
          } catch (error) {
            // Log full error for debugging
            logger.error(`Failed to restore record ${record.tenantId}: ${error.message}`);
            logger.debug('Error details:', {
              name: error.name,
              code: error.code,
              message: error.message
            });
            
            errors.push({
              tenantId: record.tenantId,
              error: error.message,
              code: error.code
            });
          }
        }

        logger.success(`Restored ${collectionData.recordCount} records to ${collectionName}`);
        
      } catch (error) {
        logger.error(`Failed to restore collection ${collectionName}:`, error.message);
        errors.push({
          collection: collectionName,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Encountered ${errors.length} errors during restoration`);
      // Don't fail if we had some errors but still restored records
      // This handles cases where records already exist in the correct state
    }

    return {
      success: true, // Consider success if we processed records, even with some errors
      restoredCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    logger.error('Failed to restore source database:', error);
    throw new RollbackError('Source database restoration failed', error);
  }
}

/**
 * Remove migrated data from destination database
 * 
 * Requirements: 2.6, 12.1 - Remove migrated data from hrsm-licenses
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {string} backupFilePath - Path to backup file (to identify what to remove)
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Removal result
 */
async function removeFromDestinationDatabase(destDb, backupFilePath, logger) {
  try {
    // Load backup data to identify what was migrated
    logger.info(`Loading backup from: ${backupFilePath}`);
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    let removedCount = 0;
    const errors = [];

    // Get list of tenant IDs that were in the backup (before migration)
    const originalTenantIds = new Set();
    if (backupData.collections.tenants && backupData.collections.tenants.records) {
      backupData.collections.tenants.records.forEach(record => {
        if (record.tenantId) {
          originalTenantIds.add(record.tenantId);
        }
      });
    }

    logger.info(`Found ${originalTenantIds.size} tenant IDs in destination backup`);

    // Get current tenant IDs in destination database
    const tenantsCollection = destDb.collection('tenants');
    const currentTenants = await tenantsCollection.find({}).toArray();
    const currentTenantIds = new Set(currentTenants.map(t => t.tenantId));

    logger.info(`Found ${currentTenantIds.size} tenant IDs currently in destination database`);

    // Identify newly migrated tenants (in current but not in original backup)
    const migratedTenantIds = [...currentTenantIds].filter(id => !originalTenantIds.has(id));

    logger.info(`Identified ${migratedTenantIds.length} newly migrated tenants to remove`);

    if (migratedTenantIds.length === 0) {
      logger.warn('No newly migrated tenants found to remove');
      return {
        success: true,
        removedCount: 0,
        errors: []
      };
    }

    // Remove migrated tenants from all collections
    const collections = ['tenants', 'subscriptions', 'enabled_modules'];

    for (const collectionName of collections) {
      try {
        const collection = destDb.collection(collectionName);
        
        // Remove records for migrated tenants
        const deleteResult = await collection.deleteMany({
          tenantId: { $in: migratedTenantIds }
        });

        logger.info(`Removed ${deleteResult.deletedCount} records from ${collectionName}`);
        removedCount += deleteResult.deletedCount;
        
      } catch (error) {
        logger.error(`Failed to remove records from ${collectionName}:`, error.message);
        errors.push({
          collection: collectionName,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Encountered ${errors.length} errors during removal`);
    }

    return {
      success: errors.length === 0,
      removedCount,
      migratedTenantIds,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    logger.error('Failed to remove data from destination database:', error);
    throw new RollbackError('Destination database cleanup failed', error);
  }
}

/**
 * Verify rollback success
 * 
 * Requirements: 12.3 - Verify restoration success
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {Object} metadata - Backup metadata
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Verification result
 */
async function verifyRollback(sourceDb, destDb, metadata, logger) {
  const discrepancies = [];

  try {
    // Load original backup data
    const sourceBackupData = JSON.parse(fs.readFileSync(metadata.source.filePath, 'utf8'));
    const destBackupData = JSON.parse(fs.readFileSync(metadata.destination.filePath, 'utf8'));

    // Verify source database restoration
    logger.info('Verifying source database restoration...');
    
    const sourceTenantsCollection = sourceDb.collection('tenants');
    const currentSourceTenants = await sourceTenantsCollection.find({}).toArray();
    const currentSourceTenantIds = new Set(currentSourceTenants.map(t => t.tenantId));

    // Get original source tenant IDs from backup
    const originalSourceTenantIds = new Set();
    if (sourceBackupData.collections.tenants && sourceBackupData.collections.tenants.records) {
      sourceBackupData.collections.tenants.records.forEach(record => {
        if (record.tenantId) {
          originalSourceTenantIds.add(record.tenantId);
        }
      });
    }

    // Check if all original tenants are restored
    for (const tenantId of originalSourceTenantIds) {
      if (!currentSourceTenantIds.has(tenantId)) {
        discrepancies.push({
          type: 'missing_source_tenant',
          tenantId,
          message: `Tenant ${tenantId} not found in source database after rollback`
        });
      }
    }

    logger.info(`Source database verification: ${originalSourceTenantIds.size} expected, ${currentSourceTenantIds.size} found`);

    // Verify destination database cleanup
    logger.info('Verifying destination database cleanup...');
    
    const destTenantsCollection = destDb.collection('tenants');
    const currentDestTenants = await destTenantsCollection.find({}).toArray();
    const currentDestTenantIds = new Set(currentDestTenants.map(t => t.tenantId));

    // Get original destination tenant IDs from backup
    const originalDestTenantIds = new Set();
    if (destBackupData.collections.tenants && destBackupData.collections.tenants.records) {
      destBackupData.collections.tenants.records.forEach(record => {
        if (record.tenantId) {
          originalDestTenantIds.add(record.tenantId);
        }
      });
    }

    // Check if destination is back to original state
    // (should only have tenants that were there before migration)
    for (const tenantId of currentDestTenantIds) {
      if (!originalDestTenantIds.has(tenantId)) {
        discrepancies.push({
          type: 'extra_destination_tenant',
          tenantId,
          message: `Tenant ${tenantId} still exists in destination database after rollback`
        });
      }
    }

    logger.info(`Destination database verification: ${originalDestTenantIds.size} expected, ${currentDestTenantIds.size} found`);

    // Verify record counts match expectations
    const sourceCountMatch = currentSourceTenantIds.size >= originalSourceTenantIds.size;
    const destCountMatch = currentDestTenantIds.size === originalDestTenantIds.size;

    if (!sourceCountMatch) {
      discrepancies.push({
        type: 'source_count_mismatch',
        expected: originalSourceTenantIds.size,
        actual: currentSourceTenantIds.size,
        message: 'Source database record count does not match backup'
      });
    }

    if (!destCountMatch) {
      discrepancies.push({
        type: 'destination_count_mismatch',
        expected: originalDestTenantIds.size,
        actual: currentDestTenantIds.size,
        message: 'Destination database record count does not match backup'
      });
    }

    const valid = discrepancies.length === 0;

    if (valid) {
      logger.success('Rollback verification passed - databases restored to original state');
    } else {
      logger.error(`Rollback verification failed with ${discrepancies.length} discrepancies`);
    }

    return {
      valid,
      discrepancies,
      statistics: {
        sourceExpected: originalSourceTenantIds.size,
        sourceActual: currentSourceTenantIds.size,
        destinationExpected: originalDestTenantIds.size,
        destinationActual: currentDestTenantIds.size
      }
    };

  } catch (error) {
    logger.error('Rollback verification failed:', error);
    return {
      valid: false,
      discrepancies: [{
        type: 'verification_error',
        message: `Verification error: ${error.message}`
      }],
      error: error.message
    };
  }
}

/**
 * Generate manual recovery instructions
 * Used when automated rollback fails
 * 
 * @param {Object} metadata - Backup metadata
 * @param {Error} rollbackError - Error that occurred during rollback
 * @returns {string} Recovery instructions
 */
export function generateRecoveryInstructions(metadata, rollbackError) {
  const logger = new MigrationLogger();
  
  const instructions = `
=============================================================================
MANUAL RECOVERY INSTRUCTIONS
=============================================================================

Automated rollback failed. Please follow these manual recovery steps:

1. BACKUP LOCATION:
   ${metadata.backupDirectory}

2. SOURCE DATABASE BACKUP:
   ${metadata.source.filePath}
   Records: ${metadata.source.recordCount}

3. DESTINATION DATABASE BACKUP:
   ${metadata.destination.filePath}
   Records: ${metadata.destination.recordCount}

4. ROLLBACK ERROR:
   ${rollbackError.message}

5. MANUAL RECOVERY STEPS:

   a) Restore source database (${metadata.source.database}):
      - Use mongorestore or manual import from backup file
      - Verify all ${metadata.source.recordCount} tenant records are restored
      
   b) Clean destination database (${metadata.destination.database}):
      - Remove any newly migrated tenant records
      - Restore to state in backup file
      
   c) Verify restoration:
      - Check record counts in both databases
      - Verify application functionality
      
6. VERIFICATION QUERIES:

   Source database:
   db.tenants.countDocuments()
   // Should return: ${metadata.source.recordCount}

   Destination database:
   db.tenants.countDocuments()
   // Should return: ${metadata.destination.recordCount}

7. CONTACT SUPPORT:
   If manual recovery fails, contact system administrator with:
   - Backup ID: ${metadata.backupId}
   - Backup timestamp: ${metadata.timestamp}
   - Error details above

=============================================================================
`;

  logger.error('MANUAL RECOVERY REQUIRED');
  logger.error(instructions);

  // Save instructions to file
  const instructionsPath = path.join(
    metadata.backupDirectory,
    'RECOVERY_INSTRUCTIONS.txt'
  );
  
  try {
    fs.writeFileSync(instructionsPath, instructions);
    logger.info(`Recovery instructions saved to: ${instructionsPath}`);
  } catch (error) {
    logger.error('Failed to save recovery instructions:', error.message);
  }

  return instructions;
}

/**
 * Custom error class for rollback errors
 */
export class RollbackError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'RollbackError';
    this.originalError = originalError;
    this.recoverable = false;

    if (originalError) {
      if (originalError.stack) {
        this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
      } else if (Array.isArray(originalError)) {
        this.details = originalError;
      }
    }
  }
}
