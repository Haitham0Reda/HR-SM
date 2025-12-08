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
} from '../controller/report.controller.js';
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
} from '../middleware/index.js';
import { requireModuleLicense } from '../middleware/licenseValidation.middleware.js';
import { MODULES } from '../models/license.model.js';

const router = express.Router();

// Apply license validation to all report routes
router.use(requireModuleLicense(MODULES.REPORTING));

// Get all reports for user
router.get('/',
    protect,
    getAllReports
);

// Get report templates
router.get('/templates',
    protect,
    getTemplates
);

// Get report by ID
router.get('/:id',
    protect,
    checkReportAccess,
    getReportById
);

// Create new report with validation
router.post('/',
    protect,
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
    protect,
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
    protect,
    checkReportAccess,
    deleteReport
);

// Execute report
router.post('/:id/execute',
    protect,
    checkReportAccess,
    executeReport
);

// Export report execution
router.get('/execution/:executionId/export',
    protect,
    exportReport
);

// Get execution history
router.get('/:id/history',
    protect,
    checkReportAccess,
    getExecutionHistory
);

// Get report statistics
router.get('/:id/statistics',
    protect,
    checkReportAccess,
    getReportStatistics
);

// Share report
router.post('/:id/share',
    protect,
    shareReport
);

// Unshare report
router.delete('/:id/share/:userId',
    protect,
    unshareReport
);

export default router;
