/**
 * Enhanced Winston Logger Configuration
 * 
 * Features:
 * - Tenant context in all logs
 * - Request ID tracking
 * - Log filtering by tenant, module, severity
 * - Structured logging with JSON format
 * - Daily log rotation
 * - Separate error logs
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format to add tenant context and request ID
 */
const enhancedFormat = winston.format((info) => {
    // Add timestamp if not present
    if (!info.timestamp) {
        info.timestamp = new Date().toISOString();
    }

    // Ensure context object exists
    if (!info.context) {
        info.context = {};
    }

    return info;
});

/**
 * Format for JSON logs (file output)
 */
const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    enhancedFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Format for console logs (development)
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    enhancedFormat(),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        let output = `${timestamp} [${level}]: ${message}`;

        // Add tenant context if present
        if (context?.tenantId) {
            output += ` [Tenant: ${context.tenantId}]`;
        }

        // Add request ID if present
        if (context?.requestId) {
            output += ` [Request: ${context.requestId}]`;
        }

        // Add module if present
        if (context?.module) {
            output += ` [Module: ${context.module}]`;
        }

        // Add remaining metadata
        const remainingMeta = { ...meta };
        delete remainingMeta.context;
        
        if (Object.keys(remainingMeta).length > 0) {
            output += `\n${JSON.stringify(remainingMeta, null, 2)}`;
        }

        return output;
    })
);

/**
 * Daily rotate file transport for application logs
 */
const applicationLogTransport = new DailyRotateFile({
    filename: path.join(logsDir, '%DATE%-application.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'info',
    format: jsonFormat
});

/**
 * Daily rotate file transport for error logs
 */
const errorLogTransport = new DailyRotateFile({
    filename: path.join(logsDir, '%DATE%-error.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: jsonFormat
});

/**
 * Daily rotate file transport for audit logs
 */
const auditLogTransport = new DailyRotateFile({
    filename: path.join(logsDir, '%DATE%-audit.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '90d', // Keep audit logs longer
    level: 'info',
    format: jsonFormat
});

/**
 * Console transport for development
 */
const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
});

/**
 * Create the main logger instance
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        applicationLogTransport,
        errorLogTransport,
        consoleTransport
    ],
    exitOnError: false
});

/**
 * Create a child logger with context
 * @param {Object} context - Context to add to all logs
 * @param {string} context.tenantId - Tenant identifier
 * @param {string} context.requestId - Request identifier
 * @param {string} context.module - Module name
 * @param {string} context.userId - User identifier
 * @returns {winston.Logger} Child logger with context
 */
logger.withContext = function(context = {}) {
    return logger.child({ context });
};

/**
 * Create a child logger for a specific tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {winston.Logger} Child logger with tenant context
 */
logger.forTenant = function(tenantId) {
    return logger.child({ context: { tenantId } });
};

/**
 * Create a child logger for a specific module
 * @param {string} module - Module name
 * @returns {winston.Logger} Child logger with module context
 */
logger.forModule = function(module) {
    return logger.child({ context: { module } });
};

/**
 * Create a child logger for a specific request
 * @param {string} requestId - Request identifier
 * @param {Object} additionalContext - Additional context
 * @returns {winston.Logger} Child logger with request context
 */
logger.forRequest = function(requestId, additionalContext = {}) {
    return logger.child({ 
        context: { 
            requestId,
            ...additionalContext
        } 
    });
};

/**
 * Create audit logger (separate from main logger)
 */
const auditLogger = winston.createLogger({
    level: 'info',
    transports: [
        auditLogTransport,
        consoleTransport
    ],
    exitOnError: false
});

/**
 * Log an audit event
 * @param {string} action - Action being audited
 * @param {Object} details - Details of the action
 * @param {string} details.tenantId - Tenant identifier
 * @param {string} details.userId - User identifier
 * @param {string} details.resource - Resource being accessed
 * @param {Object} details.metadata - Additional metadata
 */
auditLogger.logAction = function(action, details = {}) {
    const { tenantId, userId, resource, metadata = {} } = details;
    
    auditLogger.info(action, {
        context: {
            tenantId,
            userId,
            resource,
            action,
            timestamp: new Date().toISOString()
        },
        ...metadata
    });
};

/**
 * Log a platform administrator action
 * @param {string} action - Action being performed
 * @param {Object} details - Details of the action
 */
auditLogger.logPlatformAction = function(action, details = {}) {
    const { platformUserId, targetTenantId, resource, metadata = {} } = details;
    
    auditLogger.info(`[PLATFORM] ${action}`, {
        context: {
            platformUserId,
            targetTenantId,
            resource,
            action,
            timestamp: new Date().toISOString(),
            isPlatformAction: true
        },
        ...metadata
    });
};

/**
 * Log a security event
 * @param {string} event - Security event type
 * @param {Object} details - Details of the event
 */
auditLogger.logSecurityEvent = function(event, details = {}) {
    const { tenantId, userId, ipAddress, userAgent, metadata = {} } = details;
    
    auditLogger.warn(`[SECURITY] ${event}`, {
        context: {
            tenantId,
            userId,
            ipAddress,
            userAgent,
            event,
            timestamp: new Date().toISOString(),
            isSecurityEvent: true
        },
        ...metadata
    });
};

export { logger, auditLogger };
export default logger;
