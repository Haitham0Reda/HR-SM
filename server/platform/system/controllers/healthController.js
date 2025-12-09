const healthCheckService = require('../services/healthCheckService');
const asyncHandler = require('../../../utils/asyncHandler');

/**
 * Health Controller
 * Handles HTTP requests for system health checks
 */

/**
 * Get overall system health
 * GET /api/platform/system/health
 */
exports.getHealth = asyncHandler(async (req, res) => {
  const health = await healthCheckService.checkHealth();

  // Set appropriate status code based on health
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get database health
 * GET /api/platform/system/health/database
 */
exports.getDatabaseHealth = asyncHandler(async (req, res) => {
  const dbHealth = await healthCheckService.checkDatabase();

  const statusCode = dbHealth.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: dbHealth.status === 'healthy',
    data: {
      database: dbHealth
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get memory health
 * GET /api/platform/system/health/memory
 */
exports.getMemoryHealth = asyncHandler(async (req, res) => {
  const memoryHealth = healthCheckService.checkMemory();

  res.status(200).json({
    success: true,
    data: {
      memory: memoryHealth
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get system information
 * GET /api/platform/system/info
 */
exports.getSystemInfo = asyncHandler(async (req, res) => {
  const info = healthCheckService.getSystemInfo();

  res.status(200).json({
    success: true,
    data: {
      system: info
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get API response time statistics
 * GET /api/platform/system/metrics/response-time
 */
exports.getResponseTimeStats = asyncHandler(async (req, res) => {
  const stats = healthCheckService.getResponseTimeStats();

  res.status(200).json({
    success: true,
    data: {
      responseTime: stats
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get error rate statistics
 * GET /api/platform/system/metrics/error-rate
 */
exports.getErrorRateStats = asyncHandler(async (req, res) => {
  const stats = healthCheckService.getErrorRateStats();

  res.status(200).json({
    success: true,
    data: {
      errorRate: stats
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
