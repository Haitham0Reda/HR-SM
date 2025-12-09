/**
 * Alerting Middleware
 * 
 * Integrates alerting service with Express application
 */

import alertingService from '../../platform/system/services/alertingService.js';
import { logger } from '../logging/logger.js';

/**
 * Middleware to track performance and alert on degradation
 */
export const performanceMonitoring = (req, res, next) => {
    const startTime = Date.now();
    
    // Track on response finish
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Alert if response time is too slow
        if (responseTime > 5000) {
            alertingService.alertPerformanceDegradation({
                endpoint: req.path,
                responseTime,
                tenantId: req.tenant?.id || req.tenant?.tenantId,
                requestId: req.id
            });
        }
    });
    
    next();
};

/**
 * Error monitoring middleware
 * Alerts on system errors
 */
export const errorMonitoring = (err, req, res, next) => {
    // Alert on system error
    alertingService.alertSystemError({
        error: err.message,
        stack: err.stack,
        tenantId: req.tenant?.id || req.tenant?.tenantId,
        requestId: req.id,
        metadata: {
            path: req.path,
            method: req.method,
            statusCode: err.statusCode || 500
        }
    });
    
    next(err);
};

/**
 * Setup alerting event listeners
 * @param {Object} app - Express app instance
 */
export function setupAlertingListeners(app) {
    // Listen for alerts and log them
    alertingService.on('alert', (alert) => {
        logger.warn('Alert triggered', {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity,
            message: alert.message
        });
    });
    
    // Listen for limit exceeded events from usage tracker
    if (app.locals.usageTracker) {
        app.locals.usageTracker.on('limitExceeded', (data) => {
            alertingService.alertQuotaExceeded({
                tenantId: data.tenantId,
                quotaType: data.limitType,
                current: data.currentUsage,
                limit: data.limit,
                percentage: (data.currentUsage / data.limit) * 100
            });
        });
        
        app.locals.usageTracker.on('limitWarning', (data) => {
            alertingService.alertQuotaExceeded({
                tenantId: data.tenantId,
                quotaType: data.limitType,
                current: data.currentUsage,
                limit: data.limit,
                percentage: data.percentage
            });
        });
    }
    
    logger.info('Alerting listeners configured');
}

export default {
    performanceMonitoring,
    errorMonitoring,
    setupAlertingListeners
};
