/**
 * Platform Log Access Service
 * 
 * Implements universal log access for platform administrators that bypasses
 * module settings and provides comprehensive log aggregation across all companies
 * 
 * Requirements: 12.3 - Platform administrator universal access
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import loggingModuleService from './loggingModule.service.js';
import logAccessControl, { ROLE_PERMISSIONS } from './logAccessControl.service.js';
import logSearchService from './logSearch.service.js';
import platformLogger from '../utils/platformLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform administrator roles that have universal access
const PLATFORM_ADMIN_ROLES = ['super_admin', 'platform_admin'];

// Essential log types that are always accessible regardless of module settings
const ESSENTIAL_LOG_TYPES = [
    'authentication_attempt',
    'authorization_failure', 
    'security_breach',
    'data_access_violation',
    'system_error',
    'compliance_event',
    'platform_security_event',
    'audit',
    'security'
];

/**
 * Platform Log Access Context
 * Represents platform administrator access context with universal permissions
 */
class PlatformLogAccessContext {
    constructor(userId, userRole, requestContext = {}) {
        this.userId = userId;
        this.userRole = userRole;
        this.isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(userRole);
        this.requestContext = requestContext;
        this.accessTime = new Date().toISOString();
        this.universalAccess = this.isPlatformAdmin;
    }

    /**
     * Check if this context has universal access to all company logs
     */
    hasUniversalAccess() {
        return this.universalAccess;
    }

    /**
     * Check if this context can bypass module settings
     */
    canBypassModuleSettings() {
        return this.isPlatformAdmin;
    }

    /**
     * Get access level description
     */
    getAccessLevel() {
        if (this.userRole === 'super_admin') {
            return 'universal_super_admin';
        } else if (this.userRole === 'platform_admin') {
            return 'universal_platform_admin';
        } else {
            return 'company_restricted';
        }
    }
}

/**
 * Log Aggregation Result
 * Represents aggregated log data from multiple companies
 */
class LogAggregationResult {
    constructor() {
        this.companies = new Map();
        this.totalEntries = 0;
        this.timeRange = null;
        this.aggregationTime = new Date().toISOString();
        this.moduleStatusSummary = new Map();
    }

    /**
     * Add logs from a company
     */
    addCompanyLogs(companyId, logs, moduleEnabled, availableFeatures) {
        this.companies.set(companyId, {
            logs,
            count: logs.length,
            moduleEnabled,
            availableFeatures,
            lastEntry: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        });
        
        this.totalEntries += logs.length;
        this.moduleStatusSummary.set(companyId, {
            enabled: moduleEnabled,
            features: availableFeatures
        });
    }

    /**
     * Get aggregated logs sorted by timestamp
     */
    getAggregatedLogs() {
        const allLogs = [];
        
        for (const [companyId, companyData] of this.companies) {
            for (const log of companyData.logs) {
                allLogs.push({
                    ...log,
                    sourceCompany: companyId,
                    moduleEnabled: companyData.moduleEnabled,
                    logSource: companyData.moduleEnabled ? 'detailed' : 'essential'
                });
            }
        }
        
        // Sort by timestamp descending (newest first)
        return allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        const enabledCompanies = Array.from(this.moduleStatusSummary.values())
            .filter(status => status.enabled).length;
        
        const disabledCompanies = this.moduleStatusSummary.size - enabledCompanies;
        
        return {
            totalCompanies: this.moduleStatusSummary.size,
            enabledCompanies,
            disabledCompanies,
            totalLogEntries: this.totalEntries,
            aggregationTime: this.aggregationTime,
            timeRange: this.timeRange
        };
    }
}

/**
 * Platform Log Access Service
 * Main service for platform administrator universal log access
 */
class PlatformLogAccessService {
    constructor() {
        this.accessAuditLog = [];
        this.maxAuditEntries = 10000;
    }

    /**
     * Create platform access context from request
     */
    createPlatformContext(req) {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'employee';
        
        if (!userId) {
            throw new Error('Invalid platform context: missing userId');
        }

        const requestContext = {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method
        };

        return new PlatformLogAccessContext(userId, userRole, requestContext);
    }

    /**
     * Check if user has platform administrator privileges
     */
    validatePlatformAccess(platformContext) {
        if (!platformContext.isPlatformAdmin) {
            this.auditPlatformAccess(platformContext, 'platform_access_denied', {
                reason: 'insufficient_privileges',
                requiredRole: 'platform_admin'
            });
            throw new Error('Insufficient privileges for platform log access');
        }

        this.auditPlatformAccess(platformContext, 'platform_access_granted', {
            accessLevel: platformContext.getAccessLevel()
        });

        return true;
    }

    /**
     * Get all companies in the system
     */
    async getAllCompanies() {
        try {
            // Get companies from module service (which tracks all configured companies)
            const configuredCompanies = loggingModuleService.getConfiguredCompanies();
            
            // Also scan the logs directory for any additional companies
            const logsDir = path.join(__dirname, '../../logs');
            const companiesDir = path.join(logsDir, 'companies');
            
            let directoryCompanies = [];
            try {
                const entries = await fs.readdir(companiesDir, { withFileTypes: true });
                directoryCompanies = entries
                    .filter(entry => entry.isDirectory())
                    .map(entry => entry.name);
            } catch (error) {
                // Directory might not exist, that's okay
                console.warn('Companies directory not found:', error.message);
            }
            
            // Combine and deduplicate
            const allCompanies = [...new Set([...configuredCompanies, ...directoryCompanies])];
            
            return allCompanies;
        } catch (error) {
            console.error('Error getting all companies:', error);
            return [];
        }
    }

    /**
     * Get logs for a specific company regardless of module settings
     */
    async getCompanyLogsUniversal(platformContext, companyId, options = {}) {
        this.validatePlatformAccess(platformContext);

        try {
            // Get module configuration for the company
            const moduleConfig = await loggingModuleService.getConfig(companyId);
            const moduleEnabled = moduleConfig.enabled;
            const enabledFeatures = await loggingModuleService.getEnabledFeatures(companyId);

            // Platform admins can access all logs regardless of module settings
            const searchOptions = {
                ...options,
                companyId,
                bypassModuleSettings: true, // This is the key difference
                includeEssentialLogs: true,
                includeDetailedLogs: true,
                platformAccess: true
            };

            // Use the log search service to get logs
            const logs = await logSearchService.searchLogs(searchOptions);

            this.auditPlatformAccess(platformContext, 'company_logs_accessed', {
                companyId,
                moduleEnabled,
                logCount: logs.length,
                timeRange: options.timeRange,
                bypassedModuleSettings: !moduleEnabled
            });

            return {
                companyId,
                logs,
                moduleEnabled,
                enabledFeatures,
                accessType: 'platform_universal',
                totalCount: logs.length
            };

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'company_logs_access_error', {
                companyId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Aggregate logs from all companies
     */
    async aggregateAllCompanyLogs(platformContext, options = {}) {
        this.validatePlatformAccess(platformContext);

        const aggregationResult = new LogAggregationResult();
        const companies = await this.getAllCompanies();

        platformLogger.adminAction('aggregate_all_logs_started', platformContext.userId, {
            totalCompanies: companies.length,
            requestedBy: platformContext.userId,
            options
        });

        try {
            // Process each company
            for (const companyId of companies) {
                try {
                    const companyResult = await this.getCompanyLogsUniversal(
                        platformContext, 
                        companyId, 
                        options
                    );
                    
                    aggregationResult.addCompanyLogs(
                        companyId,
                        companyResult.logs,
                        companyResult.moduleEnabled,
                        companyResult.enabledFeatures
                    );
                } catch (error) {
                    console.error(`Error aggregating logs for company ${companyId}:`, error);
                    // Continue with other companies even if one fails
                    aggregationResult.addCompanyLogs(companyId, [], false, []);
                }
            }

            // Set time range if provided
            if (options.startTime || options.endTime) {
                aggregationResult.timeRange = {
                    startTime: options.startTime,
                    endTime: options.endTime
                };
            }

            this.auditPlatformAccess(platformContext, 'logs_aggregated', {
                totalCompanies: companies.length,
                totalLogEntries: aggregationResult.totalEntries,
                summary: aggregationResult.getSummary()
            });

            platformLogger.adminAction('aggregate_all_logs_completed', platformContext.userId, {
                totalCompanies: companies.length,
                totalLogEntries: aggregationResult.totalEntries,
                processingTime: Date.now() - new Date(aggregationResult.aggregationTime).getTime()
            });

            return aggregationResult;

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'logs_aggregation_error', {
                error: error.message,
                companiesProcessed: aggregationResult.companies.size
            });
            throw error;
        }
    }

    /**
     * Search across all companies with platform privileges
     */
    async searchAllCompanies(platformContext, searchQuery, options = {}) {
        this.validatePlatformAccess(platformContext);

        try {
            const companies = await this.getAllCompanies();
            const searchResults = new Map();

            for (const companyId of companies) {
                try {
                    const searchOptions = {
                        ...options,
                        companyId,
                        query: searchQuery,
                        bypassModuleSettings: true,
                        platformAccess: true
                    };

                    const results = await logSearchService.searchLogs(searchOptions);
                    
                    if (results.length > 0) {
                        searchResults.set(companyId, {
                            results,
                            count: results.length,
                            moduleEnabled: (await loggingModuleService.getConfig(companyId)).enabled
                        });
                    }
                } catch (error) {
                    console.error(`Error searching logs for company ${companyId}:`, error);
                }
            }

            this.auditPlatformAccess(platformContext, 'cross_company_search', {
                query: searchQuery,
                companiesSearched: companies.length,
                companiesWithResults: searchResults.size,
                totalResults: Array.from(searchResults.values())
                    .reduce((sum, result) => sum + result.count, 0)
            });

            return {
                query: searchQuery,
                companiesSearched: companies.length,
                results: searchResults,
                searchTime: new Date().toISOString()
            };

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'cross_company_search_error', {
                query: searchQuery,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get essential logs for a company (logs that are captured regardless of module settings)
     */
    async getEssentialLogs(platformContext, companyId, options = {}) {
        this.validatePlatformAccess(platformContext);

        try {
            const searchOptions = {
                ...options,
                companyId,
                logTypes: ESSENTIAL_LOG_TYPES,
                essentialOnly: true,
                platformAccess: true
            };

            const logs = await logSearchService.searchLogs(searchOptions);

            this.auditPlatformAccess(platformContext, 'essential_logs_accessed', {
                companyId,
                logCount: logs.length,
                logTypes: ESSENTIAL_LOG_TYPES
            });

            return {
                companyId,
                logs,
                logTypes: ESSENTIAL_LOG_TYPES,
                accessType: 'essential_only',
                totalCount: logs.length
            };

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'essential_logs_access_error', {
                companyId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get module status summary for all companies
     */
    async getModuleStatusSummary(platformContext) {
        this.validatePlatformAccess(platformContext);

        try {
            const companies = await this.getAllCompanies();
            const summary = new Map();

            for (const companyId of companies) {
                try {
                    const config = await loggingModuleService.getConfig(companyId);
                    const enabledFeatures = await loggingModuleService.getEnabledFeatures(companyId);
                    
                    summary.set(companyId, {
                        moduleEnabled: config.enabled,
                        enabledFeatures,
                        lastModified: config.lastModified,
                        modifiedBy: config.modifiedBy,
                        retentionPolicies: config.retentionPolicies
                    });
                } catch (error) {
                    summary.set(companyId, {
                        moduleEnabled: false,
                        enabledFeatures: [],
                        error: error.message
                    });
                }
            }

            this.auditPlatformAccess(platformContext, 'module_status_summary_accessed', {
                totalCompanies: companies.length,
                enabledCompanies: Array.from(summary.values())
                    .filter(status => status.moduleEnabled).length
            });

            return {
                totalCompanies: companies.length,
                companies: summary,
                summaryTime: new Date().toISOString()
            };

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'module_status_summary_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Export logs from all companies (platform admin only)
     */
    async exportAllCompanyLogs(platformContext, exportOptions = {}) {
        this.validatePlatformAccess(platformContext);

        if (platformContext.userRole !== 'super_admin') {
            throw new Error('Export all company logs requires super admin privileges');
        }

        try {
            const aggregationResult = await this.aggregateAllCompanyLogs(platformContext, exportOptions);
            const exportData = {
                exportTime: new Date().toISOString(),
                exportedBy: platformContext.userId,
                summary: aggregationResult.getSummary(),
                companies: {}
            };

            // Organize data by company
            for (const [companyId, companyData] of aggregationResult.companies) {
                exportData.companies[companyId] = {
                    moduleEnabled: companyData.moduleEnabled,
                    availableFeatures: companyData.availableFeatures,
                    logCount: companyData.count,
                    logs: companyData.logs
                };
            }

            this.auditPlatformAccess(platformContext, 'all_logs_exported', {
                totalCompanies: Object.keys(exportData.companies).length,
                totalLogEntries: aggregationResult.totalEntries,
                exportFormat: exportOptions.format || 'json'
            });

            platformLogger.adminAction('platform_logs_exported', platformContext.userId, {
                exportType: 'all_companies',
                totalEntries: aggregationResult.totalEntries,
                companies: Object.keys(exportData.companies)
            });

            return exportData;

        } catch (error) {
            this.auditPlatformAccess(platformContext, 'all_logs_export_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Audit platform access attempts
     */
    auditPlatformAccess(platformContext, eventType, details = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: platformContext.userId,
            userRole: platformContext.userRole,
            accessLevel: platformContext.getAccessLevel(),
            eventType,
            details,
            requestContext: platformContext.requestContext
        };

        this.accessAuditLog.push(auditEntry);

        // Also log to platform logger for permanent record
        platformLogger.adminAction(`platform_log_access_${eventType}`, platformContext.userId, {
            ...details,
            accessLevel: platformContext.getAccessLevel(),
            requestContext: platformContext.requestContext
        });

        // Trim audit log if it gets too large
        if (this.accessAuditLog.length > this.maxAuditEntries) {
            this.accessAuditLog = this.accessAuditLog.slice(-this.maxAuditEntries);
        }
    }

    /**
     * Get platform access audit log
     */
    getPlatformAccessAuditLog(platformContext, filters = {}) {
        this.validatePlatformAccess(platformContext);

        let filteredLog = [...this.accessAuditLog];

        // Apply filters
        if (filters.userId) {
            filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
        }
        if (filters.eventType) {
            filteredLog = filteredLog.filter(entry => entry.eventType === filters.eventType);
        }
        if (filters.startTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endTime);
        }

        return {
            totalEntries: filteredLog.length,
            entries: filteredLog,
            filters
        };
    }
}

// Create singleton instance
const platformLogAccessService = new PlatformLogAccessService();

export {
    PlatformLogAccessContext,
    LogAggregationResult,
    PlatformLogAccessService,
    PLATFORM_ADMIN_ROLES,
    ESSENTIAL_LOG_TYPES
};

export default platformLogAccessService;