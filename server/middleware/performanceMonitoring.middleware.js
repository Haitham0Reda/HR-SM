// Performance Monitoring Middleware - tracks request performance metrics
// DISABLED: This entire middleware was designed for Mongoose/MongoDB.
// It needs to be completely rewritten for Sequelize/PostgreSQL.

import os from 'os';

/**
 * Performance Monitoring Middleware
 * Tracks response times, system metrics, and database performance
 * 
 * NOTE: This middleware is currently disabled as it was designed for Mongoose.
 * It needs to be rewritten to work with Sequelize/PostgreSQL.
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
   * DISABLED: Needs Sequelize rewrite
   */
  middleware() {
    return (req, res, next) => {
      console.warn('Performance monitoring middleware is disabled - needs Sequelize rewrite');
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
   * DISABLED: Needs Sequelize rewrite
   */
  static async getPerformanceAnalytics(options = {}) {
    console.warn('getPerformanceAnalytics is disabled - needs Sequelize rewrite');
    return null;
  }

  /**
   * Get slow requests
   * DISABLED: Needs Sequelize rewrite
   */
  static async getSlowRequests(options = {}) {
    console.warn('getSlowRequests is disabled - needs Sequelize rewrite');
    return [];
  }

  /**
   * Get system capacity utilization
   * DISABLED: Needs Sequelize rewrite
   */
  static async getSystemCapacityUtilization(options = {}) {
    console.warn('getSystemCapacityUtilization is disabled - needs Sequelize rewrite');
    return null;
  }
}

export default new PerformanceMonitoringMiddleware();