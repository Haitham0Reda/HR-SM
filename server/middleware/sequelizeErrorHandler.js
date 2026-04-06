/**
 * Sequelize Error Handler Middleware
 * 
 * Handles Sequelize-specific errors and converts them to appropriate HTTP responses
 * Provides detailed error logging with SQL queries and parameters
 */

const { 
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  ConnectionError,
  TimeoutError,
  DatabaseError,
  OptimisticLockError,
  EmptyResultError
} = require('sequelize');

const logger = require('../utils/logger');

/**
 * Sequelize Error Handler Middleware
 */
function sequelizeErrorHandler(err, req, res, next) {
  // Log error details
  logSequelizeError(err, req);

  // Handle specific Sequelize errors
  if (err instanceof UniqueConstraintError) {
    return handleUniqueConstraintError(err, req, res);
  }

  if (err instanceof ForeignKeyConstraintError) {
    return handleForeignKeyConstraintError(err, req, res);
  }

  if (err instanceof ValidationError) {
    return handleValidationError(err, req, res);
  }

  if (err instanceof ConnectionError) {
    return handleConnectionError(err, req, res);
  }

  if (err instanceof TimeoutError) {
    return handleTimeoutError(err, req, res);
  }

  if (err instanceof OptimisticLockError) {
    return handleOptimisticLockError(err, req, res);
  }

  if (err instanceof EmptyResultError) {
    return handleEmptyResultError(err, req, res);
  }

  if (err instanceof DatabaseError) {
    return handleDatabaseError(err, req, res);
  }

  // Pass to next error handler if not a Sequelize error
  next(err);
}

/**
 * Handle UniqueConstraintError
 * Occurs when trying to insert/update a record with a duplicate unique value
 */
function handleUniqueConstraintError(err, req, res) {
  const field = extractFieldFromError(err);
  const value = extractValueFromError(err);

  logger.warn('Unique constraint violation', {
    field,
    value,
    table: err.table,
    constraint: err.parent?.constraint,
    sql: err.sql,
    parameters: err.parameters,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method
  });

  return res.status(409).json({
    error: 'Duplicate Entry',
    message: `A record with this ${field} already exists`,
    field,
    code: 'UNIQUE_CONSTRAINT_VIOLATION',
    details: {
      constraint: err.parent?.constraint,
      table: err.table
    }
  });
}

/**
 * Handle ForeignKeyConstraintError
 * Occurs when trying to insert/update/delete with invalid foreign key reference
 */
function handleForeignKeyConstraintError(err, req, res) {
  const isDelete = req.method === 'DELETE';
  const field = extractFieldFromError(err);

  logger.warn('Foreign key constraint violation', {
    field,
    table: err.table,
    constraint: err.parent?.constraint,
    relatedTable: err.relatedTable,
    sql: err.sql,
    parameters: err.parameters,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method
  });

  if (isDelete) {
    return res.status(409).json({
      error: 'Cannot Delete',
      message: 'This record cannot be deleted because it is referenced by other records',
      code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      details: {
        constraint: err.parent?.constraint,
        table: err.table,
        relatedTable: err.relatedTable
      }
    });
  }

  return res.status(400).json({
    error: 'Invalid Reference',
    message: `The referenced ${field} does not exist`,
    field,
    code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
    details: {
      constraint: err.parent?.constraint,
      table: err.table,
      relatedTable: err.relatedTable
    }
  });
}

/**
 * Handle ValidationError
 * Occurs when model validation fails
 */
function handleValidationError(err, req, res) {
  const errors = err.errors.map(e => ({
    field: e.path,
    message: e.message,
    type: e.type,
    value: e.value,
    validatorKey: e.validatorKey
  }));

  logger.warn('Validation error', {
    errors,
    sql: err.sql,
    parameters: err.parameters,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method
  });

  return res.status(400).json({
    error: 'Validation Failed',
    message: 'One or more fields failed validation',
    code: 'VALIDATION_ERROR',
    errors
  });
}

/**
 * Handle ConnectionError
 * Occurs when database connection fails
 */
function handleConnectionError(err, req, res) {
  logger.error('Database connection error', {
    message: err.message,
    parent: err.parent?.message,
    code: err.parent?.code,
    errno: err.parent?.errno,
    syscall: err.parent?.syscall,
    address: err.parent?.address,
    port: err.parent?.port,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  return res.status(503).json({
    error: 'Service Unavailable',
    message: 'Database connection failed. Please try again later.',
    code: 'CONNECTION_ERROR',
    details: {
      type: err.parent?.code || 'UNKNOWN'
    }
  });
}

/**
 * Handle TimeoutError
 * Occurs when query execution times out
 */
function handleTimeoutError(err, req, res) {
  logger.error('Database timeout error', {
    message: err.message,
    sql: err.sql,
    parameters: err.parameters,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  return res.status(504).json({
    error: 'Request Timeout',
    message: 'The database query took too long to execute. Please try again.',
    code: 'TIMEOUT_ERROR'
  });
}

/**
 * Handle OptimisticLockError
 * Occurs when optimistic locking fails (version mismatch)
 */
function handleOptimisticLockError(err, req, res) {
  logger.warn('Optimistic lock error', {
    message: err.message,
    modelName: err.modelName,
    values: err.values,
    where: err.where,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method
  });

  return res.status(409).json({
    error: 'Conflict',
    message: 'This record has been modified by another user. Please refresh and try again.',
    code: 'OPTIMISTIC_LOCK_ERROR',
    details: {
      modelName: err.modelName
    }
  });
}

/**
 * Handle EmptyResultError
 * Occurs when a required record is not found
 */
function handleEmptyResultError(err, req, res) {
  logger.warn('Empty result error', {
    message: err.message,
    sql: err.sql,
    parameters: err.parameters,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method
  });

  return res.status(404).json({
    error: 'Not Found',
    message: 'The requested record was not found',
    code: 'EMPTY_RESULT_ERROR'
  });
}

/**
 * Handle generic DatabaseError
 * Catches all other database-related errors
 */
function handleDatabaseError(err, req, res) {
  logger.error('Database error', {
    message: err.message,
    sql: err.sql,
    parameters: err.parameters,
    parent: err.parent?.message,
    code: err.parent?.code,
    errno: err.parent?.errno,
    sqlState: err.parent?.sqlState,
    sqlMessage: err.parent?.sqlMessage,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenant_id,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  // Check for specific PostgreSQL error codes
  const pgErrorCode = err.parent?.code;
  
  if (pgErrorCode === '23505') {
    // Unique violation
    return handleUniqueConstraintError(err, req, res);
  }
  
  if (pgErrorCode === '23503') {
    // Foreign key violation
    return handleForeignKeyConstraintError(err, req, res);
  }
  
  if (pgErrorCode === '23502') {
    // Not null violation
    return res.status(400).json({
      error: 'Missing Required Field',
      message: 'A required field is missing',
      code: 'NOT_NULL_VIOLATION',
      details: {
        sqlState: err.parent?.sqlState
      }
    });
  }

  return res.status(500).json({
    error: 'Database Error',
    message: 'An error occurred while processing your request',
    code: 'DATABASE_ERROR',
    details: {
      type: pgErrorCode || 'UNKNOWN'
    }
  });
}

/**
 * Log Sequelize error with full details
 */
function logSequelizeError(err, req) {
  const errorDetails = {
    name: err.name,
    message: err.message,
    sql: err.sql,
    parameters: err.parameters,
    parent: {
      message: err.parent?.message,
      code: err.parent?.code,
      errno: err.parent?.errno,
      sqlState: err.parent?.sqlState,
      sqlMessage: err.parent?.sqlMessage
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeBody(req.body),
      userId: req.user?.id,
      tenantId: req.tenantContext?.tenant_id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    stack: err.stack
  };

  logger.error('Sequelize error occurred', errorDetails);
}

/**
 * Extract field name from error
 */
function extractFieldFromError(err) {
  // Try to extract from error message
  if (err.errors && err.errors.length > 0) {
    return err.errors[0].path;
  }

  // Try to extract from constraint name
  if (err.parent?.constraint) {
    const match = err.parent.constraint.match(/_([^_]+)_key$/);
    if (match) {
      return match[1];
    }
  }

  // Try to extract from error message
  const match = err.message.match(/key "([^"]+)"/);
  if (match) {
    return match[1];
  }

  return 'unknown';
}

/**
 * Extract value from error
 */
function extractValueFromError(err) {
  if (err.errors && err.errors.length > 0) {
    return err.errors[0].value;
  }

  // Try to extract from error message
  const match = err.message.match(/\(([^)]+)\)/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Sanitize request body for logging (remove sensitive fields)
 */
function sanitizeBody(body) {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'encryptionKey'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * PostgreSQL Error Code Reference
 */
const PG_ERROR_CODES = {
  // Class 23 - Integrity Constraint Violation
  '23000': 'integrity_constraint_violation',
  '23001': 'restrict_violation',
  '23502': 'not_null_violation',
  '23503': 'foreign_key_violation',
  '23505': 'unique_violation',
  '23514': 'check_violation',
  '23P01': 'exclusion_violation',

  // Class 08 - Connection Exception
  '08000': 'connection_exception',
  '08003': 'connection_does_not_exist',
  '08006': 'connection_failure',
  '08001': 'sqlclient_unable_to_establish_sqlconnection',
  '08004': 'sqlserver_rejected_establishment_of_sqlconnection',
  '08007': 'transaction_resolution_unknown',
  '08P01': 'protocol_violation',

  // Class 40 - Transaction Rollback
  '40000': 'transaction_rollback',
  '40001': 'serialization_failure',
  '40002': 'transaction_integrity_constraint_violation',
  '40003': 'statement_completion_unknown',
  '40P01': 'deadlock_detected',

  // Class 53 - Insufficient Resources
  '53000': 'insufficient_resources',
  '53100': 'disk_full',
  '53200': 'out_of_memory',
  '53300': 'too_many_connections',
  '53400': 'configuration_limit_exceeded',

  // Class 57 - Operator Intervention
  '57000': 'operator_intervention',
  '57014': 'query_canceled',
  '57P01': 'admin_shutdown',
  '57P02': 'crash_shutdown',
  '57P03': 'cannot_connect_now',
  '57P04': 'database_dropped'
};

/**
 * Get human-readable error description from PostgreSQL error code
 */
function getErrorDescription(code) {
  return PG_ERROR_CODES[code] || 'unknown_error';
}

module.exports = {
  sequelizeErrorHandler,
  handleUniqueConstraintError,
  handleForeignKeyConstraintError,
  handleValidationError,
  handleConnectionError,
  handleTimeoutError,
  handleOptimisticLockError,
  handleEmptyResultError,
  handleDatabaseError,
  PG_ERROR_CODES,
  getErrorDescription
};
