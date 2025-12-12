import mongoose from 'mongoose';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Health Check Service
 * Monitors system health and component status
 */
class HealthCheckService {
  /**
   * Check overall system health
   * 
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', error: checks[0].reason?.message },
      memory: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', error: checks[1].reason?.message },
      disk: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy', error: checks[2].reason?.message }
    };

    // Determine overall status
    const allHealthy = Object.values(results).every(r => r.status === 'healthy');
    const anyUnhealthy = Object.values(results).some(r => r.status === 'unhealthy');

    let overallStatus = 'healthy';
    if (anyUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (!allHealthy) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Check database connectivity
   * 
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabase() {
    try {
      const state = mongoose.connection.readyState;
      
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      if (state === 1) {
        // Perform a simple query to verify connection
        await mongoose.connection.db.admin().ping();
        
        return {
          status: 'healthy',
          state: 'connected',
          responseTime: Date.now()
        };
      } else if (state === 2) {
        return {
          status: 'degraded',
          state: 'connecting'
        };
      } else {
        return {
          status: 'unhealthy',
          state: 'disconnected'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check memory usage
   * 
   * @returns {Object} Memory health status
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const usagePercent = (usedMemory / totalMemory) * 100;

    let status = 'healthy';
    if (usagePercent > 90) {
      status = 'unhealthy';
    } else if (usagePercent > 75) {
      status = 'degraded';
    }

    return {
      status,
      heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
      heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
      usagePercent: Math.round(usagePercent),
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }

  /**
   * Check disk usage
   * 
   * @returns {Object} Disk health status
   */
  checkDisk() {
    // This is a simplified check
    // In production, you might want to use a library like 'diskusage'
    
    return {
      status: 'healthy',
      message: 'Disk check not implemented'
    };
  }

  /**
   * Get detailed system information
   * 
   * @returns {Object} System information
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get API response time statistics
   * 
   * @returns {Object} Response time stats
   */
  getResponseTimeStats() {
    // This would typically be collected by middleware
    // For now, return placeholder data
    
    return {
      average: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }

  /**
   * Get error rate statistics
   * 
   * @returns {Object} Error rate stats
   */
  getErrorRateStats() {
    // This would typically be collected by error middleware
    // For now, return placeholder data
    
    return {
      total: 0,
      rate: 0,
      last24h: 0,
      lastHour: 0
    };
  }
}

export default new HealthCheckService();
