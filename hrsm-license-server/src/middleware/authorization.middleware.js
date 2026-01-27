/**
 * Authorization Middleware for License Server
 * 
 * Provides role-based access control (RBAC) for API endpoints
 * Checks permissions for operations and returns 403 for insufficient permissions
 * 
 * Requirements: 3.10, 8.2, 8.3
 */

/**
 * Permission definitions for different operations
 */
export const PERMISSIONS = {
    // Tenant operations
    TENANTS_READ: 'tenants:read',
    TENANTS_WRITE: 'tenants:write',
    TENANTS_DELETE: 'tenants:delete',
    
    // Module operations
    MODULES_READ: 'modules:read',
    MODULES_WRITE: 'modules:write',
    
    // License operations
    LICENSES_READ: 'licenses:read',
    LICENSES_WRITE: 'licenses:write',
    LICENSES_VALIDATE: 'licenses:validate',
    
    // Admin operations
    ADMIN_ALL: 'admin:all',
    
    // Legacy permissions (for backward compatibility)
    READ: 'read',
    WRITE: 'write',
    ADMIN: 'admin',
    VALIDATE: 'validate',
    USAGE: 'usage'
};

/**
 * Role definitions with their associated permissions
 */
export const ROLES = {
    PLATFORM_ADMIN: {
        name: 'platform_admin',
        permissions: [
            PERMISSIONS.ADMIN_ALL,
            PERMISSIONS.TENANTS_READ,
            PERMISSIONS.TENANTS_WRITE,
            PERMISSIONS.TENANTS_DELETE,
            PERMISSIONS.MODULES_READ,
            PERMISSIONS.MODULES_WRITE,
            PERMISSIONS.LICENSES_READ,
            PERMISSIONS.LICENSES_WRITE,
            PERMISSIONS.LICENSES_VALIDATE
        ]
    },
    HRSM_BACKEND: {
        name: 'hrsm_backend',
        permissions: [
            PERMISSIONS.TENANTS_READ,
            PERMISSIONS.MODULES_READ,
            PERMISSIONS.LICENSES_READ,
            PERMISSIONS.LICENSES_VALIDATE,
            PERMISSIONS.USAGE
        ]
    },
    READ_ONLY: {
        name: 'read_only',
        permissions: [
            PERMISSIONS.TENANTS_READ,
            PERMISSIONS.MODULES_READ,
            PERMISSIONS.LICENSES_READ
        ]
    }
};

/**
 * Check if a user/API key has a specific permission
 * 
 * @param {Array<string>} userPermissions - Permissions granted to the user/API key
 * @param {string|Array<string>} requiredPermission - Permission(s) required for the operation
 * @returns {boolean} - True if user has the required permission
 */
export const hasPermission = (userPermissions, requiredPermission) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
        return false;
    }
    
    // Admin permission grants access to everything
    if (userPermissions.includes(PERMISSIONS.ADMIN_ALL) || 
        userPermissions.includes(PERMISSIONS.ADMIN) ||
        userPermissions.includes('admin')) {
        return true;
    }
    
    // Check if user has any of the required permissions
    const requiredPerms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    
    return requiredPerms.some(perm => userPermissions.includes(perm));
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if the authenticated user has required permissions
 * 
 * Requirements: 3.10, 8.2, 8.3
 * 
 * @param {string|Array<string>} requiredPermissions - Permission(s) required to access the endpoint
 * @returns {Function} Express middleware function
 */
export const requirePermission = (requiredPermissions) => {
    return (req, res, next) => {
        // Ensure user is authenticated first
        if (!req.apiKey && !req.admin && !req.user) {
            console.warn(`❌ Authorization check failed: No authenticated user from IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required to access this resource',
                    statusCode: 401
                }
            });
        }
        
        // Get user permissions from the authenticated entity
        const userPermissions = req.apiKey?.permissions || 
                               req.admin?.permissions || 
                               req.user?.permissions || 
                               [];
        
        // Check if user has required permissions
        const hasRequiredPermission = hasPermission(userPermissions, requiredPermissions);
        
        // Requirement 8.2, 8.3: Return 403 for insufficient permissions
        if (!hasRequiredPermission) {
            const userName = req.apiKey?.name || req.admin?.email || req.user?.id || 'unknown';
            console.warn(`❌ Authorization failed for ${userName}: Missing required permissions`);
            console.warn(`   Required: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`);
            console.warn(`   Granted: ${userPermissions.join(', ')}`);
            
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'You do not have permission to perform this operation',
                    requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
                    grantedPermissions: userPermissions,
                    statusCode: 403
                }
            });
        }
        
        // Log successful authorization
        const userName = req.apiKey?.name || req.admin?.email || req.user?.id || 'unknown';
        console.log(`✅ Authorization successful for ${userName}: ${req.method} ${req.path}`);
        
        next();
    };
};

/**
 * Require specific role(s)
 * 
 * @param {string|Array<string>} allowedRoles - Role(s) allowed to access the endpoint
 * @returns {Function} Express middleware function
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // Ensure user is authenticated
        if (!req.apiKey && !req.admin && !req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required to access this resource',
                    statusCode: 401
                }
            });
        }
        
        // Get user role
        const userRole = req.apiKey?.role || req.admin?.role || req.user?.role;
        
        // Check if user has allowed role
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        const hasRole = roles.includes(userRole);
        
        if (!hasRole) {
            const userName = req.apiKey?.name || req.admin?.email || req.user?.id || 'unknown';
            console.warn(`❌ Authorization failed for ${userName}: Role '${userRole}' not in allowed roles`);
            
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `Access denied. Required role: ${roles.join(' or ')}`,
                    requiredRoles: roles,
                    userRole: userRole,
                    statusCode: 403
                }
            });
        }
        
        next();
    };
};

/**
 * Require admin access
 * Shorthand for requiring admin permissions
 */
export const requireAdmin = () => {
    return requirePermission([PERMISSIONS.ADMIN_ALL, PERMISSIONS.ADMIN, 'admin']);
};

/**
 * Require write access
 * Shorthand for requiring write permissions
 */
export const requireWrite = () => {
    return requirePermission([PERMISSIONS.WRITE, 'write', PERMISSIONS.ADMIN_ALL, PERMISSIONS.ADMIN, 'admin']);
};

/**
 * Require read access
 * Shorthand for requiring read permissions
 */
export const requireRead = () => {
    return requirePermission([PERMISSIONS.READ, 'read', PERMISSIONS.ADMIN_ALL, PERMISSIONS.ADMIN, 'admin']);
};

/**
 * Check if request is from platform admin
 * 
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from platform admin
 */
export const isPlatformAdmin = (req) => {
    const permissions = req.apiKey?.permissions || req.admin?.permissions || req.user?.permissions || [];
    return hasPermission(permissions, [PERMISSIONS.ADMIN_ALL, PERMISSIONS.ADMIN, 'admin']);
};

/**
 * Check if request is from HRSM backend
 * 
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from HRSM backend
 */
export const isHRSMBackend = (req) => {
    const name = req.apiKey?.name || '';
    return name.toLowerCase().includes('backend') || name.toLowerCase().includes('hrsm');
};

export default {
    PERMISSIONS,
    ROLES,
    hasPermission,
    requirePermission,
    requireRole,
    requireAdmin,
    requireWrite,
    requireRead,
    isPlatformAdmin,
    isHRSMBackend
};
