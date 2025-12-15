import express from 'express';
import {
    getAllReports,
    getReportById,
    createReport,
    updateReport,
    deleteReport,
    executeReport,
    exportReport,
    getTemplates,
    getExecutionHistory,
    getReportStatistics,
    shareReport,
    unshareReport
} from '../controllers/report.controller.js';
import {
    protect,
    hrOrAdmin,
    canViewReports,
    validateReportFields,
    validateReportFilters,
    validateReportSchedule,
    validateVisualization,
    validateExportSettings,
    validateReportType,
    checkReportAccess
} from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all report routes (after authentication)
router.use(requireModuleLicense(MODULES.REPORTING));

// Get all reports for user
router.get('/',
    getAllReports
);

// Get report templates
router.get('/templates',
    getTemplates
);

// Get report by ID
router.get('/:id',
    checkReportAccess,
    getReportById
);

// Create new report with validation
router.post('/',
    validateReportType,
    validateReportFields,
    validateReportFilters,
    validateReportSchedule,
    validateVisualization,
    validateExportSettings,
    createReport
);

// Update report with validation
router.put('/:id',
    checkReportAccess,
    validateReportType,
    validateReportFields,
    validateReportFilters,
    validateReportSchedule,
    validateVisualization,
    validateExportSettings,
    updateReport
);

// Delete report
router.delete('/:id',
    checkReportAccess,
    deleteReport
);

// Execute report
router.post('/:id/execute',
    checkReportAccess,
    executeReport
);

// Export report execution
router.get('/execution/:executionId/export',
    exportReport
);

// Get execution history
router.get('/:id/history',
    checkReportAccess,
    getExecutionHistory
);

// Get report statistics
router.get('/:id/statistics',
    checkReportAccess,
    getReportStatistics
);

// Share report
router.post('/:id/share',
    shareReport
);

// Unshare report
router.delete('/:id/share/:userId',
    unshareReport
);

export default router;
