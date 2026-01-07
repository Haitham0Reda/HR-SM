/**
 * Tenant Status Guard Middleware for Life Insurance Module
 * 
 * Provides middleware to check tenant status and log access control events
 * Requirements: 1.5, 6.2, 6.4, 6.5
 */

import { sendError } from '../../../core/utils/response.js';
import logger from '../../../utils/logger.js';
import auditService from '../services/auditService.js';

/**
 * Middleware to check tenant status and deny access for suspended/cancelled tenants
 * 
 * @returns {Function} Express middleware function
 */
export const requireActiveTenant = () => {
    return async (req, res, next) => {
        try {
            const tenant = req.tenant;
            
            if (!tenant) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Check tenant status
            const tenantStatus = tenant.status || 'active';
            const allowedStatuses = ['active', 'trial'];
            const isAllowed = allowedStatuses.includes(tenantStatus);

            // Log tenant status access attempt
            await auditService.logTenantStatusAccess(req, tenantStatus, isAllowed, {
                allowedStatuses,
                tenantName: tenant.companyName || tenant.name
            });

            if (!isAllowed) {
                const statusMessages = {
                    suspended: 'Your organization account has been suspended. Please contact support.',
                    cancelled: 'Your organization account has been cancelled. Please contact support to reactivate.',
                    expired: 'Your organization subscription has expired. Please renew to continue using the service.',
                    inactive: 'Your organization account is inactive. Please contact support.'
                };

                const message = statusMessages[tenantStatus] || 
                    'Your organization account is not active. Please contact support.';

                logger.warn('Insurance module access denied due to tenant status', {
                    tenantId: tenant.id,
                    tenantStatus,
                    companyName: tenant.companyName,
                    userId: req.user?._id,
                    userRole: req.user?.role,
                    path: req.originalUrl
                });

                return sendError(res, message, 403);
            }

            // Log successful tenant status check
            logger.info('Insurance module access granted for active tenant', {
                tenantId: tenant.id,
                tenantStatus,
                companyName: tenant.companyName,
                userId: req.user?._id,
                userRole: req.user?.role
            });

            next();
        } catch (error) {
            logger.error('Tenant status check error', {
                tenantId: req.tenant?.id,
                error: error.message,
                stack: error.stack
            });
            
            return sendError(res, 'Failed to verify tenant status', 500);
        }
    };
};

/**
 * Middleware to log tenant access events for audit purposes
 * 
 * @returns {Function} Express middleware function
 */
export const logTenantAccess = () => {
    return async (req, res, next) => {
        try {
            const tenant = req.tenant;
            const user = req.user;

            if (tenant && user) {
                // Log tenant access for audit trail
                await auditService.logInsuranceAuthEvent(req, 'tenant-access', {
                    tenantId: tenant.id,
                    tenantStatus: tenant.status,
                    companyName: tenant.companyName || tenant.name,
                    accessPath: req.originalUrl,
                    accessMethod: req.method
                });
            }

            next();
        } catch (error) {
            // Don't fail the request if audit logging fails
            logger.error('Failed to log tenant access event', {
                tenantId: req.tenant?.id,
                userId: req.user?._id,
                error: error.message
            });
            
            next();
        }
    };
};

/**
 * Middleware to check if tenant has specific permissions for insurance operations
 * 
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware function
 */
export const requireTenantPermissions = (requiredPermissions = []) => {
    return async (req, res, next) => {
        try {
            const tenant = req.tenant;
            
            if (!tenant) {
                return sendError(res, 'Tenant context required', 400);
            }

            // Get tenant permissions (this would typically come from tenant configuration)
            const tenantPermissions = tenant.permissions || [];
            
            // Check if tenant has all required permissions
            const hasAllPermissions = requiredPermissions.every(permission => 
                tenantPermissions.includes(permission)
            );

            if (!hasAllPermissions) {
                const missingPermissions = requiredPermissions.filter(permission => 
                    !tenantPermissions.includes(permission)
                );

                // Log permission denial
                await auditService.logAccessDenied(req, 'tenant-permissions', 'missing-permissions', {
                    requiredPermissions,
                    tenantPermissions,
                    missingPermissions
                });

                logger.warn('Insurance module access denied due to missing tenant permissions', {
                    tenantId: tenant.id,
                    requiredPermissions,
                    tenantPermissions,
                    missingPermissions,
                    userId: req.user?._id
                });

                return sendError(res, 'Your organization does not have the required permissions for this operation', 403);
            }

            // Log successful permission check
            await auditService.logInsuranceAuthorizationEvent(req, 'tenant-permissions', 'permissions-check', true, {
                requiredPermissions,
                tenantPermissions
            });

            next();
        } catch (error) {
            logger.error('Tenant permissions check error', {
                tenantId: req.tenant?.id,
                requiredPermissions,
                error: error.message
            });
            
            return sendError(res, 'Failed to verify tenant permissions', 500);
        }
    };
};

export default {
    requireActiveTenant,
    logTenantAccess,
    requireTenantPermissions
};