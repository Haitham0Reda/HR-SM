/**
 * Permission Check Middleware
 * 
 * Advanced permission validation with granular access control
 */

/**
 * Check if user has specific permission
 * @param {String|Array} requiredPermissions - Permission(s) required
 * @param {Object} options - Additional options
 */
export const checkPermission = (requiredPermissions, options = {}) => {
    const { requireAll = false, allowSelf = false } = options;

    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const permissions = Array.isArray(requiredPermissions)
                ? requiredPermissions
                : [requiredPermissions];

            // Check if user has required permissions
            let hasAccess = false;

            if (requireAll) {
                hasAccess = await req.user.hasAllPermissions(permissions);
            } else {
                hasAccess = await req.user.hasAnyPermission(permissions);
            }

            // Allow self-access if enabled
            if (!hasAccess && allowSelf && req.params.id) {
                hasAccess = req.user._id.toString() === req.params.id.toString();
            }

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to perform this action',
                    required: permissions
                });
            }

            next();
        } catch (error) {

            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Check if user can view reports/documentation
 */
export const canViewReports = checkPermission('reports.view');

/**
 * Check if user can manage permissions
 */
export const canManagePermissions = checkPermission('users.manage-permissions');

/**
 * Check if user can manage roles
 */
export const canManageRoles = checkPermission('users.manage-roles');

/**
 * Check if user can view confidential documents
 */
export const canViewConfidential = checkPermission('documents.view-confidential');

/**
 * Check if user can approve leaves
 */
export const canApproveLeaves = checkPermission('leaves.approve');

/**
 * Check if user can manage payroll
 */
export const canManagePayroll = checkPermission(['payroll.create', 'payroll.edit', 'payroll.process'], { requireAll: false });

/**
 * Check if user can print ID cards
 */
export const canPrintIDCards = checkPermission('id-cards.print');

/**
 * Check if user can manage ID card batches
 */
export const canManageBatches = checkPermission('id-cards.manage-batches');

/**
 * Check if user can view audit logs
 */
export const canViewAudit = checkPermission('audit.view');

/**
 * Check if user can manage system settings
 */
export const canManageSettings = checkPermission('settings.edit');

/**
 * Check if user can manage security settings
 */
export const canManageSecurity = checkPermission('settings.manage-security');

/**
 * Middleware to attach user permissions to request
 */
export const attachUserPermissions = async (req, res, next) => {
    try {
        if (req.user) {
            req.userPermissions = await req.user.getEffectivePermissions();
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Middleware to check if user owns the resource
 */
export const checkOwnership = (resourceField = 'employee') => {
    return async (req, res, next) => {
        try {
            // If user is admin/HR, allow access
            if (['admin', 'hr'].includes(req.user.role)) {
                return next();
            }

            // Check if resource belongs to user
            const resourceId = req.body[resourceField] || req.params[resourceField];

            if (resourceId && resourceId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only access your own resources'
                });
            }

            next();
        } catch (error) {

            return res.status(500).json({
                success: false,
                message: 'Error checking resource ownership'
            });
        }
    };
};

/**
 * Middleware factory for resource-specific permissions
 * Automatically handles view-own permissions
 */
export const resourcePermission = (resource, action, options = {}) => {
    const { allowOwn = true } = options;

    return async (req, res, next) => {
        const fullPermission = `${resource}.${action}`;
        const ownPermission = `${resource}.${action}-own`;

        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check for full permission
            const hasFull = await req.user.hasPermission(fullPermission);
            if (hasFull) {
                return next();
            }

            // Check for own permission if allowed
            if (allowOwn) {
                const hasOwn = await req.user.hasPermission(ownPermission);
                if (hasOwn) {
                    // Attach filter to only show own resources
                    req.ownershipFilter = { employee: req.user._id };
                    return next();
                }
            }

            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        } catch (error) {

            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

export default {
    checkPermission,
    canViewReports,
    canManagePermissions,
    canManageRoles,
    canViewConfidential,
    canApproveLeaves,
    canManagePayroll,
    canPrintIDCards,
    canManageBatches,
    canViewAudit,
    canManageSettings,
    canManageSecurity,
    attachUserPermissions,
    checkOwnership,
    resourcePermission
};
