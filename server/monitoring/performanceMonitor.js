/**
 * Performance Monitor
 * 
 * Comprehensive performance monitoring for PostgreSQL databases
 * Tracks query performance, connection pool utilization, and database health
 */

const logger = require('../utils/logger');
const { EventEmitter } = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        byType: {},
        byModel: {},
        byDatabase: {}
      },
      connections: {
        licenseServer: {
          acquired: 0,
          released: 0,
          errors: 0,
          currentActive: 0
        },
        mainApp: {
          acquired: 0,
          released: 0,
          errors: 0,
          currentActive: 0
        }
      },
      transactions: {
        started: 0,
        committed: 0,
        rolledBack: 0,
        active: 0
      },
      slowQueries: [],
      errors: []
    };

    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // ms
    this.maxSlowQueriesStored = parseInt(process.env.MAX_SLOW_QUERIES_STORED) || 100;
    this.maxErrorsStored = parseInt(process.env.MAX_ERRORS_STORED) || 100;
    
    this.alertThresholds = {
      slowQueryPercentage: parseFloat(process.env.ALERT_SLOW_QUERY_PERCENTAGE) || 10, // %
      errorPercentage: parseFloat(process.env.ALERT_ERROR_PERCENTAGE) || 5, // %
      poolUtilization: parseFloat(process.env.ALERT_POOL_UTILIZATION) || 80, // %
      connectionErrors: parseInt(process.env.ALERT_CONNECTION_ERRORS) || 10
    };

    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   * @param {number} intervalMs - Monitoring interval in milliseconds
   */
  startMonitoring(intervalMs = 60000) {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkThresholds();
      this.logMetricsSummary();
    }, intervalMs);

    logger.info('Performance monitoring started', {
      interval: `${intervalMs}ms`,
      slowQueryThreshold: `${this.slowQueryThreshold}ms`,
      alertThresholds: this.alertThresholds
    });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Performance monitoring stopped');
  }

  /**
   * Record query execution
   * @param {Object} queryInfo - Query information
   */
  recordQuery(queryInfo) {
    const { sql, executionTime, type, model, database, error } = queryInfo;

    this.metrics.queries.total++;

    // Track by type
    if (type) {
      this.metrics.queries.byType[type] = (this.metrics.queries.byType[type] || 0) + 1;
    }

    // Track by model
    if (model) {
      this.metrics.queries.byModel[model] = (this.metrics.queries.byModel[model] || 0) + 1;
    }

    // Track by database
    if (database) {
      this.metrics.queries.byDatabase[database] = (this.metrics.queries.byDatabase[database] || 0) + 1;
    }

    // Track slow queries
    if (executionTime > this.slowQueryThreshold) {
      this.metrics.queries.slow++;
      this.recordSlowQuery({
        sql,
        executionTime,
        type,
        model,
        database,
        timestamp: new Date()
      });
    }

    // Track errors
    if (error) {
      this.metrics.queries.failed++;
      this.recordError({
        sql,
        error,
        type,
        model,
        database,
        timestamp: new Date()
      });
    }

    // Emit event for real-time monitoring
    this.emit('query', queryInfo);
  }

  /**
   * Record slow query
   * @param {Object} slowQuery - Slow query information
   */
  recordSlowQuery(slowQuery) {
    this.slowQueries.push(slowQuery);

    // Keep only the most recent slow queries
    if (this.slowQueries.length > this.maxSlowQueriesStored) {
      this.slowQueries.shift();
    }

    // Emit alert event
    this.emit('slowQuery', slowQuery);

    logger.warn('Slow query detected', {
      executionTime: `${slowQuery.executionTime}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      sql: slowQuery.sql.substring(0, 200),
      type: slowQuery.type,
      model: slowQuery.model,
      database: slowQuery.database
    });
  }

  /**
   * Record query error
   * @param {Object} errorInfo - Error information
   */
  recordError(errorInfo) {
    this.metrics.errors.push(errorInfo);

    // Keep only the most recent errors
    if (this.metrics.errors.length > this.maxErrorsStored) {
      this.metrics.errors.shift();
    }

    // Emit alert event
    this.emit('queryError', errorInfo);
  }

  /**
   * Record connection pool event
   * @param {string} database - Database name ('licenseServer' or 'mainApp')
   * @param {string} event - Event type ('acquire', 'release', 'error')
   */
  recordConnectionEvent(database, event) {
    if (!this.metrics.connections[database]) {
      logger.warn(`Unknown database: ${database}`);
      return;
    }

    switch (event) {
      case 'acquire':
        this.metrics.connections[database].acquired++;
        this.metrics.connections[database].currentActive++;
        break;
      case 'release':
        this.metrics.connections[database].released++;
        this.metrics.connections[database].currentActive--;
        break;
      case 'error':
        this.metrics.connections[database].errors++;
        this.emit('connectionError', { database, timestamp: new Date() });
        break;
    }

    this.emit('connection', { database, event });
  }

  /**
   * Record transaction event
   * @param {string} event - Event type ('start', 'commit', 'rollback')
   */
  recordTransaction(event) {
    switch (event) {
      case 'start':
        this.metrics.transactions.started++;
        this.metrics.transactions.active++;
        break;
      case 'commit':
        this.metrics.transactions.committed++;
        this.metrics.transactions.active--;
        break;
      case 'rollback':
        this.metrics.transactions.rolledBack++;
        this.metrics.transactions.active--;
        break;
    }

    this.emit('transaction', { event, timestamp: new Date() });
  }

  /**
   * Get connection pool statistics
   * @param {Object} sequelize - Sequelize instance
   * @returns {Object} Pool statistics
   */
  getPoolStats(sequelize) {
    const pool = sequelize.connectionManager.pool;
    
    return {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting,
      maxSize: pool.max,
      minSize: pool.min,
      utilization: pool.max > 0 ? ((pool.using / pool.max) * 100).toFixed(2) : 0
    };
  }

  /**
   * Check alert thresholds
   */
  checkThresholds() {
    const { queries, connections } = this.metrics;

    // Check slow query percentage
    if (queries.total > 0) {
      const slowQueryPercentage = (queries.slow / queries.total) * 100;
      if (slowQueryPercentage > this.alertThresholds.slowQueryPercentage) {
        this.emit('alert', {
          type: 'slowQueryPercentage',
          value: slowQueryPercentage.toFixed(2),
          threshold: this.alertThresholds.slowQueryPercentage,
          message: `Slow query percentage (${slowQueryPercentage.toFixed(2)}%) exceeds threshold (${this.alertThresholds.slowQueryPercentage}%)`
        });
      }

      // Check error percentage
      const errorPercentage = (queries.failed / queries.total) * 100;
      if (errorPercentage > this.alertThresholds.errorPercentage) {
        this.emit('alert', {
          type: 'errorPercentage',
          value: errorPercentage.toFixed(2),
          threshold: this.alertThresholds.errorPercentage,
          message: `Error percentage (${errorPercentage.toFixed(2)}%) exceeds threshold (${this.alertThresholds.errorPercentage}%)`
        });
      }
    }

    // Check connection errors
    Object.entries(connections).forEach(([database, stats]) => {
      if (stats.errors > this.alertThresholds.connectionErrors) {
        this.emit('alert', {
          type: 'connectionErrors',
          database,
          value: stats.errors,
          threshold: this.alertThresholds.connectionErrors,
          message: `Connection errors for ${database} (${stats.errors}) exceeds threshold (${this.alertThresholds.connectionErrors})`
        });
      }
    });
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary() {
    const { queries, connections, transactions } = this.metrics;

    logger.info('Performance metrics summary', {
      queries: {
        total: queries.total,
        slow: queries.slow,
        failed: queries.failed,
        slowPercentage: queries.total > 0 ? ((queries.slow / queries.total) * 100).toFixed(2) + '%' : '0%',
        errorPercentage: queries.total > 0 ? ((queries.failed / queries.total) * 100).toFixed(2) + '%' : '0%'
      },
      connections: {
        licenseServer: {
          acquired: connections.licenseServer.acquired,
          released: connections.licenseServer.released,
          errors: connections.licenseServer.errors,
          currentActive: connections.licenseServer.currentActive
        },
        mainApp: {
          acquired: connections.mainApp.acquired,
          released: connections.mainApp.released,
          errors: connections.mainApp.errors,
          currentActive: connections.mainApp.currentActive
        }
      },
      transactions: {
        started: transactions.started,
        committed: transactions.committed,
        rolledBack: transactions.rolledBack,
        active: transactions.active,
        rollbackPercentage: transactions.started > 0 ? ((transactions.rolledBack / transactions.started) * 100).toFixed(2) + '%' : '0%'
      }
    });
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      slowQueryPercentage: this.metrics.queries.total > 0 
        ? ((this.metrics.queries.slow / this.metrics.queries.total) * 100).toFixed(2) + '%'
        : '0%',
      errorPercentage: this.metrics.queries.total > 0
        ? ((this.metrics.queries.failed / this.metrics.queries.total) * 100).toFixed(2) + '%'
        : '0%',
      rollbackPercentage: this.metrics.transactions.started > 0
        ? ((this.metrics.transactions.rolledBack / this.metrics.transactions.started) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get slow queries
   * @param {number} limit - Maximum number of slow queries to return
   * @returns {Array} Slow queries
   */
  getSlowQueries(limit = 10) {
    return this.metrics.slowQueries
      .slice(-limit)
      .reverse();
  }

  /**
   * Get recent errors
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors
      .slice(-limit)
      .reverse();
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        byType: {},
        byModel: {},
        byDatabase: {}
      },
      connections: {
        licenseServer: {
          acquired: 0,
          released: 0,
          errors: 0,
          currentActive: 0
        },
        mainApp: {
          acquired: 0,
          released: 0,
          errors: 0,
          currentActive: 0
        }
      },
      transactions: {
        started: 0,
        committed: 0,
        rolledBack: 0,
        active: 0
      },
      slowQueries: [],
      errors: []
    };

    logger.info('Performance metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Set up alert handlers
performanceMonitor.on('alert', (alert) => {
  logger.error('Performance alert', alert);
});

performanceMonitor.on('slowQuery', (slowQuery) => {
  // Additional handling for slow queries (e.g., send to monitoring service)
  if (process.env.ENABLE_SLOW_QUERY_ALERTS === 'true') {
    logger.warn('Slow query alert', {
      executionTime: slowQuery.executionTime,
      sql: slowQuery.sql.substring(0, 500),
      model: slowQuery.model,
      database: slowQuery.database
    });
  }
});

performanceMonitor.on('connectionError', (error) => {
  logger.error('Connection error alert', error);
});

module.exports = {
  performanceMonitor,
  PerformanceMonitor
};
