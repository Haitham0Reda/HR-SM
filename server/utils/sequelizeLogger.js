/**
 * Sequelize Logger
 * 
 * Enhanced logging for Sequelize operations
 * Logs SQL queries, parameters, execution time, and errors
 */

const logger = require('./logger');

class SequelizeLogger {
  constructor() {
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // ms
    this.logAllQueries = process.env.LOG_ALL_QUERIES === 'true';
    this.queryStats = {
      total: 0,
      slow: 0,
      errors: 0
    };
  }

  /**
   * Log SQL query
   * @param {string} sql - SQL query
   * @param {number} executionTime - Execution time in ms
   * @param {Object} options - Additional options
   */
  logQuery(sql, executionTime, options = {}) {
    this.queryStats.total++;

    const isSlow = executionTime > this.slowQueryThreshold;
    if (isSlow) {
      this.queryStats.slow++;
    }

    // Log slow queries or all queries if enabled
    if (isSlow || this.logAllQueries) {
      const logData = {
        sql: this.formatSQL(sql),
        executionTime: `${executionTime}ms`,
        slow: isSlow,
        ...options
      };

      if (isSlow) {
        logger.warn('Slow query detected', logData);
      } else {
        logger.debug('Query executed', logData);
      }
    }
  }

  /**
   * Log query error
   * @param {Error} error - Error object
   * @param {string} sql - SQL query
   * @param {Object} options - Additional options
   */
  logError(error, sql, options = {}) {
    this.queryStats.errors++;

    logger.error('Query error', {
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      },
      sql: this.formatSQL(sql),
      parameters: options.parameters,
      stack: error.stack,
      ...options
    });
  }

  /**
   * Log query with parameters
   * @param {string} sql - SQL query
   * @param {Array} parameters - Query parameters
   * @param {number} executionTime - Execution time in ms
   * @param {Object} options - Additional options
   */
  logQueryWithParams(sql, parameters, executionTime, options = {}) {
    this.logQuery(sql, executionTime, {
      parameters: this.sanitizeParameters(parameters),
      ...options
    });
  }

  /**
   * Format SQL for better readability
   * @param {string} sql - SQL query
   * @returns {string} Formatted SQL
   */
  formatSQL(sql) {
    if (!sql) return '';

    // Remove extra whitespace
    let formatted = sql.replace(/\s+/g, ' ').trim();

    // Add line breaks for better readability (optional)
    if (process.env.FORMAT_SQL === 'true') {
      formatted = formatted
        .replace(/SELECT /gi, '\nSELECT ')
        .replace(/FROM /gi, '\nFROM ')
        .replace(/WHERE /gi, '\nWHERE ')
        .replace(/JOIN /gi, '\nJOIN ')
        .replace(/LEFT JOIN /gi, '\nLEFT JOIN ')
        .replace(/INNER JOIN /gi, '\nINNER JOIN ')
        .replace(/ORDER BY /gi, '\nORDER BY ')
        .replace(/GROUP BY /gi, '\nGROUP BY ')
        .replace(/LIMIT /gi, '\nLIMIT ')
        .trim();
    }

    return formatted;
  }

  /**
   * Sanitize parameters (remove sensitive data)
   * @param {Array|Object} parameters - Query parameters
   * @returns {Array|Object} Sanitized parameters
   */
  sanitizeParameters(parameters) {
    if (!parameters) return parameters;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'encryptionKey'];

    if (Array.isArray(parameters)) {
      return parameters.map(param => {
        if (typeof param === 'object' && param !== null) {
          return this.sanitizeObject(param, sensitiveFields);
        }
        return param;
      });
    }

    if (typeof parameters === 'object') {
      return this.sanitizeObject(parameters, sensitiveFields);
    }

    return parameters;
  }

  /**
   * Sanitize object (remove sensitive fields)
   * @param {Object} obj - Object to sanitize
   * @param {Array} sensitiveFields - List of sensitive field names
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj, sensitiveFields) {
    const sanitized = { ...obj };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get query statistics
   * @returns {Object} Query statistics
   */
  getStats() {
    return {
      ...this.queryStats,
      slowQueryPercentage: this.queryStats.total > 0
        ? ((this.queryStats.slow / this.queryStats.total) * 100).toFixed(2) + '%'
        : '0%',
      errorPercentage: this.queryStats.total > 0
        ? ((this.queryStats.errors / this.queryStats.total) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset query statistics
   */
  resetStats() {
    this.queryStats = {
      total: 0,
      slow: 0,
      errors: 0
    };
  }

  /**
   * Create Sequelize logging function
   * @returns {Function} Logging function for Sequelize
   */
  createSequelizeLogger() {
    return (sql, timing) => {
      const executionTime = timing || 0;
      this.logQuery(sql, executionTime);
    };
  }

  /**
   * Create Sequelize benchmark logging function
   * @returns {Function} Benchmark logging function for Sequelize
   */
  createBenchmarkLogger() {
    return (sql, timing, options) => {
      this.logQueryWithParams(sql, options?.bind, timing, {
        type: options?.type,
        model: options?.model?.name
      });
    };
  }

  /**
   * Log transaction start
   * @param {Object} transaction - Transaction object
   */
  logTransactionStart(transaction) {
    logger.debug('Transaction started', {
      id: transaction.id,
      isolationLevel: transaction.options.isolationLevel
    });
  }

  /**
   * Log transaction commit
   * @param {Object} transaction - Transaction object
   * @param {number} duration - Transaction duration in ms
   */
  logTransactionCommit(transaction, duration) {
    logger.debug('Transaction committed', {
      id: transaction.id,
      duration: `${duration}ms`
    });
  }

  /**
   * Log transaction rollback
   * @param {Object} transaction - Transaction object
   * @param {Error} error - Error that caused rollback
   */
  logTransactionRollback(transaction, error) {
    logger.warn('Transaction rolled back', {
      id: transaction.id,
      error: error?.message,
      stack: error?.stack
    });
  }

  /**
   * Log connection pool status
   * @param {Object} pool - Connection pool object
   */
  logPoolStatus(pool) {
    logger.info('Connection pool status', {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting
    });
  }

  /**
   * Log model sync
   * @param {string} modelName - Model name
   * @param {Object} options - Sync options
   */
  logModelSync(modelName, options = {}) {
    logger.info('Model synced', {
      model: modelName,
      force: options.force,
      alter: options.alter
    });
  }

  /**
   * Log migration
   * @param {string} migrationName - Migration name
   * @param {string} direction - 'up' or 'down'
   */
  logMigration(migrationName, direction) {
    logger.info('Migration executed', {
      migration: migrationName,
      direction
    });
  }
}

// Create singleton instance
const sequelizeLogger = new SequelizeLogger();

/**
 * Configure Sequelize logging options
 * @param {Object} sequelize - Sequelize instance
 */
function configureSequelizeLogging(sequelize) {
  // Set up query logging
  sequelize.options.logging = sequelizeLogger.createSequelizeLogger();

  // Set up benchmark logging
  sequelize.options.benchmark = true;
  sequelize.options.logQueryParameters = true;

  // Hook into query lifecycle
  sequelize.addHook('beforeQuery', (options) => {
    options.startTime = Date.now();
  });

  sequelize.addHook('afterQuery', (options, query) => {
    const executionTime = Date.now() - options.startTime;
    sequelizeLogger.logQueryWithParams(
      query.sql,
      query.bind,
      executionTime,
      {
        type: options.type,
        model: options.model?.name
      }
    );
  });

  // Hook into transaction lifecycle
  sequelize.addHook('beforeTransaction', (transaction) => {
    sequelizeLogger.logTransactionStart(transaction);
  });

  sequelize.addHook('afterTransactionCommit', (transaction) => {
    const duration = Date.now() - transaction.startTime;
    sequelizeLogger.logTransactionCommit(transaction, duration);
  });

  sequelize.addHook('afterTransactionRollback', (transaction, error) => {
    sequelizeLogger.logTransactionRollback(transaction, error);
  });

  logger.info('Sequelize logging configured', {
    slowQueryThreshold: sequelizeLogger.slowQueryThreshold,
    logAllQueries: sequelizeLogger.logAllQueries
  });
}

/**
 * Middleware to log query statistics
 */
function queryStatsMiddleware(req, res, next) {
  // Attach stats to request
  req.queryStats = sequelizeLogger.getStats();
  next();
}

/**
 * Express route to get query statistics
 */
function getQueryStatsRoute(req, res) {
  const stats = sequelizeLogger.getStats();
  res.json({
    success: true,
    stats
  });
}

/**
 * Express route to reset query statistics
 */
function resetQueryStatsRoute(req, res) {
  sequelizeLogger.resetStats();
  res.json({
    success: true,
    message: 'Query statistics reset'
  });
}

module.exports = {
  sequelizeLogger,
  configureSequelizeLogging,
  queryStatsMiddleware,
  getQueryStatsRoute,
  resetQueryStatsRoute
};
