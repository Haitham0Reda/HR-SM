/**
 * Controller Logging Helper
 * Provides enhanced logging utilities for controllers
 * 
 * Requirements: 1.1, 7.1, 10.1
 */

import { getLoggerForTenant } from './companyLogger.js';
import platformLogger from './platformLogger.js';
import backendSecurityDetectionService from '../services/backendSecurityDetection.service.js';

/**
 * Log controller action with enhanced context
 * 
 * @param {Object} req - Express request object
 * @param {string} action - Action being performed
 * @param {Object} details - Additional details
 */
export function logControllerAction(req, action, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const logData = {
        correlationId: req.correlationId,
        action,
        controller: details.controller || 'unknown',
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        tenantId: req.tenantId,
        companyName: req.companyName,
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        ...details
    };
    
    logger.info(`Controller action: ${action}`, logData);
}

/**
 * Log controller error with enhanced context
 * 
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {Object} details - Additional details
 */
export function logControllerError(req, error, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const logData = {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
        errorCode: error.code,
        controller: details.controller || 'unknown',
        action: details.action || 'unknown',
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        userEmail: req.user?.email,
        tenantId: req.tenantId,
        companyName: req.companyName,
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        ...details
    };
    
    logger.error(`Controller error: ${details.action || 'unknown'}`, logData);
    
    // Log critical errors to platform logger
    if (error.statusCode >= 500 || error.name === 'DatabaseError') {
        platformLogger.systemHealth('controller-error', 'critical', {
            ...logData,
            errorType: error.name || 'UnknownError'
        });
    }
}

/**
 * Log authentication event from controller
 * 
 * @param {Object} req - Express request object
 * @param {string} eventType - Authentication event type
 * @param {Object} details - Additional details
 */
export function logAuthenticationEvent(req, eventType, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const logData = {
        correlationId: req.correlationId,
        eventType: 'authentication',
        authEventType: eventType,
        userId: req.user?.id || details.userId,
        userEmail: req.user?.email || details.userEmail,
        tenantId: req.tenantId,
        companyName: req.companyName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        success: details.success !== false,
        ...details
    };
    
    logger.audit(`Authentication event: ${eventType}`, logData);
    
    // Analyze for security threats
    try {
        const threats = backendSecurityDetectionService.analyzeAuthenticationEvent(
            eventType,
            logData.userId || 'unknown',
            req.ip,
            req.tenantId,
            { correlationId: req.correlationId, ...details }
        );
        
        if (threats.length > 0) {
            logger.security('Authentication security threats detected', {
                correlationId: req.correlationId,
                authEventType: eventType,
                threats,
                userId: logData.userId,
                ip: req.ip
            });
        }
    } catch (error) {
        platformLogger.warn('Authentication security analysis failed', {
            correlationId: req.correlationId,
            error: error.message,
            authEventType: eventType
        });
    }
}

/**
 * Log data access event from controller
 * 
 * @param {Object} req - Express request object
 * @param {string} dataType - Type of data accessed
 * @param {Object} details - Additional details
 */
export function logDataAccess(req, dataType, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const isSensitiveData = details.sensitiveData || 
                           ['user', 'employee', 'payroll', 'salary', 'personal'].some(type => 
                               dataType.toLowerCase().includes(type)
                           );
    
    const logData = {
        correlationId: req.correlationId,
        eventType: 'data_access',
        dataType,
        operation: details.operation || req.method,
        recordsAccessed: details.recordsAccessed || 0,
        recordIds: details.recordIds || [],
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        tenantId: req.tenantId,
        companyName: req.companyName,
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        sensitiveData: isSensitiveData,
        ...details
    };
    
    // Use audit logging for sensitive data
    if (isSensitiveData) {
        logger.audit(`Sensitive data access: ${dataType}`, logData);
        
        // Log to platform logger for sensitive data access
        platformLogger.adminAction(`Sensitive Data Access: ${dataType}`, req.user?.id || 'unknown', {
            ...logData,
            sensitiveDataAccess: true
        });
    } else {
        logger.info(`Data access: ${dataType}`, logData);
    }
}

/**
 * Log security event from controller
 * 
 * @param {Object} req - Express request object
 * @param {string} eventType - Security event type
 * @param {Object} details - Additional details
 */
export function logSecurityEvent(req, eventType, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const logData = {
        correlationId: req.correlationId,
        eventType: 'security',
        securityEventType: eventType,
        severity: details.severity || 'medium',
        userId: req.user?.id,
        userEmail: req.user?.email,
        tenantId: req.tenantId,
        companyName: req.companyName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        blocked: details.blocked || false,
        actionTaken: details.actionTaken || 'logged',
        ...details
    };
    
    logger.security(`Security event: ${eventType}`, logData);
    
    // Log high/critical security events to platform logger
    if (details.severity === 'high' || details.severity === 'critical') {
        platformLogger.platformSecurity(`Company Security Event: ${eventType}`, {
            ...logData,
            tenantId: req.tenantId,
            companyName: req.companyName
        });
    }
}

/**
 * Log admin action from controller
 * 
 * @param {Object} req - Express request object
 * @param {string} action - Admin action performed
 * @param {Object} details - Additional details
 */
export function logAdminAction(req, action, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const logData = {
        correlationId: req.correlationId,
        eventType: 'admin_action',
        action,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        tenantId: req.tenantId,
        companyName: req.companyName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID || req.headers['x-session-id'],
        timestamp: new Date().toISOString(),
        ...details
    };
    
    logger.audit(`Admin action: ${action}`, logData);
    
    // Log to platform logger for admin actions
    platformLogger.adminAction(action, req.user?.id || 'unknown', {
        ...logData,
        tenantId: req.tenantId,
        companyName: req.companyName
    });
}

/**
 * Log performance metric from controller
 * 
 * @param {Object} req - Express request object
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {Object} details - Additional details
 */
export function logPerformanceMetric(req, metric, value, details = {}) {
    const logger = req.companyLogger || getLoggerForTenant(req.tenantId, req.companyName);
    
    const isSlowOperation = value > (details.threshold || 5000); // 5 seconds default
    
    const logData = {
        correlationId: req.correlationId,
        eventType: 'performance_metric',
        metric,
        value,
        unit: details.unit || 'ms',
        controller: details.controller || 'unknown',
        action: details.action || 'unknown',
        userId: req.user?.id,
        tenantId: req.tenantId,
        timestamp: new Date().toISOString(),
        isSlowOperation,
        ...details
    };
    
    if (isSlowOperation) {
        logger.warn(`Slow operation: ${metric}`, logData);
        
        // Log to platform logger for slow operations
        platformLogger.systemPerformance({
            eventType: 'slow_controller_operation',
            ...logData
        });
    } else {
        logger.info(`Performance metric: ${metric}`, logData);
    }
}

/**
 * Create a logging wrapper for controller functions
 * Automatically logs action start, completion, and errors
 * 
 * @param {string} controllerName - Name of the controller
 * @param {string} actionName - Name of the action
 * @param {Function} fn - Controller function to wrap
 * @returns {Function} Wrapped controller function
 */
export function withLogging(controllerName, actionName, fn) {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        try {
            // Log action start
            logControllerAction(req, `${actionName}_start`, {
                controller: controllerName,
                action: actionName
            });
            
            // Execute controller function
            const result = await fn(req, res, next);
            
            // Log action completion
            const executionTime = Date.now() - startTime;
            logControllerAction(req, `${actionName}_complete`, {
                controller: controllerName,
                action: actionName,
                executionTime,
                statusCode: res.statusCode
            });
            
            // Log performance metric if slow
            if (executionTime > 5000) {
                logPerformanceMetric(req, `${controllerName}.${actionName}`, executionTime, {
                    controller: controllerName,
                    action: actionName
                });
            }
            
            return result;
        } catch (error) {
            // Log error
            logControllerError(req, error, {
                controller: controllerName,
                action: actionName,
                executionTime: Date.now() - startTime
            });
            
            throw error;
        }
    };
}

export default {
    logControllerAction,
    logControllerError,
    logAuthenticationEvent,
    logDataAccess,
    logSecurityEvent,
    logAdminAction,
    logPerformanceMetric,
    withLogging
};