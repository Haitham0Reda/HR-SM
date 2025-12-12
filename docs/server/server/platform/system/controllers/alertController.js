/**
 * Alert Controller
 * 
 * Handles alert management endpoints
 */

import alertingService from '../services/alertingService.js';
import { logger } from '../../../core/logging/logger.js';

/**
 * Get alert history
 * GET /api/platform/system/alerts
 */
export const getAlertHistory = async (req, res) => {
    try {
        const { type, severity, tenantId, limit } = req.query;
        
        const alerts = alertingService.getAlertHistory({
            type,
            severity,
            tenantId,
            limit: limit ? parseInt(limit) : 100
        });
        
        res.json({
            success: true,
            data: alerts,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
        
    } catch (error) {
        logger.error('Failed to get alert history', {
            context: { requestId: req.id },
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: {
                code: 'ALERT_HISTORY_ERROR',
                message: 'Failed to retrieve alert history',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
    }
};

/**
 * Get alert statistics
 * GET /api/platform/system/alerts/statistics
 */
export const getAlertStatistics = async (req, res) => {
    try {
        const stats = alertingService.getAlertStatistics();
        
        res.json({
            success: true,
            data: stats,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
        
    } catch (error) {
        logger.error('Failed to get alert statistics', {
            context: { requestId: req.id },
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: {
                code: 'ALERT_STATS_ERROR',
                message: 'Failed to retrieve alert statistics',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
    }
};

/**
 * Acknowledge an alert
 * POST /api/platform/system/alerts/:alertId/acknowledge
 */
export const acknowledgeAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const acknowledgedBy = req.user?.email || req.user?.id;
        
        const acknowledged = alertingService.acknowledgeAlert(alertId, acknowledgedBy);
        
        if (!acknowledged) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ALERT_NOT_FOUND',
                    message: 'Alert not found',
                    details: { alertId }
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.id
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                alertId,
                acknowledged: true,
                acknowledgedBy
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
        
    } catch (error) {
        logger.error('Failed to acknowledge alert', {
            context: { requestId: req.id },
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: {
                code: 'ALERT_ACKNOWLEDGE_ERROR',
                message: 'Failed to acknowledge alert',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
    }
};

/**
 * Clear alert history
 * DELETE /api/platform/system/alerts
 */
export const clearAlertHistory = async (req, res) => {
    try {
        alertingService.clearHistory();
        
        res.json({
            success: true,
            data: {
                message: 'Alert history cleared'
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
        
    } catch (error) {
        logger.error('Failed to clear alert history', {
            context: { requestId: req.id },
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: {
                code: 'ALERT_CLEAR_ERROR',
                message: 'Failed to clear alert history',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
    }
};

export default {
    getAlertHistory,
    getAlertStatistics,
    acknowledgeAlert,
    clearAlertHistory
};
