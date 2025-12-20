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

/**
 * Get tenant metrics with aggregation
 * GET /api/platform/tenants/:id/metrics
 */
export const getTenantMetrics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get tenant with populated metrics
  const tenant = await tenantService.getTenantById(id);
  
  // Calculate additional metrics using aggregation
  const metricsAggregation = await tenantService.getTenantMetricsAggregation(id);
  
  const metrics = {
    basic: {
      totalUsers: tenant.usage.userCount,
      activeUsers: tenant.usage.activeUsers,
      storageUsed: tenant.usage.storageUsed,
      apiCallsThisMonth: tenant.usage.apiCallsThisMonth,
      lastActivityAt: tenant.usage.lastActivityAt
    },
    performance: {
      responseTime: tenant.metrics?.responseTime || 0,
      availability: tenant.metrics?.availability || 100,
      errorRate: tenant.metrics?.errorRate || 0,
      uptime: tenant.metrics?.uptime || 0
    },
    resources: {
      cpuUsage: tenant.metrics?.cpuUsage || 0,
      memoryUsage: tenant.metrics?.memoryUsage || 0,
      diskUsage: tenant.metrics?.diskUsage || 0,
      resourceUtilization: tenant.resourceUtilization
    },
    usage: {
      storageUsagePercentage: tenant.storageUsagePercentage,
      userUsagePercentage: tenant.userUsagePercentage,
      apiUsagePercentage: tenant.apiUsagePercentage
    },
    health: {
      healthScore: tenant.healthScore,
      riskLevel: tenant.riskLevel,
      complianceStatus: tenant.complianceStatus
    },
    license: {
      status: tenant.licenseStatus,
      daysRemaining: tenant.licenseDaysRemaining,
      type: tenant.license?.licenseType,
      features: tenant.license?.features || []
    },
    aggregated: metricsAggregation
  };

  res.status(200).json({
    success: true,
    data: {
      tenantId: tenant.tenantId,
      name: tenant.name,
      metrics
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Bulk update tenants
 * PATCH /api/platform/tenants/bulk
 * 
 * Body:
 * - tenantIds: Array of tenant IDs
 * - updates: Object with fields to update
 * - operation: 'update' | 'suspend' | 'reactivate' | 'enable-module' | 'disable-module'
 */
export const bulkUpdateTenants = asyncHandler(async (req, res) => {
  const { tenantIds, updates, operation } = req.body;

  if (!tenantIds || !Array.isArray(tenantIds) || tenantIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'tenantIds array is required'
    });
  }

  let result;
  
  switch (operation) {
    case 'update':
      result = await tenantService.bulkUpdateTenants(tenantIds, updates);
      break;
    case 'suspend':
      result = await tenantService.bulkSuspendTenants(tenantIds, updates.reason);
      break;
    case 'reactivate':
      result = await tenantService.bulkReactivateTenants(tenantIds);
      break;
    case 'enable-module':
      result = await tenantService.bulkEnableModule(tenantIds, updates.moduleId, updates.enabledBy);
      break;
    case 'disable-module':
      result = await tenantService.bulkDisableModule(tenantIds, updates.moduleId);
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Must be one of: update, suspend, reactivate, enable-module, disable-module'
      });
  }

  res.status(200).json({
    success: true,
    data: {
      operation,
      affected: result.modifiedCount || result.length,
      details: result
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Create tenant with license integration
 * POST /api/platform/tenants/with-license
 * 
 * Body:
 * - tenantData: Tenant information
 * - licenseData: License configuration
 * - adminUser: Admin user data
 */
export const createTenantWithLicense = asyncHandler(async (req, res) => {
  const { tenantData, licenseData, adminUser } = req.body;

  // Validate required fields
  if (!tenantData || !licenseData || !adminUser) {
    return res.status(400).json({
      success: false,
      error: 'tenantData, licenseData, and adminUser are required'
    });
  }

  const result = await tenantService.createTenantWithLicense({
    tenantData,
    licenseData,
    adminUser,
    createdBy: req.user?.id || 'platform-admin'
  });

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
 * Get license status for tenant
 * GET /api/platform/tenants/:id/license
 */
export const getLicenseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const licenseStatus = await tenantService.getLicenseStatus(id);

  res.status(200).json({
    success: true,
    data: {
      licenseStatus
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update tenant license
 * PATCH /api/platform/tenants/:id/license
 * 
 * Body:
 * - licenseKey: New license key
 * - licenseNumber: License number
 * - expiresAt: Expiration date
 */
export const updateTenantLicense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const licenseData = req.body;

  const tenant = await tenantService.updateTenantLicense(id, licenseData);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'License updated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenants needing attention
 * GET /api/platform/tenants/attention
 */
export const getTenantsNeedingAttention = asyncHandler(async (req, res) => {
  const tenants = await tenantService.getTenantsNeedingAttention();

  res.status(200).json({
    success: true,
    data: {
      tenants,
      count: tenants.length
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenant analytics dashboard data
 * GET /api/platform/tenants/analytics
 */
export const getTenantAnalytics = asyncHandler(async (req, res) => {
  const analytics = await tenantService.getTenantAnalytics();

  res.status(200).json({
    success: true,
    data: {
      analytics
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get revenue analytics
 * GET /api/platform/tenants/analytics/revenue
 */
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period } = req.query; // 'month', 'quarter', 'year'
  
  const revenueData = await tenantService.getRevenueAnalytics(period);

  res.status(200).json({
    success: true,
    data: {
      revenue: revenueData,
      period: period || 'month'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get usage analytics
 * GET /api/platform/tenants/analytics/usage
 */
export const getUsageAnalytics = asyncHandler(async (req, res) => {
  const usageData = await tenantService.getUsageAnalytics();

  res.status(200).json({
    success: true,
    data: {
      usage: usageData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get performance analytics
 * GET /api/platform/tenants/analytics/performance
 */
export const getPerformanceAnalytics = asyncHandler(async (req, res) => {
  const performanceData = await tenantService.getPerformanceAnalytics();

  res.status(200).json({
    success: true,
    data: {
      performance: performanceData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
