/**
 * Company Logging Middleware
 * Automatically sets up company-specific logging for requests
 * Enhanced to support new company-based routing structure
 */

import { getLoggerForTenant } from '../utils/companyLogger.js';
import logger from '../utils/logger.js';

/**
 * Extract company slug from URL path
 * @param {string} pathname - The request pathname
 * @returns {string|null} Company slug or null if not a company route
 */
function extractCompanySlugFromPath(pathname) {
    const match = pathname.match(/^\/company\/([^\/]+)/);
    return match ? match[1] : null;
}

/**
 * Extract internal path from company route
 * @param {string} pathname - The request pathname
 * @returns {string} Internal path within company context
 */
function extractInternalPath(pathname) {
    const match = pathname.match(/^\/company\/[^\/]+(.*)$/);
    return match ? (match[1] || '/') : pathname;
}

/**
 * Convert slug back to company name format
 * @param {string} slug - The URL slug
 * @returns {string} Display-friendly company name
 */
function slugToCompanyName(slug) {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Middleware to add company logger to request object
 * Enhanced to support company-based routing
 */
export function setupCompanyLogging(req, res, next) {
    try {
        // Extract company info from URL path (new routing structure)
        const companySlugFromPath = extractCompanySlugFromPath(req.path);
        const internalPath = extractInternalPath(req.path);
        
        // Extract tenant info from various possible sources
        let tenantId = req.tenantId || 
                      req.tenant?.tenantId || 
                      req.headers['x-tenant-id'] || 
                      req.query.tenantId ||
                      req.body?.tenantId;
        
        let companyName = req.tenant?.name || 
                         req.headers['x-company-name'] ||
                         req.query.companyName ||
                         req.body?.companyName ||
                         (companySlugFromPath ? slugToCompanyName(companySlugFromPath) : null);
        
        // For API routes, try to get tenant info from authenticated user (set by auth middleware)
        if (!tenantId && req.user?.tenantId) {
            tenantId = req.user.tenantId;
        }
        
        // If we still don't have company name but have tenant ID, derive it
        if (!companyName && tenantId) {
            // For known tenant IDs, set the company name
            if (tenantId === 'techcorp-solutions-d8f0689c') {
                companyName = 'TechCorp Solutions';
            }
        }
        
        // Determine if this is a company-scoped request
        const isCompanyRoute = !!companySlugFromPath;
        
        if (tenantId || isCompanyRoute) {
            // Add company logger to request
            req.companyLogger = getLoggerForTenant(tenantId || companySlugFromPath, companyName);
            
            // Add routing context to request for easy access
            if (!req.tenantId && tenantId) req.tenantId = tenantId;
            if (!req.companyName && companyName) req.companyName = companyName;
            req.companySlug = companySlugFromPath;
            req.internalPath = internalPath;
            req.isCompanyRoute = isCompanyRoute;
            
            // Log the request with enhanced routing context
            if (process.env.LOG_REQUESTS !== 'false') {
                const logData = {
                    method: req.method,
                    url: req.originalUrl,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    userId: req.user?.id,
                    userEmail: req.user?.email
                };
                
                // Add company routing context
                if (isCompanyRoute) {
                    logData.routing = {
                        isCompanyRoute: true,
                        companySlug: companySlugFromPath,
                        internalPath: internalPath,
                        companyName: companyName
                    };
                }
                
                req.companyLogger.info('Request received', logData);
            }
        } else {
            // Fallback to global logger if no tenant info
            req.companyLogger = logger;
        }
        
        next();
    } catch (error) {
        logger.error('Failed to setup company logging:', error);
        req.companyLogger = logger; // Fallback to global logger
        next();
    }
}

/**
 * Middleware to log response completion
 * Enhanced with company routing context
 */
export function logResponseCompletion(req, res, next) {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to log completion
    res.end = function(chunk, encoding) {
        // Call original end function
        originalEnd.call(this, chunk, encoding);
        
        // Log response completion if company logger is available
        if (req.companyLogger && process.env.LOG_RESPONSES !== 'false') {
            // Ensure we have the correct company logger for authenticated requests
            if (req.user?.tenantId) {
                req.tenantId = req.user.tenantId;
                // Re-create company logger with correct tenant info to ensure file logging
                req.companyLogger = getLoggerForTenant(req.user.tenantId, req.companyName || 'TechCorp Solutions');
            }
            const responseTime = Date.now() - req.startTime;
            
            const logData = {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime: responseTime + 'ms',
                userId: req.user?.id,
                userEmail: req.user?.email
            };
            
            // Add company routing context if available
            if (req.isCompanyRoute) {
                logData.routing = {
                    isCompanyRoute: true,
                    companySlug: req.companySlug,
                    internalPath: req.internalPath,
                    companyName: req.companyName
                };
            }
            
            req.companyLogger.info('Request completed', logData);
            
            // Also log user activity if user is authenticated and this is an API route
            if (req.user && (req.isCompanyRoute || req.originalUrl.includes('/api/v1/'))) {
                const activityType = determineActivityType(req.method, req.path, req.body);
                
                const activityData = {
                    eventType: 'user_activity',
                    activityType: activityType,
                    userId: req.user.id,
                    userEmail: req.user.email,
                    userName: req.user.name || req.user.firstName + ' ' + req.user.lastName,
                    userRole: req.user.role,
                    companySlug: req.companySlug,
                    companyName: req.companyName,
                    method: req.method,
                    internalPath: req.internalPath || req.path,
                    fullUrl: req.originalUrl,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    sessionId: req.sessionID || req.headers['x-session-id'],
                    timestamp: new Date().toISOString(),
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    // Additional context
                    referer: req.get('Referer'),
                    requestBody: sanitizeRequestBody(req.body, activityType),
                    queryParams: req.query
                };
                
                req.companyLogger.info('User activity tracked', activityData);
            }
        }
    };
    
    // Store request start time
    req.startTime = Date.now();
    next();
}

/**
 * Error logging middleware for company-specific errors
 * Enhanced with company routing context
 */
export function logCompanyErrors(err, req, res, next) {
    const logData = {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        userEmail: req.user?.email,
        statusCode: err.statusCode || 500
    };
    
    // Add company routing context if available
    if (req.isCompanyRoute) {
        logData.routing = {
            isCompanyRoute: true,
            companySlug: req.companySlug,
            internalPath: req.internalPath,
            companyName: req.companyName
        };
    }
    
    if (req.companyLogger) {
        req.companyLogger.error('Request error', logData);
    } else {
        logger.error('Request error (no company context)', logData);
    }
    
    next(err);
}

/**
 * Middleware to log security events
 * Enhanced with company routing context
 */
export function logSecurityEvent(eventType, details = {}) {
    return (req, res, next) => {
        if (req.companyLogger) {
            const logData = {
                eventType,
                ...details,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                userEmail: req.user?.email,
                timestamp: new Date().toISOString()
            };
            
            // Add company routing context if available
            if (req.isCompanyRoute) {
                logData.routing = {
                    isCompanyRoute: true,
                    companySlug: req.companySlug,
                    internalPath: req.internalPath,
                    companyName: req.companyName
                };
            }
            
            req.companyLogger.security(`Security event: ${eventType}`, logData);
        }
        next();
    };
}

/**
 * Middleware to log audit events
 * Enhanced with company routing context
 */
export function logAuditEvent(eventType, details = {}) {
    return (req, res, next) => {
        if (req.companyLogger) {
            const logData = {
                eventType,
                ...details,
                method: req.method,
                url: req.originalUrl,
                userId: req.user?.id,
                userEmail: req.user?.email,
                timestamp: new Date().toISOString()
            };
            
            // Add company routing context if available
            if (req.isCompanyRoute) {
                logData.routing = {
                    isCompanyRoute: true,
                    companySlug: req.companySlug,
                    internalPath: req.internalPath,
                    companyName: req.companyName
                };
            }
            
            req.companyLogger.audit(`Audit event: ${eventType}`, logData);
        }
        next();
    };
}

/**
 * Middleware to log company navigation events
 * Tracks user navigation within company-scoped routes
 */
export function logCompanyNavigation(req, res, next) {
    if (req.isCompanyRoute && req.companyLogger) {
        const navigationData = {
            eventType: 'navigation',
            companySlug: req.companySlug,
            internalPath: req.internalPath,
            companyName: req.companyName,
            method: req.method,
            url: req.originalUrl,
            referrer: req.get('Referer'),
            userId: req.user?.id,
            userEmail: req.user?.email,
            timestamp: new Date().toISOString()
        };
        
        req.companyLogger.info('Company navigation', navigationData);
    }
    next();
}

/**
 * Middleware to log company route access patterns
 * Helps track which company features are being used
 */
export function logRouteAccess(req, res, next) {
    if (req.isCompanyRoute && req.companyLogger) {
        // Determine the feature/module being accessed
        const pathSegments = req.internalPath.split('/').filter(Boolean);
        const primaryFeature = pathSegments[0] || 'dashboard';
        const subFeature = pathSegments[1] || null;
        
        const accessData = {
            eventType: 'route_access',
            companySlug: req.companySlug,
            companyName: req.companyName,
            feature: primaryFeature,
            subFeature: subFeature,
            fullPath: req.internalPath,
            method: req.method,
            userId: req.user?.id,
            userEmail: req.user?.email,
            timestamp: new Date().toISOString()
        };
        
        req.companyLogger.info('Route access', accessData);
    }
    next();
}

/**
 * Helper function to log company-specific events from controllers
 * @param {Object} req - Express request object
 * @param {string} eventType - Type of event
 * @param {Object} details - Additional event details
 */
export function logCompanyEvent(req, eventType, details = {}) {
    if (req.companyLogger) {
        const eventData = {
            eventType,
            ...details,
            companySlug: req.companySlug,
            companyName: req.companyName,
            internalPath: req.internalPath,
            userId: req.user?.id,
            userEmail: req.user?.email,
            timestamp: new Date().toISOString()
        };
        
        req.companyLogger.info(`Company event: ${eventType}`, eventData);
    }
}

/**
 * Enhanced user activity tracking middleware
 * Tracks detailed user actions and behaviors
 */
export function trackUserActivity(req, res, next) {
    // Track activities for both company routes and API routes with authenticated users
    const isApiRoute = req.originalUrl.includes('/api/v1/');
    const shouldTrack = (req.isCompanyRoute || isApiRoute) && req.companyLogger && req.user;
    
    if (shouldTrack) {
        // Determine activity type based on method and path
        const activityType = determineActivityType(req.method, req.internalPath, req.body);
        
        // Extract detailed activity information
        const activityData = {
            eventType: 'user_activity',
            activityType: activityType,
            userId: req.user.id,
            userEmail: req.user.email,
            userName: req.user.name || req.user.firstName + ' ' + req.user.lastName,
            userRole: req.user.role,
            companySlug: req.companySlug,
            companyName: req.companyName,
            method: req.method,
            internalPath: req.internalPath,
            fullUrl: req.originalUrl,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            sessionId: req.sessionID || req.headers['x-session-id'],
            timestamp: new Date().toISOString(),
            // Additional context
            referer: req.get('Referer'),
            requestBody: sanitizeRequestBody(req.body, activityType),
            queryParams: req.query
        };
        
        req.companyLogger.info('User activity tracked', activityData);
        
        // Store activity data in request for potential use by controllers
        req.userActivity = activityData;
    }
    next();
}

/**
 * Determine the type of user activity based on request details
 * @param {string} method - HTTP method
 * @param {string} path - Internal path
 * @param {Object} body - Request body
 * @returns {string} Activity type
 */
function determineActivityType(method, path, body = {}) {
    const pathSegments = path.split('/').filter(Boolean);
    const resource = pathSegments[0] || 'dashboard';
    const action = pathSegments[1];
    const id = pathSegments[2];
    
    // Map common patterns to activity types
    if (method === 'GET') {
        if (path === '/' || path === '/dashboard') return 'dashboard_view';
        if (action === 'create') return `${resource}_create_form`;
        if (id && action === 'edit') return `${resource}_edit_form`;
        if (id) return `${resource}_view`;
        return `${resource}_list`;
    }
    
    if (method === 'POST') {
        if (action === 'search') return `${resource}_search`;
        if (path.includes('upload')) return `${resource}_upload`;
        return `${resource}_create`;
    }
    
    if (method === 'PUT' || method === 'PATCH') {
        return `${resource}_update`;
    }
    
    if (method === 'DELETE') {
        return `${resource}_delete`;
    }
    
    return 'unknown_activity';
}

/**
 * Sanitize request body for logging (remove sensitive data)
 * @param {Object} body - Request body
 * @param {string} activityType - Type of activity
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body, activityType) {
    if (!body || typeof body !== 'object') return {};
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    // Limit size of logged data
    const maxSize = 1000; // characters
    const stringified = JSON.stringify(sanitized);
    if (stringified.length > maxSize) {
        return { _truncated: true, _size: stringified.length, _preview: stringified.substring(0, maxSize) };
    }
    
    return sanitized;
}

/**
 * Track user session events (login, logout, session timeout)
 */
export function trackUserSession(eventType, req, additionalData = {}) {
    if (req.companyLogger && req.user) {
        const sessionData = {
            eventType: 'user_session',
            sessionEventType: eventType,
            userId: req.user.id,
            userEmail: req.user.email,
            userName: req.user.name || req.user.firstName + ' ' + req.user.lastName,
            companySlug: req.companySlug,
            companyName: req.companyName,
            sessionId: req.sessionID || req.headers['x-session-id'],
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            ...additionalData
        };
        
        req.companyLogger.info(`User session: ${eventType}`, sessionData);
    }
}

export default {
    setupCompanyLogging,
    logResponseCompletion,
    logCompanyErrors,
    logSecurityEvent,
    logAuditEvent,
    logCompanyNavigation,
    logRouteAccess,
    logCompanyEvent,
    trackUserActivity,
    trackUserSession
};