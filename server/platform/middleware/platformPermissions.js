import logger from '../../utils/logger.js';

/**
 * Platform Permissions Middleware
 * Validates platform user permissions for specific operations
 */

/**
 * Available platform permissions
 */
export const PLATFORM_PERMISSIONS = {
  // Company management
  'manage_companies': 'Create, update, and delete companies',
  'view_companies': 'View company information and statistics',
  
  // Module management
  'manage_modules': 'Enable/disable modules and update limits',
  'view_modules': 'View module configurations and status',
  
  // License management
  'manage_licenses': 'Generate and manage company licenses',
  'view_licenses': 'View license information',
  
  // User management
  'manage_platform_users': 'Create, update, and delete platform users',
  'view_platform_users': 'View platform user information',
  
  // Analytics and reporting
  'view_analytics': 'View platform analytics and reports',
  'export_data': 'Export platform data and reports',
  
  // System administration
  'manage_system': 'System configuration and maintenance',
  'view_logs': 'View system logs and audit trails',
  
  // Billing and subscriptions
  'manage_billing': 'Manage company billing and subscriptions',
  'view_billing': 'View billing information and reports'
};

/**
 * Role-based default permissions
 */
export const ROLE_PERMISSIONS = {
  'super-admin': Object.keys(PLATFORM_PERMISSIONS), // All permissions
  'support': [
    'view_companies',
    'view_modules',
    'view_licenses',
    'view_platform_users',
    'view_analytics',
    'view_logs',
    'view_billing'
  ],
  'operations': [
    'manage_companies',
    'view_companies',
    'manage_modules',
    'view_modules',
    'manage_licenses',
    'view_licenses',
    'view_analytics',
    'export_data',
    'manage_billing',
    'view_billing'
  ]
};

/**
 * Validate platform permission middleware
 * @param {string|Array} requiredPermissions - Required permission(s)
 * @returns {Function} Express middleware function
 */
export const validatePlatformPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.platformUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = req.platformUser;
      
      // Convert single permission to array
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // Check if user has required permissions
      const hasPermission = permissions.every(permission => 
        user.hasPermission(permission)
      );

      if (!hasPermission) {
        logger.warn('Platform permission denied', {
          userId: user._id,
          email: user.email,
          role: user.role,
          requiredPermissions: permissions,
          userPermissions: user.permissions
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation',
          requiredPermissions: permissions
        });
      }

      // Log successful permission check
      logger.debug('Platform permission granted', {
        userId: user._id,
        email: user.email,
        role: user.role,
        permissions: permissions
      });

      next();

    } catch (error) {
      logger.error('Platform permission validation error', {
        error: error.message,
        stack: error.stack,
        requiredPermissions
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during permission validation'
      });
    }
  };
};

/**
 * Validate multiple permissions (user must have ALL)
 * @param {Array} permissions - Array of required permissions
 * @returns {Function} Express middleware function
 */
export const validateAllPermissions = (permissions) => {
  return validatePlatformPermission(permissions);
};

/**
 * Validate any permission (user must have at least ONE)
 * @param {Array} permissions - Array of permissions (any one required)
 * @returns {Function} Express middleware function
 */
export const validateAnyPermission = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.platformUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = req.platformUser;
      
      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(permission => 
        user.hasPermission(permission)
      );

      if (!hasAnyPermission) {
        logger.warn('Platform permission denied (any)', {
          userId: user._id,
          email: user.email,
          role: user.role,
          requiredPermissions: permissions,
          userPermissions: user.permissions
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation',
          requiredPermissions: permissions
        });
      }

      next();

    } catch (error) {
      logger.error('Platform permission validation error (any)', {
        error: error.message,
        stack: error.stack,
        requiredPermissions: permissions
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during permission validation'
      });
    }
  };
};

/**
 * Validate role-based access
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {Function} Express middleware function
 */
export const validateRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.platformUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = req.platformUser;
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(user.role)) {
        logger.warn('Platform role access denied', {
          userId: user._id,
          email: user.email,
          userRole: user.role,
          requiredRoles: roles
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient role for this operation',
          requiredRoles: roles
        });
      }

      next();

    } catch (error) {
      logger.error('Platform role validation error', {
        error: error.message,
        stack: error.stack,
        requiredRoles
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during role validation'
      });
    }
  };
};

/**
 * Get user permissions for a role
 * @param {string} role - User role
 * @returns {Array} Array of permissions
 */
export const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if permission exists
 * @param {string} permission - Permission to check
 * @returns {boolean} True if permission exists
 */
export const isValidPermission = (permission) => {
  return Object.keys(PLATFORM_PERMISSIONS).includes(permission);
};

export default {
  PLATFORM_PERMISSIONS,
  ROLE_PERMISSIONS,
  validatePlatformPermission,
  validateAllPermissions,
  validateAnyPermission,
  validateRole,
  getPermissionsForRole,
  isValidPermission
};