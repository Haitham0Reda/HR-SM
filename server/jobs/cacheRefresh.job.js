import cron from 'node-cron';
import { createLicenseDataService } from '../services/licenseDataService.js';
import { getCacheStats } from '../services/licenseCache.js';
import { getModelForConnection } from '../config/sharedModels.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Cache Refresh Job
 * 
 * Scheduled job to refresh all tenant license caches from the License Server.
 * Runs every 6 hours to ensure cached data remains fresh and accurate.
 * 
 * Requirements: 5.2, 9.6
 */
class CacheRefreshJob {
  constructor() {
    this.isRunning = false;
    this.lastExecution = null;
    this.executionCount = 0;
    this.errorCount = 0;
    this.lastStats = null;
    this.licenseDataService = null;
  }

  /**
   * Initialize the License Data Service
   * 
   * @private
   */
  _initializeLicenseDataService() {
    if (this.licenseDataService) {
      return;
    }

    const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
    const licenseServerApiKey = process.env.LICENSE_SERVER_API_KEY;

    if (!licenseServerApiKey) {
      logger.warn('LICENSE_SERVER_API_KEY not configured, cache refresh job will not run');
      return;
    }

    this.licenseDataService = createLicenseDataService({
      licenseServerUrl,
      licenseServerApiKey,
      clientOptions: {
        timeout: 10000 // 10 second timeout for background jobs
      }
    });

    logger.info('License Data Service initialized for cache refresh job', {
      licenseServerUrl
    });
  }

  /**
   * Start the cache refresh job scheduler
   * Runs every 6 hours
   */
  start() {
    logger.info('🔄 Starting Cache Refresh Job Scheduler...');

    // Initialize License Data Service
    this._initializeLicenseDataService();

    if (!this.licenseDataService) {
      logger.error('Cannot start cache refresh job: License Data Service not initialized');
      return;
    }

    // Run every 6 hours (at :00 minutes of hours 0, 6, 12, 18)
    this.job = cron.schedule('0 */6 * * *', async () => {
      await this.refreshAllCaches();
    }, {
      scheduled: true,
      timezone: process.env.DEFAULT_TIMEZONE || 'UTC'
    });

    logger.info('✅ Cache Refresh Job Scheduler started');
    logger.info('   - Schedule: Every 6 hours (0:00, 6:00, 12:00, 18:00)');
    logger.info('   - Timezone: ' + (process.env.DEFAULT_TIMEZONE || 'UTC'));
  }

  /**
   * Stop the job scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('🛑 Cache Refresh Job Scheduler stopped');
    }
  }

  /**
   * Refresh all tenant license caches
   * 
   * Requirements: 5.2, 9.6
   */
  async refreshAllCaches() {
    if (this.isRunning) {
      logger.warn('Cache refresh job already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastExecution = new Date();
    this.executionCount++;

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    try {
      logger.info('🔄 Starting scheduled cache refresh for all tenants...', {
        type: 'cache_refresh_job',
        operation: 'start',
        executionCount: this.executionCount,
        timestamp: new Date().toISOString()
      });

      // Get all tenant IDs from the platform database
      const tenantIds = await this._getAllTenantIds();

      if (tenantIds.length === 0) {
        logger.info('ℹ️  No tenants found to refresh caches');
        return;
      }

      logger.info(`Found ${tenantIds.length} tenants to refresh`);

      // Refresh cache for each tenant
      for (const tenantId of tenantIds) {
        try {
          await this._refreshTenantCache(tenantId);
          successCount++;
          
          // Requirement: 9.6 - Log cache refresh operations
          logger.debug('Cache refresh operation completed', {
            type: 'cache_refresh',
            operation: 'refresh_tenant',
            tenantId,
            progress: `${successCount + failureCount}/${tenantIds.length}`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          failureCount++;
          errors.push({
            tenantId,
            error: error.message
          });
          
          logger.error('Failed to refresh cache for tenant', {
            tenantId,
            error: error.message,
            stack: error.stack
          });
        }
      }

      // Get cache statistics after refresh
      const stats = await this._getCacheStatistics();
      this.lastStats = stats;

      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);

      // Requirement: 9.6 - Log cache refresh completion with statistics
      logger.info('✅ Cache refresh completed', {
        type: 'cache_refresh_job',
        operation: 'complete',
        totalTenants: tenantIds.length,
        successCount,
        failureCount,
        durationSeconds,
        cacheStats: stats,
        executedAt: this.lastExecution.toISOString(),
        timestamp: new Date().toISOString()
      });

      // Log summary
      console.log(`✅ Cache refresh completed in ${durationSeconds}s`);
      console.log(`   📊 Summary:`);
      console.log(`      - Total tenants: ${tenantIds.length}`);
      console.log(`      - Successful refreshes: ${successCount}`);
      console.log(`      - Failed refreshes: ${failureCount}`);
      console.log(`      - Fresh caches: ${stats.fresh}`);
      console.log(`      - Stale caches: ${stats.stale}`);

      // Log errors if any
      if (errors.length > 0) {
        logger.warn('Some cache refreshes failed', {
          failureCount: errors.length,
          errors: errors.slice(0, 10) // Log first 10 errors
        });
        
        console.log(`   ⚠️  Failed refreshes:`);
        errors.slice(0, 5).forEach(({ tenantId, error }) => {
          console.log(`      - ${tenantId}: ${error}`);
        });
        
        if (errors.length > 5) {
          console.log(`      ... and ${errors.length - 5} more`);
        }
        
        this.errorCount += failureCount;
      }

    } catch (error) {
      logger.error('❌ Cache refresh job failed', {
        error: error.message,
        stack: error.stack,
        executedAt: this.lastExecution
      });
      
      console.error('❌ Cache refresh job failed:', error.message);
      this.errorCount++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get all tenant IDs from the platform database
   * 
   * @private
   * @returns {Promise<string[]>} Array of tenant IDs
   */
  async _getAllTenantIds() {
    try {
      // Get CompanyLicense model from the main database
      const CompanyLicense = (await import('../modules/licensing/models/companyLicense.model.js')).default;
      
      // Get all unique company IDs
      const licenses = await CompanyLicense.find({}, { companyId: 1 });
      const tenantIds = licenses.map(license => license.companyId).filter(Boolean);
      
      // Remove duplicates
      return [...new Set(tenantIds)];
    } catch (error) {
      logger.error('Failed to get tenant IDs', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Refresh cache for a specific tenant
   * 
   * @private
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<void>}
   */
  async _refreshTenantCache(tenantId) {
    try {
      // Force refresh from License Server
      await this.licenseDataService.getTenant(tenantId, null, { forceRefresh: true });
      
      logger.debug('Cache refresh operation completed', {
        type: 'cache_refresh',
        operation: 'refresh_tenant',
        tenantId,
        forceRefresh: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // If License Server is unavailable, log but don't fail the entire job
      if (error.message.includes('License Server unavailable')) {
        logger.warn('License Server unavailable during cache refresh', {
          tenantId,
          error: error.message
        });
        // Don't throw - continue with other tenants
        return;
      }
      
      throw error;
    }
  }

  /**
   * Get cache statistics
   * 
   * @private
   * @returns {Promise<object>} Cache statistics
   */
  async _getCacheStatistics() {
    try {
      const stats = await getCacheStats();
      return stats;
    } catch (error) {
      logger.error('Failed to get cache statistics', {
        error: error.message
      });
      return {
        total: 0,
        fresh: 0,
        stale: 0,
        error: error.message
      };
    }
  }

  /**
   * Get job status and statistics
   * 
   * @returns {object} Job status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      errorCount: this.errorCount,
      successRate: this.executionCount > 0 ? 
        ((this.executionCount - this.errorCount) / this.executionCount * 100).toFixed(2) : 0,
      nextExecution: this.job ? this._getNextExecutionTime() : null,
      lastStats: this.lastStats,
      licenseServerConfigured: !!this.licenseDataService
    };
  }

  /**
   * Get next execution time
   * 
   * @private
   * @returns {Date|null} Next execution time
   */
  _getNextExecutionTime() {
    if (!this.job) {
      return null;
    }

    // Calculate next execution (every 6 hours)
    const now = new Date();
    const currentHour = now.getHours();
    const nextHour = Math.ceil((currentHour + 1) / 6) * 6;
    
    const next = new Date(now);
    if (nextHour >= 24) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    } else {
      next.setHours(nextHour, 0, 0, 0);
    }
    
    return next;
  }

  /**
   * Execute cache refresh manually (for testing or immediate execution)
   * 
   * @returns {Promise<void>}
   */
  async executeNow() {
    logger.info('🚀 Manual execution of cache refresh requested...');
    await this.refreshAllCaches();
  }

  /**
   * Refresh cache for a specific tenant manually
   * 
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<void>}
   */
  async refreshTenant(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    logger.info('🚀 Manual cache refresh requested for tenant', { tenantId });
    
    try {
      await this._refreshTenantCache(tenantId);
      logger.info('✅ Cache refreshed successfully for tenant', { tenantId });
    } catch (error) {
      logger.error('❌ Failed to refresh cache for tenant', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const cacheRefreshJob = new CacheRefreshJob();

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  cacheRefreshJob.start();
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down Cache Refresh Job...');
  cacheRefreshJob.stop();
});

process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down Cache Refresh Job...');
  cacheRefreshJob.stop();
});

export default cacheRefreshJob;
