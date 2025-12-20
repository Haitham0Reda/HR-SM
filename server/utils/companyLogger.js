/**
 * Company-Specific Logger System
 * Creates separate log files for each company/tenant
 * Enhanced with security features, audit trails, and performance metrics
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getCorrelationContext } from '../services/correlationId.service.js';
import { 
    createCompanyDirectoryStructure, 
    LOG_TYPES,
    getLogFilePath 
} from '../services/logStorage.service.js';
import loggingModuleService from '../services/loggingModule.service.js';
import configurationChangeHandler from '../services/configurationChangeHandler.service.js';

// Mock __filename and __dirname for Jest compatibility
const __filename = 'companyLogger.js';
const __dirname = '.';

// Base logs directory
const isTest = process.env.NODE_ENV === 'test';
const logToFile = process.env.LOG_TO_FILE !== 'false';
const baseLogsDir = path.join(__dirname, '../../logs');
const companyLogsDir = path.join(baseLogsDir, 'companies');

// Create company logs directory if it doesn't exist
if (!isTest && logToFile && !fs.existsSync(companyLogsDir)) {
    fs.mkdirSync(companyLogsDir, { recursive: true });
}

// Cache for company loggers to avoid creating multiple instances
const companyLoggers = new Map();

// Security event types for detection
const SECURITY_EVENT_TYPES = {
    AUTHENTICATION_FAILURE: 'authentication_failure',
    AUTHORIZATION_FAILURE: 'authorization_failure',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    DATA_ACCESS_VIOLATION: 'data_access_violation',
    PRIVILEGE_ESCALATION: 'privilege_escalation',
    SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
    XSS_ATTEMPT: 'xss_attempt',
    BRUTE_FORCE_ATTACK: 'brute_force_attack',
    UNAUTHORIZED_API_ACCESS: 'unauthorized_api_access',
    SENSITIVE_DATA_ACCESS: 'sensitive_data_access'
};

// Performance metric types
const PERFORMANCE_METRIC_TYPES = {
    API_RESPONSE_TIME: 'api_response_time',
    DATABASE_QUERY_TIME: 'database_query_time',
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage',
    THROUGHPUT: 'throughput',
    ERROR_RATE: 'error_rate'
};

/**
 * Sanitize company name for use in file paths
 */
function sanitizeCompanyName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Generate tamper-proof hash for audit entries
 */
function generateAuditHash(entry) {
    const hashData = JSON.stringify({
        timestamp: entry.timestamp,
        message: entry.message,
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action
    });
    return crypto.createHash('sha256').update(hashData).digest('hex');
}

/**
 * Detect potential security threats in log data
 */
function detectSecurityThreats(logData) {
    const threats = [];
    const { message, meta = {} } = logData;
    
    // SQL Injection detection
    const sqlInjectionPatterns = [
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bDROP\b.*\bTABLE\b)/i,
        /(\bINSERT\b.*\bINTO\b)/i,
        /(\bDELETE\b.*\bFROM\b)/i,
        /('.*OR.*'.*=.*')/i,
        /(--|\#|\/\*)/
    ];
    
    for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(message) || pattern.test(JSON.stringify(meta))) {
            threats.push({
                type: SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
                severity: 'high',
                pattern: pattern.toString(),
                detected_in: pattern.test(message) ? 'message' : 'metadata'
            });
        }
    }
    
    // XSS detection
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe[^>]*>/i,
        /eval\s*\(/i
    ];
    
    for (const pattern of xssPatterns) {
        if (pattern.test(message) || pattern.test(JSON.stringify(meta))) {
            threats.push({
                type: SECURITY_EVENT_TYPES.XSS_ATTEMPT,
                severity: 'high',
                pattern: pattern.toString(),
                detected_in: pattern.test(message) ? 'message' : 'metadata'
            });
        }
    }
    
    // Brute force detection (multiple failed attempts)
    if (meta.statusCode === 401 && meta.endpoint && meta.endpoint.includes('login')) {
        threats.push({
            type: SECURITY_EVENT_TYPES.AUTHENTICATION_FAILURE,
            severity: 'medium',
            endpoint: meta.endpoint,
            ip_address: meta.ipAddress
        });
    }
    
    // Privilege escalation detection
    if (meta.action && (meta.action.includes('admin') || meta.action.includes('elevate'))) {
        if (meta.statusCode >= 400) {
            threats.push({
                type: SECURITY_EVENT_TYPES.PRIVILEGE_ESCALATION,
                severity: 'high',
                action: meta.action,
                user_id: meta.userId
            });
        }
    }
    
    return threats;
}

/**
 * Classify log entry as essential or detailed
 */
function classifyLogEntry(level, message, meta = {}) {
    const eventType = meta.eventType || 'general';
    const securityEventType = meta.securityEventType;
    
    // Essential log events that cannot be disabled
    const essentialConditions = [
        // Security events are always essential
        meta.security === true,
        meta.audit === true,
        
        // Authentication and authorization events
        eventType === 'authentication_attempt',
        eventType === 'authorization_failure',
        eventType === 'authentication_failure',
        
        // Security breach indicators
        eventType === 'security_breach',
        eventType === 'data_access_violation',
        eventType === 'privilege_escalation',
        securityEventType === SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
        securityEventType === SECURITY_EVENT_TYPES.XSS_ATTEMPT,
        securityEventType === SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
        
        // System errors
        level === 'error' && eventType === 'system_error',
        
        // Compliance events
        eventType === 'compliance_event',
        meta.compliance === true,
        
        // Platform security events
        eventType === 'platform_security_event',
        
        // Critical performance issues
        level === 'error' && meta.performance === true,
        
        // Failed API requests with security implications
        meta.statusCode >= 400 && (meta.endpoint?.includes('auth') || meta.endpoint?.includes('admin')),
        
        // Database security violations
        meta.operation && (meta.operation.includes('DROP') || meta.operation.includes('DELETE') || meta.operation.includes('UPDATE')),
        
        // Configuration changes
        eventType === 'configuration_change'
    ];
    
    const isEssential = essentialConditions.some(condition => condition === true);
    
    let reason = null;
    if (isEssential) {
        if (meta.security || meta.audit) {
            reason = 'security_or_audit_event';
        } else if (eventType.includes('authentication') || eventType.includes('authorization')) {
            reason = 'authentication_authorization_event';
        } else if (level === 'error') {
            reason = 'critical_error';
        } else if (meta.compliance) {
            reason = 'compliance_requirement';
        } else if (eventType === 'platform_security_event') {
            reason = 'platform_security';
        } else if (eventType === 'configuration_change') {
            reason = 'configuration_audit';
        } else {
            reason = 'security_related';
        }
    }
    
    return {
        isEssential,
        classification: isEssential ? 'essential' : 'detailed',
        reason
    };
}

/**
 * Analyze performance metrics and detect anomalies
 */
function analyzePerformanceMetrics(metricData) {
    const analysis = {
        alerts: [],
        recommendations: []
    };
    
    const { type, value, context = {} } = metricData;
    
    switch (type) {
        case PERFORMANCE_METRIC_TYPES.API_RESPONSE_TIME:
            if (value > 5000) { // 5 seconds
                analysis.alerts.push({
                    severity: 'high',
                    message: `Slow API response detected: ${value}ms`,
                    threshold: 5000
                });
            } else if (value > 2000) { // 2 seconds
                analysis.alerts.push({
                    severity: 'medium',
                    message: `Elevated API response time: ${value}ms`,
                    threshold: 2000
                });
            }
            break;
            
        case PERFORMANCE_METRIC_TYPES.DATABASE_QUERY_TIME:
            if (value > 3000) { // 3 seconds
                analysis.alerts.push({
                    severity: 'high',
                    message: `Slow database query detected: ${value}ms`,
                    threshold: 3000,
                    query: context.query
                });
            }
            break;
            
        case PERFORMANCE_METRIC_TYPES.ERROR_RATE:
            if (value > 0.1) { // 10% error rate
                analysis.alerts.push({
                    severity: 'critical',
                    message: `High error rate detected: ${(value * 100).toFixed(2)}%`,
                    threshold: 0.1
                });
            }
            break;
    }
    
    return analysis;
}

/**
 * Create or get a company-specific logger
 */
async function getCompanyLogger(tenantId, companyName = null) {
    // Use tenantId as the primary identifier
    const loggerKey = tenantId;
    
    if (companyLoggers.has(loggerKey)) {
        return companyLoggers.get(loggerKey);
    }

    // Create enhanced company-specific log directory structure
    let companyLogDir;
    if (!isTest && logToFile) {
        companyLogDir = await createCompanyDirectoryStructure(tenantId, companyName);
    } else {
        const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
        companyLogDir = path.join(companyLogsDir, sanitizedName);
    }

    const transports = [];

    // Console transport (always include for development)
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, tenantId, ...meta }) => {
                const tenantInfo = tenantId ? `[${tenantId}]` : '';
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} ${tenantInfo} [${level}]: ${message} ${metaStr}`;
            })
        )
    }));

    // File transports (only if not in test mode)
    if (!isTest && logToFile) {
        // Application log
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, '%DATE%-application.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            )
        }));

        // Error log
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, '%DATE%-error.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            )
        }));

        // Audit log (for security and compliance events) - stored in audit subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, 'audit', '%DATE%-audit.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '2555d', // 7 years for compliance
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    // Only log to audit file if it's marked as an audit event
                    if (info.audit) {
                        // Add tamper-proof hash for audit entries
                        info.auditHash = generateAuditHash(info);
                        return JSON.stringify(info);
                    }
                    return false;
                })
            )
        }));

        // Security log (for security events and threats) - stored in security subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, 'security', '%DATE%-security.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '1825d', // 5 years for security logs
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    // Only log to security file if it's marked as a security event
                    if (info.security) {
                        info.auditHash = generateAuditHash(info);
                        return JSON.stringify(info);
                    }
                    return false;
                })
            )
        }));

        // Performance log (for performance metrics and monitoring) - stored in performance subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, 'performance', '%DATE%-performance.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '90d', // 3 months for performance logs
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    // Only log to performance file if it's marked as a performance event
                    return info.performance ? JSON.stringify(info) : false;
                })
            )
        }));

        // Compliance log (for compliance-specific events) - stored in compliance subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, 'compliance', '%DATE%-compliance.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '2555d', // 7 years for compliance logs
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    // Only log to compliance file if it's marked as a compliance event
                    if (info.compliance) {
                        info.auditHash = generateAuditHash(info);
                        return JSON.stringify(info);
                    }
                    return false;
                })
            )
        }));
    }

    // Create the logger
    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        transports,
        defaultMeta: { tenantId },
        exitOnError: false
    });

    // Override default logging methods to include security detection, correlation, license control, and module awareness
    const originalLog = logger.log.bind(logger);
    logger.log = async function(level, message, meta = {}) {
        // Classify the log entry as essential or detailed
        const logClassification = classifyLogEntry(level, message, meta);
        
        // Check if logging should be captured based on module configuration and license
        const eventType = meta.eventType || 'general';
        const shouldLog = await loggingModuleService.shouldLogEvent(tenantId, eventType, level);
        
        // Always log essential events regardless of module settings
        if (!shouldLog && !logClassification.isEssential) {
            // Log platform control action for audit
            platformLogger.adminAction('Company logging blocked', 'license-control', {
                tenantId,
                eventType,
                level,
                reason: 'Module configuration or license restriction',
                timestamp: new Date().toISOString(),
                isEssential: logClassification.isEssential
            });
            return;
        }
        
        // Add classification metadata
        meta.logClassification = logClassification.classification;
        meta.isEssential = logClassification.isEssential;
        meta.essentialReason = logClassification.reason;
        
        // Add correlation ID if not present
        if (!meta.correlationId) {
            // Try to get from global context or generate new one
            meta.correlationId = global.correlationId || 
                               (meta.req && meta.req.correlationId) ||
                               crypto.randomUUID();
        }
        
        // Add correlation context if available
        const correlationContext = getCorrelationContext(meta.correlationId);
        if (correlationContext) {
            meta.correlationContext = {
                userId: correlationContext.userId,
                sessionId: correlationContext.sessionId,
                method: correlationContext.method,
                path: correlationContext.path
            };
        }
        
        // Add module configuration context
        meta.moduleEnabled = await loggingModuleService.isFeatureEnabled(tenantId, 'detailedErrorLogging');
        meta.logLevel = level === 'error' && meta.moduleEnabled ? 'detailed' : 'essential';
        
        // Detect security threats in all log entries (but avoid recursive calls)
        if (!meta._securityDetectionProcessed) {
            const threats = detectSecurityThreats({ message, meta });
            if (threats.length > 0) {
                // Log security threats separately with flag to prevent recursion
                this.security(`Security threats detected: ${message}`, {
                    ...meta,
                    threats,
                    original_level: level,
                    threat_count: threats.length,
                    _securityDetectionProcessed: true
                });
            }
        }
        
        // Call original log method
        return originalLog(level, message, meta);
    };

    // Add company-specific methods with module awareness
    logger.audit = async function(message, meta = {}) {
        // Audit logging is always enabled (essential feature)
        const auditMeta = {
            ...meta,
            audit: true,
            eventType: 'audit_event',
            timestamp: new Date().toISOString(),
            action: meta.action || 'unknown',
            userId: meta.userId || 'system',
            ipAddress: meta.ipAddress || 'unknown',
            userAgent: meta.userAgent || 'unknown'
        };
        // Audit logs are always essential and bypass module checks
        return originalLog('info', message, auditMeta);
    };

    logger.security = async function(message, meta = {}) {
        // Security logging is always enabled (essential feature)
        const securityMeta = {
            ...meta,
            security: true,
            audit: true,
            eventType: 'security_event',
            timestamp: new Date().toISOString(),
            severity: meta.severity || 'medium',
            securityEventType: meta.securityEventType || SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
            source: meta.source || 'backend',
            blocked: meta.blocked || false
        };
        // Security logs are always essential and bypass module checks
        return originalLog('warn', message, securityMeta);
    };

    logger.compliance = function(message, meta = {}) {
        const complianceMeta = {
            ...meta,
            compliance: true,
            audit: true,
            timestamp: new Date().toISOString(),
            regulation: meta.regulation || 'general',
            dataType: meta.dataType || 'unknown'
        };
        // Compliance logs are always essential and bypass module checks
        return originalLog('info', message, complianceMeta);
    };

    // Add performance monitoring methods with module awareness
    logger.performance = async function(metric, value, context = {}) {
        // Check if performance logging is enabled
        const performanceEnabled = await loggingModuleService.isFeatureEnabled(tenantId, 'performanceLogging');
        if (!performanceEnabled) {
            return; // Skip performance logging if disabled
        }
        
        const analysis = analyzePerformanceMetrics({ type: metric, value, context });
        
        const performanceMeta = {
            performance: true,
            eventType: 'performance_metric',
            metric,
            value,
            context,
            analysis,
            timestamp: new Date().toISOString(),
            unit: context.unit || 'ms'
        };
        
        // Log performance alerts at appropriate levels
        if (analysis.alerts.length > 0) {
            const highestSeverity = analysis.alerts.reduce((max, alert) => {
                const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
                return severityLevels[alert.severity] > severityLevels[max] ? alert.severity : max;
            }, 'low');
            
            if (highestSeverity === 'critical') {
                this.error(`Performance critical: ${metric} = ${value}`, performanceMeta);
            } else if (highestSeverity === 'high') {
                this.warn(`Performance issue: ${metric} = ${value}`, performanceMeta);
            } else {
                this.info(`Performance metric: ${metric} = ${value}`, performanceMeta);
            }
        } else {
            this.info(`Performance metric: ${metric} = ${value}`, performanceMeta);
        }
    };

    // Add specialized security event methods
    logger.securityEvent = function(eventType, details = {}) {
        const securityMeta = {
            ...details,
            security: true,
            audit: true,
            eventType,
            timestamp: new Date().toISOString(),
            severity: details.severity || 'medium',
            source: details.source || 'backend'
        };
        
        const message = `Security event: ${eventType}`;
        
        if (details.severity === 'critical' || details.severity === 'high') {
            this.error(message, securityMeta);
        } else {
            this.warn(message, securityMeta);
        }
    };

    // Add API request logging with automatic security detection and module awareness
    logger.apiRequest = async function(req, res, responseTime) {
        const meta = {
            method: req.method,
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || req.user?._id,
            correlationId: req.correlationId,
            timestamp: new Date().toISOString(),
            eventType: 'api_request'
        };
        
        // Log performance metric (only if performance logging is enabled)
        const performanceEnabled = await loggingModuleService.isFeatureEnabled(tenantId, 'performanceLogging');
        if (performanceEnabled) {
            this.performance(PERFORMANCE_METRIC_TYPES.API_RESPONSE_TIME, responseTime, {
                endpoint: req.originalUrl,
                method: req.method
            });
        }
        
        // Log the API request - errors and auth-related requests are essential
        if (res.statusCode >= 500) {
            this.error(`API request failed: ${req.method} ${req.originalUrl}`, meta);
        } else if (res.statusCode >= 400) {
            this.warn(`API request error: ${req.method} ${req.originalUrl}`, meta);
        } else {
            this.info(`API request: ${req.method} ${req.originalUrl}`, meta);
        }
    };

    // Add database operation logging with module awareness
    logger.databaseOperation = async function(operation, table, executionTime, meta = {}) {
        const dbMeta = {
            ...meta,
            operation,
            table,
            executionTime,
            timestamp: new Date().toISOString(),
            eventType: 'database_operation'
        };
        
        // Log performance metric (only if performance logging is enabled)
        const performanceEnabled = await loggingModuleService.isFeatureEnabled(tenantId, 'performanceLogging');
        if (performanceEnabled) {
            this.performance(PERFORMANCE_METRIC_TYPES.DATABASE_QUERY_TIME, executionTime, {
                operation,
                table,
                query: meta.query
            });
        }
        
        // Log the database operation - slow operations and security-sensitive operations are essential
        if (executionTime > 3000) {
            this.warn(`Slow database operation: ${operation} on ${table}`, dbMeta);
        } else {
            this.info(`Database operation: ${operation} on ${table}`, dbMeta);
        }
    };

    // Add configuration change listener for real-time updates
    const configChangeListener = configurationChangeHandler.registerChangeListener(tenantId, (changeEvent) => {
        logger.info('Logging configuration updated', {
            eventType: 'configuration_change',
            changes: changeEvent.changes,
            timestamp: changeEvent.timestamp
        });
    });
    
    // Store the unregister function for cleanup
    logger._configChangeUnregister = configChangeListener;
    
    // Add method to update logger configuration in real-time
    logger.updateConfiguration = async function(newConfig) {
        try {
            // Update module configuration
            await loggingModuleService.updateConfig(tenantId, newConfig, 'system');
            
            // Log the configuration update
            this.audit('Logger configuration updated', {
                action: 'update_logger_config',
                newConfig,
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            this.error('Failed to update logger configuration', {
                error: error.message,
                tenantId,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    };
    
    // Add method to check if a feature is enabled
    logger.isFeatureEnabled = async function(feature) {
        return await loggingModuleService.isFeatureEnabled(tenantId, feature);
    };
    
    // Add method to get current module configuration
    logger.getModuleConfig = async function() {
        return await loggingModuleService.getConfig(tenantId);
    };
    
    // Add method to check if logging is essential
    logger.isEssentialLogging = function(level, message, meta = {}) {
        const classification = classifyLogEntry(level, message, meta);
        return classification.isEssential;
    };
    
    // Add method to force essential logging (platform override)
    logger.forceEssentialLog = function(level, message, meta = {}) {
        const essentialMeta = {
            ...meta,
            platformOverride: true,
            isEssential: true,
            logClassification: 'essential',
            essentialReason: 'platform_override'
        };
        return originalLog(level, message, essentialMeta);
    };
    
    // Cache the logger
    companyLoggers.set(loggerKey, logger);
    
    return logger;
}

/**
 * Get logger for a specific company by tenant ID
 */
export async function getLoggerForTenant(tenantId, companyName = null) {
    if (!tenantId) {
        throw new Error('Tenant ID is required for company-specific logging');
    }
    return await getCompanyLogger(tenantId, companyName);
}

/**
 * Middleware to add company logger to request object
 */
export function companyLoggerMiddleware(req, res, next) {
    // Extract tenant info from various possible sources
    const tenantId = req.tenantId || req.tenant?.tenantId || req.headers['x-tenant-id'];
    const companyName = req.tenant?.name || req.headers['x-company-name'];
    
    if (tenantId) {
        req.companyLogger = getLoggerForTenant(tenantId, companyName);
    }
    
    next();
}

/**
 * Clean up old log files for all companies
 */
export async function cleanupOldLogs(daysToKeep = 30) {
    if (isTest || !logToFile) return;
    
    try {
        const companies = fs.readdirSync(companyLogsDir);
        
        for (const company of companies) {
            const companyDir = path.join(companyLogsDir, company);
            const files = fs.readdirSync(companyDir);
            
            for (const file of files) {
                const filePath = path.join(companyDir, file);
                const stats = fs.statSync(filePath);
                const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceModified > daysToKeep && !file.includes('audit')) {
                    fs.unlinkSync(filePath);
                }
            }
        }
    } catch (error) {
        console.error('Failed to cleanup old logs:', error);
    }
}

/**
 * Get log statistics for a company
 */
export function getCompanyLogStats(tenantId, companyName = null) {
    if (isTest || !logToFile) return null;
    
    try {
        // Try to find the directory by sanitized tenant name first
        const sanitizedTenantName = sanitizeCompanyName(tenantId);
        let companyDir = path.join(companyLogsDir, sanitizedTenantName);
        
        // If not found and we have a company name, try sanitized company name
        if (!fs.existsSync(companyDir) && companyName) {
            const sanitizedCompanyName = sanitizeCompanyName(companyName);
            companyDir = path.join(companyLogsDir, sanitizedCompanyName);
        }
        
        if (!fs.existsSync(companyDir)) return null;
        
        const files = fs.readdirSync(companyDir);
        let totalSize = 0;
        let fileCount = 0;
        
        for (const file of files) {
            const filePath = path.join(companyDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            fileCount++;
        }
        
        return {
            tenantId,
            fileCount,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            logDirectory: companyDir
        };
    } catch (error) {
        console.error('Failed to get log stats:', error);
        return null;
    }
}

export {
    SECURITY_EVENT_TYPES,
    PERFORMANCE_METRIC_TYPES
};

export default {
    getLoggerForTenant,
    companyLoggerMiddleware,
    cleanupOldLogs,
    getCompanyLogStats,
    SECURITY_EVENT_TYPES,
    PERFORMANCE_METRIC_TYPES
};