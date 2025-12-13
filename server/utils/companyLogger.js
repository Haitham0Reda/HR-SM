/**
 * Company-Specific Logger System
 * Creates separate log files for each company/tenant
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Create or get a company-specific logger
 */
function getCompanyLogger(tenantId, companyName = null) {
    // Use tenantId as the primary identifier
    const loggerKey = tenantId;
    
    if (companyLoggers.has(loggerKey)) {
        return companyLoggers.get(loggerKey);
    }

    // Create company-specific log directory
    const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
    const companyLogDir = path.join(companyLogsDir, sanitizedName);
    
    if (!isTest && logToFile && !fs.existsSync(companyLogDir)) {
        fs.mkdirSync(companyLogDir, { recursive: true });
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

        // Audit log (for security and compliance events)
        transports.push(new DailyRotateFile({
            filename: path.join(companyLogDir, '%DATE%-audit.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '90d', // Keep audit logs longer
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
                winston.format.printf((info) => {
                    // Only log to audit file if it's marked as an audit event
                    return info.audit ? JSON.stringify(info) : false;
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

    // Add company-specific methods
    logger.audit = function(message, meta = {}) {
        this.info(message, { ...meta, audit: true });
    };

    logger.security = function(message, meta = {}) {
        this.warn(message, { ...meta, security: true, audit: true });
    };

    logger.compliance = function(message, meta = {}) {
        this.info(message, { ...meta, compliance: true, audit: true });
    };

    // Cache the logger
    companyLoggers.set(loggerKey, logger);
    
    return logger;
}

/**
 * Get logger for a specific company by tenant ID
 */
export function getLoggerForTenant(tenantId, companyName = null) {
    if (!tenantId) {
        throw new Error('Tenant ID is required for company-specific logging');
    }
    return getCompanyLogger(tenantId, companyName);
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

export default {
    getLoggerForTenant,
    companyLoggerMiddleware,
    cleanupOldLogs,
    getCompanyLogStats
};