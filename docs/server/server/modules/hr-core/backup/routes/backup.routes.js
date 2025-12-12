import express from 'express';
import {
    getAllBackups,
    getBackupById,
    createBackup,
    updateBackup,
    deleteBackup,
    executeBackup,
    getExecutionHistory,
    getBackupStatistics,
    restoreBackup
} from '../controllers/backup.controller.js';
import {
    protect,
    admin,
    validateBackupType,
    validateBackupSchedule,
    validateEncryption,
    validateCompression,
    validateRetention,
    validateNotification,
    validateSources,
    validateStorage
} from '../../../../middleware/index.js';

const router = express.Router();

// Get all backup configurations - Admin only
router.get('/',
    protect,
    admin,
    getAllBackups
);

// Get backup by ID - Admin only
router.get('/:id',
    protect,
    admin,
    getBackupById
);

// Create backup configuration with validation - Admin only
router.post('/',
    protect,
    admin,
    validateBackupType,
    validateBackupSchedule,
    validateEncryption,
    validateCompression,
    validateRetention,
    validateNotification,
    validateSources,
    validateStorage,
    createBackup
);

// Update backup configuration with validation - Admin only
router.put('/:id',
    protect,
    admin,
    validateBackupType,
    validateBackupSchedule,
    validateEncryption,
    validateCompression,
    validateRetention,
    validateNotification,
    validateSources,
    validateStorage,
    updateBackup
);

// Delete backup configuration - Admin only
router.delete('/:id',
    protect,
    admin,
    deleteBackup
);

// Execute backup manually - Admin only
router.post('/:id/execute',
    protect,
    admin,
    executeBackup
);

// Get execution history - Admin only
router.get('/:backupId/history',
    protect,
    admin,
    getExecutionHistory
);

// Get backup statistics - Admin only
router.get('/:backupId/statistics',
    protect,
    admin,
    getBackupStatistics
);

// Restore from backup - Admin only
router.post('/restore/:executionId',
    protect,
    admin,
    restoreBackup
);

export default router;
