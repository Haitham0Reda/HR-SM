/**
 * Platform Logger System
 * Handles system-wide events, platform administration, and cross-tenant operations
 * Enhanced with security detection and comprehensive audit trails
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
    createPlatformDirectoryStructure, 
    PLATFORM_LOG_TYPES 
} from '../services/logStorage.service.js';

// Mock __filename and __dirname for Jest compatibility
const __filename = 'platformLogger.js';
const __dirname = '.';

// Base logs directory
const isTest = process.env.NODE_ENV === 'test';
const logToFile = process.env.LOG_TO_FILE !== 'false';
const baseLogsDir = path.join(__dirname, '../../logs');
const platformLogsDir = path.join(baseLogsDir, 'platform');

// Create platform logs directory if it doesn't exist
if (!isTest && logToFile && !fs.existsSync(platformLogsDir)) {
    fs.mkdirSync(platformLogsDir, { recursive: true });
}

// Platform security event types
const PLATFORM_SECURITY_EVENT_TYPES = {
    UNAUTHORIZED_ADMIN_ACCESS: 'unauthorized_admin_access',
    TENANT_BOUNDARY_BREACH: 'tenant_boundary_breach',
    DDOS_ATTACK: 'ddos_attack',
    CONFIG_TAMPERING: 'config_tampering',
    COORDINATED_ATTACK: 'coordinated_attack',
    LICENSE_VIOLATION: 'license_violation',
    SYSTEM_INTRUSION: 'system_intrusion',
    DATA_EXFILTRATION: 'data_exfiltration',
    PRIVILEGE_ABUSE: 'privilege_abuse',
    INFRASTRUCTURE_ATTACK: 'infrastructure_attack'
};

// Platform event types
const PLATFORM_EVENT_TYPES = {
    COMPANY_CREATED: 'company_created',
    COMPANY_DELETED: 'company_deleted',
    COMPANY_SUSPENDED: 'company_suspended',
    LICENSE_UPDATED: 'license_updated',
    SYSTEM_MAINTENANCE: 'system_maintenance',
    BACKUP_OPERATION: 'backup_operation',
    CROSS_TENANT_OPERATION: 'cross_tenant_operation',
    ADMIN_ACTION: 'admin_action',
    SYSTEM_CONFIG_CHANGE: 'system_config_change',
    PLATFORM_UPGRADE: 'platform_upgrade'
};

/**
 * Generate tamper-proof hash for platform audit entries
 */
function generatePlatformAuditHash(entry) {
    const hashData = JSON.stringify({
        timestamp: entry.timestamp,
        message: entry.message,
        eventType: entry.eventType,
        adminUser: entry.adminUser,
        affectedTenants: entry.affectedTenants
    });
    return crypto.createHash('sha256').update(hashData + process.env.PLATFORM_AUDIT_SECRET || 'default-secret').digest('hex');
}

/**
 * Detect platform-level security threats
 */
function detectPlatformSecurityThreats(logData) {
    const threats = [];
    const { message, meta = {} } = logData;
    
    // Unauthorized admin access detection
    if (meta.statusCode === 401 && meta.endpoint && meta.endpoint.includes('/platform/')) {
        threats.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
            severity: 'critical',
            endpoint: meta.endpoint,
            ip_address: meta.ipAddress,
            attempted_action: meta.action
        });
    }
    
    // Cross-tenant boundary breach detection
    if (meta.crossTenantAccess && meta.unauthorized) {
        threats.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH,
            severity: 'critical',
            source_tenant: meta.sourceTenant,
            target_tenant: meta.targetTenant,
            attempted_resource: meta.resource
        });
    }
    
    // DDoS attack detection (high request volume from single IP)
    if (meta.requestCount && meta.requestCount > 1000) {
        threats.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.DDOS_ATTACK,
            severity: 'high',
            ip_address: meta.ipAddress,
            request_count: meta.requestCount,
            time_window: meta.timeWindow
        });
    }
    
    // Configuration tampering detection
    if (meta.configChange && !meta.authorized) {
        threats.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.CONFIG_TAMPERING,
            severity: 'critical',
            config_section: meta.configSection,
            attempted_change: meta.change,
            user: meta.userId
        });
    }
    
    // License violation detection
    if (meta.licenseViolation) {
        threats.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.LICENSE_VIOLATION,
            severity: 'high',
            violation_type: meta.violationType,
            tenant_id: meta.tenantId,
            exceeded_limit: meta.exceededLimit
        });
    }
    
    return threats;
}

/**
 * Analyze system performance and resource usage
 */
function analyzeSystemPerformance(metricData) {
    const analysis = {
        alerts: [],
        recommendations: [],
        systemHealth: 'healthy'
    };
    
    const { type, value, context = {} } = metricData;
    
    switch (type) {
        case 'system_memory_usage':
            if (value > 0.9) { // 90% memory usage
                analysis.alerts.push({
                    severity: 'critical',
                    message: `Critical memory usage: ${(value * 100).toFixed(2)}%`,
                    threshold: 0.9
                });
                analysis.systemHealth = 'critical';
            } else if (value > 0.8) { // 80% memory usage
                analysis.alerts.push({
                    severity: 'high',
                    message: `High memory usage: ${(value * 100).toFixed(2)}%`,
                    threshold: 0.8
                });
                analysis.systemHealth = 'degraded';
            }
            break;
            
        case 'system_cpu_usage':
            if (value > 0.95) { // 95% CPU usage
                analysis.alerts.push({
                    severity: 'critical',
                    message: `Critical CPU usage: ${(value * 100).toFixed(2)}%`,
                    threshold: 0.95
                });
                analysis.systemHealth = 'critical';
            }
            break;
            
        case 'tenant_count':
            if (value > 1000) { // High tenant count
                analysis.recommendations.push({
                    message: 'Consider scaling infrastructure for high tenant count',
                    tenant_count: value
                });
            }
            break;
            
        case 'cross_tenant_operations_per_minute':
            if (value > 100) { // High cross-tenant activity
                analysis.alerts.push({
                    severity: 'medium',
                    message: `High cross-tenant operation rate: ${value}/min`,
                    threshold: 100
                });
            }
            break;
    }
    
    return analysis;
}

/**
 * Create platform logger instance
 */
function createPlatformLogger() {
    const transports = [];

    // Console transport for development
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const platformInfo = '[PLATFORM]';
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} ${platformInfo} [${level}]: ${message} ${metaStr}`;
            })
        )
    }));

    // File transports (only if not in test mode)
    if (!isTest && logToFile) {
        // Create enhanced platform directory structure
        createPlatformDirectoryStructure();
        // Platform application log
        transports.push(new DailyRotateFile({
            filename: path.join(platformLogsDir, '%DATE%-platform.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '30d',
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            )
        }));

        // Platform error log
        transports.push(new DailyRotateFile({
            filename: path.join(platformLogsDir, '%DATE%-platform-error.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '30d',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            )
        }));

        // Platform audit log - stored in audit subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(platformLogsDir, 'audit', '%DATE%-platform-audit.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '2555d', // Keep platform audit logs for 7 years
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    if (info.platformAudit) {
                        info.auditHash = generatePlatformAuditHash(info);
                        return JSON.stringify(info);
                    }
                    return false;
                })
            )
        }));

        // Platform security log - stored in security subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(platformLogsDir, 'security', '%DATE%-platform-security.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '2555d', // Keep platform security logs for 7 years
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    if (info.platformSecurity) {
                        info.auditHash = generatePlatformAuditHash(info);
                        return JSON.stringify(info);
                    }
                    return false;
                })
            )
        }));

        // Platform performance log - stored in performance subdirectory
        transports.push(new DailyRotateFile({
            filename: path.join(platformLogsDir, 'performance', '%DATE%-platform-performance.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '180d', // Keep platform performance logs for 6 months
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    return info.platformPerformance ? JSON.stringify(info) : false;
                })
            )
        }));
    }

    // Create the logger
    const logger = winston.createLogger({
        level: process.env.PLATFORM_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
        transports,
        defaultMeta: { platform: true },
        exitOnError: false
    });

    // Override default logging methods to include security detection
    const originalLog = logger.log.bind(logger);
    logger.log = function(level, message, meta = {}) {
        // Detect platform security threats in all log entries (but avoid recursive calls)
        if (!meta._securityDetectionProcessed) {
            const threats = detectPlatformSecurityThreats({ message, meta });
            if (threats.length > 0) {
                // Log security threats separately with flag to prevent recursion
                this.platformSecurity(`Platform security threats detected: ${message}`, {
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

    return logger;
}

// Create singleton platform logger instance
const platformLogger = createPlatformLogger();

// Add platform-specific methods
platformLogger.adminAction = function(action, adminUser, details = {}) {
    const auditMeta = {
        ...details,
        platformAudit: true,
        eventType: PLATFORM_EVENT_TYPES.ADMIN_ACTION,
        action,
        adminUser,
        timestamp: new Date().toISOString(),
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
    };
    this.info(`Platform admin action: ${action}`, auditMeta);
};

platformLogger.companyManagement = function(operation, companyId, details = {}) {
    const auditMeta = {
        ...details,
        platformAudit: true,
        eventType: operation.includes('create') ? PLATFORM_EVENT_TYPES.COMPANY_CREATED :
                   operation.includes('delete') ? PLATFORM_EVENT_TYPES.COMPANY_DELETED :
                   operation.includes('suspend') ? PLATFORM_EVENT_TYPES.COMPANY_SUSPENDED :
                   PLATFORM_EVENT_TYPES.ADMIN_ACTION,
        operation,
        companyId,
        timestamp: new Date().toISOString(),
        adminUser: details.adminUser || 'system'
    };
    this.info(`Company management: ${operation} for ${companyId}`, auditMeta);
};

platformLogger.licenseEvent = function(event, companyId, details = {}) {
    const auditMeta = {
        ...details,
        platformAudit: true,
        eventType: PLATFORM_EVENT_TYPES.LICENSE_UPDATED,
        event,
        companyId,
        timestamp: new Date().toISOString(),
        licenseDetails: details.licenseDetails || {}
    };
    this.info(`License event: ${event} for ${companyId}`, auditMeta);
};

platformLogger.crossTenantOperation = function(operation, sourceCompany, targetCompany, details = {}) {
    const auditMeta = {
        ...details,
        platformAudit: true,
        eventType: PLATFORM_EVENT_TYPES.CROSS_TENANT_OPERATION,
        operation,
        sourceCompany,
        targetCompany,
        timestamp: new Date().toISOString(),
        authorized: details.authorized !== false
    };
    
    if (!details.authorized) {
        this.warn(`Unauthorized cross-tenant operation: ${operation}`, auditMeta);
    } else {
        this.info(`Cross-tenant operation: ${operation}`, auditMeta);
    }
};

platformLogger.systemHealth = function(component, status, metrics = {}) {
    const healthMeta = {
        ...metrics,
        platformPerformance: true,
        component,
        status,
        timestamp: new Date().toISOString(),
        systemHealth: status
    };
    
    if (status === 'critical' || status === 'down') {
        this.error(`System health critical: ${component}`, healthMeta);
    } else if (status === 'degraded' || status === 'warning') {
        this.warn(`System health degraded: ${component}`, healthMeta);
    } else {
        this.info(`System health: ${component} - ${status}`, healthMeta);
    }
};

platformLogger.platformSecurity = function(message, meta = {}) {
    const securityMeta = {
        ...meta,
        platformSecurity: true,
        platformAudit: true,
        timestamp: new Date().toISOString(),
        severity: meta.severity || 'medium',
        eventType: meta.eventType || PLATFORM_SECURITY_EVENT_TYPES.SYSTEM_INTRUSION,
        source: 'platform',
        affectedTenants: meta.affectedTenants || [],
        systemImpact: meta.systemImpact || 'unknown'
    };
    
    if (meta.severity === 'critical') {
        this.error(message, securityMeta);
    } else {
        this.warn(message, securityMeta);
    }
};

platformLogger.systemPerformance = function(metrics = {}) {
    const analysis = analyzeSystemPerformance(metrics);
    
    const performanceMeta = {
        platformPerformance: true,
        metrics,
        analysis,
        timestamp: new Date().toISOString(),
        systemHealth: analysis.systemHealth
    };
    
    // Log performance alerts at appropriate levels
    if (analysis.alerts.length > 0) {
        const highestSeverity = analysis.alerts.reduce((max, alert) => {
            const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
            return severityLevels[alert.severity] > severityLevels[max] ? alert.severity : max;
        }, 'low');
        
        if (highestSeverity === 'critical') {
            this.error('Platform performance critical', performanceMeta);
        } else if (highestSeverity === 'high') {
            this.warn('Platform performance degraded', performanceMeta);
        } else {
            this.info('Platform performance metrics', performanceMeta);
        }
    } else {
        this.info('Platform performance metrics', performanceMeta);
    }
};

platformLogger.tenantActivity = function(summary = {}) {
    const activityMeta = {
        platformPerformance: true,
        tenantActivity: true,
        summary,
        timestamp: new Date().toISOString()
    };
    this.info('Tenant activity summary', activityMeta);
};

// Platform security-specific methods
platformLogger.unauthorizedAccess = function(attempt = {}) {
    this.platformSecurity('Unauthorized platform access attempt', {
        ...attempt,
        eventType: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
        severity: 'critical'
    });
};

platformLogger.crossTenantViolation = function(violation = {}) {
    this.platformSecurity('Cross-tenant security violation', {
        ...violation,
        eventType: PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH,
        severity: 'critical'
    });
};

platformLogger.infrastructureAttack = function(attack = {}) {
    this.platformSecurity('Infrastructure attack detected', {
        ...attack,
        eventType: PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK,
        severity: 'critical'
    });
};

platformLogger.configurationTampering = function(tampering = {}) {
    this.platformSecurity('Configuration tampering detected', {
        ...tampering,
        eventType: PLATFORM_SECURITY_EVENT_TYPES.CONFIG_TAMPERING,
        severity: 'critical'
    });
};

platformLogger.threatIntelligence = function(threat = {}) {
    this.platformSecurity('Platform-wide threat detected', {
        ...threat,
        eventType: PLATFORM_SECURITY_EVENT_TYPES.COORDINATED_ATTACK,
        severity: 'critical'
    });
};

export {
    PLATFORM_SECURITY_EVENT_TYPES,
    PLATFORM_EVENT_TYPES
};

export default platformLogger;