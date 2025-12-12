/**
 * Alerting Service
 * 
 * Handles system alerts for:
 * - Module loading failures
 * - Tenant quota exceeded
 * - System errors
 * - Performance degradation
 */

import EventEmitter from 'events';
import { logger, auditLogger } from '../../../core/logging/logger.js';

class AlertingService extends EventEmitter {
    constructor() {
        super();
        
        // Alert configuration
        this.config = {
            // Module loading failure alerts
            moduleLoadingFailure: {
                enabled: true,
                severity: 'critical'
            },
            
            // Quota exceeded alerts
            quotaExceeded: {
                enabled: true,
                severity: 'warning',
                thresholds: {
                    storage: 90, // Alert at 90% usage
                    users: 90,
                    apiCalls: 90
                }
            },
            
            // System error alerts
            systemError: {
                enabled: true,
                severity: 'error',
                errorRateThreshold: 10 // Alert if error rate > 10%
            },
            
            // Performance degradation alerts
            performanceDegradation: {
                enabled: true,
                severity: 'warning',
                responseTimeThreshold: 5000, // Alert if avg response time > 5s
                slowRequestThreshold: 10000 // Alert if any request > 10s
            }
        };
        
        // Alert history (in-memory, last 1000 alerts)
        this.alertHistory = [];
        this.maxHistorySize = 1000;
        
        // Alert suppression (prevent duplicate alerts within time window)
        this.suppressionCache = new Map();
        this.suppressionWindow = 5 * 60 * 1000; // 5 minutes
        
        // Performance metrics
        this.metrics = {
            requestCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
            slowRequests: 0
        };
        
        logger.info('AlertingService initialized');
    }
    
    /**
     * Alert for module loading failure
     * @param {Object} details - Alert details
     * @param {string} details.moduleId - Module identifier
     * @param {string} details.tenantId - Tenant identifier (optional)
     * @param {string} details.error - Error message
     * @param {Object} details.metadata - Additional metadata
     */
    alertModuleLoadingFailure(details) {
        const { moduleId, tenantId, error, metadata = {} } = details;
        
        const alert = this.createAlert({
            type: 'MODULE_LOADING_FAILURE',
            severity: 'critical',
            message: `Failed to load module: ${moduleId}`,
            details: {
                moduleId,
                tenantId,
                error,
                ...metadata
            }
        });
        
        this.processAlert(alert);
    }
    
    /**
     * Alert for tenant quota exceeded
     * @param {Object} details - Alert details
     * @param {string} details.tenantId - Tenant identifier
     * @param {string} details.quotaType - Type of quota (storage, users, apiCalls)
     * @param {number} details.current - Current usage
     * @param {number} details.limit - Quota limit
     * @param {number} details.percentage - Usage percentage
     */
    alertQuotaExceeded(details) {
        const { tenantId, quotaType, current, limit, percentage } = details;
        
        const alert = this.createAlert({
            type: 'QUOTA_EXCEEDED',
            severity: percentage >= 100 ? 'critical' : 'warning',
            message: `Tenant ${tenantId} ${percentage >= 100 ? 'exceeded' : 'approaching'} ${quotaType} quota`,
            details: {
                tenantId,
                quotaType,
                current,
                limit,
                percentage: percentage.toFixed(2)
            }
        });
        
        this.processAlert(alert);
    }
    
    /**
     * Alert for system error
     * @param {Object} details - Alert details
     * @param {string} details.error - Error message
     * @param {string} details.stack - Error stack trace
     * @param {string} details.tenantId - Tenant identifier (optional)
     * @param {string} details.requestId - Request identifier (optional)
     * @param {Object} details.metadata - Additional metadata
     */
    alertSystemError(details) {
        const { error, stack, tenantId, requestId, metadata = {} } = details;
        
        // Update error metrics
        this.metrics.errorCount++;
        
        // Check error rate
        const errorRate = (this.metrics.errorCount / this.metrics.requestCount) * 100;
        
        const alert = this.createAlert({
            type: 'SYSTEM_ERROR',
            severity: errorRate > this.config.systemError.errorRateThreshold ? 'critical' : 'error',
            message: `System error: ${error}`,
            details: {
                error,
                stack: process.env.NODE_ENV === 'development' ? stack : undefined,
                tenantId,
                requestId,
                errorRate: errorRate.toFixed(2),
                ...metadata
            }
        });
        
        this.processAlert(alert);
    }
    
    /**
     * Alert for performance degradation
     * @param {Object} details - Alert details
     * @param {string} details.endpoint - API endpoint
     * @param {number} details.responseTime - Response time in ms
     * @param {string} details.tenantId - Tenant identifier (optional)
     * @param {string} details.requestId - Request identifier (optional)
     */
    alertPerformanceDegradation(details) {
        const { endpoint, responseTime, tenantId, requestId } = details;
        
        // Update performance metrics
        this.metrics.requestCount++;
        this.metrics.totalResponseTime += responseTime;
        
        if (responseTime > this.config.performanceDegradation.slowRequestThreshold) {
            this.metrics.slowRequests++;
        }
        
        const avgResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
        
        // Only alert if response time exceeds threshold
        if (responseTime < this.config.performanceDegradation.slowRequestThreshold &&
            avgResponseTime < this.config.performanceDegradation.responseTimeThreshold) {
            return;
        }
        
        const alert = this.createAlert({
            type: 'PERFORMANCE_DEGRADATION',
            severity: responseTime > this.config.performanceDegradation.slowRequestThreshold ? 'critical' : 'warning',
            message: `Slow response detected: ${endpoint} (${responseTime}ms)`,
            details: {
                endpoint,
                responseTime,
                avgResponseTime: avgResponseTime.toFixed(2),
                slowRequestCount: this.metrics.slowRequests,
                tenantId,
                requestId
            }
        });
        
        this.processAlert(alert);
    }
    
    /**
     * Create an alert object
     * @param {Object} alertData - Alert data
     * @returns {Object} Alert object
     * @private
     */
    createAlert(alertData) {
        const { type, severity, message, details } = alertData;
        
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity,
            message,
            details,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
    }
    
    /**
     * Process an alert
     * @param {Object} alert - Alert object
     * @private
     */
    processAlert(alert) {
        // Check if alert should be suppressed
        if (this.shouldSuppress(alert)) {
            logger.debug('Alert suppressed (duplicate within suppression window)', {
                alertType: alert.type,
                alertId: alert.id
            });
            return;
        }
        
        // Add to suppression cache
        this.addToSuppressionCache(alert);
        
        // Add to history
        this.addToHistory(alert);
        
        // Log alert
        this.logAlert(alert);
        
        // Emit alert event
        this.emit('alert', alert);
        
        // Send notifications (email, webhook, etc.)
        this.sendNotifications(alert);
    }
    
    /**
     * Check if alert should be suppressed
     * @param {Object} alert - Alert object
     * @returns {boolean} True if should be suppressed
     * @private
     */
    shouldSuppress(alert) {
        const suppressionKey = `${alert.type}:${JSON.stringify(alert.details)}`;
        const cached = this.suppressionCache.get(suppressionKey);
        
        if (!cached) {
            return false;
        }
        
        const timeSinceLastAlert = Date.now() - cached.timestamp;
        return timeSinceLastAlert < this.suppressionWindow;
    }
    
    /**
     * Add alert to suppression cache
     * @param {Object} alert - Alert object
     * @private
     */
    addToSuppressionCache(alert) {
        const suppressionKey = `${alert.type}:${JSON.stringify(alert.details)}`;
        this.suppressionCache.set(suppressionKey, {
            timestamp: Date.now(),
            alertId: alert.id
        });
        
        // Clean up old entries
        for (const [key, value] of this.suppressionCache.entries()) {
            if (Date.now() - value.timestamp > this.suppressionWindow) {
                this.suppressionCache.delete(key);
            }
        }
    }
    
    /**
     * Add alert to history
     * @param {Object} alert - Alert object
     * @private
     */
    addToHistory(alert) {
        this.alertHistory.unshift(alert);
        
        // Trim history if too large
        if (this.alertHistory.length > this.maxHistorySize) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Log alert
     * @param {Object} alert - Alert object
     * @private
     */
    logAlert(alert) {
        const logMethod = alert.severity === 'critical' ? 'error' : 
                         alert.severity === 'error' ? 'error' : 'warn';
        
        logger[logMethod](`[ALERT] ${alert.message}`, {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity,
            details: alert.details
        });
        
        // Also log to audit log for critical alerts
        if (alert.severity === 'critical') {
            auditLogger.logSecurityEvent('CRITICAL_ALERT', {
                tenantId: alert.details.tenantId,
                metadata: {
                    alertId: alert.id,
                    alertType: alert.type,
                    message: alert.message,
                    details: alert.details
                }
            });
        }
    }
    
    /**
     * Send notifications for alert
     * @param {Object} alert - Alert object
     * @private
     */
    sendNotifications(alert) {
        // TODO: Implement notification sending
        // - Email notifications to platform administrators
        // - Webhook notifications to external systems
        // - Slack/Teams notifications
        // - SMS for critical alerts
        
        logger.debug('Alert notifications would be sent here', {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity
        });
    }
    
    /**
     * Get alert history
     * @param {Object} options - Filter options
     * @param {string} options.type - Filter by alert type
     * @param {string} options.severity - Filter by severity
     * @param {string} options.tenantId - Filter by tenant ID
     * @param {number} options.limit - Limit number of results
     * @returns {Array} Array of alerts
     */
    getAlertHistory(options = {}) {
        const { type, severity, tenantId, limit = 100 } = options;
        
        let filtered = this.alertHistory;
        
        if (type) {
            filtered = filtered.filter(alert => alert.type === type);
        }
        
        if (severity) {
            filtered = filtered.filter(alert => alert.severity === severity);
        }
        
        if (tenantId) {
            filtered = filtered.filter(alert => alert.details.tenantId === tenantId);
        }
        
        return filtered.slice(0, limit);
    }
    
    /**
     * Get alert statistics
     * @returns {Object} Alert statistics
     */
    getAlertStatistics() {
        const stats = {
            total: this.alertHistory.length,
            bySeverity: {
                critical: 0,
                error: 0,
                warning: 0
            },
            byType: {},
            recent: {
                last24Hours: 0,
                lastHour: 0
            }
        };
        
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);
        
        for (const alert of this.alertHistory) {
            // Count by severity
            stats.bySeverity[alert.severity]++;
            
            // Count by type
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
            
            // Count recent alerts
            const alertTime = new Date(alert.timestamp).getTime();
            if (alertTime > oneDayAgo) {
                stats.recent.last24Hours++;
            }
            if (alertTime > oneHourAgo) {
                stats.recent.lastHour++;
            }
        }
        
        return stats;
    }
    
    /**
     * Acknowledge an alert
     * @param {string} alertId - Alert identifier
     * @param {string} acknowledgedBy - User who acknowledged
     * @returns {boolean} True if acknowledged
     */
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        
        if (!alert) {
            return false;
        }
        
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
        
        logger.info('Alert acknowledged', {
            alertId,
            acknowledgedBy,
            alertType: alert.type
        });
        
        return true;
    }
    
    /**
     * Clear alert history
     */
    clearHistory() {
        this.alertHistory = [];
        logger.info('Alert history cleared');
    }
    
    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            requestCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
            slowRequests: 0
        };
        logger.info('Performance metrics reset');
    }
}

// Export singleton instance
const alertingService = new AlertingService();
export default alertingService;
