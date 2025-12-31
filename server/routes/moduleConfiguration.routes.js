/**
 * Module Configuration Routes
 * 
 * Defines REST API endpoints for logging module configuration management
 * Implements Requirements 13.1 and 13.4
 */

import express from 'express';
import moduleConfigurationController from '../controllers/moduleConfiguration.controller.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.middleware.js';
import { setupCompanyLogging } from '../middleware/companyLogging.js';
import { rateLimitByCompany } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply company logging middleware
router.use(setupCompanyLogging);

// Apply rate limiting for configuration changes
const configChangeRateLimit = rateLimitByCompany({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 configuration requests per windowMs
    message: 'Too many configuration requests, please try again later'
});

// Module configuration routes

/**
 * Get module configuration for a company
 * GET /api/v1/logging/module/:companyId
 */
router.get('/:companyId', moduleConfigurationController.getModuleConfig);

/**
 * Update module configuration for a company
 * PUT /api/v1/logging/module/:companyId
 */
router.put('/:companyId', configChangeRateLimit, moduleConfigurationController.updateModuleConfig);

/**
 * Enable or disable the logging module for a company
 * PUT /api/v1/logging/module/:companyId/status
 */
router.put('/:companyId/status', configChangeRateLimit, moduleConfigurationController.updateModuleStatus);

/**
 * Get enabled features for a company
 * GET /api/v1/logging/module/:companyId/features
 */
router.get('/:companyId/features', moduleConfigurationController.getEnabledFeatures);

/**
 * Check if a specific feature is enabled
 * GET /api/v1/logging/module/:companyId/features/:featureName
 */
router.get('/:companyId/features/:featureName', moduleConfigurationController.checkFeatureEnabled);

/**
 * Toggle individual feature
 * PUT /api/v1/logging/module/:companyId/features/:featureName/toggle
 */
router.put('/:companyId/features/:featureName/toggle', configChangeRateLimit, moduleConfigurationController.toggleFeature);

/**
 * Batch update multiple features
 * PUT /api/v1/logging/module/:companyId/features/batch
 */
router.put('/:companyId/features/batch', configChangeRateLimit, moduleConfigurationController.batchUpdateFeatures);

/**
 * Update retention policy for specific log type
 * PUT /api/v1/logging/module/:companyId/retention/:logType
 */
router.put('/:companyId/retention/:logType', configChangeRateLimit, moduleConfigurationController.updateRetentionPolicy);

/**
 * Update alerting configuration
 * PUT /api/v1/logging/module/:companyId/alerting
 */
router.put('/:companyId/alerting', configChangeRateLimit, moduleConfigurationController.updateAlertingConfig);

/**
 * Preview configuration changes without applying them
 * POST /api/v1/logging/module/:companyId/preview
 */
router.post('/:companyId/preview', moduleConfigurationController.previewConfigChanges);

/**
 * Export module configuration
 * GET /api/v1/logging/module/:companyId/export
 */
router.get('/:companyId/export', moduleConfigurationController.exportModuleConfig);

/**
 * Import module configuration
 * POST /api/v1/logging/module/:companyId/import
 */
router.post('/:companyId/import', configChangeRateLimit, moduleConfigurationController.importModuleConfig);

/**
 * Reset module configuration to defaults
 * POST /api/v1/logging/module/:companyId/reset
 */
router.post('/:companyId/reset', configChangeRateLimit, moduleConfigurationController.resetModuleConfig);

/**
 * Get configuration audit trail
 * GET /api/v1/logging/module/:companyId/audit
 */
router.get('/:companyId/audit', moduleConfigurationController.getConfigurationAudit);

/**
 * Validate module configuration
 * POST /api/v1/logging/module/:companyId/validate
 */
router.post('/:companyId/validate', moduleConfigurationController.validateModuleConfig);

export default router;