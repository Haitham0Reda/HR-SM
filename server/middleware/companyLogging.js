/**
 * Company Logging Middleware
 * Automatically sets up company-specific logging for requests
 * Enhanced to support new company-based routing structure with correlation IDs and security detection
 * 
 * Requirements: 1.2, 4.2, 4.3
 */

import { getLoggerForTenant } from '../utils/companyLogger.js';
import logger from '../utils/logger.js';
import { correlationMiddleware, generateCorrelationId } from '../services/correlationId.service.js';
import backendSecurityDetectionService from '../services/backendSecurityDetection.service.js';
import platformLogger from '../utils/platformLogger.js';
import loggingModuleService from '../services/loggingModule.service.js';

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
 * Enhanced middleware to add company logger to request object
 * Now includes correlation ID generation, security detection, and comprehensive logging
 * 
 * Requirements: 1.2, 4.2, 4.3
 */
export function setupCompanyLogging(req, res, next) {
    try {
        // Generate or extract correlation ID first
        let correlationId = req.headers['x-correlation-id'] || 
                           req.headers['correlation-id'] ||
                           req.get('X-Correlation-ID');
        
        if (!correlationId) {
            correlationId = generateCorrelationId('req');
        }
        
        // Add correlation ID to request and response
        req.correlationId = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);
        
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
        } else {
            // Fallback to global logger if no tenant info
            req.companyLogger = logger;
        }
        
        // Perform security analysis on the request (module-aware)
        try {
            const securityThreats = await backendSecurityDetectionService.analyzeRequest(req, tenantId);
            
            // If threats detected, log them and potentially block request
            if (securityThreats.length > 0) {
                const criticalThreats = securityThreats.filter(threat => threat.severity === 'critical');
                
                if (criticalThreats.length > 0) {
                    // Log critical security threat
                    const threatLog = {
                        correlationId,
                        securityThreats: criticalThreats,
                        method: req.method,
                        url: req.originalUrl,
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        userId: req.user?.id,
                        tenantId,
                        blocked: true,
                        moduleAware: true
                    };
                    
                    if (req.companyLogger) {
                        req.companyLogger.security('Critical security threat detected - request blocked', threatLog);
                    }
                    
                    platformLogger.platformSecurity('critical_threat_blocked', threatLog);
                    
                    // Block the request for critical threats
                    return res.status(403).json({
                        success: false,
                        error: 'Request blocked due to security policy violation',
                        correlationId: correlationId
                    });
                }
                
                // Log non-critical threats but allow request to continue
                const threatLog = {
                    correlationId,
                    securityThreats,
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    userId: req.user?.id,
                    tenantId,
                    blocked: false,
                    moduleAware: true
                };
                
                if (req.companyLogger) {
                    req.companyLogger.security('Security threats detected', threatLog);
                }
            }
        } catch (securityError) {
            // Don't block request if security analysis fails, but log the error
            platformLogger.error('Security analysis failed', {
                correlationId,
                error: securityError.message,
                stack: securityError.stack,
                url: req.originalUrl
            });
        }
        
        // Enhanced request logging with correlation ID and security context (module-aware)
        const shouldLogRequest = await shouldPerformLogging(tenantId, 'request_logging');
        if (process.env.LOG_REQUESTS !== 'false' && shouldLogRequest) {
            const logData = {
                correlationId,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                userId: req.user?.id,
                userEmail: req.user?.email,
                sessionId: req.sessionID || req.headers['x-session-id'],
                timestamp: new Date().toISOString(),
                referer: req.get('Referer')
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
            
            // Add tenant context
            if (tenantId) {
                logData.tenantContext = {
                    tenantId,
                    companyName
                };
            }
            
            req.companyLogger.info('Request received', logData);
        }
        
        // Store request start time for performance monitoring
        req.startTime = Date.now();
        
        next();
    } catch (error) {
        logger.error('Failed to setup company logging:', {
            error: error.message,
            stack: error.stack,
            url: req.originalUrl,
            correlationId: req.correlationId
        });
        req.companyLogger = logger; // Fallback to global logger
        next();
    }
}

/**
 * Enhanced middleware to log response completion
 * Now includes correlation ID, performance metrics, and comprehensive activity tracking
 * 
 * Requirements: 1.2, 4.2, 4.3
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
            
            const responseTime = Date.now() - (req.startTime || Date.now());
            const isSlowRequest = responseTime > 5000; // 5 seconds
            const isError = res.statusCode >= 400;
            
            const logData = {
                correlationId: req.correlationId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime: responseTime,
                responseTimeMs: responseTime + 'ms',
                userId: req.user?.id,
                userEmail: req.user?.email,
                sessionId: req.sessionID || req.headers['x-session-id'],
                timestamp: new Date().toISOString(),
                isSlowRequest,
                isError
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
            
            // Add tenant context
            if (req.tenantId) {
                logData.tenantContext = {
                    tenantId: req.tenantId,
                    companyName: req.companyName
                };
            }
            
            // Add performance metrics
            logData.performance = {
                responseTime,
                isSlowRequest,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };
            
            // Log with appropriate level based on response
            if (isError) {
                req.companyLogger.warn('Request completed with error', logData);
            } else if (isSlowRequest) {
                req.companyLogger.warn('Slow request completed', logData);
            } else {
                req.companyLogger.info('Request completed', logData);
            }
            
            // Log performance metrics to platform logger if slow
            if (isSlowRequest) {
                platformLogger.systemPerformance({
                    eventType: 'slow_request',
                    correlationId: req.correlationId,
                    url: req.originalUrl,
                    method: req.method,
                    responseTime,
                    tenantId: req.tenantId,
                    userId: req.user?.id
                });
            }
            
            // Also log user activity if user is authenticated and this is an API route
            if (req.user && (req.isCompanyRoute || req.originalUrl.includes('/api/v1/'))) {
                const activityType = determineActivityType(req.method, req.path, req.body);
                
                const activityData = {
                    eventType: 'user_activity',
                    activityType: activityType,
                    correlationId: req.correlationId,
                    userId: req.user.id,
                    userEmail: req.user.email,
                    userName: req.user.name || req.user.firstName + ' ' + req.user.lastName,
                    userRole: req.user.role,
                    companySlug: req.companySlug,
                    companyName: req.companyName,
                    tenantId: req.tenantId,
                    method: req.method,
                    internalPath: req.internalPath || req.path,
                    fullUrl: req.originalUrl,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    sessionId: req.sessionID || req.headers['x-session-id'],
                    timestamp: new Date().toISOString(),
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    success: !isError,
                    // Additional context
                    referer: req.get('Referer'),
                    requestBody: sanitizeRequestBody(req.body, activityType),
                    queryParams: req.query
                };
                
                req.companyLogger.info('User activity tracked', activityData);
                
                // Log authentication events if this is an auth-related endpoint
                if (req.originalUrl.includes('/auth/') || req.originalUrl.includes('/login') || req.originalUrl.includes('/logout')) {
                    const authEventType = determineAuthEventType(req.originalUrl, req.method, res.statusCode);
                    if (authEventType) {
                        const authThreats = backendSecurityDetectionService.analyzeAuthenticationEvent(
                            authEventType, 
                            req.user.id, 
                            req.ip, 
                            req.tenantId, 
                            { correlationId: req.correlationId, statusCode: res.statusCode }
                        );
                        
                        if (authThreats.length > 0) {
                            req.companyLogger.security('Authentication security threats detected', {
                                correlationId: req.correlationId,
                                authEventType,
                                threats: authThreats,
                                userId: req.user.id,
                                ip: req.ip
                            });
                        }
                    }
                }
            }
        }
    };
    
    // Store request start time if not already set
    if (!req.startTime) {
        req.startTime = Date.now();
    }
    
    next();
}

/**
 * Enhanced error logging middleware for company-specific errors
 * Now includes correlation ID, security analysis, and comprehensive error context
 * 
 * Requirements: 1.4, 4.2, 4.3
 */
export function logCompanyErrors(err, req, res, next) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    const logData = {
        correlationId: req.correlationId,
        error: err.message,
        stack: err.stack,
        errorCode: err.code,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        userEmail: req.user?.email,
        sessionId: req.sessionID || req.headers['x-session-id'],
        statusCode: err.statusCode || 500,
        responseTime,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
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
    
    // Add tenant context
    if (req.tenantId) {
        logData.tenantContext = {
            tenantId: req.tenantId,
            companyName: req.companyName
        };
    }
    
    // Add request context for debugging
    logData.requestContext = {
        headers: sanitizeHeaders(req.headers),
        query: req.query,
        body: sanitizeRequestBody(req.body, 'error'),
        params: req.params
    };
    
    // Determine error severity
    const isCriticalError = err.statusCode >= 500 || err.name === 'DatabaseError' || err.name === 'SecurityError';
    const isSecurityError = err.name === 'SecurityError' || err.message.includes('security') || err.message.includes('unauthorized');
    
    logData.errorSeverity = isCriticalError ? 'critical' : (err.statusCode >= 400 ? 'high' : 'medium');
    logData.isSecurityError = isSecurityError;
    
    // Log the error with appropriate level
    if (req.companyLogger) {
        if (isCriticalError) {
            req.companyLogger.error('Critical request error', logData);
        } else if (isSecurityError) {
            req.companyLogger.security('Security-related request error', logData);
        } else {
            req.companyLogger.warn('Request error', logData);
        }
    } else {
        logger.error('Request error (no company context)', logData);
    }
    
    // Log to platform logger for critical errors
    if (isCriticalError) {
        platformLogger.systemHealth('request-error', 'critical', {
            correlationId: req.correlationId,
            error: err.message,
            statusCode: err.statusCode || 500,
            url: req.originalUrl,
            tenantId: req.tenantId,
            userId: req.user?.id,
            errorType: err.name || 'UnknownError'
        });
    }
    
    // Analyze error for security implications
    if (isSecurityError && req.user) {
        try {
            const securityThreats = backendSecurityDetectionService.analyzeAuthenticationEvent(
                'error_occurred',
                req.user.id,
                req.ip,
                req.tenantId,
                {
                    correlationId: req.correlationId,
                    errorMessage: err.message,
                    statusCode: err.statusCode || 500,
                    url: req.originalUrl
                }
            );
            
            if (securityThreats.length > 0) {
                if (req.companyLogger) {
                    req.companyLogger.security('Security threats detected from error analysis', {
                        correlationId: req.correlationId,
                        threats: securityThreats,
                        originalError: err.message
                    });
                }
            }
        } catch (securityAnalysisError) {
            // Don't let security analysis errors break error handling
            platformLogger.warn('Security analysis failed during error handling', {
                correlationId: req.correlationId,
                originalError: err.message,
                analysisError: securityAnalysisError.message
            });
        }
    }
    
    next(err);
}

/**
 * Sanitize headers for logging (remove sensitive information)
 * @param {Object} headers - Request headers
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    });
    
    return sanitized;
}

/**
 * Enhanced middleware to log security events
 * Now includes correlation ID, threat analysis, and comprehensive security context
 * 
 * Requirements: 7.1, 7.2, 9.1, 9.2
 */
export function logSecurityEvent(eventType, details = {}) {
    return (req, res, next) => {
        if (req.companyLogger) {
            const logData = {
                correlationId: req.correlationId,
                eventType,
                securityEventType: eventType,
                ...details,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                userEmail: req.user?.email,
                sessionId: req.sessionID || req.headers['x-session-id'],
                timestamp: new Date().toISOString(),
                severity: details.severity || 'medium'
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
            
            // Add tenant context
            if (req.tenantId) {
                logData.tenantContext = {
                    tenantId: req.tenantId,
                    companyName: req.companyName
                };
            }
            
            // Add security context
            logData.securityContext = {
                threatLevel: details.severity || 'medium',
                blocked: details.blocked || false,
                actionTaken: details.actionTaken || 'logged',
                riskScore: details.riskScore || 0
            };
            
            req.companyLogger.security(`Security event: ${eventType}`, logData);
            
            // Log to platform logger for high/critical security events
            if (details.severity === 'high' || details.severity === 'critical') {
                platformLogger.platformSecurity(`Company Security Event: ${eventType}`, {
                    ...logData,
                    tenantId: req.tenantId,
                    companyName: req.companyName
                });
            }
        }
        next();
    };
}

/**
 * Enhanced middleware to log audit events
 * Now includes correlation ID, compliance tracking, and comprehensive audit context
 * 
 * Requirements: 2.1, 2.2, 2.4, 7.5
 */
export function logAuditEvent(eventType, details = {}) {
    return (req, res, next) => {
        if (req.companyLogger) {
            const logData = {
                correlationId: req.correlationId,
                eventType,
                auditEventType: eventType,
                ...details,
                method: req.method,
                url: req.originalUrl,
                userId: req.user?.id,
                userEmail: req.user?.email,
                userRole: req.user?.role,
                sessionId: req.sessionID || req.headers['x-session-id'],
                timestamp: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
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
            
            // Add tenant context
            if (req.tenantId) {
                logData.tenantContext = {
                    tenantId: req.tenantId,
                    companyName: req.companyName
                };
            }
            
            // Add audit context
            logData.auditContext = {
                complianceLevel: details.complianceLevel || 'standard',
                retentionPeriod: details.retentionPeriod || 'standard',
                tamperProof: true,
                auditTrailId: `audit_${req.correlationId}_${Date.now()}`,
                dataClassification: details.dataClassification || 'internal'
            };
            
            // Add data access context if this is a data operation
            if (details.dataAccessed) {
                logData.dataAccess = {
                    dataType: details.dataType || 'unknown',
                    recordsAffected: details.recordsAffected || 0,
                    operation: details.operation || req.method,
                    sensitiveData: details.sensitiveData || false
                };
            }
            
            req.companyLogger.audit(`Audit event: ${eventType}`, logData);
            
            // Log sensitive data access to platform logger
            if (details.sensitiveData || details.complianceLevel === 'high') {
                platformLogger.adminAction(`Sensitive Data Access: ${eventType}`, req.user?.id || 'unknown', {
                    ...logData,
                    tenantId: req.tenantId,
                    companyName: req.companyName,
                    sensitiveDataAccess: true
                });
            }
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
 * Determine authentication event type from URL and response
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @param {number} statusCode - Response status code
 * @returns {string|null} Authentication event type
 */
function determineAuthEventType(url, method, statusCode) {
    if (method === 'POST') {
        if (url.includes('/login') || url.includes('/auth/login')) {
            return statusCode === 200 ? 'login_success' : 'login_failed';
        }
        if (url.includes('/logout') || url.includes('/auth/logout')) {
            return 'logout';
        }
        if (url.includes('/password-reset') || url.includes('/auth/password-reset')) {
            return 'password_reset_request';
        }
        if (url.includes('/register') || url.includes('/auth/register')) {
            return statusCode === 201 ? 'registration_success' : 'registration_failed';
        }
    }
    return null;
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

/**
 * Check if logging should be performed based on module settings
 * @param {string} tenantId - Tenant ID
 * @param {string} logType - Type of logging to check
 * @returns {boolean} Whether logging should be performed
 */
async function shouldPerformLogging(tenantId, logType) {
    if (!tenantId) {
        return true; // Always log for platform-level requests
    }
    
    try {
        const moduleConfig = await loggingModuleService.getConfig(tenantId);
        
        // If module is disabled, only log essential events
        if (!moduleConfig.enabled) {
            return false;
        }
        
        // Check specific feature flags
        switch (logType) {
            case 'request_logging':
                return true; // Request logging is always enabled when module is enabled
            case 'user_activity':
                return moduleConfig.features.userActionLogging;
            case 'performance':
                return moduleConfig.features.performanceLogging;
            case 'detailed_error':
                return moduleConfig.features.detailedErrorLogging;
            case 'audit':
                return moduleConfig.features.auditLogging;
            case 'security':
                return moduleConfig.features.securityLogging;
            default:
                return true;
        }
    } catch (error) {
        // Fallback to logging if module service fails
        return true;
    }
}

/**
 * Check if an event is essential (always logged regardless of module settings)
 * @param {string} eventType - Type of event
 * @param {Object} logData - Log data to check
 * @returns {boolean} Whether the event is essential
 */
function isEssentialEvent(eventType, logData = {}) {
    const essentialEvents = [
        'authentication_attempt',
        'authorization_failure',
        'security_breach',
        'data_access_violation',
        'system_error',
        'compliance_event',
        'platform_security_event'
    ];
    
    // Check if event type is essential
    if (essentialEvents.includes(eventType)) {
        return true;
    }
    
    // Check if log data indicates essential event
    if (logData.essential === true) {
        return true;
    }
    
    if (logData.severity === 'critical') {
        return true;
    }
    
    return false;
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
    trackUserSession,
    shouldPerformLogging,
    isEssentialEvent
};