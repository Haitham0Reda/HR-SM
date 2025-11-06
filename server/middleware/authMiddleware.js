import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Protect middleware - Verify JWT token and attach user to request
 */
export const protect = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password').populate('department position school');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * Admin only middleware - Requires admin role
 */
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

/**
 * HR or Admin middleware - Requires HR or Admin role
 */
export const hrOrAdmin = (req, res, next) => {
    if (req.user && ['hr', 'admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({
            message: 'Access denied. HR or Admin role required.'
        });
    }
};

/**
 * HR only middleware - Requires HR role
 */
export const hr = (req, res, next) => {
    if (req.user && req.user.role === 'hr') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as HR' });
    }
};

/**
 * Manager or above middleware - Requires manager, HR, or admin role
 */
export const managerOrAbove = (req, res, next) => {
    if (req.user && ['manager', 'hr', 'admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({
            message: 'Access denied. Manager role or above required.'
        });
    }
};

/**
 * ID Card Admin middleware - Requires id-card-admin, HR, or admin role
 */
export const idCardAdmin = (req, res, next) => {
    if (req.user && ['id-card-admin', 'hr', 'admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({
            message: 'Access denied. ID Card Admin role required.'
        });
    }
};

/**
 * Supervisor or above middleware - Requires supervisor, manager, HR, or admin role
 */
export const supervisorOrAbove = (req, res, next) => {
    if (req.user && ['supervisor', 'manager', 'hr', 'admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({
            message: 'Access denied. Supervisor role or above required.'
        });
    }
};

/**
 * Custom role check middleware factory
 * @param {Array<String>} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export const checkRole = (roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }
    };
};

/**
 * Check if user is active middleware
 */
export const checkActive = (req, res, next) => {
    if (req.user && req.user.isActive && req.user.employment?.employmentStatus === 'active') {
        next();
    } else {
        res.status(403).json({
            message: 'Account is inactive or employment status is not active.'
        });
    }
};

/**
 * Self or Admin middleware - User can access own resources or admin can access any
 * @param {String} paramName - Name of the parameter containing user ID (default: 'id')
 */
export const selfOrAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        const targetUserId = req.params[paramName] || req.body.employee || req.body.userId;

        if (req.user.role === 'admin' || req.user._id.toString() === targetUserId?.toString()) {
            next();
        } else {
            res.status(403).json({
                message: 'Access denied. You can only access your own resources.'
            });
        }
    };
};
