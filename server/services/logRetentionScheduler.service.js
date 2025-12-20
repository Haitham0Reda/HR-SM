/**
 * Log Retention Scheduler Service
 * Manages automated log retention, compression, and cleanup across all log types
 */

import cron from 'node-cron';
import { 
    runGlobalRetentionCleanup,
    getCompanyStorageStats,
    getPlatformStorageStats 
} from './logStorage.service.js';
import { 
    applyPlatformRetentionPolicies,
    getPlatformStorageStatistics,
    verifyAllImmutableChains 
} from './platformLogStorage.service.js';
import platformLogger from '../utils/platformLogger.js';

class LogRetentionScheduler {
    constructor() {
        this.isRunning = false;
        this.scheduledTasks = new Map();
        this.lastRunStats = null;
        this.retentionConfig = {
            // Run daily retention cleanup at 2 AM
            dailyCleanup: {
                schedule: '0 2 * * *',
                enabled: process.env.LOG_RETENTION_ENABLED !== 'false'
            },
            // Run weekly integrity checks on Sundays at 3 AM
            weeklyIntegrityCheck: {
                schedule: '0 3 * * 0',
                enabled: process.env.LOG_INTEGRITY_CHECK_ENABLED !== 'false'
            },
            // Run monthly storage analysis on the 1st at 4 AM
            monthlyStorageAnalysis: {
                schedule: '0 4 1 * *',
                enabled: process.env.LOG_STORAGE_ANALYSIS_ENABLED !== 'false'
            }
        };
    }

    /**
     * Start the retention scheduler
     */
    start() {
        if (this.isRunning) {
            platformLogger.warn('Log retention scheduler is already running');
            return;
        }

        try {
            // Schedule daily retention cleanup
            if (this.retentionConfig.dailyCleanup.enabled) {
                const dailyTask = cron.schedule(
                    this.retentionConfig.dailyCleanup.schedule,
                    () => this.runDailyRetentionCleanup(),
                    { scheduled: false }
                );
                this.scheduledTasks.set('dailyCleanup', dailyTask);
                dailyTask.start();
                
                platformLogger.info('Scheduled daily log retention cleanup', {
                    schedule: this.retentionConfig.dailyCleanup.schedule
                });
            }

            // Schedule weekly integrity checks
            if (this.retentionConfig.weeklyIntegrityCheck.enabled) {
                const weeklyTask = cron.schedule(
                    this.retentionConfig.weeklyIntegrityCheck.schedule,
                    () => this.runWeeklyIntegrityCheck(),
                    { scheduled: false }
                );
                this.scheduledTasks.set('weeklyIntegrityCheck', weeklyTask);
                weeklyTask.start();
                
                platformLogger.info('Scheduled weekly log integrity check', {
                    schedule: this.retentionConfig.weeklyIntegrityCheck.schedule
                });
            }

            // Schedule monthly storage analysis
            if (this.retentionConfig.monthlyStorageAnalysis.enabled) {
                const monthlyTask = cron.schedule(
                    this.retentionConfig.monthlyStorageAnalysis.schedule,
                    () => this.runMonthlyStorageAnalysis(),
                    { scheduled: false }
                );
                this.scheduledTasks.set('monthlyStorageAnalysis', monthlyTask);
                monthlyTask.start();
                
                platformLogger.info('Scheduled monthly log storage analysis', {
                    schedule: this.retentionConfig.monthlyStorageAnalysis.schedule
                });
            }

            this.isRunning = true;
            platformLogger.info('Log retention scheduler started successfully', {
                scheduledTasks: Array.from(this.scheduledTasks.keys()),
                totalTasks: this.scheduledTasks.size
            });

        } catch (error) {
            platformLogger.error('Failed to start log retention scheduler', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Stop the retention scheduler
     */
    stop() {
        if (!this.isRunning) {
            platformLogger.warn('Log retention scheduler is not running');
            return;
        }

        try {
            // Stop all scheduled tasks
            for (const [taskName, task] of this.scheduledTasks) {
                task.stop();
                platformLogger.info(`Stopped scheduled task: ${taskName}`);
            }

            this.scheduledTasks.clear();
            this.isRunning = false;

            platformLogger.info('Log retention scheduler stopped successfully');

        } catch (error) {
            platformLogger.error('Error stopping log retention scheduler', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Run daily retention cleanup
     */
    async runDailyRetentionCleanup() {
        const startTime = Date.now();
        
        platformLogger.info('Starting daily log retention cleanup');

        try {
            // Run company log retention
            const companyResults = await runGlobalRetentionCleanup();
            
            // Run platform log retention
            const platformResults = await applyPlatformRetentionPolicies();

            const totalStats = {
                companiesProcessed: companyResults.companiesProcessed,
                platformProcessed: companyResults.platformProcessed,
                totalProcessed: companyResults.totalStats.processed + platformResults.totalArchived,
                totalCompressed: companyResults.totalStats.compressed + platformResults.totalCompressed,
                totalDeleted: companyResults.totalStats.deleted + platformResults.totalDeleted,
                errors: [...companyResults.errors, ...platformResults.errors],
                executionTime: Date.now() - startTime
            };

            this.lastRunStats = {
                type: 'daily_cleanup',
                timestamp: new Date().toISOString(),
                stats: totalStats
            };

            // Log results
            if (totalStats.errors.length > 0) {
                platformLogger.warn('Daily retention cleanup completed with errors', {
                    stats: totalStats,
                    errorCount: totalStats.errors.length
                });
            } else {
                platformLogger.info('Daily retention cleanup completed successfully', {
                    stats: totalStats
                });
            }

            // Alert if cleanup took too long or had many errors
            if (totalStats.executionTime > 300000) { // 5 minutes
                platformLogger.warn('Daily retention cleanup took longer than expected', {
                    executionTime: totalStats.executionTime,
                    threshold: 300000
                });
            }

            if (totalStats.errors.length > 5) {
                platformLogger.error('Daily retention cleanup had excessive errors', {
                    errorCount: totalStats.errors.length,
                    errors: totalStats.errors.slice(0, 5) // Log first 5 errors
                });
            }

        } catch (error) {
            platformLogger.error('Daily retention cleanup failed', {
                error: error.message,
                stack: error.stack,
                executionTime: Date.now() - startTime
            });
        }
    }

    /**
     * Run weekly integrity check
     */
    async runWeeklyIntegrityCheck() {
        const startTime = Date.now();
        
        platformLogger.info('Starting weekly log integrity check');

        try {
            // Verify all immutable log chains
            const integrityResults = await verifyAllImmutableChains();
            
            let totalEntries = 0;
            let totalValid = 0;
            let totalInvalid = 0;
            const failedChains = [];

            for (const [category, result] of Object.entries(integrityResults)) {
                if (result.error) {
                    failedChains.push({
                        category,
                        error: result.error
                    });
                } else {
                    totalEntries += result.totalEntries || 0;
                    totalValid += result.validEntries || 0;
                    totalInvalid += result.invalidEntries || 0;

                    if (!result.valid) {
                        failedChains.push({
                            category,
                            integrityScore: result.integrityScore,
                            errors: result.errors
                        });
                    }
                }
            }

            const integrityStats = {
                totalChains: Object.keys(integrityResults).length,
                totalEntries,
                totalValid,
                totalInvalid,
                failedChains: failedChains.length,
                overallIntegrityScore: totalEntries > 0 ? totalValid / totalEntries : 1,
                executionTime: Date.now() - startTime
            };

            this.lastRunStats = {
                type: 'weekly_integrity_check',
                timestamp: new Date().toISOString(),
                stats: integrityStats,
                details: integrityResults
            };

            // Log results
            if (failedChains.length > 0) {
                platformLogger.error('Weekly integrity check found compromised log chains', {
                    stats: integrityStats,
                    failedChains: failedChains.slice(0, 3) // Log first 3 failures
                });
            } else {
                platformLogger.info('Weekly integrity check completed successfully', {
                    stats: integrityStats
                });
            }

            // Alert on integrity issues
            if (integrityStats.overallIntegrityScore < 0.99) {
                platformLogger.error('Log integrity score below threshold', {
                    integrityScore: integrityStats.overallIntegrityScore,
                    threshold: 0.99,
                    failedChains
                });
            }

        } catch (error) {
            platformLogger.error('Weekly integrity check failed', {
                error: error.message,
                stack: error.stack,
                executionTime: Date.now() - startTime
            });
        }
    }

    /**
     * Run monthly storage analysis
     */
    async runMonthlyStorageAnalysis() {
        const startTime = Date.now();
        
        platformLogger.info('Starting monthly log storage analysis');

        try {
            // Get platform storage statistics
            const platformStats = await getPlatformStorageStatistics();
            
            // Get overall storage statistics
            const storageAnalysis = {
                platform: platformStats,
                totalSizeMB: parseFloat(platformStats?.totalSizeMB || 0),
                totalFiles: platformStats?.totalFiles || 0,
                analysisDate: new Date().toISOString(),
                executionTime: Date.now() - startTime
            };

            // Calculate growth trends (would need historical data)
            storageAnalysis.trends = {
                // This would be calculated from historical data
                monthlyGrowthMB: 0,
                projectedSizeIn6Months: storageAnalysis.totalSizeMB * 1.5 // Rough estimate
            };

            // Generate recommendations
            storageAnalysis.recommendations = [];
            
            if (storageAnalysis.totalSizeMB > 10000) { // 10GB
                storageAnalysis.recommendations.push({
                    type: 'storage_optimization',
                    message: 'Consider implementing more aggressive compression for older logs',
                    priority: 'medium'
                });
            }

            if (storageAnalysis.totalFiles > 10000) {
                storageAnalysis.recommendations.push({
                    type: 'file_consolidation',
                    message: 'High file count detected, consider log consolidation strategies',
                    priority: 'low'
                });
            }

            this.lastRunStats = {
                type: 'monthly_storage_analysis',
                timestamp: new Date().toISOString(),
                stats: storageAnalysis
            };

            platformLogger.info('Monthly storage analysis completed', {
                stats: {
                    totalSizeMB: storageAnalysis.totalSizeMB,
                    totalFiles: storageAnalysis.totalFiles,
                    recommendations: storageAnalysis.recommendations.length,
                    executionTime: storageAnalysis.executionTime
                }
            });

            // Alert on storage issues
            if (storageAnalysis.totalSizeMB > 50000) { // 50GB
                platformLogger.warn('Log storage size exceeds recommended threshold', {
                    currentSizeMB: storageAnalysis.totalSizeMB,
                    threshold: 50000,
                    recommendations: storageAnalysis.recommendations
                });
            }

        } catch (error) {
            platformLogger.error('Monthly storage analysis failed', {
                error: error.message,
                stack: error.stack,
                executionTime: Date.now() - startTime
            });
        }
    }

    /**
     * Run manual retention cleanup
     */
    async runManualCleanup(options = {}) {
        const {
            includeCompanyLogs = true,
            includePlatformLogs = true,
            dryRun = false
        } = options;

        platformLogger.info('Starting manual log retention cleanup', {
            options,
            dryRun
        });

        if (dryRun) {
            platformLogger.info('DRY RUN: No files will be actually deleted or compressed');
        }

        const results = {
            companyResults: null,
            platformResults: null,
            dryRun
        };

        try {
            if (includeCompanyLogs) {
                if (dryRun) {
                    // For dry run, we would need to implement a preview mode
                    platformLogger.info('DRY RUN: Would process company log retention');
                } else {
                    results.companyResults = await runGlobalRetentionCleanup();
                }
            }

            if (includePlatformLogs) {
                if (dryRun) {
                    platformLogger.info('DRY RUN: Would process platform log retention');
                } else {
                    results.platformResults = await applyPlatformRetentionPolicies();
                }
            }

            platformLogger.info('Manual retention cleanup completed', {
                results: dryRun ? 'dry_run_completed' : results
            });

            return results;

        } catch (error) {
            platformLogger.error('Manual retention cleanup failed', {
                error: error.message,
                stack: error.stack,
                options
            });
            throw error;
        }
    }

    /**
     * Get scheduler status and statistics
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            scheduledTasks: Array.from(this.scheduledTasks.keys()),
            taskCount: this.scheduledTasks.size,
            lastRunStats: this.lastRunStats,
            config: this.retentionConfig
        };
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.retentionConfig };
        this.retentionConfig = { ...this.retentionConfig, ...newConfig };

        platformLogger.info('Log retention scheduler configuration updated', {
            oldConfig,
            newConfig: this.retentionConfig
        });

        // If scheduler is running, restart with new config
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
}

// Create singleton instance
const logRetentionScheduler = new LogRetentionScheduler();

export { LogRetentionScheduler };
export default logRetentionScheduler;