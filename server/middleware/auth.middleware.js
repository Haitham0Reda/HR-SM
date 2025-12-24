/**
 * Authentication Middleware
 * 
 * Provides JWT authentication and user context extraction
 * for API endpoints requiring authentication
 * 
 * Requirements: 8.1, 4.2, 3.2
 */

import jwt from 'jsonwebtoken';
import companyLogger from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';
import correlationIdService from '../services/correlationId.service.js';

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT tokens and extracts user context
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function authenticateJWT(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                correlationId: req.correlationId
            });
        }

        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, jwtSecret);

        // Extract user information
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId || decoded.companyId,
            permissions: decoded.permissions || {},
            sessionId: decoded.sessionId,
            iat: decoded.iat,
            exp: decoded.exp
        };

        // Validate token expiration
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                correlationId: req.correlationId
            });
        }

        // Add correlation ID if not present
        if (!req.correlationId) {
            req.correlationId = correlationIdService.generateCorrelationId();
        }

        // Log successful authentication
        const logger = await companyLogger.getLoggerForTenant(req.user.tenantId);
        logger.info('User authenticated', {
            correlationId: req.correlationId,
            userId: req.user.id,
            userRole: req.user.role,
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        next();

    } catch (error) {
        // Log authentication failure
        platformLogger.platformSecurity('authentication_failed', {
            error: error.message,
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            authHeader: req.headers.authorization ? 'present' : 'missing',
            correlationId: req.correlationId
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                correlationId: req.correlationId
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                correlationId: req.correlationId
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            correlationId: req.correlationId
        });
    }
}

/**
 * Optional JWT Authentication Middleware
 * 
 * Extracts user context if token is present, but doesn't require it
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token provided, continue without user context
        req.user = null;
        if (!req.correlationId) {
            req.correlationId = correlationIdService.generateCorrelationId();
        }
        return next();
    }

    // Try to authenticate, but don't fail if token is invalid
    try {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, jwtSecret);

        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId || decoded.companyId,
            permissions: decoded.permissions || {},
            sessionId: decoded.sessionId,
            iat: decoded.iat,
            exp: decoded.exp
        };
    } catch (error) {
        // Invalid token, continue without user context
        req.user = null;
    }

    if (!req.correlationId) {
        req.correlationId = correlationIdService.generateCorrelationId();
    }

    next();
}

/**
 * Role-based authorization middleware
 * 
 * @param {Array|string} allowedRoles - Roles allowed to access the endpoint
 * @returns {Function} Express middleware function
 */
export function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                correlationId: req.correlationId
            });
        }

        if (!roles.includes(req.user.role)) {
            // Log authorization failure
            const logger = await companyLogger.getLoggerForTenant(req.user.tenantId);
            logger.warn('Authorization failed - insufficient role', {
                correlationId: req.correlationId,
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: roles,
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                correlationId: req.correlationId
            });
        }

        next();
    };
}

/**
 * Permission-based authorization middleware
 * 
 * @param {string} permission - Permission required to access the endpoint
 * @returns {Function} Express middleware function
 */
export function requirePermission(permission) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                correlationId: req.correlationId
            });
        }

        const userPermissions = req.user.permissions || {};
        if (!userPermissions[permission]) {
            // Log authorization failure
            const logger = await companyLogger.getLoggerForTenant(req.user.tenantId);
            logger.warn('Authorization failed - missing permission', {
                correlationId: req.correlationId,
                userId: req.user.id,
                userRole: req.user.role,
                requiredPermission: permission,
                userPermissions: Object.keys(userPermissions),
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                correlationId: req.correlationId
            });
        }

        next();
    };
}

/**
 * Admin-only access middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requireAdmin(req, res, next) {
    return requireRole(['admin', 'super_admin'])(req, res, next);
}

/**
 * Super admin-only access middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requireSuperAdmin(req, res, next) {
    return requireRole('super_admin')(req, res, next);
}

export default {
    authenticateJWT,
    optionalAuth,
    requireRole,
    requirePermission,
    requireAdmin,
    requireSuperAdmin
};