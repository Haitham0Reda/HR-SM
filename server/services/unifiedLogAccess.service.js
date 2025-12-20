/**
 * Unified Log Access Service
 * 
 * Provides a unified interface for both platform and company log access,
 * automatically routing requests to the appropriate access control service
 * based on user role and access requirements
 * 
 * Requirements: 12.3, 13.5 - Platform administrator universal access and company-specific access control
 */

import platformLogAccessService, { 
    PlatformLogAccessContext, 
    PLATFORM_ADMIN_ROLES 
} from './platformLogAccess.service.js';
import companyLogAccessService, { 
    CompanyAccessContext, 
    COMPANY_ADMIN_ROLES 
} from './companyLogAccess.service.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Unified Access Context
 * Determines the appropriate access context based on user role and request
 */
class UnifiedAccessContext {
    constructor(req) {
        this.userId = req.user?.id;
        this.userRole = req.user?.role || 'employee';
        this.companyId = req.tenant?.id || req.companyId;
        this.requestContext = {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method
        };
        
        this.isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(this.userRole);
        this.isCompanyAdmin = COMPANY_ADMIN_ROLES.includes(this.userRole);
        
        // Create appropriate access context
        if (this.isPlatformAdmin) {
            this.platformContext = new PlatformLogAccessContext(
                this.userId, 
                this.userRole, 
                this.requestContext
            );
        }
        
        if (this.companyId) {
            this.companyContext = new CompanyAccessContext(
                this.userId, 
                this.userRole, 
                this.companyId, 
                this.requestContext
            );
        }
    }

    /**
     * Get the primary access type for this user
     */
    getPrimaryAccessType() {
        if (this.isPlatformAdmin) {
            return 'platform';
        } else if (this.isCompanyAdmin) {
            return 'company';
        } else {
            return 'employee';
        }
    }

    /**
     * Check if user can access platform-level features
     */
    canAccessPlatformFeatures() {
        return this.isPlatformAdmin;
    }

    /**
     * Check if user is restricted to company-only access
     */
    isCompanyRestricted() {
        return !this.isPlatformAdmin && this.isCompanyAdmin;
    }
}

/**
 * Unified Log Access Service
 * Main service that routes requests to appropriate access control services
 */
class UnifiedLogAccessService {
    constructor() {
        this.accessStats = {
            platformRequests: 0,
            companyRequests: 0,
            deniedRequests: 0,
            totalRequests: 0
        };
    }

    /**
     * Create unified access context from request
     */
    createAccessContext(req) {
        this.accessStats.totalRequests++;
        return new UnifiedAccessContext(req);
    }

    /**
     * Get logs with automatic access control routing
     */
    async getLogs(req, options = {}) {
        const accessContext = this.createAccessContext(req);
        
        try {
            // Route to appropriate service based on access level
            if (accessContext.canAccessPlatformFeatures() && options.platformAccess) {
                this.accessStats.platformRequests++;
                
                // Use platform access service for universal access
                if (options.aggregateAll) {
                    return await platformLogAccessService.aggregateAllCompanyLogs(
                        accessContext.platformContext, 
                        options
                    );
                } else if (options.companyId) {
                    return await platformLogAccessService.getCompanyLogsUniversal(
                        accessContext.platformContext, 
                        options.companyId, 
                        options
                    );
                } else {
                    throw new Error('Platform access requires either aggregateAll or specific companyId');
                }
            } else {
                this.accessStats.companyRequests++;
                
                // Use company access service for restricted access
                return await companyLogAccessService.getCompanyLogs(
                    accessContext.companyContext, 
                    options
                );
            }
        } catch (error) {
            this.accessStats.deniedRequests++;
            
            platformLogger.warn('Unified log access denied', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                companyId: accessContext.companyId,
                error: error.message,
                options
            });
            
            throw error;
        }
    }

    /**
     * Search logs with automatic access control routing
     */
    async searchLogs(req, searchQuery, options = {}) {
        const accessContext = this.createAccessContext(req);
        
        try {
            if (accessContext.canAccessPlatformFeatures() && options.crossCompany) {
                this.accessStats.platformRequests++;
                
                // Use platform access service for cross-company search
                return await platformLogAccessService.searchAllCompanies(
                    accessContext.platformContext, 
                    searchQuery, 
                    options
                );
            } else {
                this.accessStats.companyRequests++;
                
                // Use company access service for single-company search
                return await companyLogAccessService.searchCompanyLogs(
                    accessContext.companyContext, 
                    searchQuery, 
                    options
                );
            }
        } catch (error) {
            this.accessStats.deniedRequests++;
            
            platformLogger.warn('Unified log search denied', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                companyId: accessContext.companyId,
                query: searchQuery,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Get available log types based on user access level
     */
    async getAvailableLogTypes(req) {
        const accessContext = this.createAccessContext(req);
        
        try {
            if (accessContext.canAccessPlatformFeatures()) {
                // Platform admins can see all log types across all companies
                const moduleStatusSummary = await platformLogAccessService.getModuleStatusSummary(
                    accessContext.platformContext
                );
                
                return {
                    accessType: 'platform',
                    allLogTypes: ['audit', 'security', 'performance', 'error', 'frontend', 'user_action', 'platform'],
                    moduleStatusSummary: moduleStatusSummary.companies,
                    totalCompanies: moduleStatusSummary.totalCompanies
                };
            } else {
                // Company admins see only their company's available log types
                return await companyLogAccessService.getAvailableLogTypes(
                    accessContext.companyContext
                );
            }
        } catch (error) {
            platformLogger.warn('Failed to get available log types', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Export logs with appropriate access controls
     */
    async exportLogs(req, exportOptions = {}) {
        const accessContext = this.createAccessContext(req);
        
        try {
            if (accessContext.canAccessPlatformFeatures() && exportOptions.allCompanies) {
                // Platform admin export all companies
                return await platformLogAccessService.exportAllCompanyLogs(
                    accessContext.platformContext, 
                    exportOptions
                );
            } else {
                // Company admin export their company only
                return await companyLogAccessService.exportCompanyLogs(
                    accessContext.companyContext, 
                    exportOptions
                );
            }
        } catch (error) {
            platformLogger.warn('Log export denied', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get access summary for current user
     */
    async getAccessSummary(req) {
        const accessContext = this.createAccessContext(req);
        
        try {
            const summary = {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                companyId: accessContext.companyId,
                primaryAccessType: accessContext.getPrimaryAccessType(),
                canAccessPlatformFeatures: accessContext.canAccessPlatformFeatures(),
                isCompanyRestricted: accessContext.isCompanyRestricted(),
                accessTime: new Date().toISOString()
            };

            if (accessContext.canAccessPlatformFeatures()) {
                // Add platform-specific access information
                const moduleStatusSummary = await platformLogAccessService.getModuleStatusSummary(
                    accessContext.platformContext
                );
                
                summary.platformAccess = {
                    canBypassModuleSettings: true,
                    canAccessAllCompanies: true,
                    totalCompanies: moduleStatusSummary.totalCompanies,
                    enabledCompanies: Array.from(moduleStatusSummary.companies.values())
                        .filter(status => status.moduleEnabled).length
                };
            }

            if (accessContext.companyContext) {
                // Add company-specific access information
                const companyAccessSummary = await companyLogAccessService.getAccessSummary(
                    accessContext.companyContext
                );
                
                summary.companyAccess = companyAccessSummary;
            }

            return summary;
        } catch (error) {
            platformLogger.warn('Failed to get access summary', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if user can access specific company
     */
    async canAccessCompany(req, targetCompanyId) {
        const accessContext = this.createAccessContext(req);
        
        try {
            if (accessContext.canAccessPlatformFeatures()) {
                // Platform admins can access any company
                return {
                    canAccess: true,
                    reason: 'Platform administrator access',
                    accessType: 'platform',
                    bypassesModuleSettings: true
                };
            } else {
                // Use company access service to check restrictions
                return await companyLogAccessService.canAccessCompany(
                    accessContext.companyContext, 
                    targetCompanyId
                );
            }
        } catch (error) {
            return {
                canAccess: false,
                reason: error.message,
                accessType: 'denied'
            };
        }
    }

    /**
     * Get essential logs (always accessible regardless of module settings)
     */
    async getEssentialLogs(req, companyId, options = {}) {
        const accessContext = this.createAccessContext(req);
        
        try {
            if (accessContext.canAccessPlatformFeatures()) {
                // Platform admins can get essential logs for any company
                return await platformLogAccessService.getEssentialLogs(
                    accessContext.platformContext, 
                    companyId, 
                    options
                );
            } else {
                // Company admins can only get essential logs for their company
                if (companyId !== accessContext.companyId) {
                    throw new Error('Cannot access essential logs for other companies');
                }
                
                const essentialOptions = {
                    ...options,
                    essentialOnly: true
                };
                
                return await companyLogAccessService.getCompanyLogs(
                    accessContext.companyContext, 
                    essentialOptions
                );
            }
        } catch (error) {
            platformLogger.warn('Essential logs access denied', {
                userId: accessContext.userId,
                userRole: accessContext.userRole,
                targetCompany: companyId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.accessStats,
            platformAccessPercentage: this.accessStats.totalRequests > 0 
                ? (this.accessStats.platformRequests / this.accessStats.totalRequests * 100).toFixed(2)
                : 0,
            companyAccessPercentage: this.accessStats.totalRequests > 0 
                ? (this.accessStats.companyRequests / this.accessStats.totalRequests * 100).toFixed(2)
                : 0,
            deniedRequestPercentage: this.accessStats.totalRequests > 0 
                ? (this.accessStats.deniedRequests / this.accessStats.totalRequests * 100).toFixed(2)
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.accessStats = {
            platformRequests: 0,
            companyRequests: 0,
            deniedRequests: 0,
            totalRequests: 0
        };
    }

    /**
     * Validate request has required authentication
     */
    validateAuthentication(req) {
        if (!req.user || !req.user.id) {
            throw new Error('Authentication required for log access');
        }
        
        if (!req.user.role) {
            throw new Error('User role required for log access');
        }
        
        return true;
    }

    /**
     * Get audit trail for access attempts
     */
    async getAccessAuditTrail(req, filters = {}) {
        const accessContext = this.createAccessContext(req);
        
        if (!accessContext.canAccessPlatformFeatures()) {
            throw new Error('Insufficient privileges to access audit trail');
        }
        
        try {
            // Get audit logs from both services
            const platformAudit = await platformLogAccessService.getPlatformAccessAuditLog(
                accessContext.platformContext, 
                filters
            );
            
            const companyAudit = await companyLogAccessService.getCompanyAccessAuditLog(
                accessContext.companyContext, 
                filters
            );
            
            return {
                platformAccess: platformAudit,
                companyAccess: companyAudit,
                totalEntries: platformAudit.totalEntries + companyAudit.totalEntries,
                filters
            };
        } catch (error) {
            platformLogger.warn('Failed to get access audit trail', {
                userId: accessContext.userId,
                error: error.message
            });
            throw error;
        }
    }
}

// Create singleton instance
const unifiedLogAccessService = new UnifiedLogAccessService();

export {
    UnifiedAccessContext,
    UnifiedLogAccessService
};

export default unifiedLogAccessService;