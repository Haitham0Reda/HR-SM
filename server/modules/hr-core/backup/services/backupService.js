// Backup Service - Tenant-scoped backup for HR-Core data only
import mongoose from 'mongoose';
import logger from '../../../../utils/logger.js';

/**
 * HARD RULE: Backup ONLY HR-Core collections
 * NEVER backup optional module data (tasks, payroll, documents, etc.)
 */
const HR_CORE_COLLECTIONS = [
    'attendances',
    'requests',
    'holidays',
    'missions',
    'vacations',
    'mixedvacations',
    'vacationbalances',
    'overtimes',
    'users',
    'departments',
    'positions',
    'forgetchecks'
];

/**
 * Backup service for tenant-scoped HR-Core data
 */
class BackupService {
    /**
     * Create a backup for a specific tenant
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object>} Backup data
     */
    async createBackup(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required for backup');
            }
            
            logger.info(`Starting backup for tenant: ${tenantId}`);
            
            const backup = {
                tenantId,
                timestamp: new Date().toISOString(),
                collections: {},
                metadata: {
                    version: '1.0',
                    type: 'hr-core',
                    collectionCount: 0,
                    documentCount: 0
                }
            };
            
            // Backup only HR-Core collections
            for (const collectionName of HR_CORE_COLLECTIONS) {
                try {
                    const collection = mongoose.connection.collection(collectionName);
                    
                    // Query only documents for this tenant
                    const documents = await collection.find({ tenantId }).toArray();
                    
                    if (documents.length > 0) {
                        backup.collections[collectionName] = documents;
                        backup.metadata.collectionCount++;
                        backup.metadata.documentCount += documents.length;
                        
                        logger.info(`Backed up ${documents.length} documents from ${collectionName}`);
                    }
                } catch (error) {
                    logger.warn(`Collection ${collectionName} not found or error: ${error.message}`);
                    // Continue with other collections
                }
            }
            
            logger.info(`Backup completed for tenant ${tenantId}: ${backup.metadata.documentCount} documents from ${backup.metadata.collectionCount} collections`);
            
            return backup;
        } catch (error) {
            logger.error(`Error creating backup for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    /**
     * Restore a backup for a specific tenant
     * @param {Object} backupData - Backup data to restore
     * @param {string} tenantId - Tenant identifier (must match backup)
     * @returns {Promise<Object>} Restore result
     */
    async restoreBackup(backupData, tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required for restore');
            }
            
            if (backupData.tenantId !== tenantId) {
                throw new Error(`Backup tenant ID (${backupData.tenantId}) does not match target tenant ID (${tenantId})`);
            }
            
            logger.info(`Starting restore for tenant: ${tenantId}`);
            
            const result = {
                tenantId,
                timestamp: new Date().toISOString(),
                collectionsRestored: 0,
                documentsRestored: 0,
                errors: []
            };
            
            // Restore only HR-Core collections
            for (const collectionName of Object.keys(backupData.collections)) {
                // Validate collection is in whitelist
                if (!HR_CORE_COLLECTIONS.includes(collectionName)) {
                    const error = `Collection ${collectionName} is not in HR-Core whitelist - skipping`;
                    logger.warn(error);
                    result.errors.push(error);
                    continue;
                }
                
                try {
                    const collection = mongoose.connection.collection(collectionName);
                    const documents = backupData.collections[collectionName];
                    
                    // Verify all documents belong to the tenant
                    const invalidDocs = documents.filter(doc => doc.tenantId !== tenantId);
                    if (invalidDocs.length > 0) {
                        throw new Error(`Found ${invalidDocs.length} documents with incorrect tenantId in ${collectionName}`);
                    }
                    
                    // Delete existing documents for this tenant in this collection
                    await collection.deleteMany({ tenantId });
                    
                    // Insert backup documents
                    if (documents.length > 0) {
                        await collection.insertMany(documents);
                        result.collectionsRestored++;
                        result.documentsRestored += documents.length;
                        
                        logger.info(`Restored ${documents.length} documents to ${collectionName}`);
                    }
                } catch (error) {
                    const errorMsg = `Error restoring ${collectionName}: ${error.message}`;
                    logger.error(errorMsg);
                    result.errors.push(errorMsg);
                }
            }
            
            logger.info(`Restore completed for tenant ${tenantId}: ${result.documentsRestored} documents from ${result.collectionsRestored} collections`);
            
            return result;
        } catch (error) {
            logger.error(`Error restoring backup for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    
    /**
     * Validate a backup file
     * @param {Object} backupData - Backup data to validate
     * @returns {Object} Validation result
     */
    validateBackup(backupData) {
        const errors = [];
        const warnings = [];
        
        // Check required fields
        if (!backupData.tenantId) {
            errors.push('Missing tenantId');
        }
        
        if (!backupData.timestamp) {
            errors.push('Missing timestamp');
        }
        
        if (!backupData.collections || typeof backupData.collections !== 'object') {
            errors.push('Missing or invalid collections object');
        }
        
        // Check for non-HR-Core collections
        if (backupData.collections) {
            for (const collectionName of Object.keys(backupData.collections)) {
                if (!HR_CORE_COLLECTIONS.includes(collectionName)) {
                    warnings.push(`Collection ${collectionName} is not in HR-Core whitelist`);
                }
            }
        }
        
        // Check tenant isolation
        if (backupData.collections) {
            for (const [collectionName, documents] of Object.entries(backupData.collections)) {
                const invalidDocs = documents.filter(doc => doc.tenantId !== backupData.tenantId);
                if (invalidDocs.length > 0) {
                    errors.push(`Collection ${collectionName} contains ${invalidDocs.length} documents with incorrect tenantId`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get backup statistics for a tenant
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object>} Backup statistics
     */
    async getBackupStats(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            const stats = {
                tenantId,
                collections: {},
                totalDocuments: 0
            };
            
            for (const collectionName of HR_CORE_COLLECTIONS) {
                try {
                    const collection = mongoose.connection.collection(collectionName);
                    const count = await collection.countDocuments({ tenantId });
                    
                    if (count > 0) {
                        stats.collections[collectionName] = count;
                        stats.totalDocuments += count;
                    }
                } catch (error) {
                    logger.warn(`Error getting stats for ${collectionName}: ${error.message}`);
                }
            }
            
            return stats;
        } catch (error) {
            logger.error(`Error getting backup stats for tenant ${tenantId}:`, error);
            throw error;
        }
    }
}

export default new BackupService();
