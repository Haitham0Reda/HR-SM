import express from 'express';
import ModuleController from '../controllers/ModuleController.js';
import { authenticatePlatformUser } from '../middleware/platformAuth.js';
import { validatePlatformPermission } from '../middleware/platformPermissions.js';

const router = express.Router();

/**
 * Module Management Routes
 * All routes require platform authentication and appropriate permissions
 */

// Get all available modules
router.get('/available', 
  authenticatePlatformUser,
  ModuleController.getAvailableModules
);

// Get modules for specific tier
router.get('/tier/:tier', 
  authenticatePlatformUser,
  ModuleController.getModulesForTier
);

// Get module usage statistics
router.get('/stats', 
  authenticatePlatformUser,
  validatePlatformPermission('view_analytics'),
  ModuleController.getModuleStats
);

// Get all companies with their modules
router.get('/companies', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  ModuleController.getAllCompaniesModules
);

// Get specific company modules
router.get('/companies/:companyId', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  ModuleController.getCompanyModules
);

// Enable module for company
router.post('/companies/:companyId/enable', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_modules'),
  ModuleController.enableModule
);

// Disable module for company
router.post('/companies/:companyId/disable', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_modules'),
  ModuleController.disableModule
);

// Update module limits for company
router.put('/companies/:companyId/limits', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_modules'),
  ModuleController.updateModuleLimits
);

// Generate license for company
router.post('/companies/:companyId/license', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_licenses'),
  ModuleController.generateLicense
);

// Check module access for company
router.get('/companies/:companyId/access/:moduleKey', 
  authenticatePlatformUser,
  validatePlatformPermission('view_companies'),
  ModuleController.checkModuleAccess
);

// Update company usage
router.put('/companies/:companyId/usage', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  ModuleController.updateUsage
);

// Bulk operations
router.post('/bulk/enable', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_modules'),
  ModuleController.bulkEnableModule
);

// Get companies with expired subscriptions
router.get('/expired-subscriptions', 
  authenticatePlatformUser,
  validatePlatformPermission('view_companies'),
  ModuleController.getExpiredSubscriptions
);

export default router;