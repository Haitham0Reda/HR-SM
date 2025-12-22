import mongoose from 'mongoose';
import os from 'os';

/**
 * Performance Metrics Schema for MongoDB storage
 */
const performanceMetricSchema = new mongoose.Schema({
  tenantId: { type: String, index: true },
  requestId: { type: String, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // milliseconds
  requestSize: { type: Number, default: 0 }, // bytes
  responseSize: { type: Number, default: 0 }, // bytes
  userAgent: String,
  ipAddress: String,
  userId: String,

  // System metrics at time of request
  systemMetrics: {
    cpuUsage: Number,
    memoryUsage: Number,
    memoryTotal: Number,
    loadAverage: [Number],
    uptime: Number
  },

  // Database metrics
  dbMetrics: {
    connectionCount: Number,
    queryTime: Number,
    queryCount: Number
  },

  // Error information
  error: {
    message: String,
    stack: String,
    code: String
  },

  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'performance_metrics'
});

// Indexes for performance queries
performanceMetricSchema.index({ timestamp: -1 });
performanceMetricSchema.index({ tenantId: 1, timestamp: -1 });
performanceMetricSchema.index({ path: 1, method: 1 });
performanceMetricSchema.index({ responseTime: -1 });
performanceMetricSchema.index({ statusCode: 1 });

const PerformanceMetric = mongoose.model('PerformanceMetric', performanceMetricSchema);

/**
 * Performance Monitoring Middleware
 * Tracks response times, system metrics, and database performance
 */
class PerformanceMonitoringMiddleware {
  constructor() {
    this.sampleRate = parseFloat(process.env.PERFORMANCE_SAMPLE_RATE) || 0.1; // Sample 10% of requests
    this.slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000; // 1 second
    this.enableSystemMetrics = process.env.ENABLE_SYSTEM_METRICS !== 'false';
    this.enableDbMetrics = process.env.ENABLE_DB_METRICS !== 'false';
  }

  /**
   * Express middleware for performance monitoring
   */
  middleware() {
    return (req, res, next) => {
      // Skip monitoring for health checks and static assets
      if (this.shouldSkipRequest(req)) {
        return next();
      }

      // Sample requests to avoid overwhelming the database
      if (Math.random() > this.sampleRate && !this.isSlowRequest(req)) {
        return next();
      }

      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      // Store original methods
      const originalSend = res.send;
      const originalJson = res.json;

      let responseSize = 0;
      let dbQueryCount = 0;
      let dbQueryTime = 0;

      // Track database queries if enabled
      if (this.enableDbMetrics) {
        this.trackDatabaseQueries(req, (count, time) => {
          dbQueryCount = count;
          dbQueryTime = time;
        });
      }

      // Override response methods to capture response size
      res.send = function (data) {
        responseSize = Buffer.byteLength(data || '', 'utf8');
        return originalSend.call(this, data);
      };

      res.json = function (data) {
        const jsonString = JSON.stringify(data);
        responseSize = Buffer.byteLength(jsonString, 'utf8');
        return originalJson.call(this, data);
      };

      // Capture metrics when response finishes
      res.on('finish', async () => {
        try {
          const endTime = process.hrtime.bigint();
          const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

          // Only log if it's a slow request or within sample rate
          if (responseTime >= this.slowRequestThreshold || Math.random() <= this.sampleRate) {
            await this.logPerformanceMetric({
              req,
              res,
              responseTime,
              requestSize: this.getRequestSize(req),
              responseSize,
              dbQueryCount,
              dbQueryTime,
              startMemory
            });
          }
        } catch (error) {
          console.error('Error logging performance metric:', error);
        }
      });

      next();
    };
  }

  /**
   * Check if request should be skipped from monitoring
   */
  shouldSkipRequest(req) {
    const skipPaths = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/robots.txt'
    ];

    const skipExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'];

    return skipPaths.includes(req.path) ||
      skipExtensions.some(ext => req.path.endsWith(ext)) ||
      req.path.startsWith('/static/');
  }

  /**
   * Check if this might be a slow request based on path patterns
   */
  isSlowRequest(req) {
    const slowPaths = [
      '/api/reports',
      '/api/analytics',
      '/api/export',
      '/api/backup'
    ];

    return slowPaths.some(path => req.path.startsWith(path));
  }

  /**
   * Get request size in bytes
   */
  getRequestSize(req) {
    const contentLength = req.get('content-length');
    if (contentLength) {
      return parseInt(contentLength);
    }

    // Estimate size from body if available
    if (req.body) {
      return Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    }

    return 0;
  }

  /**
   * Track database queries during request
   */
  trackDatabaseQueries(req, callback) {
    let queryCount = 0;
    let totalQueryTime = 0;

    // Hook into Mongoose query execution
    const originalExec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = function () {
      const startTime = Date.now();
      queryCount++;

      const result = originalExec.apply(this, arguments);

      if (result && typeof result.then === 'function') {
        return result.then(res => {
          totalQueryTime += Date.now() - startTime;
          callback(queryCount, totalQueryTime);
          return res;
        }).catch(err => {
          totalQueryTime += Date.now() - startTime;
          callback(queryCount, totalQueryTime);
          throw err;
        });
      }

      totalQueryTime += Date.now() - startTime;
      callback(queryCount, totalQueryTime);
      return result;
    };

    // Restore original method after request
    req.on('end', () => {
      mongoose.Query.prototype.exec = originalExec;
    });
  }

  /**
   * Log performance metric to database
   */
  async logPerformanceMetric(data) {
    const {
      req,
      res,
      responseTime,
      requestSize,
      responseSize,
      dbQueryCount,
      dbQueryTime,
      startMemory
    } = data;

    try {
      const systemMetrics = this.enableSystemMetrics ? this.getSystemMetrics() : {};

      const metric = new PerformanceMetric({
        tenantId: req.tenantId || req.headers['x-tenant-id'],
        requestId: req.id || req.headers['x-request-id'],
        method: req.method,
        path: this.sanitizePath(req.path),
        statusCode: res.statusCode,
        responseTime,
        requestSize,
        responseSize,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || req.user?._id,
        systemMetrics,
        dbMetrics: {
          connectionCount: mongoose.connection.readyState === 1 ? 1 : 0,
          queryTime: dbQueryTime,
          queryCount: dbQueryCount
        },
        error: res.statusCode >= 400 ? {
          message: res.locals.error?.message,
          stack: res.locals.error?.stack,
          code: res.locals.error?.code
        } : undefined
      });

      await metric.save();
    } catch (error) {
      console.error('Failed to save performance metric:', error);
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();

    return {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to milliseconds
      memoryUsage: memoryUsage.heapUsed,
      memoryTotal: memoryUsage.heapTotal,
      loadAverage: os.loadavg(),
      uptime: process.uptime()
    };
  }

  /**
   * Sanitize path to remove sensitive information
   */
  sanitizePath(path) {
    // Remove IDs and sensitive parameters
    return path
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\?.*$/, '') // Query parameters
      .substring(0, 200); // Limit length
  }

  /**
   * Get performance analytics
   */
  static async getPerformanceAnalytics(options = {}) {
    const {
      tenantId,
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      endDate = new Date(),
      groupBy = 'hour'
    } = options;

    const matchStage = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    // Time series aggregation
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

    const [
      timeSeriesData,
      endpointStats,
      errorStats,
      systemStats
    ] = await Promise.all([
      // Time series performance data
      PerformanceMetric.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupFormat,
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            requestCount: { $sum: 1 },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
            },
            avgRequestSize: { $avg: '$requestSize' },
            avgResponseSize: { $avg: '$responseSize' },
            avgDbQueryTime: { $avg: '$dbMetrics.queryTime' },
            avgDbQueryCount: { $avg: '$dbMetrics.queryCount' },
            avgCpuUsage: { $avg: '$systemMetrics.cpuUsage' },
            avgMemoryUsage: { $avg: '$systemMetrics.memoryUsage' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
      ]),

      // Endpoint performance stats
      PerformanceMetric.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { path: '$path', method: '$method' },
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            requestCount: { $sum: 1 },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
            },
            errorRate: {
              $avg: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
            }
          }
        },
        { $sort: { avgResponseTime: -1 } },
        { $limit: 20 }
      ]),

      // Error statistics
      PerformanceMetric.aggregate([
        {
          $match: {
            ...matchStage,
            statusCode: { $gte: 400 }
          }
        },
        {
          $group: {
            _id: '$statusCode',
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            paths: { $addToSet: '$path' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // System performance stats
      PerformanceMetric.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            avgCpuUsage: { $avg: '$systemMetrics.cpuUsage' },
            maxCpuUsage: { $max: '$systemMetrics.cpuUsage' },
            avgMemoryUsage: { $avg: '$systemMetrics.memoryUsage' },
            maxMemoryUsage: { $max: '$systemMetrics.memoryUsage' },
            avgDbQueryTime: { $avg: '$dbMetrics.queryTime' },
            maxDbQueryTime: { $max: '$dbMetrics.queryTime' },
            totalRequests: { $sum: 1 },
            totalErrors: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const systemSummary = systemStats[0] || {};

    return {
      period: { start: startDate, end: endDate },
      groupBy,
      timeSeries: timeSeriesData,
      endpoints: endpointStats,
      errors: errorStats,
      summary: {
        totalRequests: systemSummary.totalRequests || 0,
        totalErrors: systemSummary.totalErrors || 0,
        errorRate: systemSummary.totalRequests > 0
          ? (systemSummary.totalErrors / systemSummary.totalRequests) * 100
          : 0,
        avgResponseTime: systemSummary.avgResponseTime || 0,
        avgCpuUsage: systemSummary.avgCpuUsage || 0,
        avgMemoryUsage: systemSummary.avgMemoryUsage || 0,
        avgDbQueryTime: systemSummary.avgDbQueryTime || 0
      },
      generatedAt: new Date()
    };
  }

  /**
   * Get slow requests
   */
  static async getSlowRequests(options = {}) {
    const {
      tenantId,
      limit = 50,
      minResponseTime = 1000,
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    const matchStage = {
      timestamp: { $gte: startDate, $lte: endDate },
      responseTime: { $gte: minResponseTime }
    };

    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    return await PerformanceMetric.find(matchStage)
      .sort({ responseTime: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get system capacity utilization
   */
  static async getSystemCapacityUtilization(options = {}) {
    const {
      startDate = new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      endDate = new Date()
    } = options;

    const result = await PerformanceMetric.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          'systemMetrics.cpuUsage': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgCpuUsage: { $avg: '$systemMetrics.cpuUsage' },
          maxCpuUsage: { $max: '$systemMetrics.cpuUsage' },
          avgMemoryUsage: { $avg: '$systemMetrics.memoryUsage' },
          maxMemoryUsage: { $max: '$systemMetrics.memoryUsage' },
          avgMemoryTotal: { $avg: '$systemMetrics.memoryTotal' },
          avgLoadAverage: { $avg: { $arrayElemAt: ['$systemMetrics.loadAverage', 0] } },
          maxLoadAverage: { $max: { $arrayElemAt: ['$systemMetrics.loadAverage', 0] } },
          sampleCount: { $sum: 1 }
        }
      }
    ]);

    const stats = result[0] || {};
    const memoryUtilization = stats.avgMemoryTotal > 0
      ? (stats.avgMemoryUsage / stats.avgMemoryTotal) * 100
      : 0;

    return {
      cpu: {
        average: stats.avgCpuUsage || 0,
        peak: stats.maxCpuUsage || 0,
        utilization: Math.min((stats.avgCpuUsage || 0) / 100, 1) * 100
      },
      memory: {
        average: stats.avgMemoryUsage || 0,
        peak: stats.maxMemoryUsage || 0,
        total: stats.avgMemoryTotal || 0,
        utilization: memoryUtilization
      },
      load: {
        average: stats.avgLoadAverage || 0,
        peak: stats.maxLoadAverage || 0,
        cores: os.cpus().length
      },
      period: { start: startDate, end: endDate },
      sampleCount: stats.sampleCount || 0
    };
  }
}

export default new PerformanceMonitoringMiddleware();