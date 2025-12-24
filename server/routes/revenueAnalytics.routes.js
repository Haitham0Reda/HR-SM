import express from 'express';
import {
  getMRR,
  getARR,
  getChurnRate,
  getLicenseAnalytics,
  getUsagePatterns,
  getRevenueDashboard,
  getRevenueByLicenseType,
  getSecurityAnalytics,
  getSecurityEvents,
  logSecurityEvent,
  resolveSecurityEvent,
  getTenantSecurityMetrics,
  getAnalyticsDashboard,
  exportAnalytics
} from '../controllers/revenueAnalytics.controller.js';
import { authenticateJWT as authenticateToken } from '../middleware/auth.middleware.js';
import { requirePlatformAdmin } from '../middleware/platformAuth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePlatformAdmin);

/**
 * Revenue Analytics Routes
 */

// Monthly Recurring Revenue
router.get('/revenue/mrr', 
  [
    query('date').optional().isISO8601().withMessage('Date must be in ISO 8601 format')
  ],
  validateRequest,
  getMRR
);

// Annual Recurring Revenue
router.get('/revenue/arr',
  [
    query('date').optional().isISO8601().withMessage('Date must be in ISO 8601 format')
  ],
  validateRequest,
  getARR
);

// Churn Rate Analysis
router.get('/revenue/churn',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  getChurnRate
);

// Revenue Dashboard
router.get('/revenue/dashboard',
  [
    query('period').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('Period must be one of: hour, day, week, month')
  ],
  validateRequest,
  getRevenueDashboard
);

// Revenue by License Type
router.get('/revenue/by-license-type', getRevenueByLicenseType);

/**
 * License Analytics Routes
 */

// License Usage Analytics
router.get('/licenses', getLicenseAnalytics);

/**
 * Usage Pattern Routes
 */

// Usage Patterns Analysis
router.get('/usage-patterns',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('GroupBy must be one of: hour, day, week, month')
  ],
  validateRequest,
  getUsagePatterns
);

/**
 * Security Analytics Routes
 */

// Security Analytics Dashboard
router.get('/security',
  [
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('GroupBy must be one of: hour, day, week, month')
  ],
  validateRequest,
  getSecurityAnalytics
);

// Security Events List
router.get('/security/events',
  [
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string'),
    query('eventType').optional().isString().withMessage('Event type must be a string'),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Severity must be one of: low, medium, high, critical'),
    query('ipAddress').optional().isIP().withMessage('IP address must be valid'),
    query('userId').optional().isString().withMessage('User ID must be a string'),
    query('resolved').optional().isBoolean().withMessage('Resolved must be a boolean'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isIn(['timestamp', 'severity', 'eventType']).withMessage('SortBy must be one of: timestamp, severity, eventType'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('SortOrder must be asc or desc')
  ],
  validateRequest,
  getSecurityEvents
);

// Log Security Event
router.post('/security/events',
  [
    body('tenantId').notEmpty().withMessage('Tenant ID is required'),
    body('eventType').isIn([
      'failed_login', 'successful_login', 'password_change', 'account_lockout',
      'suspicious_activity', 'rate_limit_exceeded', 'unauthorized_access_attempt',
      'privilege_escalation_attempt', 'data_access_violation', 'license_validation_failure',
      'api_abuse', 'malicious_request', 'brute_force_attempt', 'session_hijack_attempt',
      'csrf_attempt', 'xss_attempt', 'sql_injection_attempt', 'file_upload_violation',
      'configuration_change', 'admin_action'
    ]).withMessage('Invalid event type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Severity must be one of: low, medium, high, critical'),
    body('description').notEmpty().withMessage('Description is required'),
    body('userId').optional().isString().withMessage('User ID must be a string'),
    body('userEmail').optional().isEmail().withMessage('User email must be valid'),
    body('details').optional().isObject().withMessage('Details must be an object')
  ],
  validateRequest,
  logSecurityEvent
);

// Resolve Security Event
router.patch('/security/events/:eventId/resolve',
  [
    param('eventId').isMongoId().withMessage('Event ID must be a valid MongoDB ObjectId'),
    body('resolvedBy').optional().isString().withMessage('Resolved by must be a string'),
    body('resolutionNotes').optional().isString().withMessage('Resolution notes must be a string')
  ],
  validateRequest,
  resolveSecurityEvent
);

// Tenant Security Metrics
router.get('/security/tenants/:tenantId',
  [
    param('tenantId').notEmpty().withMessage('Tenant ID is required'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  getTenantSecurityMetrics
);

/**
 * Comprehensive Dashboard Routes
 */

// Main Analytics Dashboard
router.get('/dashboard',
  [
    query('period').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('Period must be one of: hour, day, week, month'),
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string')
  ],
  validateRequest,
  getAnalyticsDashboard
);

/**
 * Export Routes
 */

// Export Analytics Data
router.get('/export',
  [
    query('type').isIn(['revenue', 'security', 'usage', 'all']).withMessage('Type must be one of: revenue, security, usage, all'),
    query('format').isIn(['json', 'csv']).withMessage('Format must be one of: json, csv'),
    query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
    query('tenantId').optional().isString().withMessage('Tenant ID must be a string')
  ],
  validateRequest,
  exportAnalytics
);

export default router;