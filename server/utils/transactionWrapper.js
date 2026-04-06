const { Transaction } = require('sequelize');
const logger = require('./logger');

/**
 * Transaction Wrapper Utility
 * Provides managed transactions with automatic rollback on errors
 * Supports configurable isolation levels
 */

/**
 * Execute a function within a managed transaction
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Function} callback - Async function to execute within transaction
 * @param {Object} options - Transaction options
 * @param {string} options.isolationLevel - Transaction isolation level
 * @param {boolean} options.autocommit - Whether to autocommit (default: false)
 * @param {string} options.operationName - Name of operation for logging
 * @returns {Promise<any>} Result of the callback function
 */
async function withTransaction(sequelize, callback, options = {}) {
  const {
    isolationLevel = Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    autocommit = false,
    operationName = 'database operation'
  } = options;

  const transaction = await sequelize.transaction({
    isolationLevel,
    autocommit
  });

  try {
    logger.debug(`Starting transaction for: ${operationName}`);
    
    const result = await callback(transaction);
    
    await transaction.commit();
    logger.debug(`Transaction committed successfully for: ${operationName}`);
    
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Transaction rolled back for: ${operationName}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Execute multiple operations in a single transaction
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Array<Function>} operations - Array of async functions to execute
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} Array of results from each operation
 */
async function withTransactionBatch(sequelize, operations, options = {}) {
  return withTransaction(sequelize, async (transaction) => {
    const results = [];
    
    for (const operation of operations) {
      const result = await operation(transaction);
      results.push(result);
    }
    
    return results;
  }, options);
}

/**
 * Execute a function with retry logic and transaction support
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Function} callback - Async function to execute
 * @param {Object} options - Options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {string} options.isolationLevel - Transaction isolation level
 * @param {string} options.operationName - Name of operation for logging
 * @returns {Promise<any>} Result of the callback function
 */
async function withTransactionRetry(sequelize, callback, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    isolationLevel,
    operationName = 'database operation'
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(sequelize, callback, {
        isolationLevel,
        operationName: `${operationName} (attempt ${attempt}/${maxRetries})`
      });
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable (deadlock, serialization failure, etc.)
      const isRetryable = isRetryableError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      logger.warn(`Retryable error in transaction, attempt ${attempt}/${maxRetries}`, {
        error: error.message,
        operationName
      });
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  const retryableErrors = [
    'SequelizeConnectionError',
    'SequelizeConnectionRefusedError',
    'SequelizeHostNotFoundError',
    'SequelizeHostNotReachableError',
    'SequelizeInvalidConnectionError',
    'SequelizeConnectionTimedOutError',
    'SequelizeTimeoutError',
    'SequelizeDatabaseError' // For deadlocks and serialization failures
  ];
  
  const errorName = error.name || error.constructor.name;
  
  // Check error name
  if (retryableErrors.includes(errorName)) {
    return true;
  }
  
  // Check for specific PostgreSQL error codes
  if (error.parent && error.parent.code) {
    const retryableCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '57P03', // cannot_connect_now
    ];
    
    return retryableCodes.includes(error.parent.code);
  }
  
  return false;
}

/**
 * Isolation level constants for easy access
 */
const ISOLATION_LEVELS = {
  READ_UNCOMMITTED: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
  READ_COMMITTED: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  REPEATABLE_READ: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  SERIALIZABLE: Transaction.ISOLATION_LEVELS.SERIALIZABLE
};

module.exports = {
  withTransaction,
  withTransactionBatch,
  withTransactionRetry,
  isRetryableError,
  ISOLATION_LEVELS
};
