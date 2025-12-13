import { verifyTenantToken } from '../../core/auth/tenantAuth.js';
import { ROLES, ROLE_HIERARCHY } from '../constants/modules.js';

export const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = verifyTenantToken(token);
        req.user = {
            id: decoded.userId,
            role: decoded.role,
            tenantId: decoded.tenantId
        };
        req.tenantId = decoded.tenantId; // Set tenantId for tenant-scoped operations

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const hasPermission = allowedRoles.some(role => {
            // Check if user's role hierarchy is >= required role
            return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role];
        });

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

export const requireSelfOrRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.params.userId || req.params.id;
        const isSelf = userId === req.user.id;

        const hasRolePermission = allowedRoles.some(role => {
            return ROLE_HIERARCHY[req.user.role] >= ROLE_HIERARCHY[role];
        });

        if (!isSelf && !hasRolePermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

export default { requireAuth, requireRole, requireSelfOrRole };
