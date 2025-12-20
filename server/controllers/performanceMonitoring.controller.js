import performanceMonitoringService from '../services/performanceMonitoring.service.js';
import performanceMonitoringMiddleware from '../middleware/performanceMonitoring.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Performance Monitoring Controller
 * Handles HTTP requests for performance monitoring and system metrics
 */

/**
 * Get system status
 * GET /api/platform/performance/status
 */
export const getSystemStatus = asyncHandler(async (req, res) => {
  const status = await performanceMonitoringService.getSystemStatus();

  res.status(200).json({
    success: true,
    data: {
      status
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get system capacity utilization
 * GET /api/platform/performance/capacity
 */
export const getSystemCapacity = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const options = {};
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);

  const capacity = await performanceMonitoringService.getSystemCapacityUtilization(options);

  res.status(200).json({
    success: true,
    data: {
      capacity
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get performance analytics
 * GET /api/platform/performance/analytics
 */
export const getPerformanceAnalytics = asyncHandler(async (req, res) => {
  const { tenantId, startDate, endDate, groupBy } = req.query;

  const options = {};
  if (tenantId) options.tenantId = tenantId;
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);
  if (groupBy) options.groupBy = groupBy;

  const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics(options);

  res.status(200).json({
    success: true,
    data: {
      analytics
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get slow requests
 * GET /api/platform/performance/slow-requests
 */
export const getSlowRequests = asyncHandler(async (req, res) => {
  const { tenantId, limit, minResponseTime, startDate, endDate } = req.query;

  const options = {};
  if (tenantId) options.tenantId = tenantId;
  if (limit) options.limit = parseInt(limit);
  if (minResponseTime) options.minResponseTime = parseInt(minResponseTime);
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);

  const slowRequests = await performanceMonitoringMiddleware.constructor.getSlowRequests(options);

  res.status(200).json({
    success: true,
    data: {
      slowRequests,
      count: slowRequests.length
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Generate performance report
 * GET /api/platform/performance/report
 */
export const generatePerformanceReport = asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    includeSystemMetrics, 
    includePerformanceMetrics, 
    includeLicenseServerMetrics 
  } = req.query;

  const options = {};
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);
  if (includeSystemMetrics !== undefined) options.includeSystemMetrics = includeSystemMetrics === 'true';
  if (includePerformanceMetrics !== undefined) options.includePerformanceMetrics = includePerformanceMetrics === 'true';
  if (includeLicenseServerMetrics !== undefined) options.includeLicenseServerMetrics = includeLicenseServerMetrics === 'true';

  const report = await performanceMonitoringService.generatePerformanceReport(options);

  res.status(200).json({
    success: true,
    data: {
      report
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Start performance monitoring
 * POST /api/platform/performance/monitoring/start
 */
export const startMonitoring = asyncHandler(async (req, res) => {
  const { intervalMs } = req.body;

  performanceMonitoringService.startMonitoring(intervalMs);

  res.status(200).json({
    success: true,
    data: {
      message: 'Performance monitoring started',
      interval: intervalMs || 30000
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Stop performance monitoring
 * POST /api/platform/performance/monitoring/stop
 */
export const stopMonitoring = asyncHandler(async (req, res) => {
  performanceMonitoringService.stopMonitoring();

  res.status(200).json({
    success: true,
    data: {
      message: 'Performance monitoring stopped'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get monitoring status
 * GET /api/platform/performance/monitoring/status
 */
export const getMonitoringStatus = asyncHandler(async (req, res) => {
  const isMonitoring = performanceMonitoringService.isMonitoring;

  res.status(200).json({
    success: true,
    data: {
      isMonitoring,
      status: isMonitoring ? 'active' : 'stopped'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get performance alerts
 * GET /api/platform/performance/alerts
 */
export const getPerformanceAlerts = asyncHandler(async (req, res) => {
  const { resolved, severity, startDate, endDate, limit } = req.query;

  try {
    const mongoose = await import('mongoose');
    const PerformanceAlert = mongoose.default.model('PerformanceAlert');

    const query = {};
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (severity) query.severity = severity;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const alerts = await PerformanceAlert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 50)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance alerts',
      details: error.message
    });
  }
});

/**
 * Resolve performance alert
 * PATCH /api/platform/performance/alerts/:alertId/resolve
 */
export const resolvePerformanceAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { resolvedBy, notes } = req.body;

  try {
    const mongoose = await import('mongoose');
    const PerformanceAlert = mongoose.default.model('PerformanceAlert');

    const alert = await PerformanceAlert.findByIdAndUpdate(
      alertId,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || req.user?.email || 'system',
        resolutionNotes: notes
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Performance alert not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        alert
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    console.error('Error resolving performance alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve performance alert',
      details: error.message
    });
  }
});

/**
 * Get system metrics history
 * GET /api/platform/performance/metrics/history
 */
export const getSystemMetricsHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  try {
    const mongoose = await import('mongoose');
    const SystemMetrics = mongoose.default.model('SystemMetrics');

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    // Default to last 24 hours if no date range specified
    if (!startDate && !endDate) {
      matchStage.timestamp = {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
    }

    let groupFormat;
    switch (groupBy) {
      case 'minute':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' },
          minute: { $minute: '$timestamp' }
        };
        break;
      case 'hour':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'day':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
        break;
      default:
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
    }

    const metrics = await SystemMetrics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupFormat,
          avgCpuUtilization: { $avg: '$cpu.utilization' },
          maxCpuUtilization: { $max: '$cpu.utilization' },
          avgMemoryUtilization: { $avg: '$memory.utilization' },
          maxMemoryUtilization: { $max: '$memory.utilization' },
          avgLoadAverage: { $avg: '$cpu.loadAverage.1min' },
          avgProcessUptime: { $avg: '$process.uptime' },
          avgActiveHandles: { $avg: '$process.activeHandles' },
          avgActiveRequests: { $avg: '$process.activeRequests' },
          sampleCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        metrics,
        period: {
          start: matchStage.timestamp?.$gte || new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: matchStage.timestamp?.$lte || new Date()
        },
        groupBy: groupBy || 'hour'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    console.error('Error fetching system metrics history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics history',
      details: error.message
    });
  }
});

/**
 * Export performance data
 * GET /api/platform/performance/export
 */
export const exportPerformanceData = asyncHandler(async (req, res) => {
  const { 
    type, // 'metrics', 'alerts', 'report', 'all'
    format, // 'json', 'csv'
    startDate, 
    endDate 
  } = req.query;

  if (!type || !format) {
    return res.status(400).json({
      success: false,
      error: 'type and format parameters are required'
    });
  }

  try {
    let data = {};
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    switch (type) {
      case 'metrics':
        data = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics(options);
        break;
      case 'alerts':
        const mongoose = await import('mongoose');
        const PerformanceAlert = mongoose.default.model('PerformanceAlert');
        const query = {};
        if (startDate || endDate) {
          query.timestamp = {};
          if (startDate) query.timestamp.$gte = new Date(startDate);
          if (endDate) query.timestamp.$lte = new Date(endDate);
        }
        data = await PerformanceAlert.find(query).sort({ timestamp: -1 }).lean();
        break;
      case 'report':
        data = await performanceMonitoringService.generatePerformanceReport(options);
        break;
      case 'all':
        data = {
          metrics: await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics(options),
          capacity: await performanceMonitoringService.getSystemCapacityUtilization(options),
          report: await performanceMonitoringService.generatePerformanceReport(options)
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be one of: metrics, alerts, report, all'
        });
    }

    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `performance-${type}-${timestamp}`;

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
    console.error('Error exporting performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export performance data',
      details: error.message
    });
  }
});