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
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';

const router = express.Router();

/**
 * License Management Routes
 * All routes require authentication and admin privileges
 */

// Get all licenses - GET /api/v1/licenses
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        // Mock response for all licenses
        const licenses = [
            {
                tenantId: 'techcorp_solutions',
                licenseType: 'enterprise',
                status: 'active',
                expiryDate: '2025-12-31',
                modules: ['hr-core', 'payroll', 'reports', 'analytics'],
                maxUsers: 500,
                currentUsers: 150
            },
            {
                tenantId: 'demo_company',
                licenseType: 'standard',
                status: 'active',
                expiryDate: '2025-06-30',
                modules: ['hr-core', 'payroll'],
                maxUsers: 100,
                currentUsers: 45
            }
        ];

        res.json({
            success: true,
            data: licenses,
            message: 'Licenses retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve licenses',
            error: error.message
        });
    }
});

// Query audit logs - GET /api/v1/licenses/audit
// This must come before /:tenantId routes to avoid matching "audit" as a tenantId
router.get('/audit', requireAuth, requireRole('admin'), queryAuditLogs);

// Create or update license - POST /api/v1/licenses
router.post('/', requireAuth, requireRole('admin'), createOrUpdateLicense);

// Get license details - GET /api/v1/licenses/:tenantId
router.get('/:tenantId', requireAuth, requireRole('admin'), getLicenseDetails);

// Get usage metrics - GET /api/v1/licenses/:tenantId/usage
router.get('/:tenantId/usage', requireAuth, requireRole('admin'), getUsageMetrics);

// Activate module - POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate
router.post('/:tenantId/modules/:moduleKey/activate', requireAuth, requireRole('admin'), activateModule);

// Deactivate module - POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate
router.post('/:tenantId/modules/:moduleKey/deactivate', requireAuth, requireRole('admin'), deactivateModule);

export default router;
