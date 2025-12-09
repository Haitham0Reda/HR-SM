const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const metricsController = require('../controllers/metricsController');
const alertController = require('../controllers/alertController');
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');
const { platformGuard } = require('../../../core/middleware/platformAuthorization');

/**
 * System Routes
 * Base path: /api/platform/system
 * 
 * Health check routes are public, metrics routes require authentication and permissions
 */

// Health check routes (public for monitoring tools)
router.get('/health', healthController.getHealth);
router.get('/health/database', healthController.getDatabaseHealth);
router.get('/health/memory', healthController.getMemoryHealth);

// System information (requires authentication)
router.get('/info', 
  authenticatePlatform,
  ...platformGuard('system:read', 'VIEW_SYSTEM_INFO'),
  healthController.getSystemInfo
);

// Metrics routes (require authentication and permissions)
router.get('/metrics/response-time', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_RESPONSE_TIME_STATS'),
  healthController.getResponseTimeStats
);

router.get('/metrics/error-rate', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_ERROR_RATE_STATS'),
  healthController.getErrorRateStats
);

router.get('/metrics/aggregated', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_AGGREGATED_STATS'),
  metricsController.getAggregatedStats
);

router.get('/metrics/exceeding-limits', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_TENANTS_EXCEEDING_LIMITS'),
  metricsController.getTenantsExceedingLimits
);

router.get('/metrics/top-tenants', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_TOP_TENANTS'),
  metricsController.getTopTenants
);

router.post('/metrics/reset-monthly', 
  authenticatePlatform,
  ...platformGuard('system:update', 'RESET_MONTHLY_USAGE'),
  metricsController.resetMonthlyUsage
);

// Tenant-specific metrics routes
router.get('/metrics/tenants', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_ALL_TENANTS_USAGE'),
  metricsController.getAllTenantsUsage
);

router.get('/metrics/tenants/:tenantId', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_TENANT_USAGE'),
  metricsController.getTenantUsage
);

router.get('/metrics/tenants/:tenantId/trends', 
  authenticatePlatform,
  ...platformGuard('system:metrics', 'VIEW_USAGE_TRENDS'),
  metricsController.getUsageTrends
);

router.patch('/metrics/tenants/:tenantId/storage', 
  authenticatePlatform,
  ...platformGuard('system:update', 'UPDATE_STORAGE_USAGE'),
  metricsController.updateStorageUsage
);

router.post('/metrics/tenants/:tenantId/update-user-count', 
  authenticatePlatform,
  ...platformGuard('system:update', 'UPDATE_USER_COUNT'),
  metricsController.updateUserCount
);

// Alert routes (require authentication and permissions)
router.get('/alerts', 
  authenticatePlatform,
  ...platformGuard('system:alerts', 'VIEW_ALERTS'),
  alertController.getAlertHistory
);

router.get('/alerts/statistics', 
  authenticatePlatform,
  ...platformGuard('system:alerts', 'VIEW_ALERT_STATS'),
  alertController.getAlertStatistics
);

router.post('/alerts/:alertId/acknowledge', 
  authenticatePlatform,
  ...platformGuard('system:alerts', 'ACKNOWLEDGE_ALERTS'),
  alertController.acknowledgeAlert
);

router.delete('/alerts', 
  authenticatePlatform,
  ...platformGuard('system:update', 'CLEAR_ALERTS'),
  alertController.clearAlertHistory
);

module.exports = router;
