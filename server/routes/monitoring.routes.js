/**
 * Monitoring Routes
 * 
 * API endpoints for performance monitoring and health checks
 */

const express = require('express');
const router = express.Router();
const { performanceMonitor } = require('../monitoring/performanceMonitor');
const { connectionPoolMonitor } = require('../monitoring/connectionPoolMonitor');
const { checkDatabaseHealth } = require('../config/database');
const { sequelizeLogger } = require('../utils/sequelizeLogger');

/**
 * GET /api/monitoring/health
 * Get overall system health
 */
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const poolHealth = connectionPoolMonitor.getHealthSummary();
    const metrics = performanceMonitor.getMetrics();

    const overall = {
      status: dbHealth.overall === 'healthy' && poolHealth.overall === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      components: {
        database: dbHealth,
        connectionPools: poolHealth,
        queries: {
          total: metrics.queries.total,
          slow: metrics.queries.slow,
          failed: metrics.queries.failed,
          slowPercentage: metrics.slowQueryPercentage,
          errorPercentage: metrics.errorPercentage
        }
      }
    };

    const statusCode = overall.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(overall);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Get performance metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/slow-queries
 * Get slow queries
 */
router.get('/slow-queries', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const slowQueries = performanceMonitor.getSlowQueries(limit);
    
    res.json({
      success: true,
      count: slowQueries.length,
      slowQueries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/errors
 * Get recent query errors
 */
router.get('/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const errors = performanceMonitor.getRecentErrors(limit);
    
    res.json({
      success: true,
      count: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/connection-pools
 * Get connection pool statistics
 */
router.get('/connection-pools', (req, res) => {
  try {
    const poolName = req.query.pool;
    const stats = connectionPoolMonitor.getPoolStats(poolName);
    
    if (poolName && !stats) {
      return res.status(404).json({
        success: false,
        error: `Pool '${poolName}' not found`
      });
    }

    res.json({
      success: true,
      pools: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/query-stats
 * Get query statistics from sequelize logger
 */
router.get('/query-stats', (req, res) => {
  try {
    const stats = sequelizeLogger.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/monitoring/reset-metrics
 * Reset performance metrics
 */
router.post('/reset-metrics', (req, res) => {
  try {
    performanceMonitor.resetMetrics();
    sequelizeLogger.resetStats();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/monitoring/reset-pool-stats
 * Reset connection pool statistics
 */
router.post('/reset-pool-stats', (req, res) => {
  try {
    const poolName = req.body.pool;
    connectionPoolMonitor.resetStats(poolName);
    
    res.json({
      success: true,
      message: poolName 
        ? `Pool statistics reset for ${poolName}` 
        : 'Pool statistics reset for all pools'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/database-health
 * Get detailed database health information
 */
router.get('/database-health', async (req, res) => {
  try {
    const health = await checkDatabaseHealth();
    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
