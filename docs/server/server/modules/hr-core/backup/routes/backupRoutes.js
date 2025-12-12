import express from 'express';
import {
    createBackup,
    restoreBackup,
    validateBackup,
    getBackupStats,
    listBackups
} from '../controllers/backupController.js';
import { protect, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// All backup operations require admin or HR role
router.use(protect);
router.use(checkRole(['admin', 'hr']));

// Create backup
router.post('/create', createBackup);

// Restore backup
router.post('/restore', restoreBackup);

// Validate backup
router.post('/validate', validateBackup);

// Get backup statistics
router.get('/stats', getBackupStats);

// List available backups
router.get('/list', listBackups);

export default router;
