// Backup Service - Tenant-scoped backup for HR-Core data only
import { Op } from 'sequelize';
import logger from '../../../../utils/logger.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';
import Attendance from '../../attendance/models/attendance.model.js';
import Request from '../../requests/models/request.model.js';
import Holiday from '../../holidays/models/holiday.model.js';
import Mission from '../../missions/models/mission.model.js';
import Vacation from '../../vacations/models/vacation.model.js';
import MixedVacation from '../../vacations/models/mixedVacation.model.js';
import VacationBalance from '../../vacations/models/vacationBalance.model.js';
import Overtime from '../../overtime/models/overtime.model.js';
import ForgetCheck from '../../attendance/models/forgetCheck.model.js';

/**
 * HARD RULE: Backup ONLY HR-Core collections
 * NEVER backup optional module data (tasks, payroll, documents, etc.)
 */
const HR_CORE_MODELS = {
    attendances: Attendance,
    requests: Request,
    holidays: Holiday,
    missions: Mission,
    vacations: Vacation,
    mixedvacations: MixedVacation,
    vacationbalances: VacationBalance,
    overtimes: Overtime,
    users: User,
    departments: Department,
    positions: Position,
    forgetchecks: ForgetCheck
};

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
            for (const [collectionName, Model] of Object.entries(HR_CORE_MODELS)) {
                try {
                    // Query only documents for this tenant
                    const documents = await Model.findAll({
                        where: { tenant_id: tenantId },
                        raw: true
                    });
                    
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
            
            // Restore each collection
            for (const [collectionName, documents] of Object.entries(backupData.collections)) {
                try {
                    const Model = HR_CORE_MODELS[collectionName];
                    if (!Model) {
                        logger.warn(`Model not found for collection: ${collectionName}`);
                        continue;
                    }
                    
                    // Delete existing documents for this tenant in this collection
                    await Model.destroy({
                        where: { tenant_id: tenantId }
                    });
                    
                    // Insert backup documents
                    if (documents.length > 0) {
                        await Model.bulkCreate(documents, {
                            validate: true,
                            individualHooks: false
                        });
                        
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
     * Get backup statistics for a tenant
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object>} Backup statistics
     */
    async getBackupStats(tenantId) {
        try {
            const stats = {
                tenantId,
                collections: {},
                totalDocuments: 0
            };
            
            for (const [collectionName, Model] of Object.entries(HR_CORE_MODELS)) {
                try {
                    const count = await Model.count({
                        where: { tenant_id: tenantId }
                    });
                    
                    stats.collections[collectionName] = count;
                    stats.totalDocuments += count;
                } catch (error) {
                    logger.warn(`Error counting ${collectionName}: ${error.message}`);
                    stats.collections[collectionName] = 0;
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
