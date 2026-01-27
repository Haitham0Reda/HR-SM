/**
 * Backup Creation Module
 * 
 * Creates backups of both source and destination databases before migration.
 * Stores backups with timestamps and verifies backup integrity.
 * 
 * Requirements: 2.6, 12.1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationLogger } from '../utils/migrationLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create backup of both databases before migration
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {Object} options - Backup options
 * @param {string} options.backupDir - Directory to store backups
 * @param {boolean} options.verifyIntegrity - Whether to verify backup integrity
 * @returns {Promise<Object>} Backup result with file paths and metadata
 */
export async function createBackup(sourceDb, destDb, options = {}) {
  const logger = new MigrationLogger();
  const backupDir = options.backupDir || 'backups/migrations';
  const verifyIntegrity = options.verifyIntegrity !== undefined ? options.verifyIntegrity : true;

  try {
    logger.info('Starting backup creation before migration');
    logger.info('Backup options:', { backupDir, verifyIntegrity });

    // Generate timestamp for backup
    const timestamp = generateBackupTimestamp();
    const backupId = `backup-${timestamp}`;

    // Ensure backup directory exists
    const fullBackupDir = path.resolve(backupDir, backupId);
    ensureDirectoryExists(fullBackupDir);

    logger.info(`Backup directory: ${fullBackupDir}`);

    // Step 1: Backup source database (hrsm_platform)
    logger.info('Backing up source database (hrsm_platform)...');
    const sourceBackup = await backupDatabase(
      sourceDb,
      fullBackupDir,
      'source',
      ['tenants'],
      logger
    );
    logger.success(`Source database backed up: ${sourceBackup.recordCount} records`);

    // Step 2: Backup destination database (hrsm-licenses)
    logger.info('Backing up destination database (hrsm-licenses)...');
    const destBackup = await backupDatabase(
      destDb,
      fullBackupDir,
      'destination',
      ['tenants', 'subscriptions', 'enabled_modules'],
      logger
    );
    logger.success(`Destination database backed up: ${destBackup.recordCount} records`);

    // Step 3: Create backup metadata
    const metadata = {
      backupId,
      timestamp: new Date().toISOString(),
      source: {
        database: sourceDb.databaseName,
        collections: sourceBackup.collections,
        recordCount: sourceBackup.recordCount,
        filePath: sourceBackup.filePath
      },
      destination: {
        database: destDb.databaseName,
        collections: destBackup.collections,
        recordCount: destBackup.recordCount,
        filePath: destBackup.filePath
      },
      backupDirectory: fullBackupDir
    };

    // Save metadata to file
    const metadataPath = path.join(fullBackupDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    logger.success(`Backup metadata saved: ${metadataPath}`);

    // Step 4: Verify backup integrity
    if (verifyIntegrity) {
      logger.info('Verifying backup integrity...');
      const verificationResult = await verifyBackupIntegrity(metadata, logger);
      
      if (!verificationResult.valid) {
        throw new BackupError('Backup integrity verification failed', verificationResult.errors);
      }
      
      logger.success('Backup integrity verified');
      metadata.verified = true;
      metadata.verifiedAt = new Date().toISOString();
      
      // Update metadata with verification status
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    logger.success('Backup creation completed successfully');

    return {
      success: true,
      backupId,
      metadata,
      files: {
        source: sourceBackup.filePath,
        destination: destBackup.filePath,
        metadata: metadataPath
      }
    };

  } catch (error) {
    logger.error('Failed to create backup:', error);
    throw new BackupError('Backup creation failed', error);
  }
}

/**
 * Backup a specific database
 * 
 * @param {mongoose.mongo.Db} db - Database connection
 * @param {string} backupDir - Backup directory
 * @param {string} label - Database label (source/destination)
 * @param {Array<string>} collections - Collections to backup
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Backup result
 */
async function backupDatabase(db, backupDir, label, collections, logger) {
  const backupData = {
    database: db.databaseName,
    label,
    timestamp: new Date().toISOString(),
    collections: {}
  };

  let totalRecords = 0;

  // Backup each collection
  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName);
      
      // Check if collection exists
      const collectionExists = await collection.countDocuments({}).catch(() => 0);
      
      if (collectionExists === 0) {
        logger.warn(`Collection ${collectionName} is empty or does not exist, skipping`);
        backupData.collections[collectionName] = {
          recordCount: 0,
          records: []
        };
        continue;
      }

      // Fetch all documents from collection
      const records = await collection.find({}).toArray();
      
      backupData.collections[collectionName] = {
        recordCount: records.length,
        records: records
      };
      
      totalRecords += records.length;
      
      logger.info(`Backed up ${records.length} records from ${collectionName}`);
      
    } catch (error) {
      logger.error(`Failed to backup collection ${collectionName}:`, error.message);
      backupData.collections[collectionName] = {
        recordCount: 0,
        records: [],
        error: error.message
      };
    }
  }

  // Save backup to file
  const fileName = `${label}-${db.databaseName}.json`;
  const filePath = path.join(backupDir, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  logger.info(`Backup saved to: ${filePath}`);

  return {
    filePath,
    recordCount: totalRecords,
    collections: Object.keys(backupData.collections)
  };
}

/**
 * Verify backup integrity
 * 
 * @param {Object} metadata - Backup metadata
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Verification result
 */
async function verifyBackupIntegrity(metadata, logger) {
  const errors = [];
  const warnings = [];

  try {
    // Verify source backup file exists and is readable
    if (!fs.existsSync(metadata.source.filePath)) {
      errors.push(`Source backup file not found: ${metadata.source.filePath}`);
    } else {
      try {
        const sourceData = JSON.parse(fs.readFileSync(metadata.source.filePath, 'utf8'));
        
        // Verify record count matches
        let actualRecordCount = 0;
        for (const collectionName in sourceData.collections) {
          actualRecordCount += sourceData.collections[collectionName].recordCount;
        }
        
        if (actualRecordCount !== metadata.source.recordCount) {
          errors.push(
            `Source backup record count mismatch: expected ${metadata.source.recordCount}, got ${actualRecordCount}`
          );
        }
        
        // Verify collections exist
        for (const collectionName of metadata.source.collections) {
          if (!sourceData.collections[collectionName]) {
            errors.push(`Source backup missing collection: ${collectionName}`);
          }
        }
        
      } catch (error) {
        errors.push(`Failed to read source backup file: ${error.message}`);
      }
    }

    // Verify destination backup file exists and is readable
    if (!fs.existsSync(metadata.destination.filePath)) {
      errors.push(`Destination backup file not found: ${metadata.destination.filePath}`);
    } else {
      try {
        const destData = JSON.parse(fs.readFileSync(metadata.destination.filePath, 'utf8'));
        
        // Verify record count matches
        let actualRecordCount = 0;
        for (const collectionName in destData.collections) {
          actualRecordCount += destData.collections[collectionName].recordCount;
        }
        
        if (actualRecordCount !== metadata.destination.recordCount) {
          errors.push(
            `Destination backup record count mismatch: expected ${metadata.destination.recordCount}, got ${actualRecordCount}`
          );
        }
        
        // Verify collections exist
        for (const collectionName of metadata.destination.collections) {
          if (!destData.collections[collectionName]) {
            errors.push(`Destination backup missing collection: ${collectionName}`);
          }
        }
        
      } catch (error) {
        errors.push(`Failed to read destination backup file: ${error.message}`);
      }
    }

    // Check backup file sizes
    if (fs.existsSync(metadata.source.filePath)) {
      const sourceStats = fs.statSync(metadata.source.filePath);
      if (sourceStats.size === 0) {
        errors.push('Source backup file is empty');
      } else if (sourceStats.size < 100) {
        warnings.push('Source backup file is suspiciously small');
      }
    }

    if (fs.existsSync(metadata.destination.filePath)) {
      const destStats = fs.statSync(metadata.destination.filePath);
      if (destStats.size === 0) {
        errors.push('Destination backup file is empty');
      } else if (destStats.size < 100) {
        warnings.push('Destination backup file is suspiciously small');
      }
    }

    const valid = errors.length === 0;

    if (warnings.length > 0) {
      warnings.forEach(warning => logger.warn(warning));
    }

    if (errors.length > 0) {
      errors.forEach(error => logger.error(error));
    }

    return {
      valid,
      errors,
      warnings
    };

  } catch (error) {
    logger.error('Backup verification failed:', error);
    return {
      valid: false,
      errors: [`Verification error: ${error.message}`],
      warnings
    };
  }
}

/**
 * Load backup metadata from file
 * 
 * @param {string} backupId - Backup ID or path to backup directory
 * @param {string} baseBackupDir - Base backup directory
 * @returns {Object} Backup metadata
 */
export function loadBackupMetadata(backupId, baseBackupDir = 'backups/migrations') {
  const logger = new MigrationLogger();
  
  try {
    // Determine backup directory
    let backupDir;
    if (path.isAbsolute(backupId)) {
      backupDir = backupId;
    } else if (backupId.startsWith('backup-')) {
      backupDir = path.resolve(baseBackupDir, backupId);
    } else {
      backupDir = path.resolve(baseBackupDir, `backup-${backupId}`);
    }

    // Load metadata file
    const metadataPath = path.join(backupDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new BackupError(`Backup metadata not found: ${metadataPath}`);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    logger.info('Backup metadata loaded:', {
      backupId: metadata.backupId,
      timestamp: metadata.timestamp,
      sourceRecords: metadata.source.recordCount,
      destRecords: metadata.destination.recordCount
    });

    return metadata;
    
  } catch (error) {
    logger.error('Failed to load backup metadata:', error);
    throw new BackupError('Failed to load backup metadata', error);
  }
}

/**
 * List available backups
 * 
 * @param {string} baseBackupDir - Base backup directory
 * @returns {Array<Object>} List of available backups
 */
export function listBackups(baseBackupDir = 'backups/migrations') {
  const logger = new MigrationLogger();
  
  try {
    const backupPath = path.resolve(baseBackupDir);
    
    if (!fs.existsSync(backupPath)) {
      logger.warn(`Backup directory does not exist: ${backupPath}`);
      return [];
    }

    const entries = fs.readdirSync(backupPath, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('backup-')) {
        const metadataPath = path.join(backupPath, entry.name, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            backups.push({
              backupId: metadata.backupId,
              timestamp: metadata.timestamp,
              sourceRecords: metadata.source.recordCount,
              destRecords: metadata.destination.recordCount,
              verified: metadata.verified || false,
              path: path.join(backupPath, entry.name)
            });
          } catch (error) {
            logger.warn(`Failed to read backup metadata for ${entry.name}:`, error.message);
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logger.info(`Found ${backups.length} backups`);
    return backups;
    
  } catch (error) {
    logger.error('Failed to list backups:', error);
    throw new BackupError('Failed to list backups', error);
  }
}

/**
 * Generate backup timestamp
 * 
 * @returns {string} Timestamp string
 */
function generateBackupTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
}

/**
 * Ensure directory exists, create if it doesn't
 * 
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Custom error class for backup errors
 */
export class BackupError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'BackupError';
    this.originalError = originalError;
    this.recoverable = false;

    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack || originalError}`;
    }
  }
}
