/**
 * Company Log Access Service
 * 
 * Implements company administrator log access restrictions ensuring they only
 * see their company's logs when module is enabled, and creates clear access
 * boundaries between company and platform levels
 * 
 * Requirements: 13.5 - Company-specific log access control
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

// Company administrator roles
const COMPANY_ADMIN_ROLES = ['company_admin', 'hr_manager'];

// Platform administrator roles (for comparison)
const PLATFORM_ADMIN_ROLES = ['super_admin', 'platform_admin'];

/**
 * Company Access Context
 * Represents company administrator access context with restricted permissions
 */
class CompanyAccessContext {
    constructor(userId, userRole, companyId, requestContext = {}) {
        this.userId = userId;
        this.userRole = userRole;
        this.companyId = companyId;
        this.isCompanyAdmin = COMPANY_ADMIN_ROLES.includes(userRole);
        this.isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(userRole);
        this.requestContext = requestContext;
        this.accessTime = new Date().toISOString();
    }

    /**
     * Check if this context is restricted to company-only access
     */
    isCompanyRestricted() {
        return this.isCompanyAdmin && !this.isPlatformAdmin;
    }

    /**
     * Check if this context can access other companies
     */
    canAccessOtherCompanies() {
        return this.isPlatformAdmin;
    }

    /**
     * Get access level description
     */
    getAccessLevel() {
        if (this.isPlatformAdmin) {
            return 'platform_admin';
        } else if (this.isCompanyAdmin) {
            return 'company_admin';
        } else {
            return 'employee';
        }
    }

    /**
     * Get accessible company IDs
     */
    getAccessibleCompanies() {
        if (this.isPlatformAdmin) {
            return 'all'; // Platform admins can access all companies
        } else {
            return [this.companyId]; // Company admins can only access their company
        }
    }
}

/**
 * Access Restriction Result
 * Represents the result of access restriction checks
 */
class AccessRestrictionResult {
    constructor(allowed, reason, restrictions = {}) {
        this.allowed = allowed;
        this.reason = reason;
        this.restrictions = restrictions;
        this.timestamp = new Date().toISOString();
    }

    static allow(reason = 'Access granted', restrictions = {}) {
        return new AccessRestrictionResult(true, reason, restrictions);
    }

    static deny(reason = 'Access denied') {
        return new AccessRestrictionResult(false, reason);
    }
}

/**
 * Company Log Access Service
 * Main service for managing company-specific log access restrictions
 */
class CompanyLogAccessService {
    constructor() {
        this.accessAuditLog = [];
        this.maxAuditEntries = 10000;
    }

    /**
     * Create company access context from request
     */
    createCompanyContext(req) {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'employee';
        const companyId = req.tenant?.id || req.companyId;
        
        if (!userId || !companyId) {
            throw new Error('Invalid company context: missing userId or companyId');
        }

        const requestContext = {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method
        };

        return new CompanyAccessContext(userId, userRole, companyId, requestContext);
    }

    /**
     * Validate company access permissions
     */
    async validateCompanyAccess(companyContext, targetCompanyId = null) {
        const requestedCompany = targetCompanyId || companyContext.companyId;

        try {
            // Platform admins can access any company
            if (companyContext.isPlatformAdmin) {
                this.auditCompanyAccess(companyContext, 'platform_access_granted', {
                    targetCompany: requestedCompany,
                    accessLevel: 'platform_admin'
                });
                return AccessRestrictionResult.allow('Platform administrator access granted');
            }

            // Company admins can only access their own company
            if (companyContext.isCompanyAdmin) {
                if (requestedCompany !== companyContext.companyId) {
                    this.auditCompanyAccess(companyContext, 'cross_company_access_denied', {
                        targetCompany: requestedCompany,
                        userCompany: companyContext.companyId
                    });
                    return AccessRestrictionResult.deny(
                        `Company administrator cannot access logs for company ${requestedCompany}`
                    );
                }

                // Check if logging module is enabled for their company
                const moduleConfig = await loggingModuleService.getConfig(companyContext.companyId);
                if (!moduleConfig.enabled) {
                    this.auditCompanyAccess(companyContext, 'module_disabled_access_denied', {
                        targetCompany: requestedCompany
                    });
                    return AccessRestrictionResult.deny(
                        'Logging module is disabled for this company'
                    );
                }

                this.auditCompanyAccess(companyContext, 'company_access_granted', {
                    targetCompany: requestedCompany,
                    moduleEnabled: true
                });
                return AccessRestrictionResult.allow('Company administrator access granted');
            }

            // Regular employees have limited access
            this.auditCompanyAccess(companyContext, 'employee_access_restricted', {
                targetCompany: requestedCompany,
                userRole: companyContext.userRole
            });
            return AccessRestrictionResult.deny('Insufficient privileges for log access');

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'access_validation_error', {
                error: error.message,
                targetCompany: requestedCompany
            });
            return AccessRestrictionResult.deny(`Access validation failed: ${error.message}`);
        }
    }

    /**
     * Get logs for company administrator (restricted to their company only)
     */
    async getCompanyLogs(companyContext, options = {}) {
        // Validate access to the company
        const accessResult = await this.validateCompanyAccess(companyContext, options.companyId);
        if (!accessResult.allowed) {
            throw new Error(accessResult.reason);
        }

        try {
            const targetCompanyId = options.companyId || companyContext.companyId;

            // Get module configuration to determine available features
            const moduleConfig = await loggingModuleService.getConfig(targetCompanyId);
            const enabledFeatures = await loggingModuleService.getEnabledFeatures(targetCompanyId);

            // Company admins respect module settings (no bypass)
            const searchOptions = {
                ...options,
                companyId: targetCompanyId,
                bypassModuleSettings: false, // Company admins cannot bypass module settings
                platformAccess: false,
                includeEssentialLogs: true,
                includeDetailedLogs: moduleConfig.enabled
            };

            // Use the log search service to get logs
            const logs = await logSearchService.searchLogs(searchOptions);

            this.auditCompanyAccess(companyContext, 'company_logs_retrieved', {
                targetCompany: targetCompanyId,
                logCount: logs.length,
                moduleEnabled: moduleConfig.enabled,
                enabledFeatures: enabledFeatures.length
            });

            return {
                companyId: targetCompanyId,
                logs,
                moduleEnabled: moduleConfig.enabled,
                enabledFeatures,
                accessType: 'company_restricted',
                totalCount: logs.length,
                restrictions: {
                    canBypassModuleSettings: false,
                    canAccessOtherCompanies: false,
                    moduleSettingsApplied: true
                }
            };

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'company_logs_retrieval_error', {
                error: error.message,
                targetCompany: options.companyId || companyContext.companyId
            });
            throw error;
        }
    }

    /**
     * Search logs within company restrictions
     */
    async searchCompanyLogs(companyContext, searchQuery, options = {}) {
        // Validate access
        const accessResult = await this.validateCompanyAccess(companyContext, options.companyId);
        if (!accessResult.allowed) {
            throw new Error(accessResult.reason);
        }

        try {
            const targetCompanyId = options.companyId || companyContext.companyId;

            // Company admins can only search within their company
            const searchOptions = {
                ...options,
                companyId: targetCompanyId,
                query: searchQuery,
                bypassModuleSettings: false,
                platformAccess: false
            };

            const results = await logSearchService.searchLogs(searchOptions);

            this.auditCompanyAccess(companyContext, 'company_logs_searched', {
                query: searchQuery,
                targetCompany: targetCompanyId,
                resultCount: results.length
            });

            return {
                query: searchQuery,
                companyId: targetCompanyId,
                results,
                searchTime: new Date().toISOString(),
                accessType: 'company_restricted'
            };

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'company_search_error', {
                query: searchQuery,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get available log types for company administrator
     */
    async getAvailableLogTypes(companyContext) {
        const accessResult = await this.validateCompanyAccess(companyContext);
        if (!accessResult.allowed) {
            throw new Error(accessResult.reason);
        }

        try {
            const moduleConfig = await loggingModuleService.getConfig(companyContext.companyId);
            const enabledFeatures = await loggingModuleService.getEnabledFeatures(companyContext.companyId);

            // Map features to log types
            const availableLogTypes = [];
            
            if (enabledFeatures.includes('auditLogging')) {
                availableLogTypes.push('audit');
            }
            if (enabledFeatures.includes('securityLogging')) {
                availableLogTypes.push('security');
            }
            if (enabledFeatures.includes('performanceLogging')) {
                availableLogTypes.push('performance');
            }
            if (enabledFeatures.includes('detailedErrorLogging')) {
                availableLogTypes.push('error');
            }
            if (enabledFeatures.includes('frontendLogging')) {
                availableLogTypes.push('frontend');
            }
            if (enabledFeatures.includes('userActionLogging')) {
                availableLogTypes.push('user_action');
            }

            // Always include essential log types
            const essentialTypes = ['authentication', 'authorization'];
            for (const essentialType of essentialTypes) {
                if (!availableLogTypes.includes(essentialType)) {
                    availableLogTypes.push(essentialType);
                }
            }

            this.auditCompanyAccess(companyContext, 'available_log_types_retrieved', {
                availableTypes: availableLogTypes,
                moduleEnabled: moduleConfig.enabled
            });

            return {
                companyId: companyContext.companyId,
                moduleEnabled: moduleConfig.enabled,
                availableLogTypes,
                enabledFeatures,
                accessType: 'company_restricted'
            };

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'available_log_types_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Export logs for company administrator (restricted to their company)
     */
    async exportCompanyLogs(companyContext, exportOptions = {}) {
        const accessResult = await this.validateCompanyAccess(companyContext);
        if (!accessResult.allowed) {
            throw new Error(accessResult.reason);
        }

        try {
            const companyLogsResult = await this.getCompanyLogs(companyContext, exportOptions);
            
            const exportData = {
                exportTime: new Date().toISOString(),
                exportedBy: companyContext.userId,
                companyId: companyContext.companyId,
                moduleEnabled: companyLogsResult.moduleEnabled,
                enabledFeatures: companyLogsResult.enabledFeatures,
                logCount: companyLogsResult.totalCount,
                logs: companyLogsResult.logs,
                accessType: 'company_restricted',
                restrictions: companyLogsResult.restrictions
            };

            this.auditCompanyAccess(companyContext, 'company_logs_exported', {
                logCount: companyLogsResult.totalCount,
                exportFormat: exportOptions.format || 'json'
            });

            return exportData;

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'company_export_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if user can access specific company
     */
    async canAccessCompany(companyContext, targetCompanyId) {
        const accessResult = await this.validateCompanyAccess(companyContext, targetCompanyId);
        return {
            canAccess: accessResult.allowed,
            reason: accessResult.reason,
            accessLevel: companyContext.getAccessLevel(),
            restrictions: accessResult.restrictions
        };
    }

    /**
     * Get company access summary for user
     */
    async getAccessSummary(companyContext) {
        try {
            const accessibleCompanies = companyContext.getAccessibleCompanies();
            const moduleConfig = await loggingModuleService.getConfig(companyContext.companyId);
            const enabledFeatures = await loggingModuleService.getEnabledFeatures(companyContext.companyId);

            const summary = {
                userId: companyContext.userId,
                userRole: companyContext.userRole,
                accessLevel: companyContext.getAccessLevel(),
                companyId: companyContext.companyId,
                accessibleCompanies,
                moduleEnabled: moduleConfig.enabled,
                enabledFeatures,
                canBypassModuleSettings: companyContext.isPlatformAdmin,
                canAccessOtherCompanies: companyContext.canAccessOtherCompanies(),
                accessTime: companyContext.accessTime
            };

            this.auditCompanyAccess(companyContext, 'access_summary_retrieved', {
                accessLevel: summary.accessLevel,
                moduleEnabled: summary.moduleEnabled
            });

            return summary;

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'access_summary_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Validate cross-company access attempt
     */
    validateCrossCompanyAccess(companyContext, targetCompanyId) {
        if (companyContext.isPlatformAdmin) {
            return AccessRestrictionResult.allow('Platform administrator can access all companies');
        }

        if (targetCompanyId !== companyContext.companyId) {
            return AccessRestrictionResult.deny(
                `Company administrator cannot access company ${targetCompanyId}`
            );
        }

        return AccessRestrictionResult.allow('Same company access allowed');
    }

    /**
     * Get module configuration for company (if user has access)
     */
    async getModuleConfiguration(companyContext) {
        const accessResult = await this.validateCompanyAccess(companyContext);
        if (!accessResult.allowed) {
            throw new Error(accessResult.reason);
        }

        try {
            const moduleConfig = await loggingModuleService.getConfig(companyContext.companyId);
            
            // Remove sensitive information for company admins
            const sanitizedConfig = {
                companyId: companyContext.companyId,
                enabled: moduleConfig.enabled,
                features: moduleConfig.features,
                retentionPolicies: moduleConfig.retentionPolicies,
                alerting: moduleConfig.alerting,
                lastModified: moduleConfig.lastModified,
                // Don't expose modifiedBy to company admins unless they're platform admins
                ...(companyContext.isPlatformAdmin && { modifiedBy: moduleConfig.modifiedBy })
            };

            this.auditCompanyAccess(companyContext, 'module_config_retrieved', {
                moduleEnabled: moduleConfig.enabled
            });

            return sanitizedConfig;

        } catch (error) {
            this.auditCompanyAccess(companyContext, 'module_config_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Audit company access attempts
     */
    auditCompanyAccess(companyContext, eventType, details = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: companyContext.userId,
            userRole: companyContext.userRole,
            companyId: companyContext.companyId,
            accessLevel: companyContext.getAccessLevel(),
            eventType,
            details,
            requestContext: companyContext.requestContext
        };

        this.accessAuditLog.push(auditEntry);

        // Also log to platform logger for permanent record
        platformLogger.adminAction(`company_log_access_${eventType}`, companyContext.userId, {
            ...details,
            companyId: companyContext.companyId,
            accessLevel: companyContext.getAccessLevel(),
            requestContext: companyContext.requestContext
        });

        // Trim audit log if it gets too large
        if (this.accessAuditLog.length > this.maxAuditEntries) {
            this.accessAuditLog = this.accessAuditLog.slice(-this.maxAuditEntries);
        }
    }

    /**
     * Get company access audit log (for platform admins only)
     */
    getCompanyAccessAuditLog(companyContext, filters = {}) {
        if (!companyContext.isPlatformAdmin) {
            throw new Error('Insufficient privileges to access audit log');
        }

        let filteredLog = [...this.accessAuditLog];

        // Apply filters
        if (filters.userId) {
            filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
        }
        if (filters.companyId) {
            filteredLog = filteredLog.filter(entry => entry.companyId === filters.companyId);
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
const companyLogAccessService = new CompanyLogAccessService();

export {
    CompanyAccessContext,
    AccessRestrictionResult,
    CompanyLogAccessService,
    COMPANY_ADMIN_ROLES,
    PLATFORM_ADMIN_ROLES
};

export default companyLogAccessService;