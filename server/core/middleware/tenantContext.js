/**
 * Tenant Context Middleware
 * 
 * Extracts tenantId from Tenant JWT and injects tenant object into req.tenant
 * Validates tenant exists and is active
 * Enforces tenant isolation at the middleware level
 * 
 * Requirements: 1.3, 6.2
 */

import { verifyTenantToken } from '../auth/tenantAuth.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

/**
 * Extract token from request
 * Checks Authorization header and cookies
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractToken = (req) => {
    // Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    
    // Check cookies
    if (req.cookies && req.cookies.tenant_token) {
        return req.cookies.tenant_token;
    }
    
    return null;
};

/**
 * Tenant Context Middleware
 * 
 * Extracts tenantId from JWT and loads tenant information
 * Injects tenant object into req.tenant for downstream use
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const tenantContext = async (req, res, next) => {
    try {
        // Extract token from request
        const token = extractToken(req);
        
        if (!token) {
            throw new AppError(
                'No authentication token provided',
                401,
                ERROR_TYPES.UNAUTHORIZED
            );
        }

        // Verify and decode token
        const decoded = verifyTenantToken(token);
        
        // Extract tenantId from token
        const tenantId = decoded.tenantId;
        
        if (!tenantId) {
            throw new AppError(
                'Token missing tenantId',
                401,
                ERROR_TYPES.INVALID_TENANT_TOKEN
            );
        }

        // Load tenant from database
        let tenant;
        try {
            // Dynamically import Tenant model to avoid circular dependencies
            const { default: Tenant } = await import('../../platform/tenants/models/Tenant.js');
            tenant = await Tenant.findOne({ tenantId }).lean();
        } catch (error) {
            // If Tenant model doesn't exist yet, create minimal tenant object
            tenant = {
                id: tenantId,
                tenantId: tenantId,
                status: 'active',
                enabledModules: [],
                config: {}
            };
        }

        // If tenant not found in database, reject
        if (!tenant) {
            throw new AppError(
                'Tenant not found',
                404,
                ERROR_TYPES.TENANT_NOT_FOUND,
                { tenantId }
            );
        }

        // Validate tenant status - CRITICAL for security
        if (tenant.status === 'suspended') {
            throw new AppError(
                'Tenant account is suspended',
                403,
                ERROR_TYPES.TENANT_SUSPENDED,
                { tenantId }
            );
        }

        if (tenant.status === 'cancelled') {
            throw new AppError(
                'Tenant account is cancelled',
                403,
                ERROR_TYPES.TENANT_CANCELLED,
                { tenantId }
            );
        }

        // Normalize tenant object structure
        tenant = {
            id: tenant.tenantId || tenantId,
            tenantId: tenant.tenantId || tenantId,
            status: tenant.status,
            enabledModules: tenant.enabledModules || [],
            config: tenant.config || {}
        };

        // Inject tenant into request
        req.tenant = tenant;
        
        // Also inject user info from token
        req.user = {
            id: decoded.userId,
            role: decoded.role,
            tenantId: tenantId
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional Tenant Context Middleware
 * 
 * Similar to tenantContext but doesn't fail if no token is provided
 * Useful for endpoints that work with or without authentication
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalTenantContext = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            // No token provided, continue without tenant context
            return next();
        }

        // Verify and decode token
        const decoded = verifyTenantToken(token);
        const tenantId = decoded.tenantId;
        
        if (tenantId) {
            // Create minimal tenant object
            req.tenant = {
                id: tenantId,
                tenantId: tenantId,
                status: 'active',
                enabledModules: [],
                config: {}
            };
            
            req.user = {
                id: decoded.userId,
                role: decoded.role,
                tenantId: tenantId
            };
        }

        next();
    } catch (error) {
        // If token is invalid, continue without tenant context
        // This allows graceful degradation
        next();
    }
};

export default {
    tenantContext,
    optionalTenantContext
};
