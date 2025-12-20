/**
 * Platform Logging Control Routes
 * 
 * API routes for platform administrators to control and monitor company logging.
 * All routes require platform administrator privileges.
 */

import express from 'express';
import platformLoggingControlController from '../controllers/platformLoggingControl.controller.js';
import { requireModuleLicense } from '../middleware/licenseValidation.middleware.js';
import { MODULES } from '../platform/system/models/license.model.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import { trackLoggingOperation } from '../middleware/licenseControlledLogging.middleware.js';

const router = express.Router();

// Apply authentication and platform admin role requirement to all routes
router.use(protect);
router.use(requireRole('platform_admin'));
router.use(trackLoggingOperation());

/**
 * @route   GET /api/platform/logging-control/dashboard
 * @desc    Get platform logging control dashboard
 * @access  Platform Admin
 */
router.get('/dashboard', platformLoggingControlController.getControlDashboard);

/**
 * @route   GET /api/platform/logging-control/summary
 * @desc    Get platform control summary
 * @access  Platform Admin
 */
router.get('/summary', platformLoggingControlController.getPlatformControlSummary);

/**
 * @route   GET /api/platform/logging-control/company/:tenantId/status
 * @desc    Get detailed logging status for a specific company
 * @access  Platform Admin
 */
router.get('/company/:tenantId/status', platformLoggingControlController.getCompanyLoggingStatus);

/**
 * @route   GET /api/platform/logging-control/company/:tenantId/capabilities
 * @desc    Get logging capabilities for a specific company
 * @access  Platform Admin
 */
router.get('/company/:tenantId/capabilities', platformLoggingControlController.getCompanyCapabilities);

/**
 * @route   GET /api/platform/logging-control/company/:tenantId/usage
 * @desc    Get usage statistics for a specific company
 * @access  Platform Admin
 * @query   days - Number of days to include in statistics (default: 30)
 */
router.get('/company/:tenantId/usage', platformLoggingControlController.getCompanyUsageStats);

/**
 * @route   POST /api/platform/logging-control/company/:tenantId/enforce-license
 * @desc    Enforce logging license for a company
 * @access  Platform Admin
 * @body    { reason?: string }
 */
router.post('/company/:tenantId/enforce-license', platformLoggingControlController.enforceLoggingLicense);

/**
 * @route   POST /api/platform/logging-control/company/:tenantId/suspend
 * @desc    Suspend company logging
 * @access  Platform Admin
 * @body    { reason: string }
 */
router.post('/company/:tenantId/suspend', platformLoggingControlController.suspendCompanyLogging);

/**
 * @route   POST /api/platform/logging-control/company/:tenantId/restore
 * @desc    Restore company logging
 * @access  Platform Admin
 * @body    { reason: string }
 */
router.post('/company/:tenantId/restore', platformLoggingControlController.restoreCompanyLogging);

/**
 * @route   POST /api/platform/logging-control/company/:tenantId/force-essential
 * @desc    Force essential logging for a company (emergency override)
 * @access  Platform Admin
 * @body    { reason: string, duration?: string }
 */
router.post('/company/:tenantId/force-essential', platformLoggingControlController.forceEssentialLogging);

/**
 * @route   POST /api/platform/logging-control/bulk-enforce
 * @desc    Bulk enforce logging policies across all companies
 * @access  Platform Admin
 * @body    { options?: object }
 */
router.post('/bulk-enforce', platformLoggingControlController.bulkEnforcePolicies);

/**
 * @route   POST /api/platform/logging-control/generate-report
 * @desc    Generate platform logging control report
 * @access  Platform Admin
 * @body    { options?: { period?: string, format?: string } }
 */
router.post('/generate-report', platformLoggingControlController.generateControlReport);

export default router;