/**
 * Logging Configuration Routes
 * 
 * Defines REST API endpoints for logging configuration management
 */

import express from 'express';
import loggingConfigurationController from '../controllers/loggingConfiguration.controller.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.middleware.js';
import { setupCompanyLogging } from '../middleware/companyLogging.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply company logging middleware
router.use(setupCompanyLogging);

// Global configuration routes (admin only)
router.get('/config/global', loggingConfigurationController.getGlobalConfig);
router.put('/config/global', loggingConfigurationController.updateGlobalConfig);

// Configuration health check
router.get('/config/health', loggingConfigurationController.getConfigHealth);

// List configured companies
router.get('/config/companies', loggingConfigurationController.getConfiguredCompanies);

// Log type configuration
router.get('/config/logtype/:logType', loggingConfigurationController.getLogTypeConfig);

// Company-specific configuration routes
router.get('/config/:companyId', loggingConfigurationController.getCompanyConfig);
router.put('/config/:companyId', loggingConfigurationController.updateCompanyConfig);
router.delete('/config/:companyId', loggingConfigurationController.resetCompanyConfig);

// Feature toggle management
router.get('/config/:companyId/features', loggingConfigurationController.getCompanyFeatures);
router.put('/config/:companyId/features/:featureName', loggingConfigurationController.updateFeatureToggle);

// Retention policy management
router.put('/config/:companyId/retention/:logType', loggingConfigurationController.updateRetentionPolicy);

// Alert configuration
router.put('/config/:companyId/alerts', loggingConfigurationController.configureAlerts);

// Configuration import/export
router.get('/config/:companyId/export', loggingConfigurationController.exportCompanyConfig);
router.post('/config/:companyId/import', loggingConfigurationController.importCompanyConfig);

export default router;