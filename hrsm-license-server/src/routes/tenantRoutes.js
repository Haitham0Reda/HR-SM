import express from 'express';
import tenantController from '../controllers/TenantController.js';
import { authenticateApiKey } from '../middleware/apiKeyAuth.middleware.js';
import { requirePermission, requireAdmin, PERMISSIONS } from '../middleware/authorization.middleware.js';

const router = express.Router();

/**
 * Tenant Management Routes - License Server
 * 
 * Requirements: 3.1-3.10 - Tenant management API endpoints
 * Requirements: 8.1, 8.2, 8.3, 8.4 - API key authentication and authorization
 */

// All tenant routes require API key authentication
router.use(authenticateApiKey());

/**
 * Tenant CRUD Operations
 */

// GET /api/tenants - List all tenants with pagination
// Requirement 3.1 - Requires read permission
router.get('/', requirePermission([PERMISSIONS.TENANTS_READ, PERMISSIONS.READ, 'read']), tenantController.getAllTenants);

// GET /api/tenants/:tenantId - Get specific tenant details
// Requirement 3.2 - Requires read permission
router.get('/:tenantId', requirePermission([PERMISSIONS.TENANTS_READ, PERMISSIONS.READ, 'read']), tenantController.getTenantById);

// POST /api/tenants - Create new tenant
// Requirement 3.3 - Requires write permission
router.post('/', requirePermission([PERMISSIONS.TENANTS_WRITE, PERMISSIONS.WRITE, 'write']), tenantController.createTenant);

// PUT /api/tenants/:tenantId - Update tenant information
// Requirement 3.4 - Requires write permission
router.put('/:tenantId', requirePermission([PERMISSIONS.TENANTS_WRITE, PERMISSIONS.WRITE, 'write']), tenantController.updateTenant);

// DELETE /api/tenants/:tenantId - Delete tenant (soft delete)
// Requirement 3.5 - Requires admin permission
router.delete('/:tenantId', requireAdmin(), tenantController.deleteTenant);

/**
 * Module Management Operations
 */

// GET /api/tenants/:tenantId/modules - Get enabled modules
// Requirement 3.6 - Requires read permission
router.get('/:tenantId/modules', requirePermission([PERMISSIONS.MODULES_READ, PERMISSIONS.READ, 'read']), tenantController.getTenantModules);

// POST /api/tenants/:tenantId/modules/:moduleId - Enable module
// Requirement 3.7 - Requires write permission
router.post('/:tenantId/modules/:moduleId', requirePermission([PERMISSIONS.MODULES_WRITE, PERMISSIONS.WRITE, 'write']), tenantController.enableModule);

// DELETE /api/tenants/:tenantId/modules/:moduleId - Disable module
// Requirement 3.8 - Requires write permission
router.delete('/:tenantId/modules/:moduleId', requirePermission([PERMISSIONS.MODULES_WRITE, PERMISSIONS.WRITE, 'write']), tenantController.disableModule);

export default router;
