import revenueAnalyticsService from '../services/revenueAnalytics.service.js';
import securityEventTrackingService from '../services/securityEventTracking.service.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Revenue Analytics Controller
 * Handles HTTP requests for revenue analytics and reporting
 */

/**
 * Get Monthly Recurring Revenue (MRR)
 * GET /api/platform/analytics/revenue/mrr
 */
export const getMRR = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const mrrData = await revenueAnalyticsService.calculateMRR(targetDate);

  res.status(200).json({
    success: true,
    data: {
      mrr: mrrData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get Annual Recurring Revenue (ARR)
 * GET /api/platform/analytics/revenue/arr
 */
export const getARR = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const arrData = await revenueAnalyticsService.calculateARR(targetDate);

  res.status(200).json({
    success: true,
    data: {
      arr: arrData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get churn rate analysis
 * GET /api/platform/analytics/revenue/churn
 */
export const getChurnRate = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const churnData = await revenueAnalyticsService.calculateChurnRate(start, end);

  res.status(200).json({
    success: true,
    data: {
      churn: churnData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get license usage analytics
 * GET /api/platform/analytics/licenses
 */
export const getLicenseAnalytics = asyncHandler(async (req, res) => {
  const licenseData = await revenueAnalyticsService.getLicenseUsageAnalytics();

  res.status(200).json({
    success: true,
    data: {
      licenses: licenseData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get usage pattern analysis
 * GET /api/platform/analytics/usage-patterns
 */
export const getUsagePatterns = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  const options = {};
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);
  if (groupBy) options.groupBy = groupBy;

  const usageData = await revenueAnalyticsService.getUsagePatternAnalysis(options);

  res.status(200).json({
    success: true,
    data: {
      usage: usageData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get comprehensive revenue dashboard
 * GET /api/platform/analytics/revenue/dashboard
 */
export const getRevenueDashboard = asyncHandler(async (req, res) => {
  const { period } = req.query;

  const options = {};
  if (period) options.period = period;

  const dashboardData = await revenueAnalyticsService.getRevenueDashboard(options);

  res.status(200).json({
    success: true,
    data: {
      dashboard: dashboardData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get revenue by license type
 * GET /api/platform/analytics/revenue/by-license-type
 */
export const getRevenueByLicenseType = asyncHandler(async (req, res) => {
  const revenueData = await revenueAnalyticsService.getRevenueByLicenseType();

  res.status(200).json({
    success: true,
    data: {
      revenueByLicenseType: revenueData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get security events analytics
 * GET /api/platform/analytics/security
 */
export const getSecurityAnalytics = asyncHandler(async (req, res) => {
  const { tenantId, startDate, endDate, groupBy } = req.query;

  const options = {};
  if (tenantId) options.tenantId = tenantId;
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);
  if (groupBy) options.groupBy = groupBy;

  const securityData = await securityEventTrackingService.getSecurityAnalytics(options);

  res.status(200).json({
    success: true,
    data: {
      security: securityData
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get security events with filtering
 * GET /api/platform/analytics/security/events
 */
export const getSecurityEvents = asyncHandler(async (req, res) => {
  const {
    tenantId,
    eventType,
    severity,
    ipAddress,
    userId,
    resolved,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const filters = {};
  if (tenantId) filters.tenantId = tenantId;
  if (eventType) filters.eventType = eventType;
  if (severity) filters.severity = severity;
  if (ipAddress) filters.ipAddress = ipAddress;
  if (userId) filters.userId = userId;
  if (resolved !== undefined) filters.resolved = resolved === 'true';
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const options = {};
  if (page) options.page = parseInt(page);
  if (limit) options.limit = parseInt(limit);
  if (sortBy) options.sortBy = sortBy;
  if (sortOrder) options.sortOrder = sortOrder;

  const eventsData = await securityEventTrackingService.getSecurityEvents(filters, options);

  res.status(200).json({
    success: true,
    data: eventsData,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Log security event
 * POST /api/platform/analytics/security/events
 */
export const logSecurityEvent = asyncHandler(async (req, res) => {
  const eventData = {
    ...req.body,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    correlationId: req.id
  };

  const securityEvent = await securityEventTrackingService.logSecurityEvent(eventData);

  res.status(201).json({
    success: true,
    data: {
      event: securityEvent
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Resolve security event
 * PATCH /api/platform/analytics/security/events/:eventId/resolve
 */
export const resolveSecurityEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { resolvedBy, resolutionNotes } = req.body;

  const resolvedEvent = await securityEventTrackingService.resolveSecurityEvent(eventId, {
    resolvedBy: resolvedBy || req.user?.email || 'system',
    resolutionNotes
  });

  res.status(200).json({
    success: true,
    data: {
      event: resolvedEvent
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenant security metrics
 * GET /api/platform/analytics/security/tenants/:tenantId
 */
export const getTenantSecurityMetrics = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { startDate, endDate } = req.query;

  const options = {};
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);

  const securityMetrics = await securityEventTrackingService.getTenantSecurityMetrics(tenantId, options);

  res.status(200).json({
    success: true,
    data: {
      metrics: securityMetrics
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get comprehensive analytics dashboard
 * GET /api/platform/analytics/dashboard
 */
export const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const { period, tenantId } = req.query;

  try {
    const [
      revenueDashboard,
      securityAnalytics,
      usagePatterns
    ] = await Promise.all([
      revenueAnalyticsService.getRevenueDashboard({ period }),
      securityEventTrackingService.getSecurityAnalytics({ 
        tenantId, 
        groupBy: period || 'day' 
      }),
      revenueAnalyticsService.getUsagePatternAnalysis({ 
        groupBy: period || 'day' 
      })
    ]);

    const dashboard = {
      revenue: revenueDashboard,
      security: securityAnalytics,
      usage: usagePatterns,
      summary: {
        totalRevenue: revenueDashboard.keyMetrics.mrr,
        totalCustomers: revenueDashboard.keyMetrics.totalCustomers,
        churnRate: revenueDashboard.keyMetrics.churnRate,
        securityEvents: securityAnalytics.summary.totalEvents,
        criticalSecurityEvents: securityAnalytics.summary.criticalEvents,
        activeLicenses: revenueDashboard.keyMetrics.activeLicenses
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: {
        dashboard
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    console.error('Error generating analytics dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics dashboard',
      details: error.message
    });
  }
});

/**
 * Export analytics data
 * GET /api/platform/analytics/export
 */
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { 
    type, // 'revenue', 'security', 'usage', 'all'
    format, // 'json', 'csv', 'excel'
    startDate, 
    endDate,
    tenantId
  } = req.query;

  if (!type || !format) {
    return res.status(400).json({
      success: false,
      error: 'type and format parameters are required'
    });
  }

  const options = {};
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);
  if (tenantId) options.tenantId = tenantId;

  let data = {};

  try {
    switch (type) {
      case 'revenue':
        data = await revenueAnalyticsService.getRevenueDashboard(options);
        break;
      case 'security':
        data = await securityEventTrackingService.getSecurityAnalytics(options);
        break;
      case 'usage':
        data = await revenueAnalyticsService.getUsagePatternAnalysis(options);
        break;
      case 'all':
        data = {
          revenue: await revenueAnalyticsService.getRevenueDashboard(options),
          security: await securityEventTrackingService.getSecurityAnalytics(options),
          usage: await revenueAnalyticsService.getUsagePatternAnalysis(options)
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be one of: revenue, security, usage, all'
        });
    }

    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-${type}-${timestamp}`;

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
        break;
      case 'csv':
        // For CSV, we'll flatten the data structure
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        
        // Simple CSV conversion (in production, use a proper CSV library)
        const csvData = JSON.stringify(data).replace(/[{}]/g, '').replace(/"/g, '');
        res.send(csvData);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Must be one of: json, csv'
        });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      details: error.message
    });
  }
});