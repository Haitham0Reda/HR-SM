import express from 'express';
import {
  getSystemStatus,
  getSystemCapacity,
  getPerformanceAnalytics,
  getSlowRequests,
  generatePerformanceReport,
  startMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  getPerformanceAlerts,
  resolvePerformanceAlert,
  getSystemMetricsHistory,
  exportPerformanceData
} from '../controllers/performanceMonitoring.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePlatformAdmin } from '../middleware/platformAuth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePlatformAdmin);

/**
 * System Status Routes
 */

// Get current system status
router.get('/status', getSystemStatus);

// Get system capacity utilization
router.get('/capacity',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  getSystemCapacity
);

/**
 * Performance Analytics Routes
 */

// Get performance analytics
router.get('/analytics',
  [
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('groupBy').optional().isIn(['minute', 'hour', 'day']).withMessage('GroupBy must be one of: minute, hour, day')
  ],
  validateRequest,
  getPerformanceAnalytics
);

// Get slow requests
router.get('/slow-requests',
  [
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('minResponseTime').optional().isInt({ min: 0 }).withMessage('Min response time must be a positive integer'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  getSlowRequests
);

// Generate performance report
router.get('/report',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('includeSystemMetrics').optional().isBoolean().withMessage('Include system metrics must be a boolean'),
    query('includePerformanceMetrics').optional().isBoolean().withMessage('Include performance metrics must be a boolean'),
    query('includeLicenseServerMetrics').optional().isBoolean().withMessage('Include license server metrics must be a boolean')
  ],
  validateRequest,
  generatePerformanceReport
);

/**
 * Monitoring Control Routes
 */

// Start performance monitoring
router.post('/monitoring/start',
  [
    body('intervalMs').optional().isInt({ min: 1000, max: 300000 }).withMessage('Interval must be between 1000ms and 300000ms (5 minutes)')
  ],
  validateRequest,
  startMonitoring
);

// Stop performance monitoring
router.post('/monitoring/stop', stopMonitoring);

// Get monitoring status
router.get('/monitoring/status', getMonitoringStatus);

/**
 * Performance Alerts Routes
 */

// Get performance alerts
router.get('/alerts',
  [
    query('resolved').optional().isBoolean().withMessage('Resolved must be a boolean'),
    query('severity').optional().isIn(['info', 'warning', 'critical']).withMessage('Severity must be one of: info, warning, critical'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
  ],
  validateRequest,
  getPerformanceAlerts
);

// Resolve performance alert
router.patch('/alerts/:alertId/resolve',
  [
    param('alertId').isMongoId().withMessage('Alert ID must be a valid MongoDB ObjectId'),
    body('resolvedBy').optional().isString().withMessage('Resolved by must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  validateRequest,
  resolvePerformanceAlert
);

/**
 * Metrics History Routes
 */

// Get system metrics history
router.get('/metrics/history',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('groupBy').optional().isIn(['minute', 'hour', 'day']).withMessage('GroupBy must be one of: minute, hour, day')
  ],
  validateRequest,
  getSystemMetricsHistory
);

/**
 * Export Routes
 */

// Export performance data
router.get('/export',
  [
    query('type').isIn(['metrics', 'alerts', 'report', 'all']).withMessage('Type must be one of: metrics, alerts, report, all'),
    query('format').isIn(['json', 'csv']).withMessage('Format must be one of: json, csv'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  exportPerformanceData
);

export default router;