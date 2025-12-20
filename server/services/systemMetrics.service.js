import os from 'os';
import process from 'process';
import mongoose from 'mongoose';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * System Metrics Service
 * Collects system-level metrics using Node.js os and process modules
 */
class SystemMetricsService {
  constructor() {
    this.startTime = Date.now();
    this.previousCpuUsage = process.cpuUsage();
    this.previousTime = process.hrtime();
  }

  /**
   * Get basic system metrics
   * @returns {Object} System metrics
   */
  getBasicMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      timestamp: new Date().toISOString(),
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
        application: (Date.now() - this.startTime) / 1000
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        architecture: os.arch(),
        model: os.cpus()[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: (usedMemory / totalMemory) * 100,
        // Process memory usage
        process: process.memoryUsage()
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        nodeVersion: process.version
      }
    };
  }

  /**
   * Get CPU usage percentage
   * @returns {number} CPU usage percentage
   */
  getCpuUsage() {
    const currentCpuUsage = process.cpuUsage(this.previousCpuUsage);
    const currentTime = process.hrtime(this.previousTime);
    
    // Convert to microseconds
    const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000;
    const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
    
    // Calculate percentage
    const cpuPercent = (totalCpuTime / totalTime) * 100;
    
    // Update for next calculation
    this.previousCpuUsage = process.cpuUsage();
    this.previousTime = process.hrtime();
    
    return Math.min(100, Math.max(0, cpuPercent));
  }

  /**
   * Get memory usage details
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();

    return {
      system: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: (usedMemory / totalMemory) * 100,
        available: freeMemory
      },
      process: {
        rss: processMemory.rss, // Resident Set Size
        heapTotal: processMemory.heapTotal,
        heapUsed: processMemory.heapUsed,
        external: processMemory.external,
        arrayBuffers: processMemory.arrayBuffers,
        heapUsagePercentage: (processMemory.heapUsed / processMemory.heapTotal) * 100
      }
    };
  }

  /**
   * Get disk usage information (Linux/Unix systems)
   * @returns {Promise<Object>} Disk usage information
   */
  async getDiskUsage() {
    try {
      // Try to get disk usage using df command (Unix/Linux)
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 5) {
        return {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          percentage: parseInt(parts[4].replace('%', '')),
          mountPoint: parts[5] || '/'
        };
      }
    } catch (error) {
      // Fallback for Windows or when df command fails
      console.warn('Could not get disk usage:', error.message);
    }

    return {
      filesystem: 'Unknown',
      size: 'Unknown',
      used: 'Unknown',
      available: 'Unknown',
      percentage: 0,
      mountPoint: '/',
      error: 'Disk usage information not available'
    };
  }

  /**
   * Get network interface information
   * @returns {Object} Network interfaces
   */
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = {};

    for (const [name, addresses] of Object.entries(interfaces)) {
      result[name] = addresses.map(addr => ({
        address: addr.address,
        netmask: addr.netmask,
        family: addr.family,
        mac: addr.mac,
        internal: addr.internal,
        cidr: addr.cidr
      }));
    }

    return result;
  }

  /**
   * Get process information
   * @returns {Object} Process information
   */
  getProcessInfo() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      versions: process.versions,
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        // Don't expose sensitive environment variables
        keys: Object.keys(process.env).length
      }
    };
  }

  /**
   * Get comprehensive system health metrics
   * @returns {Promise<Object>} Complete system health data
   */
  async getSystemHealth() {
    const basicMetrics = this.getBasicMetrics();
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();
    const networkInterfaces = this.getNetworkInterfaces();
    const processInfo = this.getProcessInfo();

    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct points for high resource usage
    if (memoryUsage.system.percentage > 90) healthScore -= 30;
    else if (memoryUsage.system.percentage > 80) healthScore -= 15;
    
    if (cpuUsage > 90) healthScore -= 25;
    else if (cpuUsage > 80) healthScore -= 10;
    
    if (diskUsage.percentage > 95) healthScore -= 20;
    else if (diskUsage.percentage > 85) healthScore -= 10;

    // Determine health status
    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 70) status = 'warning';
    else if (healthScore < 85) status = 'degraded';

    return {
      timestamp: new Date().toISOString(),
      status,
      healthScore,
      metrics: {
        basic: basicMetrics,
        cpu: {
          usage: cpuUsage,
          loadAverage: basicMetrics.cpu.loadAverage,
          cores: basicMetrics.cpu.cores
        },
        memory: memoryUsage,
        disk: diskUsage,
        network: networkInterfaces,
        process: processInfo
      },
      alerts: this.generateAlerts(cpuUsage, memoryUsage, diskUsage)
    };
  }

  /**
   * Generate alerts based on system metrics
   * @param {number} cpuUsage - CPU usage percentage
   * @param {Object} memoryUsage - Memory usage data
   * @param {Object} diskUsage - Disk usage data
   * @returns {Array} Array of alerts
   */
  generateAlerts(cpuUsage, memoryUsage, diskUsage) {
    const alerts = [];

    // CPU alerts
    if (cpuUsage > 90) {
      alerts.push({
        level: 'critical',
        type: 'cpu',
        message: 'CPU usage is critically high',
        value: cpuUsage,
        threshold: 90
      });
    } else if (cpuUsage > 80) {
      alerts.push({
        level: 'warning',
        type: 'cpu',
        message: 'CPU usage is high',
        value: cpuUsage,
        threshold: 80
      });
    }

    // Memory alerts
    if (memoryUsage.system.percentage > 90) {
      alerts.push({
        level: 'critical',
        type: 'memory',
        message: 'Memory usage is critically high',
        value: memoryUsage.system.percentage,
        threshold: 90
      });
    } else if (memoryUsage.system.percentage > 85) {
      alerts.push({
        level: 'warning',
        type: 'memory',
        message: 'Memory usage is high',
        value: memoryUsage.system.percentage,
        threshold: 85
      });
    }

    // Disk alerts
    if (diskUsage.percentage > 95) {
      alerts.push({
        level: 'critical',
        type: 'disk',
        message: 'Disk usage is critically high',
        value: diskUsage.percentage,
        threshold: 95
      });
    } else if (diskUsage.percentage > 85) {
      alerts.push({
        level: 'warning',
        type: 'disk',
        message: 'Disk usage is high',
        value: diskUsage.percentage,
        threshold: 85
      });
    }

    // Process memory alerts
    if (memoryUsage.process.heapUsagePercentage > 90) {
      alerts.push({
        level: 'warning',
        type: 'process-memory',
        message: 'Process heap usage is high',
        value: memoryUsage.process.heapUsagePercentage,
        threshold: 90
      });
    }

    return alerts;
  }

  /**
   * Get metrics for Prometheus export
   * @returns {Promise<Object>} Prometheus-compatible metrics
   */
  async getPrometheusMetrics() {
    const health = await this.getSystemHealth();
    
    return {
      // System metrics
      'system_cpu_usage_percent': health.metrics.cpu.usage,
      'system_memory_usage_percent': health.metrics.memory.system.percentage,
      'system_disk_usage_percent': health.metrics.disk.percentage,
      'system_uptime_seconds': health.metrics.basic.uptime.system,
      'system_load_average_1m': health.metrics.cpu.loadAverage[0],
      'system_load_average_5m': health.metrics.cpu.loadAverage[1],
      'system_load_average_15m': health.metrics.cpu.loadAverage[2],
      
      // Process metrics
      'process_uptime_seconds': health.metrics.basic.uptime.process,
      'process_memory_rss_bytes': health.metrics.memory.process.rss,
      'process_memory_heap_used_bytes': health.metrics.memory.process.heapUsed,
      'process_memory_heap_total_bytes': health.metrics.memory.process.heapTotal,
      'process_memory_external_bytes': health.metrics.memory.process.external,
      
      // Health metrics
      'system_health_score': health.healthScore,
      'system_alerts_total': health.alerts.length
    };
  }

  /**
   * Start periodic metrics collection
   * @param {number} interval - Collection interval in milliseconds
   * @param {Function} callback - Callback function to handle metrics
   */
  startPeriodicCollection(interval = 30000, callback) {
    const collectMetrics = async () => {
      try {
        const metrics = await this.getSystemHealth();
        if (callback) {
          callback(metrics);
        }
      } catch (error) {
        console.error('Error collecting system metrics:', error);
      }
    };

    // Collect immediately
    collectMetrics();

    // Set up periodic collection
    return setInterval(collectMetrics, interval);
  }

  /**
   * Stop periodic metrics collection
   * @param {NodeJS.Timeout} intervalId - Interval ID returned by startPeriodicCollection
   */
  stopPeriodicCollection(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default new SystemMetricsService();