/**
 * Log Management Service
 * Central service for managing all logging operations, storage, and retention
 */

import { 
    createCompanyDirectoryStructure,
    createPlatformDirectoryStructure,
    getCompanyStorageStats,
    getPlatformStorageStats,
    runGlobalRetentionCleanup,
    validateLogIntegrity
} from './logStorage.service.js';

import {
    createImmutableLogEntry,
    verifyImmutableChain,
    getPlatformStorageStatistics,
    verifyAllImmutableChains,
    exportPlatformLogs,
    PLATFORM_LOG_CATEGORIES
} from './platformLogStorage.service.js';

import logRetentionScheduler from './logRetentionScheduler.service.js';
import platformLogger from '../utils/platformLogger.js';
import { getLoggerForTenant } from '../utils/companyLogger.js';

class LogManagementService {
    constructor() {
        this.initialized = false;
        this.retentionSchedulerStarted = false;
    }

    /**
     * Initialize the log management system
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            platformLogger.info('Initializing log management system');

            // Create base directory structures
            await createPlatformDirectoryStructure();
            
            // Start retention scheduler if enabled
            if (process.env.LOG_RETENTION_SCHEDULER_ENABLED !== 'false') {
                logRetentionScheduler.start();
                this.retentionSchedulerStarted = true;
                platformLogger.info('Log retention scheduler started');
            }

            this.initialized = true;
            platformLogger.info('Log management system initialized successfully');

        } catch (error) {
            platformLogger.error('Failed to initialize log management system', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Setup logging for a new company
     */
    async setupCompanyLogging(tenantId, companyName, options = {}) {
        try {
            platformLogger.info('Setting up logging for new company', {
                tenantId,
                companyName,
                options
            });

            // Create directory structure
            const companyLogDir = await createCompanyDirectoryStructure(tenantId, companyName);

            // Initialize company logger
            const companyLogger = await getLoggerForTenant(tenantId, companyName);

            // Log the setup completion
            companyLogger.audit('Company logging system initialized', {
                tenantId,
                companyName,
                logDirectory: companyLogDir,
                setupOptions: options,
                action: 'company_logging_setup'
            });

            platformLogger.adminAction('company_logging_setup', 'system', {
                tenantId,
                companyName,
                logDirectory: companyLogDir
            });

            return {
                success: true,
                tenantId,
                companyName,
                logDirectory: companyLogDir,
                message: 'Company logging setup completed successfully'
            };

        } catch (error) {
            platformLogger.error('Failed to setup company logging', {
                tenantId,
                companyName,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get comprehensive storage statistics
     */
    async getStorageStatistics(includeCompanies = true) {
        try {
            const stats = {
                platform: null,
                companies: [],
                summary: {
                    totalSizeMB: 0,
                    totalFiles: 0,
                    totalCompanies: 0,
                    oldestLog: null,
                    newestLog: null
                },
                generatedAt: new Date().toISOString()
            };

            // Get platform statistics
            stats.platform = await getPlatformStorageStatistics();
            if (stats.platform) {
                stats.summary.totalSizeMB += parseFloat(stats.platform.totalSizeMB || 0);
                stats.summary.totalFiles += stats.platform.totalFiles || 0;
                
                if (!stats.summary.oldestLog || (stats.platform.oldestLog && stats.platform.oldestLog < stats.summary.oldestLog)) {
                    stats.summary.oldestLog = stats.platform.oldestLog;
                }
                if (!stats.summary.newestLog || (stats.platform.newestLog && stats.platform.newestLog > stats.summary.newestLog)) {
                    stats.summary.newestLog = stats.platform.newestLog;
                }
            }

            // Get company statistics if requested
            if (includeCompanies) {
                // This would require iterating through all companies
                // For now, we'll implement a basic version
                stats.summary.totalCompanies = 0; // Would be calculated from actual company directories
            }

            return stats;

        } catch (error) {
            platformLogger.error('Failed to get storage statistics', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Run integrity checks on all log systems
     */
    async runIntegrityCheck(options = {}) {
        const {
            includeCompanyLogs = true,
            includePlatformLogs = true,
            detailed = false
        } = options;

        try {
            platformLogger.info('Starting comprehensive log integrity check', { options });

            const results = {
                platform: null,
                companies: [],
                summary: {
                    totalChecked: 0,
                    totalValid: 0,
                    totalInvalid: 0,
                    overallIntegrityScore: 0
                },
                checkedAt: new Date().toISOString()
            };

            // Check platform log integrity
            if (includePlatformLogs) {
                results.platform = await verifyAllImmutableChains();
                
                let platformValid = 0;
                let platformTotal = 0;
                
                for (const [category, result] of Object.entries(results.platform)) {
                    if (!result.error) {
                        platformTotal += result.totalEntries || 0;
                        platformValid += result.validEntries || 0;
                    }
                }
                
                results.summary.totalChecked += platformTotal;
                results.summary.totalValid += platformValid;
                results.summary.totalInvalid += (platformTotal - platformValid);
            }

            // Check company log integrity
            if (includeCompanyLogs) {
                // This would require iterating through all company log directories
                // and validating their integrity
                // For now, we'll implement a placeholder
            }

            // Calculate overall integrity score
            if (results.summary.totalChecked > 0) {
                results.summary.overallIntegrityScore = results.summary.totalValid / results.summary.totalChecked;
            } else {
                results.summary.overallIntegrityScore = 1.0;
            }

            platformLogger.info('Log integrity check completed', {
                summary: results.summary,
                integrityScore: results.summary.overallIntegrityScore
            });

            // Alert on integrity issues
            if (results.summary.overallIntegrityScore < 0.99) {
                platformLogger.error('Log integrity issues detected', {
                    integrityScore: results.summary.overallIntegrityScore,
                    invalidEntries: results.summary.totalInvalid,
                    totalEntries: results.summary.totalChecked
                });
            }

            return results;

        } catch (error) {
            platformLogger.error('Log integrity check failed', {
                error: error.message,
                stack: error.stack,
                options
            });
            throw error;
        }
    }

    /**
     * Export logs for compliance or analysis
     */
    async exportLogs(exportRequest) {
        const {
            type, // 'company' or 'platform'
            identifier, // tenantId for company, category for platform
            startDate,
            endDate,
            format = 'json',
            includeMetadata = true
        } = exportRequest;

        try {
            platformLogger.info('Starting log export', { exportRequest });

            let exportData;

            if (type === 'platform') {
                exportData = await exportPlatformLogs(identifier, startDate, endDate, format);
            } else if (type === 'company') {
                // Company log export would be implemented here
                throw new Error('Company log export not yet implemented');
            } else {
                throw new Error(`Unknown export type: ${type}`);
            }

            // Add export metadata
            if (includeMetadata) {
                exportData.exportMetadata = {
                    requestedBy: 'system', // Would be actual user in real implementation
                    exportId: `export_${Date.now()}`,
                    exportedAt: new Date().toISOString(),
                    request: exportRequest
                };
            }

            // Log the export operation
            platformLogger.adminAction('log_export', 'system', {
                type,
                identifier,
                startDate,
                endDate,
                format,
                entriesExported: exportData.metadata?.totalEntries || 0
            });

            return exportData;

        } catch (error) {
            platformLogger.error('Log export failed', {
                exportRequest,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Run manual retention cleanup
     */
    async runRetentionCleanup(options = {}) {
        try {
            platformLogger.info('Starting manual retention cleanup', { options });

            const results = await logRetentionScheduler.runManualCleanup(options);

            platformLogger.adminAction('manual_retention_cleanup', 'system', {
                options,
                results: {
                    companiesProcessed: results.companyResults?.companiesProcessed || 0,
                    platformProcessed: results.platformResults ? 1 : 0,
                    totalCompressed: (results.companyResults?.totalStats?.compressed || 0) + 
                                   (results.platformResults?.totalCompressed || 0),
                    totalDeleted: (results.companyResults?.totalStats?.deleted || 0) + 
                                (results.platformResults?.totalDeleted || 0)
                }
            });

            return results;

        } catch (error) {
            platformLogger.error('Manual retention cleanup failed', {
                options,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get system health and status
     */
    getSystemHealth() {
        const health = {
            initialized: this.initialized,
            retentionScheduler: {
                running: this.retentionSchedulerStarted,
                status: logRetentionScheduler.getStatus()
            },
            timestamp: new Date().toISOString()
        };

        return health;
    }

    /**
     * Create immutable audit record
     */
    async createAuditRecord(category, eventData) {
        try {
            if (!PLATFORM_LOG_CATEGORIES[category]) {
                throw new Error(`Invalid audit category: ${category}`);
            }

            const auditEntry = await createImmutableLogEntry(category, {
                eventType: eventData.eventType || 'audit_event',
                data: eventData
            });

            platformLogger.info('Immutable audit record created', {
                category,
                entryIndex: auditEntry.index,
                eventType: eventData.eventType
            });

            return auditEntry;

        } catch (error) {
            platformLogger.error('Failed to create audit record', {
                category,
                eventData,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Shutdown the log management system
     */
    async shutdown() {
        try {
            platformLogger.info('Shutting down log management system');

            if (this.retentionSchedulerStarted) {
                logRetentionScheduler.stop();
                this.retentionSchedulerStarted = false;
            }

            this.initialized = false;
            platformLogger.info('Log management system shutdown completed');

        } catch (error) {
            platformLogger.error('Error during log management system shutdown', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

// Create singleton instance
const logManagementService = new LogManagementService();

export { LogManagementService };
export default logManagementService;