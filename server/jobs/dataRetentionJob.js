import cron from 'node-cron';
import dataRetentionService from '../services/dataRetentionService.js';
import { companyLogger } from '../utils/companyLogger.js';

class DataRetentionJob {
  constructor() {
    this.isRunning = false;
    this.lastExecution = null;
    this.executionCount = 0;
    this.errorCount = 0;
  }

  /**
   * Start the data retention job scheduler
   */
  start() {
    console.log('🗂️  Starting Data Retention Job Scheduler...');

    // Run every hour to check for due policies
    this.job = cron.schedule('0 * * * *', async () => {
      await this.executeRetentionPolicies();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Also run archive cleanup daily at 3 AM
    this.cleanupJob = cron.schedule('0 3 * * *', async () => {
      await this.cleanupExpiredArchives();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    console.log('✅ Data Retention Job Scheduler started');
    console.log('   - Retention policies check: Every hour');
    console.log('   - Archive cleanup: Daily at 3:00 AM');
  }

  /**
   * Stop the job scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('🛑 Data Retention Job Scheduler stopped');
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      console.log('🛑 Archive Cleanup Job stopped');
    }
  }

  /**
   * Execute retention policies that are due
   */
  async executeRetentionPolicies() {
    if (this.isRunning) {
      console.log('⏳ Data retention job already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastExecution = new Date();
    this.executionCount++;

    try {
      console.log('🔄 Starting scheduled data retention policy execution...');

      // Execute retention policies for all tenants
      const results = await dataRetentionService.executeRetentionPolicies();

      if (results.length > 0) {
        console.log(`✅ Executed ${results.length} retention policies`);
        
        // Log summary
        const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
        const totalArchived = results.reduce((sum, r) => sum + r.archived, 0);
        const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
        const successfulExecutions = results.filter(r => r.success).length;
        const failedExecutions = results.filter(r => !r.success).length;

        console.log(`   📊 Summary:`);
        console.log(`      - Records processed: ${totalProcessed}`);
        console.log(`      - Records archived: ${totalArchived}`);
        console.log(`      - Records deleted: ${totalDeleted}`);
        console.log(`      - Successful executions: ${successfulExecutions}`);
        console.log(`      - Failed executions: ${failedExecutions}`);

        // Log to platform logger for monitoring
        console.log('Data retention policies executed', {
          executionCount: results.length,
          totalProcessed,
          totalArchived,
          totalDeleted,
          successfulExecutions,
          failedExecutions,
          executedAt: this.lastExecution
        });

        // Log failures for investigation
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.error('❌ Some retention policy executions failed:');
          failures.forEach(failure => {
            console.error(`   - Policy ${failure.policyId}: ${failure.error}`);
          });
          this.errorCount += failures.length;
        }

      } else {
        console.log('ℹ️  No retention policies due for execution');
      }

    } catch (error) {
      console.error('❌ Failed to execute retention policies:', error);
      this.errorCount++;
      
      // Log error to platform logger
      console.error('Data retention job failed', {
        error: error.message,
        stack: error.stack,
        executedAt: this.lastExecution
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up expired archives
   */
  async cleanupExpiredArchives() {
    try {
      console.log('🧹 Starting expired archive cleanup...');

      const results = await dataRetentionService.deleteExpiredArchives();

      if (results.length > 0) {
        console.log(`✅ Cleaned up ${results.length} expired archives`);
        
        // Group by tenant for logging
        const byTenant = results.reduce((acc, result) => {
          if (!acc[result.tenantId]) {
            acc[result.tenantId] = [];
          }
          acc[result.tenantId].push(result.archiveId);
          return acc;
        }, {});

        // Log to each tenant's logger
        Object.entries(byTenant).forEach(([tenantId, archiveIds]) => {
          companyLogger(tenantId).compliance('Expired archives cleaned up', {
            archiveIds,
            count: archiveIds.length,
            cleanupDate: new Date(),
            compliance: true,
            audit: true
          });
        });

        console.log('Expired archives cleaned up', {
          totalArchives: results.length,
          tenantCount: Object.keys(byTenant).length,
          cleanupDate: new Date()
        });

      } else {
        console.log('ℹ️  No expired archives to clean up');
      }

    } catch (error) {
      console.error('❌ Failed to clean up expired archives:', error);
      this.errorCount++;
      
      console.error('Archive cleanup job failed', {
        error: error.message,
        stack: error.stack,
        cleanupDate: new Date()
      });
    }
  }

  /**
   * Get job status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      errorCount: this.errorCount,
      successRate: this.executionCount > 0 ? 
        ((this.executionCount - this.errorCount) / this.executionCount * 100).toFixed(2) : 0,
      nextExecution: this.job ? this.job.nextDate() : null,
      nextCleanup: this.cleanupJob ? this.cleanupJob.nextDate() : null
    };
  }

  /**
   * Execute retention policies manually (for testing or immediate execution)
   */
  async executeNow() {
    console.log('🚀 Manual execution of retention policies requested...');
    await this.executeRetentionPolicies();
  }

  /**
   * Execute archive cleanup manually
   */
  async cleanupNow() {
    console.log('🚀 Manual execution of archive cleanup requested...');
    await this.cleanupExpiredArchives();
  }
}

// Create singleton instance
const dataRetentionJob = new DataRetentionJob();

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  dataRetentionJob.start();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Data Retention Job...');
  dataRetentionJob.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Data Retention Job...');
  dataRetentionJob.stop();
  process.exit(0);
});

export default dataRetentionJob;