// routes/license.routes.js
import express from 'express';
import {
    createOrUpdateLicense,
    getLicenseDetails,
    getUsageMetrics,
    queryAuditLogs,
    activateModule,
    deactivateModule
} from '../controllers/license.controller.js';
import { protect, admin } from '../../../middleware/index.js';

const router = express.Router();

/**
 * License Management Routes
 * All routes require authentication and admin privileges
 */

// Query audit logs - GET /api/v1/licenses/audit
// This must come before /:tenantId routes to avoid matching "audit" as a tenantId
router.get('/audit', protect, admin, queryAuditLogs);

// Create or update license - POST /api/v1/licenses
router.post('/', protect, admin, createOrUpdateLicense);

// Get license details - GET /api/v1/licenses/:tenantId
router.get('/:tenantId', protect, admin, getLicenseDetails);

// Get usage metrics - GET /api/v1/licenses/:tenantId/usage
router.get('/:tenantId/usage', protect, admin, getUsageMetrics);

// Activate module - POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate
router.post('/:tenantId/modules/:moduleKey/activate', protect, admin, activateModule);

// Deactivate module - POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate
router.post('/:tenantId/modules/:moduleKey/deactivate', protect, admin, deactivateModule);

export default router;
