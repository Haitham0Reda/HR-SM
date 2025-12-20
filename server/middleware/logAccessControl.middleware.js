/**
 * Log Access Control Middleware
 * 
 * Middleware to enforce log access control and tenant isolation
 * Integrates with existing authentication and tenant context middleware
 * 
 * Requirements: 3.2, 3.5 - Log access authorization and tenant isolation
 */

import logAccessControl from '../services/logAccessControl.service.js';
import tenantIsolationEnforcement from '../services/tenantIsolationEnforcement.service.js';
import { sendUnauthorized, sendForbidden } from '../utils/responseHelper.js';

/**
 * Middleware to enforce log access control
 * Must be used after authentication and tenant context middleware
 */
export function enforceLogAccessControl(options = {}) {
    const { 
        logType = 'general',
        action = 'read',
        requireCompanyAccess = true 
    } = options;

    return async (req, res, next) => {
        try {
            // Ensure user is authenticated
            if (!req.user || !req.user.id) {
                return sendUnauthorized(res, 'Authentication required for log access');
            }

            // Create user access context
            const userContext = logAccessControl.createUserContext(req);

            // Determine target company ID
            let targetCompanyId = req.params.companyId || 
                                req.query.companyId || 
                                req.body?.companyId ||
                                req.tenant?.tenantId ||
                                req.tenantId;

            // For company-specific access, require company ID
            if (requireCompanyAccess && !targetCompanyId) {
                return sendForbidden(res, 'Company ID required for log access');
            }

            // Check access permissions
            let accessDecision;
            if (action === 'read') {
                accessDecision = logAccessControl.checkCompanyAccess(userContext, targetCompanyId, logType);
            } else {
                accessDecision = logAccessControl.checkActionPermission(userContext, action, targetCompanyId, logType);
            }

            if (!accessDecision.allowed) {
                // Log the access denial
                if (req.companyLogger) {
                    req.companyLogger.security('Log access denied', {
                        userId: userContext.userId,
                        userRole: userContext.userRole,
                        targetCompanyId,
                        logType,
                        action,
                        reason: accessDecision.reason,
                        url: req.originalUrl,
                        method: req.method,
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    });
                }

                return sendForbidden(res, accessDecision.reason);
            }

            // Add access context to request for downstream use
            req.logAccessContext = {
                userContext,
                accessDecision,
                targetCompanyId,
                logType,
                action,
                restrictions: accessDecision.restrictions
            };

            next();

        } catch (error) {
            // Log the error
            if (req.companyLogger) {
                req.companyLogger.error('Log access control error', {
                    error: error.message,
                    stack: error.stack,
                    userId: req.user?.id,
                    url: req.originalUrl,
                    method: req.method
                });
            }

            return sendForbidden(res, 'Access control check failed');
        }
    };
}

/**
 * Middleware to enforce tenant isolation
 * Validates that requests don't violate tenant boundaries
 */
export function enforceTenantIsolation(req, res, next) {
    try {
        // Enforce request-level isolation
        const isolationResult = tenantIsolationEnforcement.enforceRequestIsolation(req);

        if (!isolationResult.valid) {
            // Log the violation
            if (req.companyLogger) {
                req.companyLogger.security('Tenant isolation violation', {
                    violations: isolationResult.violations,
                    warnings: isolationResult.warnings,
                    checkId: isolationResult.checkId,
                    userId: req.user?.id,
                    tenantId: req.tenant?.tenantId,
                    url: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            // Return first violation as error message
            const firstViolation = isolationResult.violations[0];
            return sendForbidden(res, `Tenant isolation violation: ${firstViolation.description}`);
        }

        // Add isolation context to request
        req.isolationContext = {
            checkId: isolationResult.checkId,
            warnings: isolationResult.warnings,
            validated: true
        };

        // Log warnings if any
        if (isolationResult.warnings.length > 0 && req.companyLogger) {
            req.companyLogger.warn('Tenant isolation warnings', {
                warnings: isolationResult.warnings,
                checkId: isolationResult.checkId,
                userId: req.user?.id,
                tenantId: req.tenant?.tenantId,
                url: req.originalUrl
            });
        }

        next();

    } catch (error) {
        // Log the error
        if (req.companyLogger) {
            req.companyLogger.error('Tenant isolation enforcement error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                url: req.originalUrl,
                method: req.method
            });
        }

        return sendForbidden(res, 'Tenant isolation check failed');
    }
}

/**
 * Middleware to validate file access for tenant isolation
 * Used for endpoints that access log files directly
 */
export function validateFileAccess(req, res, next) {
    try {
        const filePath = req.params.filePath || req.query.filePath || req.body?.filePath;
        const allowedTenantId = req.user?.tenantId || req.tenant?.tenantId;
        const operation = req.method === 'GET' ? 'read' : 'write';

        if (!filePath) {
            return sendForbidden(res, 'File path required');
        }

        if (!allowedTenantId) {
            return sendForbidden(res, 'Tenant context required for file access');
        }

        // Validate file path for tenant isolation
        const fileResult = tenantIsolationEnforcement.enforceFileIsolation(filePath, allowedTenantId, operation);

        if (!fileResult.valid) {
            // Log the violation
            if (req.companyLogger) {
                req.companyLogger.security('File access violation', {
                    filePath,
                    allowedTenantId,
                    operation,
                    violations: fileResult.violations,
                    userId: req.user?.id,
                    url: req.originalUrl,
                    ip: req.ip
                });
            }

            const firstViolation = fileResult.violations[0];
            return sendForbidden(res, `File access denied: ${firstViolation.description}`);
        }

        // Add file validation context to request
        req.fileAccessContext = {
            filePath,
            allowedTenantId,
            operation,
            checkId: fileResult.checkId,
            validated: true
        };

        next();

    } catch (error) {
        // Log the error
        if (req.companyLogger) {
            req.companyLogger.error('File access validation error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                url: req.originalUrl
            });
        }

        return sendForbidden(res, 'File access validation failed');
    }
}

/**
 * Middleware to validate export requests for tenant isolation
 */
export function validateExportRequest(req, res, next) {
    try {
        const exportConfig = req.body?.exportConfig || req.body;
        const allowedTenantId = req.user?.tenantId || req.tenant?.tenantId;
        const userContext = req.logAccessContext?.userContext;

        if (!exportConfig) {
            return sendForbidden(res, 'Export configuration required');
        }

        if (!allowedTenantId || !userContext) {
            return sendForbidden(res, 'Authentication and tenant context required for export');
        }

        // Validate export for tenant isolation
        const exportResult = tenantIsolationEnforcement.enforceExportIsolation(
            exportConfig, 
            allowedTenantId, 
            userContext
        );

        if (!exportResult.valid) {
            // Log the violation
            if (req.companyLogger) {
                req.companyLogger.security('Export isolation violation', {
                    exportConfig,
                    allowedTenantId,
                    violations: exportResult.violations,
                    userId: req.user?.id,
                    url: req.originalUrl,
                    ip: req.ip
                });
            }

            const firstViolation = exportResult.violations[0];
            return sendForbidden(res, `Export denied: ${firstViolation.description}`);
        }

        // Add export validation context to request
        req.exportValidationContext = {
            exportConfig,
            allowedTenantId,
            checkId: exportResult.checkId,
            warnings: exportResult.warnings,
            validated: true
        };

        next();

    } catch (error) {
        // Log the error
        if (req.companyLogger) {
            req.companyLogger.error('Export validation error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                url: req.originalUrl
            });
        }

        return sendForbidden(res, 'Export validation failed');
    }
}

/**
 * Middleware to validate analysis requests for tenant isolation
 */
export function validateAnalysisRequest(req, res, next) {
    try {
        const query = req.body?.query || req.query;
        const allowedTenantId = req.user?.tenantId || req.tenant?.tenantId;
        const userContext = req.logAccessContext?.userContext;

        if (!query) {
            return sendForbidden(res, 'Analysis query required');
        }

        if (!allowedTenantId || !userContext) {
            return sendForbidden(res, 'Authentication and tenant context required for analysis');
        }

        // Validate analysis for tenant isolation
        const analysisResult = tenantIsolationEnforcement.enforceAnalysisIsolation(
            query, 
            allowedTenantId, 
            userContext
        );

        if (!analysisResult.valid) {
            // Log the violation
            if (req.companyLogger) {
                req.companyLogger.security('Analysis isolation violation', {
                    query,
                    allowedTenantId,
                    violations: analysisResult.violations,
                    userId: req.user?.id,
                    url: req.originalUrl,
                    ip: req.ip
                });
            }

            const firstViolation = analysisResult.violations[0];
            return sendForbidden(res, `Analysis denied: ${firstViolation.description}`);
        }

        // Add analysis validation context to request
        req.analysisValidationContext = {
            query,
            allowedTenantId,
            checkId: analysisResult.checkId,
            warnings: analysisResult.warnings,
            validated: true
        };

        next();

    } catch (error) {
        // Log the error
        if (req.companyLogger) {
            req.companyLogger.error('Analysis validation error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                url: req.originalUrl
            });
        }

        return sendForbidden(res, 'Analysis validation failed');
    }
}

/**
 * Helper middleware to check if user has super admin privileges
 */
export function requireSuperAdmin(req, res, next) {
    try {
        const userRole = req.user?.role;
        
        if (userRole !== 'super_admin') {
            // Log the unauthorized access attempt
            if (req.companyLogger) {
                req.companyLogger.security('Super admin access denied', {
                    userId: req.user?.id,
                    userRole,
                    url: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            return sendForbidden(res, 'Super admin privileges required');
        }

        next();

    } catch (error) {
        return sendForbidden(res, 'Authorization check failed');
    }
}

/**
 * Helper middleware to check if user has platform admin privileges
 */
export function requirePlatformAdmin(req, res, next) {
    try {
        const userRole = req.user?.role;
        
        if (!['super_admin', 'platform_admin'].includes(userRole)) {
            // Log the unauthorized access attempt
            if (req.companyLogger) {
                req.companyLogger.security('Platform admin access denied', {
                    userId: req.user?.id,
                    userRole,
                    url: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            return sendForbidden(res, 'Platform admin privileges required');
        }

        next();

    } catch (error) {
        return sendForbidden(res, 'Authorization check failed');
    }
}

export default {
    enforceLogAccessControl,
    enforceTenantIsolation,
    validateFileAccess,
    validateExportRequest,
    validateAnalysisRequest,
    requireSuperAdmin,
    requirePlatformAdmin
};