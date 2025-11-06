import express from 'express';
import {
    getAllBackupExecutions,
    getBackupExecutionById,
    getBackupExecutionHistory,
    getBackupExecutionStats,
    getFailedExecutions,
    getRunningExecutions,
    cancelBackupExecution,
    retryFailedExecution,
    deleteBackupExecution,
    exportExecutionLogs
} from '../controller/backupExecution.controller.js';
import {
    protect,
    admin,
    canViewAudit
} from '../middleware/index.js';

const router = express.Router();

// Get all backup executions - Admin only
router.get('/',
    protect,
    admin,
    getAllBackupExecutions
);

// Get backup execution by ID - Admin only
router.get('/:id',
    protect,
    admin,
    getBackupExecutionById
);

// Get execution history for a specific backup - Admin only
router.get('/backup/:backupId/history',
    protect,
    admin,
    getBackupExecutionHistory
);

// Get execution statistics - Admin only
router.get('/statistics',
    protect,
    admin,
    getBackupExecutionStats
);

// Get failed executions - Admin only
router.get('/failed',
    protect,
    admin,
    getFailedExecutions
);

// Get running executions - Admin only
router.get('/running',
    protect,
    admin,
    getRunningExecutions
);

// Cancel a running backup execution - Admin only
router.post('/:id/cancel',
    protect,
    admin,
    cancelBackupExecution
);

// Retry a failed execution - Admin only
router.post('/:id/retry',
    protect,
    admin,
    retryFailedExecution
);

// Delete backup execution record - Admin only
router.delete('/:id',
    protect,
    admin,
    deleteBackupExecution
);

// Export execution logs - Admin only
router.get('/export/logs',
    protect,
    admin,
    exportExecutionLogs
);

export default router;