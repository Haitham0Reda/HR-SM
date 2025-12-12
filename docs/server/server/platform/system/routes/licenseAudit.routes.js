// routes/licenseAudit.routes.js
import express from 'express';
import {
    queryAuditLogs,
    getAuditStatistics,
    getRecentViolations,
    getModuleAuditTrail,
    getAuditMetadata,
    createAuditLog,
    cleanupOldLogs
} from '../controllers/licenseAudit.controller.js';

const router = express.Router();

/**
 * Audit Log Routes
 * Base path: /api/v1/licenses/audit
 * 
 * All routes should be protected with authentication middleware
 * Admin-only routes should also include authorization middleware
 */

/**
 * @route   GET /api/v1/licenses/audit
 * @desc    Query audit logs with filters
 * @access  Protected (Admin/Manager)
 * @query   tenantId, moduleKey, eventType, severity, startDate, endDate, limit, skip
 */
router.get('/', queryAuditLogs);

/**
 * @route   GET /api/v1/licenses/audit/statistics
 * @desc    Get audit log statistics
 * @access  Protected (Admin)
 * @query   tenantId, startDate, endDate
 */
router.get('/statistics', getAuditStatistics);

/**
 * @route   GET /api/v1/licenses/audit/violations
 * @desc    Get recent violations (high-priority events)
 * @access  Protected (Admin)
 * @query   tenantId, limit
 */
router.get('/violations', getRecentViolations);

/**
 * @route   GET /api/v1/licenses/audit/metadata
 * @desc    Get available event types and severity levels
 * @access  Protected
 */
router.get('/metadata', getAuditMetadata);

/**
 * @route   GET /api/v1/licenses/audit/module/:moduleKey
 * @desc    Get audit trail for a specific module
 * @access  Protected (Admin/Manager)
 * @query   tenantId, days
 */
router.get('/module/:moduleKey', getModuleAuditTrail);

/**
 * @route   POST /api/v1/licenses/audit
 * @desc    Create a manual audit log entry
 * @access  Protected (Admin only)
 * @body    tenantId, moduleKey, eventType, details, severity
 */
router.post('/', createAuditLog);

/**
 * @route   DELETE /api/v1/licenses/audit/cleanup
 * @desc    Clean up old audit logs
 * @access  Protected (Admin only)
 * @query   daysToKeep
 */
router.delete('/cleanup', cleanupOldLogs);

export default router;
