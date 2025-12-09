// Backup Controller - Tenant-scoped backup management
import backupService from '../services/backupService.js';
import logger from '../../../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Create a backup for the current tenant
 */
export const createBackup = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        logger.info(`Backup requested by user ${req.user._id} for tenant ${tenantId}`);
        
        const backup = await backupService.createBackup(tenantId);
        
        // Optionally save to file
        if (req.query.saveToFile === 'true') {
            const backupDir = path.join(process.cwd(), 'backups', 'tenants', tenantId);
            await fs.mkdir(backupDir, { recursive: true });
            
            const filename = `backup-${Date.now()}.json`;
            const filepath = path.join(backupDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(backup, null, 2));
            
            logger.info(`Backup saved to file: ${filepath}`);
            
            return res.json({
                success: true,
                message: 'Backup created and saved to file',
                data: {
                    ...backup.metadata,
                    tenantId: backup.tenantId,
                    timestamp: backup.timestamp,
                    filepath
                }
            });
        }
        
        // Return backup data
        res.json({
            success: true,
            message: 'Backup created successfully',
            data: backup
        });
    } catch (error) {
        logger.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Restore a backup for the current tenant
 */
export const restoreBackup = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const { backupData } = req.body;
        
        if (!backupData) {
            return res.status(400).json({ error: 'Backup data is required' });
        }
        
        // Validate backup
        const validation = backupService.validateBackup(backupData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid backup data',
                details: validation.errors
            });
        }
        
        // Ensure backup belongs to this tenant
        if (backupData.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Backup does not belong to this tenant'
            });
        }
        
        logger.info(`Restore requested by user ${req.user._id} for tenant ${tenantId}`);
        
        const result = await backupService.restoreBackup(backupData, tenantId);
        
        res.json({
            success: true,
            message: 'Backup restored successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Validate a backup file
 */
export const validateBackup = async (req, res) => {
    try {
        const { backupData } = req.body;
        
        if (!backupData) {
            return res.status(400).json({ error: 'Backup data is required' });
        }
        
        const validation = backupService.validateBackup(backupData);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        logger.error('Error validating backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get backup statistics for the current tenant
 */
export const getBackupStats = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const stats = await backupService.getBackupStats(tenantId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting backup stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * List available backups for the current tenant
 */
export const listBackups = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const backupDir = path.join(process.cwd(), 'backups', 'tenants', tenantId);
        
        try {
            const files = await fs.readdir(backupDir);
            const backupFiles = files.filter(f => f.endsWith('.json'));
            
            const backups = await Promise.all(
                backupFiles.map(async (filename) => {
                    const filepath = path.join(backupDir, filename);
                    const stats = await fs.stat(filepath);
                    
                    return {
                        filename,
                        filepath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
            );
            
            res.json({
                success: true,
                data: backups.sort((a, b) => b.created - a.created)
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.json({
                    success: true,
                    data: [],
                    message: 'No backups found'
                });
            }
            throw error;
        }
    } catch (error) {
        logger.error('Error listing backups:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
