import express from 'express';
import * as tenantController from '../controllers/tenantController.js';
import { authenticatePlatform } from '../../../core/middleware/platformAuthentication.js';
import { platformGuard } from '../../../core/middleware/platformAuthorization.js';

const router = express.Router();

/**
 * Tenant Management Routes
 * Base path: /api/platform/tenants
 * 
 * All routes require Platform JWT authentication and appropriate permissions
 */

// Get tenant statistics (must be before /:id route)
router.get('/stats', 
  authenticatePlatform,
  ...platformGuard('tenants:read', 'VIEW_TENANT_STATS'),
  tenantController.getTenantStats
);

// List all tenants
router.get('/', 
  authenticatePlatform,
  ...platformGuard('tenants:read', 'LIST_TENANTS'),
  tenantController.listTenants
);

// Create new tenant
router.post('/', 
  authenticatePlatform,
  ...platformGuard('tenants:create', 'CREATE_TENANT'),
  tenantController.createTenant
);

// Get tenant by ID
router.get('/:id', 
  authenticatePlatform,
  ...platformGuard('tenants:read', 'VIEW_TENANT'),
  tenantController.getTenant
);

// Update tenant
router.patch('/:id', 
  authenticatePlatform,
  ...platformGuard('tenants:update', 'UPDATE_TENANT'),
  tenantController.updateTenant
);

// Delete tenant (archive)
router.delete('/:id', 
  authenticatePlatform,
  ...platformGuard('tenants:delete', 'DELETE_TENANT'),
  tenantController.deleteTenant
);

// Suspend tenant
router.post('/:id/suspend', 
  authenticatePlatform,
  ...platformGuard('tenants:update', 'SUSPEND_TENANT'),
  tenantController.suspendTenant
);

// Reactivate tenant
router.post('/:id/reactivate', 
  authenticatePlatform,
  ...platformGuard('tenants:update', 'REACTIVATE_TENANT'),
  tenantController.reactivateTenant
);

// Check tenant limits
router.get('/:id/limits', 
  authenticatePlatform,
  ...platformGuard('tenants:read', 'CHECK_TENANT_LIMITS'),
  tenantController.checkTenantLimits
);

// Update tenant usage
router.patch('/:id/usage', 
  authenticatePlatform,
  ...platformGuard('tenants:update', 'UPDATE_TENANT_USAGE'),
  tenantController.updateTenantUsage
);

export default router;
