import usageTrackingService from '../services/usageTrackingService.js';
import asyncHandler from '../../../utils/asyncHandler.js';

/**
 * Metrics Controller
 * Handles HTTP requests for usage metrics
 */

/**
 * Get usage metrics for specific tenant
 * GET /api/platform/system/metrics/tenants/:tenantId
 */
export const getTenantUsage = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const usage = await usageTrackingService.getTenantUsage(tenantId);

  res.status(200).json({
    success: true,
    data: usage,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get usage metrics for all tenants
 * GET /api/platform/system/metrics/tenants
 */
export const getAllTenantsUsage = asyncHandler(async (req, res) => {
  const usage = await usageTrackingService.getAllTenantsUsage();

  res.status(200).json({
    success: true,
    data: {
      tenants: usage,
      count: usage.length
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get aggregated usage statistics
 * GET /api/platform/system/metrics/aggregated
 */
export const getAggregatedStats = asyncHandler(async (req, res) => {
  const stats = await usageTrackingService.getAggregatedStats();

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
 * Get tenants exceeding limits
 * GET /api/platform/system/metrics/exceeding-limits
 */
export const getTenantsExceedingLimits = asyncHandler(async (req, res) => {
  const tenants = await usageTrackingService.getTenantsExceedingLimits();

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
 * Get usage trends for tenant
 * GET /api/platform/system/metrics/tenants/:tenantId/trends
 * 
 * Query params:
 * - days: Number of days to look back (default: 30)
 */
export const getUsageTrends = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { days = 30 } = req.query;

  const trends = await usageTrackingService.getUsageTrends(tenantId, parseInt(days));

  res.status(200).json({
    success: true,
    data: trends,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get top tenants by usage
 * GET /api/platform/system/metrics/top-tenants
 * 
 * Query params:
 * - metric: Metric to sort by (users, storage, apiCalls) - default: users
 * - limit: Number of tenants to return (default: 10)
 */
export const getTopTenants = asyncHandler(async (req, res) => {
  const { metric = 'users', limit = 10 } = req.query;

  const tenants = await usageTrackingService.getTopTenants(metric, parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      metric,
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
 * Reset monthly usage counters
 * POST /api/platform/system/metrics/reset-monthly
 */
export const resetMonthlyUsage = asyncHandler(async (req, res) => {
  const count = await usageTrackingService.resetMonthlyUsage();

  res.status(200).json({
    success: true,
    data: {
      message: 'Monthly usage counters reset successfully',
      tenantsReset: count
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update storage usage for tenant
 * PATCH /api/platform/system/metrics/tenants/:tenantId/storage
 * 
 * Body:
 * - bytes: Storage used in bytes
 */
export const updateStorageUsage = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { bytes } = req.body;

  if (typeof bytes !== 'number' || bytes < 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'bytes must be a non-negative number'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  await usageTrackingService.updateStorageUsage(tenantId, bytes);

  res.status(200).json({
    success: true,
    data: {
      message: 'Storage usage updated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update user count for tenant
 * POST /api/platform/system/metrics/tenants/:tenantId/update-user-count
 */
export const updateUserCount = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  await usageTrackingService.updateUserCount(tenantId);

  res.status(200).json({
    success: true,
    data: {
      message: 'User count updated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
