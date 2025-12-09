/**
 * Platform Authorization Middleware
 * 
 * Handles permission checking for platform administrators
 * Logs all platform administrator actions for audit trail
 */

import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

/**
 * Platform permission definitions
 * Maps roles to their allowed permissions
 */
export const PLATFORM_PERMISSIONS = {
  'super-admin': [
    // Full system access - wildcard grants all permissions
    'platform:*'
  ],
  'support': [
    // Tenant management (read and update for support)
    'tenants:read',
    'tenants:update',
    
    // Subscription management (read-only)
    'subscriptions:read',
    
    // Module management (read-only)
    'modules:read',
    
    // User management (read-only)
    'users:read',
    
    // System monitoring
    'system:read',
    'system:health',
    'system:metrics'
  ],
  'operations': [
    // System monitoring and health (full access)
    'system:read',
    'system:health',
    'system:metrics',
    'system:update',
    
    // Tenant information (read-only)
    'tenants:read',
    
    // Module information (read-only)
    'modules:read'
  ]
};

/**
 * Check if a role has a specific permission
 * Supports wildcard permissions (e.g., 'platform:*')
 * 
 * @param {string} role - Platform user role
 * @param {string} permission - Required permission
 * @returns {boolean} True if role has permission
 */
export const hasPermission = (role, permission) => {
  const rolePermissions = PLATFORM_PERMISSIONS[role] || [];
  
  // Check for exact match
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check for wildcard match (e.g., 'platform:*' matches 'platform:anything')
  const [resource, action] = permission.split(':');
  const wildcardPermission = `${resource}:*`;
  
  if (rolePermissions.includes(wildcardPermission)) {
    return true;
  }
  
  // Check for global wildcard
  if (rolePermissions.includes('platform:*')) {
    return true;
  }
  
  return false;
};

/**
 * Middleware to check if platform user has required permission
 * Must be used after authenticatePlatform middleware
 * 
 * @param {string|string[]} requiredPermission - Required permission(s)
 * @returns {Function} Express middleware
 */
export const requirePlatformPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.platformUser) {
        throw new AppError(
          'Platform authentication required',
          401,
          ERROR_TYPES.UNAUTHORIZED
        );
      }

      const { role, userId } = req.platformUser;

      // Handle array of permissions (user needs at least one)
      const permissions = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];

      // Check if user has any of the required permissions
      const hasRequiredPermission = permissions.some(permission => 
        hasPermission(role, permission)
      );

      if (!hasRequiredPermission) {
        // Log unauthorized access attempt
        logger.warn('Platform authorization failed', {
          userId,
          role,
          requiredPermission: permissions,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        throw new AppError(
          'Insufficient permissions to access this resource',
          403,
          ERROR_TYPES.INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to log all platform administrator actions
 * Should be used on all platform routes that modify data
 * 
 * @param {string} actionType - Type of action being performed
 * @returns {Function} Express middleware
 */
export const logPlatformAction = (actionType) => {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function(data) {
      // Log the action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          actionType,
          platformUserId: req.platformUser?.userId,
          platformUserRole: req.platformUser?.role,
          method: req.method,
          path: req.path,
          tenantId: req.params.tenantId || req.body?.tenantId || null,
          requestBody: sanitizeRequestBody(req.body),
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('user-agent')
        };

        logger.info('Platform administrator action', logData);
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords
 * 
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'token', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Middleware to log cross-tenant operations
 * Used when platform admin performs actions on behalf of a tenant
 * 
 * @returns {Function} Express middleware
 */
export const logCrossTenantOperation = () => {
  return (req, res, next) => {
    const tenantId = req.params.tenantId || req.body?.tenantId;

    if (tenantId && req.platformUser) {
      logger.info('Cross-tenant operation', {
        platformUserId: req.platformUser.userId,
        platformUserRole: req.platformUser.role,
        targetTenantId: tenantId,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
    }

    next();
  };
};

/**
 * Combined middleware for platform routes
 * Checks authentication, permissions, and logs actions
 * 
 * @param {string|string[]} requiredPermission - Required permission(s)
 * @param {string} actionType - Type of action for logging
 * @returns {Function[]} Array of middleware functions
 */
export const platformGuard = (requiredPermission, actionType) => {
  return [
    requirePlatformPermission(requiredPermission),
    logPlatformAction(actionType),
    logCrossTenantOperation()
  ];
};

export default {
  PLATFORM_PERMISSIONS,
  hasPermission,
  requirePlatformPermission,
  logPlatformAction,
  logCrossTenantOperation,
  platformGuard
};
