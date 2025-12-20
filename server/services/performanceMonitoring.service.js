import os from 'os';
import process from 'process';
import mongoose from 'mongoose';
import performanceMonitoringMiddleware from '../middleware/performanceMonitoring.middleware.js';

/**
 * Performance Monitoring Service
 * Provides system capacity utilization monitoring and automated performance reporting
 */
class PerformanceMonitoringService {
  constructor() {
    this.monitoringInterval = null;
    this.alertThresholds = {
      cpu: 80, // 80% CPU usage
      memory: 85, // 85% memory usage
      responseTime: 2000, // 2 seconds
      errorRate: 5, // 5% error rate
      diskSpace: 90 // 90% disk usage
    };
    this.isMonitoring = false;
  }

  /**
   * Start continuous system monitoring
   * @param {number} intervalMs - Monitoring interval in milliseconds (default: 30 seconds)
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('Performance monitoring is already running');
      return;
    }

    console.log(`Starting performance monitoring with ${intervalMs}ms interval`);
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.checkAlertThresholds();
      } catch (error) {
        console.error('Error in performance monitoring cycle:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop continuous system monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('Performance monitoring stopped');
    }
  }

  /**
   * Collect current system metrics
   */
  async collectSystemMetrics() {
    const metrics = {
      timestamp: new Date(),
      cpu: this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      disk: await this.getDiskMetrics(),
      network: this.getNetworkMetrics(),
      process: this.getProcessMetrics(),
      database: await this.getDatabaseMetrics()
    };

    // Store metrics in database for historical analysis
    await this.storeSystemMetrics(metrics);

    return metrics;
  }

  /**
   * Get CPU metrics
   */
  getCPUMetrics() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    return {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      utilization: Math.min((loadAvg[0] / cpus.length) * 100, 100)
    };
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();

    return {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      utilization: (usedMemory / totalMemory) * 100,
      process: {
        rss: processMemory.rss,
        heapTotal: processMemory.heapTotal,
        heapUsed: processMemory.heapUsed,
        external: processMemory.external,
        arrayBuffers: processMemory.arrayBuffers
      }
    };
  }

  /**
   * Get disk metrics (simplified - in production use a proper disk monitoring library)
   */
  async getDiskMetrics() {
    // This is a simplified implementation
    // In production, use libraries like 'node-disk-info' or 'systeminformation'
    return {
      total: 0,
      free: 0,
      used: 0,
      utilization: 0
    };
  }

  /**
   * Get network metrics
   */
  getNetworkMetrics() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = [];

    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      if (addresses) {
        interfaces.push({
          name,
          addresses: addresses.map(addr => ({
            address: addr.address,
            family: addr.family,
            internal: addr.internal
          }))
        });
      }
    }

    return {
      interfaces,
      hostname: os.hostname()
    };
  }

  /**
   * Get Node.js process metrics
   */
  getProcessMetrics() {
    const usage = process.cpuUsage();
    
    return {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: {
        user: usage.user,
        system: usage.system
      },
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      const connection = mongoose.connection;
      
      if (connection.readyState !== 1) {
        return {
          connected: false,
          readyState: connection.readyState
        };
      }

      // Get database statistics
      const dbStats = await connection.db.stats();
      
      return {
        connected: true,
        readyState: connection.readyState,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        stats: {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize
        }
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Store system metrics in database
   */
  async storeSystemMetrics(metrics) {
    try {
      // Create a simplified metrics document for storage
      const SystemMetrics = mongoose.model('SystemMetrics', new mongoose.Schema({
        timestamp: { type: Date, default: Date.now, index: true },
        cpu: {
          cores: Number,
          utilization: Number,
          loadAverage: {
            '1min': Number,
            '5min': Number,
            '15min': Number
          }
        },
        memory: {
          total: Number,
          used: Number,
          utilization: Number,
          processHeapUsed: Number
        },
        process: {
          uptime: Number,
          cpuUsage: {
            user: Number,
            system: Number
          },
          activeHandles: Number,
          activeRequests: Number
        },
        database: {
          connected: Boolean,
          dataSize: Number,
          collections: Number
        }
      }, { collection: 'system_metrics' }));

      const systemMetric = new SystemMetrics({
        timestamp: metrics.timestamp,
        cpu: {
          cores: metrics.cpu.cores,
          utilization: metrics.cpu.utilization,
          loadAverage: metrics.cpu.loadAverage
        },
        memory: {
          total: metrics.memory.total,
          used: metrics.memory.used,
          utilization: metrics.memory.utilization,
          processHeapUsed: metrics.memory.process.heapUsed
        },
        process: {
          uptime: metrics.process.uptime,
          cpuUsage: metrics.process.cpuUsage,
          activeHandles: metrics.process.activeHandles,
          activeRequests: metrics.process.activeRequests
        },
        database: {
          connected: metrics.database.connected,
          dataSize: metrics.database.stats?.dataSize || 0,
          collections: metrics.database.stats?.collections || 0
        }
      });

      await systemMetric.save();
    } catch (error) {
      console.error('Error storing system metrics:', error);
    }
  }

  /**
   * Check alert thresholds and trigger alerts if necessary
   */
  async checkAlertThresholds() {
    try {
      const metrics = await this.collectSystemMetrics();
      const alerts = [];

      // CPU usage alert
      if (metrics.cpu.utilization > this.alertThresholds.cpu) {
        alerts.push({
          type: 'cpu_high',
          severity: 'warning',
          message: `High CPU usage: ${metrics.cpu.utilization.toFixed(1)}%`,
          value: metrics.cpu.utilization,
          threshold: this.alertThresholds.cpu
        });
      }

      // Memory usage alert
      if (metrics.memory.utilization > this.alertThresholds.memory) {
        alerts.push({
          type: 'memory_high',
          severity: 'warning',
          message: `High memory usage: ${metrics.memory.utilization.toFixed(1)}%`,
          value: metrics.memory.utilization,
          threshold: this.alertThresholds.memory
        });
      }

      // Database connection alert
      if (!metrics.database.connected) {
        alerts.push({
          type: 'database_disconnected',
          severity: 'critical',
          message: 'Database connection lost',
          value: false,
          threshold: true
        });
      }

      // Check performance metrics from recent requests
      const performanceAlerts = await this.checkPerformanceAlerts();
      alerts.push(...performanceAlerts);

      // Trigger alerts if any
      if (alerts.length > 0) {
        await this.triggerAlerts(alerts);
      }

      return alerts;
    } catch (error) {
      console.error('Error checking alert thresholds:', error);
      return [];
    }
  }

  /**
   * Check performance-based alerts
   */
  async checkPerformanceAlerts() {
    try {
      const alerts = [];
      const recentPerformance = await performanceMonitoringMiddleware.constructor
        .getPerformanceAnalytics({
          startDate: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          endDate: new Date(),
          groupBy: 'minute'
        });

      // High response time alert
      if (recentPerformance.summary.avgResponseTime > this.alertThresholds.responseTime) {
        alerts.push({
          type: 'response_time_high',
          severity: 'warning',
          message: `High average response time: ${recentPerformance.summary.avgResponseTime.toFixed(0)}ms`,
          value: recentPerformance.summary.avgResponseTime,
          threshold: this.alertThresholds.responseTime
        });
      }

      // High error rate alert
      if (recentPerformance.summary.errorRate > this.alertThresholds.errorRate) {
        alerts.push({
          type: 'error_rate_high',
          severity: 'critical',
          message: `High error rate: ${recentPerformance.summary.errorRate.toFixed(1)}%`,
          value: recentPerformance.summary.errorRate,
          threshold: this.alertThresholds.errorRate
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking performance alerts:', error);
      return [];
    }
  }

  /**
   * Trigger alerts (log, email, webhook, etc.)
   */
  async triggerAlerts(alerts) {
    for (const alert of alerts) {
      console.warn(`🚨 PERFORMANCE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      
      // In production, implement additional alert mechanisms:
      // - Email notifications
      // - Slack/Teams webhooks
      // - PagerDuty integration
      // - SMS alerts for critical issues
      
      // Store alert in database for tracking
      await this.storeAlert(alert);
    }
  }

  /**
   * Store alert in database
   */
  async storeAlert(alert) {
    try {
      const PerformanceAlert = mongoose.model('PerformanceAlert', new mongoose.Schema({
        type: { type: String, required: true },
        severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
        message: { type: String, required: true },
        value: mongoose.Schema.Types.Mixed,
        threshold: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
        resolvedAt: Date,
        resolvedBy: String
      }, { collection: 'performance_alerts' }));

      const performanceAlert = new PerformanceAlert(alert);
      await performanceAlert.save();
    } catch (error) {
      console.error('Error storing performance alert:', error);
    }
  }

  /**
   * Generate automated performance report
   */
  async generatePerformanceReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      endDate = new Date(),
      includeSystemMetrics = true,
      includePerformanceMetrics = true,
      includeLicenseServerMetrics = true
    } = options;

    const report = {
      period: { start: startDate, end: endDate },
      generatedAt: new Date(),
      summary: {},
      systemMetrics: null,
      performanceMetrics: null,
      licenseServerMetrics: null,
      recommendations: []
    };

    try {
      // System metrics
      if (includeSystemMetrics) {
        report.systemMetrics = await this.getSystemCapacityUtilization({
          startDate,
          endDate
        });
      }

      // Performance metrics
      if (includePerformanceMetrics) {
        report.performanceMetrics = await performanceMonitoringMiddleware.constructor
          .getPerformanceAnalytics({
            startDate,
            endDate,
            groupBy: 'hour'
          });
      }

      // License server metrics (if available)
      if (includeLicenseServerMetrics) {
        try {
          report.licenseServerMetrics = await this.getLicenseServerMetrics({
            startDate,
            endDate
          });
        } catch (error) {
          console.warn('License server metrics unavailable:', error.message);
        }
      }

      // Generate summary
      report.summary = this.generateReportSummary(report);

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error(`Failed to generate performance report: ${error.message}`);
    }
  }

  /**
   * Get system capacity utilization
   */
  async getSystemCapacityUtilization(options = {}) {
    const {
      startDate = new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      endDate = new Date()
    } = options;

    try {
      const SystemMetrics = mongoose.model('SystemMetrics');
      
      const result = await SystemMetrics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            avgCpuUtilization: { $avg: '$cpu.utilization' },
            maxCpuUtilization: { $max: '$cpu.utilization' },
            avgMemoryUtilization: { $avg: '$memory.utilization' },
            maxMemoryUtilization: { $max: '$memory.utilization' },
            avgLoadAverage: { $avg: '$cpu.loadAverage.1min' },
            maxLoadAverage: { $max: '$cpu.loadAverage.1min' },
            avgProcessUptime: { $avg: '$process.uptime' },
            avgActiveHandles: { $avg: '$process.activeHandles' },
            avgActiveRequests: { $avg: '$process.activeRequests' },
            sampleCount: { $sum: 1 }
          }
        }
      ]);

      const stats = result[0] || {};

      return {
        cpu: {
          average: stats.avgCpuUtilization || 0,
          peak: stats.maxCpuUtilization || 0,
          loadAverage: stats.avgLoadAverage || 0,
          peakLoadAverage: stats.maxLoadAverage || 0
        },
        memory: {
          average: stats.avgMemoryUtilization || 0,
          peak: stats.maxMemoryUtilization || 0
        },
        process: {
          uptime: stats.avgProcessUptime || 0,
          activeHandles: stats.avgActiveHandles || 0,
          activeRequests: stats.avgActiveRequests || 0
        },
        period: { start: startDate, end: endDate },
        sampleCount: stats.sampleCount || 0
      };
    } catch (error) {
      console.error('Error getting system capacity utilization:', error);
      return {
        cpu: { average: 0, peak: 0 },
        memory: { average: 0, peak: 0 },
        process: { uptime: 0, activeHandles: 0, activeRequests: 0 },
        period: { start: startDate, end: endDate },
        sampleCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get license server metrics (placeholder - would integrate with actual license server)
   */
  async getLicenseServerMetrics(options = {}) {
    // This would integrate with the actual license server monitoring
    // For now, return placeholder data
    return {
      available: false,
      message: 'License server metrics integration not implemented'
    };
  }

  /**
   * Generate report summary
   */
  generateReportSummary(report) {
    const summary = {
      overallHealth: 'good',
      criticalIssues: 0,
      warnings: 0,
      keyMetrics: {}
    };

    // System health assessment
    if (report.systemMetrics) {
      const { cpu, memory } = report.systemMetrics;
      
      summary.keyMetrics.avgCpuUtilization = cpu.average;
      summary.keyMetrics.peakCpuUtilization = cpu.peak;
      summary.keyMetrics.avgMemoryUtilization = memory.average;
      summary.keyMetrics.peakMemoryUtilization = memory.peak;

      if (cpu.peak > 90 || memory.peak > 95) {
        summary.overallHealth = 'critical';
        summary.criticalIssues++;
      } else if (cpu.average > 70 || memory.average > 80) {
        summary.overallHealth = 'warning';
        summary.warnings++;
      }
    }

    // Performance health assessment
    if (report.performanceMetrics) {
      const { summary: perfSummary } = report.performanceMetrics;
      
      summary.keyMetrics.avgResponseTime = perfSummary.avgResponseTime;
      summary.keyMetrics.errorRate = perfSummary.errorRate;
      summary.keyMetrics.totalRequests = perfSummary.totalRequests;

      if (perfSummary.errorRate > 5 || perfSummary.avgResponseTime > 3000) {
        summary.overallHealth = 'critical';
        summary.criticalIssues++;
      } else if (perfSummary.errorRate > 2 || perfSummary.avgResponseTime > 1500) {
        if (summary.overallHealth !== 'critical') {
          summary.overallHealth = 'warning';
        }
        summary.warnings++;
      }
    }

    return summary;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];

    // System recommendations
    if (report.systemMetrics) {
      const { cpu, memory } = report.systemMetrics;
      
      if (cpu.average > 70) {
        recommendations.push({
          type: 'system',
          priority: 'high',
          title: 'High CPU Usage',
          description: `Average CPU utilization is ${cpu.average.toFixed(1)}%. Consider scaling horizontally or optimizing CPU-intensive operations.`
        });
      }

      if (memory.average > 80) {
        recommendations.push({
          type: 'system',
          priority: 'high',
          title: 'High Memory Usage',
          description: `Average memory utilization is ${memory.average.toFixed(1)}%. Consider increasing memory or optimizing memory usage.`
        });
      }
    }

    // Performance recommendations
    if (report.performanceMetrics) {
      const { summary: perfSummary, endpoints } = report.performanceMetrics;
      
      if (perfSummary.avgResponseTime > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: 'Slow Response Times',
          description: `Average response time is ${perfSummary.avgResponseTime.toFixed(0)}ms. Consider optimizing database queries and adding caching.`
        });
      }

      if (perfSummary.errorRate > 2) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          title: 'High Error Rate',
          description: `Error rate is ${perfSummary.errorRate.toFixed(1)}%. Review error logs and fix underlying issues.`
        });
      }

      // Slow endpoint recommendations
      const slowEndpoints = endpoints.filter(ep => ep.avgResponseTime > 2000);
      if (slowEndpoints.length > 0) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: 'Slow Endpoints Detected',
          description: `${slowEndpoints.length} endpoints have response times > 2s. Focus optimization on: ${slowEndpoints.slice(0, 3).map(ep => `${ep._id.method} ${ep._id.path}`).join(', ')}`
        });
      }
    }

    return recommendations;
  }

  /**
   * Get current system status
   */
  async getSystemStatus() {
    const metrics = await this.collectSystemMetrics();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      cpu: {
        utilization: metrics.cpu.utilization,
        loadAverage: metrics.cpu.loadAverage['1min']
      },
      memory: {
        utilization: metrics.memory.utilization,
        used: metrics.memory.used,
        total: metrics.memory.total
      },
      database: {
        connected: metrics.database.connected,
        collections: metrics.database.stats?.collections || 0
      },
      process: {
        pid: process.pid,
        version: process.version,
        activeHandles: metrics.process.activeHandles,
        activeRequests: metrics.process.activeRequests
      }
    };
  }
}

export default new PerformanceMonitoringService();