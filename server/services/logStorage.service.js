/**
 * Log Storage and Retention Service
 * Manages enhanced log storage with proper directory structure, retention policies, and compression
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import zlib from 'zlib';
import crypto from 'crypto';

// Mock __filename and __dirname for Jest compatibility
const __filename = 'logStorage.service.js';
const __dirname = '.';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const gzip = promisify(zlib.gzip);

// Base directories
const baseLogsDir = path.join(__dirname, '../../logs');
const companyLogsDir = path.join(baseLogsDir, 'companies');
const platformLogsDir = path.join(baseLogsDir, 'platform');
const archivesDir = path.join(baseLogsDir, 'archives');

// Log types and their configurations
const LOG_TYPES = {
    APPLICATION: {
        name: 'application',
        retention: 30, // days
        compress: true,
        subdirectory: null
    },
    ERROR: {
        name: 'error',
        retention: 90, // days
        compress: true,
        subdirectory: null
    },
    AUDIT: {
        name: 'audit',
        retention: 2555, // 7 years for compliance
        compress: true,
        subdirectory: 'audit',
        immutable: true
    },
    SECURITY: {
        name: 'security',
        retention: 1825, // 5 years for security logs
        compress: true,
        subdirectory: 'security',
        immutable: true
    },
    PERFORMANCE: {
        name: 'performance',
        retention: 90, // days
        compress: true,
        subdirectory: 'performance'
    },
    COMPLIANCE: {
        name: 'compliance',
        retention: 2555, // 7 years for compliance
        compress: true,
        subdirectory: 'compliance',
        immutable: true
    }
};

// Platform log types with extended retention
const PLATFORM_LOG_TYPES = {
    PLATFORM: {
        name: 'platform',
        retention: 365, // 1 year
        compress: true,
        subdirectory: null
    },
    PLATFORM_AUDIT: {
        name: 'platform-audit',
        retention: 2555, // 7 years
        compress: true,
        subdirectory: 'audit',
        immutable: true
    },
    PLATFORM_SECURITY: {
        name: 'platform-security',
        retention: 2555, // 7 years
        compress: true,
        subdirectory: 'security',
        immutable: true
    },
    PLATFORM_PERFORMANCE: {
        name: 'platform-performance',
        retention: 180, // 6 months
        compress: true,
        subdirectory: 'performance'
    },
    PLATFORM_ERROR: {
        name: 'platform-error',
        retention: 365, // 1 year
        compress: true,
        subdirectory: null
    }
};

/**
 * Sanitize company name for directory usage
 */
function sanitizeCompanyName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Generate integrity hash for immutable logs
 */
function generateIntegrityHash(content, salt = '') {
    const secret = process.env.LOG_INTEGRITY_SECRET || 'default-log-secret';
    return crypto.createHash('sha256').update(content + salt + secret).digest('hex');
}

/**
 * Create enhanced directory structure for a company
 */
async function createCompanyDirectoryStructure(tenantId, companyName = null) {
    const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
    const companyDir = path.join(companyLogsDir, sanitizedName);
    
    // Create main company directory
    if (!fs.existsSync(companyDir)) {
        fs.mkdirSync(companyDir, { recursive: true });
    }
    
    // Create subdirectories for different log types
    const subdirectories = [
        'audit',
        'security', 
        'performance',
        'compliance',
        'archives'
    ];
    
    for (const subdir of subdirectories) {
        const subdirPath = path.join(companyDir, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
    }
    
    return companyDir;
}

/**
 * Create enhanced directory structure for platform logs
 */
async function createPlatformDirectoryStructure() {
    // Create main platform directory
    if (!fs.existsSync(platformLogsDir)) {
        fs.mkdirSync(platformLogsDir, { recursive: true });
    }
    
    // Create subdirectories for different platform log types
    const subdirectories = [
        'audit',
        'security',
        'performance',
        'compliance',
        'archives'
    ];
    
    for (const subdir of subdirectories) {
        const subdirPath = path.join(platformLogsDir, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
    }
    
    return platformLogsDir;
}

/**
 * Get the appropriate log file path based on log type and company
 */
function getLogFilePath(logType, tenantId, companyName = null, date = new Date()) {
    const logConfig = LOG_TYPES[logType];
    if (!logConfig) {
        throw new Error(`Unknown log type: ${logType}`);
    }
    
    const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
    const companyDir = path.join(companyLogsDir, sanitizedName);
    
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${dateStr}-${logConfig.name}.log`;
    
    if (logConfig.subdirectory) {
        return path.join(companyDir, logConfig.subdirectory, filename);
    }
    
    return path.join(companyDir, filename);
}

/**
 * Get the appropriate platform log file path
 */
function getPlatformLogFilePath(logType, date = new Date()) {
    const logConfig = PLATFORM_LOG_TYPES[logType];
    if (!logConfig) {
        throw new Error(`Unknown platform log type: ${logType}`);
    }
    
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${dateStr}-${logConfig.name}.log`;
    
    if (logConfig.subdirectory) {
        return path.join(platformLogsDir, logConfig.subdirectory, filename);
    }
    
    return path.join(platformLogsDir, filename);
}

/**
 * Compress and archive old log files
 */
async function compressLogFile(filePath) {
    try {
        const content = await readFile(filePath);
        const compressed = await gzip(content);
        
        const compressedPath = `${filePath}.gz`;
        await writeFile(compressedPath, compressed);
        
        // Remove original file after successful compression
        await unlink(filePath);
        
        return compressedPath;
    } catch (error) {
        console.error(`Failed to compress log file ${filePath}:`, error);
        throw error;
    }
}

/**
 * Apply retention policies to company logs
 */
async function applyCompanyRetentionPolicies(tenantId, companyName = null) {
    const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
    const companyDir = path.join(companyLogsDir, sanitizedName);
    
    if (!fs.existsSync(companyDir)) {
        return { processed: 0, compressed: 0, deleted: 0 };
    }
    
    const stats = { processed: 0, compressed: 0, deleted: 0 };
    
    // Process each log type
    for (const [logTypeKey, logConfig] of Object.entries(LOG_TYPES)) {
        const logDir = logConfig.subdirectory 
            ? path.join(companyDir, logConfig.subdirectory)
            : companyDir;
            
        if (!fs.existsSync(logDir)) {
            continue;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            for (const file of logFiles) {
                const filePath = path.join(logDir, file);
                const fileStat = await stat(filePath);
                const daysSinceModified = (Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                stats.processed++;
                
                // Check if file should be deleted (beyond retention period)
                if (daysSinceModified > logConfig.retention) {
                    // Don't delete immutable logs (audit, security, compliance)
                    if (!logConfig.immutable) {
                        await unlink(filePath);
                        stats.deleted++;
                    }
                } 
                // Check if file should be compressed (older than 7 days and not already compressed)
                else if (daysSinceModified > 7 && file.endsWith('.log') && logConfig.compress) {
                    await compressLogFile(filePath);
                    stats.compressed++;
                }
            }
        } catch (error) {
            console.error(`Error processing retention for ${logTypeKey} in ${companyDir}:`, error);
        }
    }
    
    return stats;
}

/**
 * Apply retention policies to platform logs
 */
async function applyPlatformRetentionPolicies() {
    if (!fs.existsSync(platformLogsDir)) {
        return { processed: 0, compressed: 0, deleted: 0 };
    }
    
    const stats = { processed: 0, compressed: 0, deleted: 0 };
    
    // Process each platform log type
    for (const [logTypeKey, logConfig] of Object.entries(PLATFORM_LOG_TYPES)) {
        const logDir = logConfig.subdirectory 
            ? path.join(platformLogsDir, logConfig.subdirectory)
            : platformLogsDir;
            
        if (!fs.existsSync(logDir)) {
            continue;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            for (const file of logFiles) {
                const filePath = path.join(logDir, file);
                const fileStat = await stat(filePath);
                const daysSinceModified = (Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                stats.processed++;
                
                // Check if file should be deleted (beyond retention period)
                if (daysSinceModified > logConfig.retention) {
                    // Don't delete immutable logs
                    if (!logConfig.immutable) {
                        await unlink(filePath);
                        stats.deleted++;
                    }
                } 
                // Check if file should be compressed
                else if (daysSinceModified > 7 && file.endsWith('.log') && logConfig.compress) {
                    await compressLogFile(filePath);
                    stats.compressed++;
                }
            }
        } catch (error) {
            console.error(`Error processing platform retention for ${logTypeKey}:`, error);
        }
    }
    
    return stats;
}

/**
 * Get storage statistics for a company
 */
async function getCompanyStorageStats(tenantId, companyName = null) {
    const sanitizedName = companyName ? sanitizeCompanyName(companyName) : tenantId;
    const companyDir = path.join(companyLogsDir, sanitizedName);
    
    if (!fs.existsSync(companyDir)) {
        return null;
    }
    
    const stats = {
        tenantId,
        companyName: sanitizedName,
        totalSize: 0,
        totalFiles: 0,
        logTypes: {},
        oldestLog: null,
        newestLog: null
    };
    
    // Recursively calculate directory size and file counts
    async function calculateDirStats(dirPath, logType = 'general') {
        const files = await readdir(dirPath);
        let dirSize = 0;
        let fileCount = 0;
        let oldestTime = null;
        let newestTime = null;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await stat(filePath);
            
            if (fileStat.isDirectory()) {
                const subStats = await calculateDirStats(filePath, file);
                dirSize += subStats.size;
                fileCount += subStats.count;
                
                if (!oldestTime || (subStats.oldest && subStats.oldest < oldestTime)) {
                    oldestTime = subStats.oldest;
                }
                if (!newestTime || (subStats.newest && subStats.newest > newestTime)) {
                    newestTime = subStats.newest;
                }
            } else {
                dirSize += fileStat.size;
                fileCount++;
                
                if (!oldestTime || fileStat.mtime < oldestTime) {
                    oldestTime = fileStat.mtime;
                }
                if (!newestTime || fileStat.mtime > newestTime) {
                    newestTime = fileStat.mtime;
                }
            }
        }
        
        return { size: dirSize, count: fileCount, oldest: oldestTime, newest: newestTime };
    }
    
    try {
        const dirStats = await calculateDirStats(companyDir);
        stats.totalSize = dirStats.size;
        stats.totalFiles = dirStats.count;
        stats.oldestLog = dirStats.oldest;
        stats.newestLog = dirStats.newest;
        
        // Get stats for each subdirectory
        const subdirs = ['audit', 'security', 'performance', 'compliance'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(companyDir, subdir);
            if (fs.existsSync(subdirPath)) {
                const subdirStats = await calculateDirStats(subdirPath, subdir);
                stats.logTypes[subdir] = {
                    size: subdirStats.size,
                    files: subdirStats.count,
                    sizeMB: (subdirStats.size / 1024 / 1024).toFixed(2)
                };
            }
        }
        
        stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
        
    } catch (error) {
        console.error(`Error calculating storage stats for ${companyDir}:`, error);
        return null;
    }
    
    return stats;
}

/**
 * Get platform storage statistics
 */
async function getPlatformStorageStats() {
    if (!fs.existsSync(platformLogsDir)) {
        return null;
    }
    
    const stats = {
        totalSize: 0,
        totalFiles: 0,
        logTypes: {},
        oldestLog: null,
        newestLog: null
    };
    
    // Recursively calculate directory size and file counts
    async function calculateDirStats(dirPath) {
        const files = await readdir(dirPath);
        let dirSize = 0;
        let fileCount = 0;
        let oldestTime = null;
        let newestTime = null;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await stat(filePath);
            
            if (fileStat.isDirectory()) {
                const subStats = await calculateDirStats(filePath);
                dirSize += subStats.size;
                fileCount += subStats.count;
                
                if (!oldestTime || (subStats.oldest && subStats.oldest < oldestTime)) {
                    oldestTime = subStats.oldest;
                }
                if (!newestTime || (subStats.newest && subStats.newest > newestTime)) {
                    newestTime = subStats.newest;
                }
            } else {
                dirSize += fileStat.size;
                fileCount++;
                
                if (!oldestTime || fileStat.mtime < oldestTime) {
                    oldestTime = fileStat.mtime;
                }
                if (!newestTime || fileStat.mtime > newestTime) {
                    newestTime = fileStat.mtime;
                }
            }
        }
        
        return { size: dirSize, count: fileCount, oldest: oldestTime, newest: newestTime };
    }
    
    try {
        const dirStats = await calculateDirStats(platformLogsDir);
        stats.totalSize = dirStats.size;
        stats.totalFiles = dirStats.count;
        stats.oldestLog = dirStats.oldest;
        stats.newestLog = dirStats.newest;
        
        // Get stats for each subdirectory
        const subdirs = ['audit', 'security', 'performance'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(platformLogsDir, subdir);
            if (fs.existsSync(subdirPath)) {
                const subdirStats = await calculateDirStats(subdirPath);
                stats.logTypes[subdir] = {
                    size: subdirStats.size,
                    files: subdirStats.count,
                    sizeMB: (subdirStats.size / 1024 / 1024).toFixed(2)
                };
            }
        }
        
        stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
        
    } catch (error) {
        console.error('Error calculating platform storage stats:', error);
        return null;
    }
    
    return stats;
}

/**
 * Validate log file integrity for immutable logs
 */
async function validateLogIntegrity(filePath) {
    try {
        const content = await readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        let validEntries = 0;
        let invalidEntries = 0;
        
        for (const line of lines) {
            try {
                const logEntry = JSON.parse(line);
                
                // Check if this is an immutable log entry with hash
                if (logEntry.auditHash) {
                    // Recreate the hash and compare
                    const entryWithoutHash = { ...logEntry };
                    delete entryWithoutHash.auditHash;
                    
                    const expectedHash = generateIntegrityHash(JSON.stringify(entryWithoutHash));
                    
                    if (logEntry.auditHash === expectedHash) {
                        validEntries++;
                    } else {
                        invalidEntries++;
                    }
                } else {
                    validEntries++; // Non-immutable logs are considered valid
                }
            } catch (parseError) {
                invalidEntries++;
            }
        }
        
        return {
            valid: invalidEntries === 0,
            totalEntries: validEntries + invalidEntries,
            validEntries,
            invalidEntries,
            integrityScore: validEntries / (validEntries + invalidEntries)
        };
        
    } catch (error) {
        console.error(`Error validating log integrity for ${filePath}:`, error);
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Run comprehensive retention and cleanup for all companies
 */
async function runGlobalRetentionCleanup() {
    const results = {
        companiesProcessed: 0,
        platformProcessed: false,
        totalStats: { processed: 0, compressed: 0, deleted: 0 },
        errors: []
    };
    
    try {
        // Process company logs
        if (fs.existsSync(companyLogsDir)) {
            const companies = await readdir(companyLogsDir);
            
            for (const company of companies) {
                const companyPath = path.join(companyLogsDir, company);
                const companyStat = await stat(companyPath);
                
                if (companyStat.isDirectory()) {
                    try {
                        const companyStats = await applyCompanyRetentionPolicies(company);
                        results.totalStats.processed += companyStats.processed;
                        results.totalStats.compressed += companyStats.compressed;
                        results.totalStats.deleted += companyStats.deleted;
                        results.companiesProcessed++;
                    } catch (error) {
                        results.errors.push({
                            company,
                            error: error.message
                        });
                    }
                }
            }
        }
        
        // Process platform logs
        try {
            const platformStats = await applyPlatformRetentionPolicies();
            results.totalStats.processed += platformStats.processed;
            results.totalStats.compressed += platformStats.compressed;
            results.totalStats.deleted += platformStats.deleted;
            results.platformProcessed = true;
        } catch (error) {
            results.errors.push({
                platform: true,
                error: error.message
            });
        }
        
    } catch (error) {
        results.errors.push({
            global: true,
            error: error.message
        });
    }
    
    return results;
}

export {
    LOG_TYPES,
    PLATFORM_LOG_TYPES,
    createCompanyDirectoryStructure,
    createPlatformDirectoryStructure,
    getLogFilePath,
    getPlatformLogFilePath,
    compressLogFile,
    applyCompanyRetentionPolicies,
    applyPlatformRetentionPolicies,
    getCompanyStorageStats,
    getPlatformStorageStats,
    validateLogIntegrity,
    runGlobalRetentionCleanup,
    generateIntegrityHash
};

export default {
    LOG_TYPES,
    PLATFORM_LOG_TYPES,
    createCompanyDirectoryStructure,
    createPlatformDirectoryStructure,
    getLogFilePath,
    getPlatformLogFilePath,
    compressLogFile,
    applyCompanyRetentionPolicies,
    applyPlatformRetentionPolicies,
    getCompanyStorageStats,
    getPlatformStorageStats,
    validateLogIntegrity,
    runGlobalRetentionCleanup,
    generateIntegrityHash
};