const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');
const { platformGuard } = require('../../../core/middleware/platformAuthorization');

/**
 * Module Management Routes
 * Base path: /api/platform/modules
 * 
 * All routes require Platform JWT authentication and appropriate permissions
 */

// Module registry routes (must be before tenant-specific routes)
router.get('/stats', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'VIEW_MODULE_STATS'),
  moduleController.getModuleStats
);

router.get('/', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'LIST_MODULES'),
  moduleController.listModules
);

router.get('/:moduleId', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'VIEW_MODULE'),
  moduleController.getModule
);

router.get('/:moduleId/dependencies', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'VIEW_MODULE_DEPENDENCIES'),
  moduleController.getModuleDependencies
);

// Tenant module management routes
router.get('/tenants/:tenantId/modules', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'LIST_TENANT_MODULES'),
  moduleController.getTenantModules
);

router.post('/tenants/:tenantId/modules/enable-batch', 
  authenticatePlatform,
  ...platformGuard('modules:update', 'ENABLE_MODULES_BATCH'),
  moduleController.enableModules
);

router.post('/tenants/:tenantId/modules/:moduleId/enable', 
  authenticatePlatform,
  ...platformGuard('modules:update', 'ENABLE_MODULE'),
  moduleController.enableModule
);

router.delete('/tenants/:tenantId/modules/:moduleId/disable', 
  authenticatePlatform,
  ...platformGuard('modules:update', 'DISABLE_MODULE'),
  moduleController.disableModule
);

router.get('/tenants/:tenantId/modules/:moduleId/can-enable', 
  authenticatePlatform,
  ...platformGuard('modules:read', 'CHECK_MODULE_ENABLE'),
  moduleController.canEnableModule
);

module.exports = router;
