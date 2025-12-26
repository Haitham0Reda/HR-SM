import express from 'express';
import { authenticatePlatformUser } from '../../middleware/platformAuth.js';
import { validatePlatformPermission } from '../../middleware/platformPermissions.js';
import * as tenantController from '../controllers/tenantController.js';

const router = express.Router();

/**
 * Platform Tenant Routes
 * Base path: /api/platform/tenants
 */

// Get all tenants
router.get('/', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  tenantController.listTenants
);

// Get tenant by ID
router.get('/:id', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  tenantController.getTenant
);

// Create tenant
router.post('/', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  tenantController.createTenant
);

// Update tenant
router.put('/:id', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  tenantController.updateTenant
);

// Create tenant with license integration
router.post('/with-license', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  tenantController.createTenantWithLicense
);

export default router;