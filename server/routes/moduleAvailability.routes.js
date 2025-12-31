/**
 * Module Availability Routes
 * 
 * API endpoints for checking module availability based on tenant configuration and license.
 * Used by frontend applications to determine which features to show/hide.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import express from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../core/middleware/validation.js';
import { protect } from '../middleware/authMiddleware.js';
import { 
    getModuleAvailabilitySummary, 
    checkModuleAvailability,
    validateModuleConfiguration 
} from '../services/moduleAvailability.service.js';
import asyncHandler from '../core/utils/asyncHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * Get module availability summary for current tenant
 * GET /api/v1/modules/availability
 */
router.get('/availability', asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
        return res.status(400).json({
            success: false,
            error: 'TENANT_REQUIRED',
            message: 'Tenant context is required'
        });
    }

    // Create a minimal tenant object for the service
    const tenant = {
        id: tenantId,
        tenantId: tenantId,
        enabledModules: ['hr-core', 'tasks', 'communication', 'documents', 'reporting', 'payroll', 'life-insurance'], // Enable all modules in development
        name: 'Current Tenant'
    };

    const licenseInfo = req.licenseInfo || {
        valid: true,
        features: ['hr-core', 'attendance', 'vacations', 'documents', 'surveys', 'notifications', 'payroll', 'reports', 'dashboard', 'theme', 'holidays', 'requests', 'announcements', 'missions', 'communication', 'tasks', 'logging'],
        licenseType: 'development'
    };

    const summary = getModuleAvailabilitySummary(tenant, licenseInfo);

    logger.debug('Module availability requested', {
        tenantId: tenant.id || tenant._id,
        totalAvailable: summary.modules.total,
        availableModules: summary.modules.available
    });

    res.json({
        success: true,
        data: summary
    });
}));

/**
 * Check availability of a specific module
 * GET /api/v1/modules/:moduleName/availability
 */
router.get('/:moduleName/availability', 
    [
        param('moduleName')
            .isAlphanumeric('en-US', { ignore: '-' })
            .withMessage('Module name must be alphanumeric with hyphens')
            .isLength({ min: 1, max: 50 })
            .withMessage('Module name must be between 1 and 50 characters')
    ],
    validateRequest,
    asyncHandler(async (req, res) => {
        const { moduleName } = req.params;
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant context is required'
            });
        }

        // Create a minimal tenant object for the service
        const tenant = {
            id: tenantId,
            tenantId: tenantId,
            enabledModules: ['hr-core', 'tasks', 'communication', 'documents', 'reporting', 'payroll', 'life-insurance'], // Enable all modules in development
            name: 'Current Tenant'
        };

        const licenseInfo = req.licenseInfo || {
            valid: true,
            features: ['hr-core', 'attendance', 'vacations', 'documents', 'surveys', 'notifications', 'payroll', 'reports', 'dashboard', 'theme', 'holidays', 'requests', 'announcements', 'missions', 'communication', 'tasks', 'logging'],
            licenseType: 'development'
        };

        const availability = checkModuleAvailability(tenant, licenseInfo, moduleName);

        logger.debug('Module availability check', {
            tenantId: tenant.id || tenant._id,
            moduleName,
            available: availability.available,
            reason: availability.reason
        });

        res.json({
            success: true,
            data: {
                moduleName,
                available: availability.available,
                reason: availability.reason,
                details: availability.details,
                tenant: {
                    id: tenant.id || tenant._id,
                    name: tenant.name
                },
                license: {
                    valid: licenseInfo?.valid || false,
                    features: licenseInfo?.features || []
                }
            }
        });
    })
);

/**
 * Validate module configuration
 * POST /api/v1/modules/validate
 * Body: { modules: ['module1', 'module2'] }
 */
router.post('/validate',
    [
        // Validate request body
        // Note: express-validator doesn't have a direct body array validator,
        // so we'll validate in the handler
    ],
    asyncHandler(async (req, res) => {
        const { modules } = req.body;
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant context is required'
            });
        }

        if (!Array.isArray(modules)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_INPUT',
                message: 'Modules must be an array'
            });
        }

        if (modules.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_INPUT',
                message: 'At least one module must be specified'
            });
        }

        // Validate each module name
        for (const moduleName of modules) {
            if (typeof moduleName !== 'string' || !/^[a-zA-Z0-9-]+$/.test(moduleName)) {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_MODULE_NAME',
                    message: `Invalid module name: ${moduleName}`,
                    moduleName
                });
            }
        }

        // Create a minimal tenant object for the service
        const tenant = {
            id: tenantId,
            tenantId: tenantId,
            enabledModules: ['hr-core', 'tasks', 'communication', 'documents', 'reporting', 'payroll', 'life-insurance'], // Enable all modules in development
            name: 'Current Tenant'
        };

        const licenseInfo = req.licenseInfo || {
            valid: true,
            features: ['hr-core', 'attendance', 'vacations', 'documents', 'surveys', 'notifications', 'payroll', 'reports', 'dashboard', 'theme', 'holidays', 'requests', 'announcements', 'missions', 'communication', 'tasks', 'logging'],
            licenseType: 'development'
        };

        const validation = validateModuleConfiguration(tenant, modules, licenseInfo);

        logger.debug('Module configuration validation', {
            tenantId: tenant.id || tenant._id,
            requestedModules: modules,
            valid: validation.valid,
            validModules: validation.validModules,
            invalidModules: validation.invalidModules.map(m => m.name)
        });

        res.json({
            success: true,
            data: {
                valid: validation.valid,
                validModules: validation.validModules,
                invalidModules: validation.invalidModules,
                errors: validation.errors,
                tenant: {
                    id: tenant.id || tenant._id,
                    name: tenant.name
                }
            }
        });
    })
);

/**
 * Get module requirements (what license features are needed)
 * GET /api/v1/modules/requirements
 */
router.get('/requirements', asyncHandler(async (req, res) => {
    const { getRequiredFeature, OPTIONAL_MODULES, CORE_MODULES } = await import('../services/moduleAvailability.service.js');
    
    const requirements = {};
    
    // Get requirements for all modules
    const allModules = [...CORE_MODULES, ...OPTIONAL_MODULES];
    
    for (const moduleName of allModules) {
        const requiredFeature = getRequiredFeature(moduleName);
        requirements[moduleName] = {
            name: moduleName,
            requiredFeature: requiredFeature,
            isCore: CORE_MODULES.includes(moduleName),
            isOptional: OPTIONAL_MODULES.includes(moduleName)
        };
    }

    res.json({
        success: true,
        data: {
            requirements,
            coreModules: CORE_MODULES,
            optionalModules: OPTIONAL_MODULES
        }
    });
}));

export default router;