import logger from '../utils/logger.js';

/**
 * Enhanced activity logging middleware
 * Logs detailed information about user actions including:
 * - User identity (ID, email, username, role)
 * - Request details (method, path, IP, user agent)
 * - Request body (sanitized)
 * - Timestamp
 */
export const logUserActivity = (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response
    res.end = function (chunk, encoding) {
        // Restore original end
        res.end = originalEnd;

        // Log the activity if user is authenticated
        if (req.user) {
            const activityLog = {
                userId: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                action: `${req.method} ${req.path}`,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                timestamp: new Date().toISOString()
            };

            // Add department and position if available
            if (req.user.department) {
                activityLog.department = req.user.department.name || req.user.department;
            }
            if (req.user.position) {
                activityLog.position = req.user.position.title || req.user.position;
            }

            // Sanitize and add request body for POST/PUT/PATCH (exclude sensitive data)
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                const sanitizedBody = { ...req.body };
                // Remove sensitive fields
                delete sanitizedBody.password;
                delete sanitizedBody.newPassword;
                delete sanitizedBody.currentPassword;
                delete sanitizedBody.token;

                // Only log if there's something left after sanitization
                if (Object.keys(sanitizedBody).length > 0) {
                    activityLog.requestData = sanitizedBody;
                }
            }

            // Add query parameters if present
            if (Object.keys(req.query).length > 0) {
                activityLog.queryParams = req.query;
            }

            // Log with appropriate level based on status code
            if (res.statusCode >= 500) {
                logger.error('User action failed with server error', activityLog);
            } else if (res.statusCode >= 400) {
                logger.warn('User action failed with client error', activityLog);
            } else {
                logger.info('User action', activityLog);
            }
        }

        // Call original end
        res.end(chunk, encoding);
    };

    next();
};

/**
 * Log authentication events (login, logout, failed attempts)
 */
export const logAuthEvent = (eventType, user, req, additionalInfo = {}) => {
    const authLog = {
        event: eventType,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        ...additionalInfo
    };

    if (user) {
        authLog.userId = user._id;
        authLog.username = user.username;
        authLog.email = user.email;
        authLog.role = user.role;
    }

    switch (eventType) {
        case 'LOGIN_SUCCESS':
            logger.info('User logged in successfully', authLog);
            break;
        case 'LOGIN_FAILED':
            logger.warn('Failed login attempt', authLog);
            break;
        case 'LOGOUT':
            logger.info('User logged out', authLog);
            break;
        case 'TOKEN_EXPIRED':
            logger.warn('Token expired', authLog);
            break;
        case 'UNAUTHORIZED_ACCESS':
            logger.warn('Unauthorized access attempt', authLog);
            break;
        case 'PASSWORD_RESET_REQUEST':
            logger.info('Password reset requested', authLog);
            break;
        case 'PASSWORD_RESET_SUCCESS':
            logger.info('Password reset successful', authLog);
            break;
        default:
            logger.info('Authentication event', authLog);
    }
};

/**
 * Log data modification events (create, update, delete)
 */
export const logDataModification = (action, resourceType, resourceId, user, changes = {}) => {
    const modLog = {
        action,
        resourceType,
        resourceId,
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        changes,
        timestamp: new Date().toISOString()
    };

    logger.info(`Data modification: ${action} ${resourceType}`, modLog);
};

/**
 * Log access control events (permission checks, role changes)
 */
export const logAccessControl = (eventType, user, req, details = {}) => {
    const accessLog = {
        event: eventType,
        userId: user?._id,
        username: user?.username,
        email: user?.email,
        role: user?.role,
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString(),
        ...details
    };

    if (eventType.includes('DENIED') || eventType.includes('FAILED')) {
        logger.warn('Access control event', accessLog);
    } else {
        logger.info('Access control event', accessLog);
    }
};
