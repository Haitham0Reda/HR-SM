import express from 'express';
import { authenticatePlatformUser } from '../../middleware/platformAuth.js';
import * as healthController from '../controllers/healthController.js';
import * as metricsController from '../controllers/metricsController.js';

const router = express.Router();

/**
 * Platform System Routes
 * Base path: /api/platform/system
 */

// Health endpoints
router.get('/health', healthController.getHealth);
router.get('/health/database', healthController.getDatabaseHealth);
router.get('/health/memory', healthController.getMemoryHealth);
router.get('/info', healthController.getSystemInfo);

// Metrics endpoints (protected)
router.get('/metrics/response-time', authenticatePlatformUser, healthController.getResponseTimeStats);
router.get('/metrics/error-rate', authenticatePlatformUser, healthController.getErrorRateStats);
router.get('/metrics/tenants/:tenantId', authenticatePlatformUser, metricsController.getTenantUsage);
router.get('/metrics/tenants', authenticatePlatformUser, metricsController.getAllTenantsUsage);
router.get('/metrics/aggregated', authenticatePlatformUser, metricsController.getAggregatedStats);
router.get('/metrics/exceeding-limits', authenticatePlatformUser, metricsController.getTenantsExceedingLimits);
router.get('/metrics/tenants/:tenantId/trends', authenticatePlatformUser, metricsController.getUsageTrends);
router.get('/metrics/top-tenants', authenticatePlatformUser, metricsController.getTopTenants);

// System status (protected)
router.get('/status', authenticatePlatformUser, (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

// System statistics (protected)
router.get('/stats', authenticatePlatformUser, metricsController.getSystemStats);

export default router;