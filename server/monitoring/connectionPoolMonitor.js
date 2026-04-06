/**
 * Connection Pool Monitor
 * 
 * Monitors PostgreSQL connection pool health and utilization
 * Tracks pool metrics and alerts on issues
 */

const logger = require('../utils/logger');
const { performanceMonitor } = require('./performanceMonitor');

class ConnectionPoolMonitor {
  constructor() {
    this.pools = new Map();
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.checkIntervalMs = parseInt(process.env.POOL_CHECK_INTERVAL) || 30000; // 30 seconds
    
    this.thresholds = {
      highUtilization: parseFloat(process.env.POOL_HIGH_UTILIZATION_THRESHOLD) || 80, // %
      criticalUtilization: parseFloat(process.env.POOL_CRITICAL_UTILIZATION_THRESHOLD) || 95, // %
      waitingConnections: parseInt(process.env.POOL_WAITING_THRESHOLD) || 5
    };
  }

  /**
   * Register a database connection pool for monitoring
   * @param {string} name - Pool name (e.g., 'licenseServer', 'mainApp')
   * @param {Object} sequelize - Sequelize instance
   */
  registerPool(name, sequelize) {
    if (this.pools.has(name)) {
      logger.warn(`Pool ${name} is already registered`);
      return;
    }

    const pool = sequelize.connectionManager.pool;
    
    this.pools.set(name, {
      name,
      sequelize,
      pool,
      stats: {
        totalAcquired: 0,
        totalReleased: 0,
        totalErrors: 0,
        peakUsage: 0,
        lastChecked: new Date()
      }
    });

    // Set up pool event listeners
    this.setupPoolListeners(name, pool);

    logger.info(`Connection pool registered for monitoring: ${name}`, {
      maxSize: pool.max,
      minSize: pool.min,
      acquireTimeout: pool.acquireTimeout,
      idleTimeout: pool.idleTimeout
    });
  }

  /**
   * Set up event listeners for a connection pool
   * @param {string} name - Pool name
   * @param {Object} pool - Connection pool
   */
  setupPoolListeners(name, pool) {
    // Connection acquired
    pool.on('acquire', (connection) => {
      const poolInfo = this.pools.get(name);
      if (poolInfo) {
        poolInfo.stats.totalAcquired++;
        
        // Update peak usage
        const currentUsage = pool.using;
        if (currentUsage > poolInfo.stats.peakUsage) {
          poolInfo.stats.peakUsage = currentUsage;
        }
      }

      performanceMonitor.recordConnectionEvent(name, 'acquire');

      if (process.env.LOG_LEVEL === 'debug') {
        logger.debug(`Connection acquired from ${name} pool`, {
          using: pool.using,
          available: pool.available,
          waiting: pool.waiting
        });
      }
    });

    // Connection released
    pool.on('release', (connection) => {
      const poolInfo = this.pools.get(name);
      if (poolInfo) {
        poolInfo.stats.totalReleased++;
      }

      performanceMonitor.recordConnectionEvent(name, 'release');

      if (process.env.LOG_LEVEL === 'debug') {
        logger.debug(`Connection released to ${name} pool`, {
          using: pool.using,
          available: pool.available,
          waiting: pool.waiting
        });
      }
    });

    // Connection error
    pool.on('error', (error) => {
      const poolInfo = this.pools.get(name);
      if (poolInfo) {
        poolInfo.stats.totalErrors++;
      }

      performanceMonitor.recordConnectionEvent(name, 'error');

      logger.error(`Connection error in ${name} pool`, {
        error: error.message,
        code: error.code,
        using: pool.using,
        available: pool.available,
        waiting: pool.waiting
      });
    });

    // Connection timeout
    pool.on('timeout', () => {
      logger.error(`Connection timeout in ${name} pool`, {
        using: pool.using,
        available: pool.available,
        waiting: pool.waiting,
        maxSize: pool.max
      });
    });
  }

  /**
   * Start monitoring connection pools
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Connection pool monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkAllPools();
    }, this.checkIntervalMs);

    logger.info('Connection pool monitoring started', {
      checkInterval: `${this.checkIntervalMs}ms`,
      thresholds: this.thresholds
    });
  }

  /**
   * Stop monitoring connection pools
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Connection pool monitoring stopped');
  }

  /**
   * Check all registered pools
   */
  checkAllPools() {
    for (const [name, poolInfo] of this.pools) {
      this.checkPool(name, poolInfo);
    }
  }

  /**
   * Check a specific pool
   * @param {string} name - Pool name
   * @param {Object} poolInfo - Pool information
   */
  checkPool(name, poolInfo) {
    const { pool, stats } = poolInfo;
    
    const currentStats = {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting,
      maxSize: pool.max,
      minSize: pool.min
    };

    // Calculate utilization percentage
    const utilization = pool.max > 0 ? (pool.using / pool.max) * 100 : 0;
    currentStats.utilization = utilization.toFixed(2);

    // Update last checked time
    stats.lastChecked = new Date();

    // Check thresholds and log warnings
    if (utilization >= this.thresholds.criticalUtilization) {
      logger.error(`CRITICAL: ${name} pool utilization is very high`, {
        ...currentStats,
        threshold: this.thresholds.criticalUtilization
      });
    } else if (utilization >= this.thresholds.highUtilization) {
      logger.warn(`WARNING: ${name} pool utilization is high`, {
        ...currentStats,
        threshold: this.thresholds.highUtilization
      });
    }

    // Check waiting connections
    if (pool.waiting >= this.thresholds.waitingConnections) {
      logger.warn(`WARNING: ${name} pool has many waiting connections`, {
        ...currentStats,
        threshold: this.thresholds.waitingConnections
      });
    }

    // Log pool status periodically
    if (process.env.LOG_POOL_STATUS === 'true') {
      logger.info(`${name} pool status`, currentStats);
    }
  }

  /**
   * Get pool statistics
   * @param {string} name - Pool name (optional, returns all if not specified)
   * @returns {Object} Pool statistics
   */
  getPoolStats(name = null) {
    if (name) {
      const poolInfo = this.pools.get(name);
      if (!poolInfo) {
        return null;
      }
      return this.getPoolStatsForPool(name, poolInfo);
    }

    // Return stats for all pools
    const allStats = {};
    for (const [poolName, poolInfo] of this.pools) {
      allStats[poolName] = this.getPoolStatsForPool(poolName, poolInfo);
    }
    return allStats;
  }

  /**
   * Get statistics for a specific pool
   * @param {string} name - Pool name
   * @param {Object} poolInfo - Pool information
   * @returns {Object} Pool statistics
   */
  getPoolStatsForPool(name, poolInfo) {
    const { pool, stats } = poolInfo;
    
    const utilization = pool.max > 0 ? (pool.using / pool.max) * 100 : 0;
    
    return {
      name,
      current: {
        size: pool.size,
        available: pool.available,
        using: pool.using,
        waiting: pool.waiting,
        utilization: utilization.toFixed(2) + '%'
      },
      config: {
        maxSize: pool.max,
        minSize: pool.min,
        acquireTimeout: pool.acquireTimeout,
        idleTimeout: pool.idleTimeout
      },
      lifetime: {
        totalAcquired: stats.totalAcquired,
        totalReleased: stats.totalReleased,
        totalErrors: stats.totalErrors,
        peakUsage: stats.peakUsage,
        lastChecked: stats.lastChecked
      },
      health: this.getPoolHealth(utilization, pool.waiting, stats.totalErrors)
    };
  }

  /**
   * Determine pool health status
   * @param {number} utilization - Pool utilization percentage
   * @param {number} waiting - Number of waiting connections
   * @param {number} errors - Total errors
   * @returns {string} Health status
   */
  getPoolHealth(utilization, waiting, errors) {
    if (utilization >= this.thresholds.criticalUtilization || waiting >= this.thresholds.waitingConnections * 2) {
      return 'critical';
    }
    if (utilization >= this.thresholds.highUtilization || waiting >= this.thresholds.waitingConnections) {
      return 'warning';
    }
    if (errors > 10) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Get pool health summary
   * @returns {Object} Health summary for all pools
   */
  getHealthSummary() {
    const summary = {
      overall: 'healthy',
      pools: {}
    };

    let hasWarning = false;
    let hasCritical = false;

    for (const [name, poolInfo] of this.pools) {
      const stats = this.getPoolStatsForPool(name, poolInfo);
      summary.pools[name] = {
        health: stats.health,
        utilization: stats.current.utilization,
        waiting: stats.current.waiting,
        errors: stats.lifetime.totalErrors
      };

      if (stats.health === 'critical') {
        hasCritical = true;
      } else if (stats.health === 'warning' || stats.health === 'degraded') {
        hasWarning = true;
      }
    }

    if (hasCritical) {
      summary.overall = 'critical';
    } else if (hasWarning) {
      summary.overall = 'warning';
    }

    return summary;
  }

  /**
   * Reset pool statistics
   * @param {string} name - Pool name (optional, resets all if not specified)
   */
  resetStats(name = null) {
    if (name) {
      const poolInfo = this.pools.get(name);
      if (poolInfo) {
        poolInfo.stats = {
          totalAcquired: 0,
          totalReleased: 0,
          totalErrors: 0,
          peakUsage: 0,
          lastChecked: new Date()
        };
        logger.info(`Pool statistics reset for ${name}`);
      }
    } else {
      for (const [poolName, poolInfo] of this.pools) {
        poolInfo.stats = {
          totalAcquired: 0,
          totalReleased: 0,
          totalErrors: 0,
          peakUsage: 0,
          lastChecked: new Date()
        };
      }
      logger.info('Pool statistics reset for all pools');
    }
  }
}

// Create singleton instance
const connectionPoolMonitor = new ConnectionPoolMonitor();

module.exports = {
  connectionPoolMonitor,
  ConnectionPoolMonitor
};
