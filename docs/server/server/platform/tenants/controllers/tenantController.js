import tenantService from '../services/tenantService.js';
import tenantProvisioningService from '../services/tenantProvisioningService.js';
import asyncHandler from '../../../utils/asyncHandler.js';

/**
 * Tenant Controller
 * Handles HTTP requests for tenant management
 */

/**
 * List all tenants
 * GET /api/platform/tenants
 * 
 * Query params:
 * - status: Filter by status
 * - deploymentMode: Filter by deployment mode
 * - page: Page number
 * - limit: Items per page
 */
export const listTenants = asyncHandler(async (req, res) => {
  const { status, deploymentMode, page, limit } = req.query;

  const result = await tenantService.listTenants({
    status,
    deploymentMode,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20
  });

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenant by ID
 * GET /api/platform/tenants/:id
 */
export const getTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to get by tenantId first, then by MongoDB _id
  let tenant;
  try {
    tenant = await tenantService.getTenantById(id);
  } catch (error) {
    // If not found by tenantId, try MongoDB _id
    tenant = await tenantService.getTenantByMongoId(id);
  }

  res.status(200).json({
    success: true,
    data: {
      tenant
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Create new tenant
 * POST /api/platform/tenants
 * 
 * Body:
 * - name: Tenant name (required)
 * - domain: Tenant domain (optional)
 * - deploymentMode: saas or on-premise (default: saas)
 * - contactInfo: Contact information
 * - adminUser: Admin user data (required)
 *   - email: Admin email (required)
 *   - password: Admin password (required)
 *   - firstName: Admin first name (required)
 *   - lastName: Admin last name (required)
 * - metadata: Additional metadata
 */
export const createTenant = asyncHandler(async (req, res) => {
  const tenantData = req.body;

  const result = await tenantProvisioningService.createTenant(tenantData);

  res.status(201).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update tenant
 * PATCH /api/platform/tenants/:id
 * 
 * Body: Fields to update
 */
export const updateTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const tenant = await tenantService.updateTenant(id, updateData);

  res.status(200).json({
    success: true,
    data: {
      tenant
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Suspend tenant
 * POST /api/platform/tenants/:id/suspend
 * 
 * Body:
 * - reason: Reason for suspension (optional)
 */
export const suspendTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const tenant = await tenantService.suspendTenant(id, reason);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Tenant suspended successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Reactivate tenant
 * POST /api/platform/tenants/:id/reactivate
 */
export const reactivateTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tenant = await tenantService.reactivateTenant(id);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Tenant reactivated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Delete tenant (archive)
 * DELETE /api/platform/tenants/:id
 */
export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tenant = await tenantService.deleteTenant(id);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Tenant archived successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenant statistics
 * GET /api/platform/tenants/stats
 */
export const getTenantStats = asyncHandler(async (req, res) => {
  const stats = await tenantService.getStatistics();

  res.status(200).json({
    success: true,
    data: {
      statistics: stats
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Check tenant limits
 * GET /api/platform/tenants/:id/limits
 */
export const checkTenantLimits = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exceeded = await tenantService.checkLimits(id);

  res.status(200).json({
    success: true,
    data: {
      exceeded,
      hasExceededLimits: Object.keys(exceeded).length > 0
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update tenant usage
 * PATCH /api/platform/tenants/:id/usage
 * 
 * Body:
 * - userCount: Number of users
 * - storageUsed: Storage used in bytes
 * - apiCallsThisMonth: API calls this month
 */
export const updateTenantUsage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const usageData = req.body;

  const tenant = await tenantService.updateUsage(id, usageData);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Usage updated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
