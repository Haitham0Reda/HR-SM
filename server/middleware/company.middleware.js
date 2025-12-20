/**
 * Company Context Middleware
 * 
 * Extracts and validates company context from authenticated users
 * and request headers for multi-tenant operations
 * 
 * Requirements: 3.1, 3.2, 4.2
 */

import companyLogger from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Extract company context from authenticated user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function extractCompanyContext(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required for company context',
                correlationId: req.correlationId
            });
        }

        // Extract tenant/company information from user token
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            platformLogger.platformSecurity('missing_tenant_context', {
                userId: req.user.id,
                userRole: req.user.role,
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip,
                correlationId: req.correlationId
            });

            return res.status(400).json({
                success: false,
                error: 'No company context found in user token',
                correlationId: req.correlationId
            });
        }

        // Validate tenant ID format
        if (!isValidTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid company identifier format',
                correlationId: req.correlationId
            });
        }

        // Check for tenant ID in headers (for additional validation)
        const headerTenantId = req.headers['x-tenant-id'];
        if (headerTenantId && headerTenantId !== tenantId) {
            // Log potential tenant spoofing attempt
            platformLogger.platformSecurity('tenant_spoofing_attempt', {
                userId: req.user.id,
                tokenTenantId: tenantId,
                headerTenantId: headerTenantId,
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                correlationId: req.correlationId
            });

            return res.status(403).json({
                success: false,
                error: 'Tenant context mismatch detected',
                correlationId: req.correlationId
            });
        }

        // Set tenant context on request
        req.tenant = {
            tenantId: tenantId,
            id: tenantId, // Alias for compatibility
            companyName: req.user.companyName || `Company_${tenantId}`,
            userRole: req.user.role,
            permissions: req.user.permissions || {}
        };

        // Add request start time for performance monitoring
        req.startTime = new Date();

        // Log company context extraction
        const logger = await companyLogger.getLoggerForTenant(tenantId, req.tenant.companyName);
        logger.debug('Company context extracted', {
            correlationId: req.correlationId,
            userId: req.user.id,
            userRole: req.user.role,
            tenantId: tenantId,
            endpoint: req.originalUrl,
            method: req.method
        });

        next();

    } catch (error) {
        platformLogger.systemHealth('company-context-middleware', 'error', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            endpoint: req.originalUrl,
            correlationId: req.correlationId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to extract company context',
            correlationId: req.correlationId
        });
    }
}

/**
 * Validate tenant access for specific operations
 * 
 * @param {Object} options - Validation options
 * @param {boolean} options.allowCrossCompany - Allow cross-company access for admins
 * @param {Array} options.adminRoles - Roles that can access cross-company data
 * @returns {Function} Express middleware function
 */
export function validateTenantAccess(options = {}) {
    const {
        allowCrossCompany = false,
        adminRoles = ['super_admin', 'platform_admin']
    } = options;

    return async (req, res, next) => {
        try {
            if (!req.tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'Company context required',
                    correlationId: req.correlationId
                });
            }

            // Check if requesting data for a different company
            const requestedTenantId = req.params.tenantId || req.query.tenantId || req.body.tenantId;
            
            if (requestedTenantId && requestedTenantId !== req.tenant.tenantId) {
                // Check if cross-company access is allowed
                if (!allowCrossCompany || !adminRoles.includes(req.user.role)) {
                    const logger = await companyLogger.getLoggerForTenant(req.tenant.tenantId, req.tenant.companyName);
                    logger.warn('Unauthorized cross-company access attempt', {
                        correlationId: req.correlationId,
                        userId: req.user.id,
                        userRole: req.user.role,
                        userTenantId: req.tenant.tenantId,
                        requestedTenantId: requestedTenantId,
                        endpoint: req.originalUrl,
                        method: req.method,
                        ipAddress: req.ip
                    });

                    return res.status(403).json({
                        success: false,
                        error: 'Access denied to requested company data',
                        correlationId: req.correlationId
                    });
                }

                // Log authorized cross-company access
                platformLogger.adminAction('cross_company_access', req.user.id, {
                    userTenantId: req.tenant.tenantId,
                    accessedTenantId: requestedTenantId,
                    endpoint: req.originalUrl,
                    method: req.method,
                    correlationId: req.correlationId
                });
            }

            next();

        } catch (error) {
            const logger = await companyLogger.getLoggerForTenant(req.tenant?.tenantId, req.tenant?.companyName);
            logger.error('Tenant access validation error', {
                correlationId: req.correlationId,
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });

            res.status(500).json({
                success: false,
                error: 'Failed to validate tenant access',
                correlationId: req.correlationId
            });
        }
    };
}

/**
 * Ensure company-specific data isolation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function enforceDataIsolation(req, res, next) {
    try {
        if (!req.tenant) {
            return res.status(400).json({
                success: false,
                error: 'Company context required for data isolation',
                correlationId: req.correlationId
            });
        }

        // Add tenant filter to query parameters
        if (!req.query.tenantId && !req.query.companyId) {
            req.query.tenantId = req.tenant.tenantId;
        }

        // Add tenant filter to request body if it's a data modification
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            if (!req.body.tenantId && !req.body.companyId) {
                req.body.tenantId = req.tenant.tenantId;
            }
        }

        // Validate that any existing tenant ID matches the user's tenant
        const bodyTenantId = req.body?.tenantId || req.body?.companyId;
        const queryTenantId = req.query?.tenantId || req.query?.companyId;
        
        if (bodyTenantId && bodyTenantId !== req.tenant.tenantId) {
            const logger = await companyLogger.getLoggerForTenant(req.tenant.tenantId, req.tenant.companyName);
            logger.warn('Data isolation violation attempt in body', {
                correlationId: req.correlationId,
                userId: req.user.id,
                userTenantId: req.tenant.tenantId,
                bodyTenantId: bodyTenantId,
                endpoint: req.originalUrl,
                method: req.method
            });

            return res.status(403).json({
                success: false,
                error: 'Data isolation violation detected',
                correlationId: req.correlationId
            });
        }

        if (queryTenantId && queryTenantId !== req.tenant.tenantId) {
            const logger = await companyLogger.getLoggerForTenant(req.tenant.tenantId, req.tenant.companyName);
            logger.warn('Data isolation violation attempt in query', {
                correlationId: req.correlationId,
                userId: req.user.id,
                userTenantId: req.tenant.tenantId,
                queryTenantId: queryTenantId,
                endpoint: req.originalUrl,
                method: req.method
            });

            return res.status(403).json({
                success: false,
                error: 'Data isolation violation detected',
                correlationId: req.correlationId
            });
        }

        next();

    } catch (error) {
        const logger = await companyLogger.getLoggerForTenant(req.tenant?.tenantId, req.tenant?.companyName);
        logger.error('Data isolation enforcement error', {
            correlationId: req.correlationId,
            userId: req.user?.id,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'Failed to enforce data isolation',
            correlationId: req.correlationId
        });
    }
}

/**
 * Helper function to validate tenant ID format
 * 
 * @param {string} tenantId - Tenant ID to validate
 * @returns {boolean} True if valid format
 */
function isValidTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
        return false;
    }

    // Basic validation - alphanumeric with underscores and hyphens
    const tenantIdRegex = /^[a-zA-Z0-9_-]+$/;
    return tenantIdRegex.test(tenantId) && tenantId.length >= 3 && tenantId.length <= 50;
}

export default {
    extractCompanyContext,
    validateTenantAccess,
    enforceDataIsolation
};