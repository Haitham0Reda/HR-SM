/**
 * Platform Log Storage Service
 * Specialized storage for platform-level logs with immutable audit records and extended retention
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import crypto from 'crypto';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const gzip = promisify(zlib.gzip);

// Platform log directories
const baseLogsDir = path.join(__dirname, '../../logs');
const platformLogsDir = path.join(baseLogsDir, 'platform');
const platformArchivesDir = path.join(platformLogsDir, 'archives');
const immutableLogsDir = path.join(platformLogsDir, 'immutable');

// Platform log categories with specific retention policies
const PLATFORM_LOG_CATEGORIES = {
    ADMIN_ACTIONS: {
        name: 'admin-actions',
        retention: 2555, // 7 years
        immutable: true,
        subdirectory: 'audit',
        compressionDelay: 30 // days before compression
    },
    CROSS_TENANT_OPERATIONS: {
        name: 'cross-tenant-ops',
        retention: 1825, // 5 years
        immutable: true,
        subdirectory: 'audit',
        compressionDelay: 30
    },
    SECURITY_EVENTS: {
        name: 'security-events',
        retention: 2555, // 7 years
        immutable: true,
        subdirectory: 'security',
        compressionDelay: 7 // Compress security logs faster
    },
    COMPLIANCE_EVENTS: {
        name: 'compliance-events',
        retention: 2555, // 7 years
        immutable: true,
        subdirectory: 'compliance',
        compressionDelay: 30
    },
    SYSTEM_HEALTH: {
        name: 'system-health',
        retention: 365, // 1 year
        immutable: false,
        subdirectory: 'performance',
        compressionDelay: 7
    },
    LICENSE_MANAGEMENT: {
        name: 'license-mgmt',
        retention: 2555, // 7 years for legal compliance
        immutable: true,
        subdirectory: 'compliance',
        compressionDelay: 30
    },
    INFRASTRUCTURE_EVENTS: {
        name: 'infrastructure',
        retention: 730, // 2 years
        immutable: false,
        subdirectory: null,
        compressionDelay: 14
    }
};

/**
 * Generate cryptographic hash for immutable log entries
 */
function generateImmutableHash(entry, previousHash = '') {
    const secret = process.env.PLATFORM_IMMUTABLE_SECRET || 'platform-immutable-secret-key';
    const entryData = JSON.stringify({
        timestamp: entry.timestamp,
        eventType: entry.eventType,
        data: entry.data,
        previousHash
    });
    
    return crypto.createHash('sha256')
        .update(entryData + secret)
        .digest('hex');
}

/**
 * Create blockchain-like chain for immutable audit records
 */
async function createImmutableLogEntry(category, entry) {
    const categoryConfig = PLATFORM_LOG_CATEGORIES[category];
    if (!categoryConfig || !categoryConfig.immutable) {
        throw new Error(`Category ${category} is not configured for immutable logging`);
    }
    
    // Ensure immutable directory exists
    if (!fs.existsSync(immutableLogsDir)) {
        fs.mkdirSync(immutableLogsDir, { recursive: true });
    }
    
    // Get the last hash from the chain
    const chainFile = path.join(immutableLogsDir, `${categoryConfig.name}-chain.json`);
    let previousHash = '';
    let chainIndex = 0;
    
    if (fs.existsSync(chainFile)) {
        try {
            const chainData = JSON.parse(await readFile(chainFile, 'utf8'));
            previousHash = chainData.lastHash || '';
            chainIndex = chainData.index || 0;
        } catch (error) {
            console.error('Error reading chain file:', error);
        }
    }
    
    // Create immutable entry
    const immutableEntry = {
        index: chainIndex + 1,
        timestamp: new Date().toISOString(),
        category,
        eventType: entry.eventType,
        data: entry.data,
        previousHash,
        hash: ''
    };
    
    // Generate hash for this entry
    immutableEntry.hash = generateImmutableHash(immutableEntry, previousHash);
    
    // Update chain file
    const chainData = {
        index: immutableEntry.index,
        lastHash: immutableEntry.hash,
        lastUpdate: immutableEntry.timestamp,
        totalEntries: chainIndex + 1
    };
    
    await writeFile(chainFile, JSON.stringify(chainData, null, 2));
    
    // Append to immutable log file
    const logFile = path.join(immutableLogsDir, `${categoryConfig.name}-immutable.log`);
    await appendFile(logFile, JSON.stringify(immutableEntry) + '\n');
    
    return immutableEntry;
}

/**
 * Verify the integrity of immutable log chain
 */
async function verifyImmutableChain(category) {
    const categoryConfig = PLATFORM_LOG_CATEGORIES[category];
    if (!categoryConfig || !categoryConfig.immutable) {
        throw new Error(`Category ${category} is not configured for immutable logging`);
    }
    
    const logFile = path.join(immutableLogsDir, `${categoryConfig.name}-immutable.log`);
    
    if (!fs.existsSync(logFile)) {
        return { valid: true, entries: 0, message: 'No immutable log file found' };
    }
    
    const content = await readFile(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    let previousHash = '';
    let validEntries = 0;
    let invalidEntries = 0;
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
        try {
            const entry = JSON.parse(lines[i]);
            
            // Verify hash
            const expectedHash = generateImmutableHash(entry, previousHash);
            
            if (entry.hash === expectedHash && entry.previousHash === previousHash) {
                validEntries++;
                previousHash = entry.hash;
            } else {
                invalidEntries++;
                errors.push({
                    index: i + 1,
                    entryIndex: entry.index,
                    error: 'Hash mismatch',
                    expected: expectedHash,
                    actual: entry.hash
                });
            }
        } catch (parseError) {
            invalidEntries++;
            errors.push({
                index: i + 1,
                error: 'Parse error',
                message: parseError.message
            });
        }
    }
    
    return {
        valid: invalidEntries === 0,
        totalEntries: validEntries + invalidEntries,
        validEntries,
        invalidEntries,
        errors,
        integrityScore: validEntries / (validEntries + invalidEntries)
    };
}

/**
 * Create enhanced platform directory structure
 */
async function createPlatformDirectoryStructure() {
    const directories = [
        platformLogsDir,
        platformArchivesDir,
        immutableLogsDir,
        path.join(platformLogsDir, 'audit'),
        path.join(platformLogsDir, 'security'),
        path.join(platformLogsDir, 'performance'),
        path.join(platformLogsDir, 'compliance'),
        path.join(platformArchivesDir, 'audit'),
        path.join(platformArchivesDir, 'security'),
        path.join(platformArchivesDir, 'performance'),
        path.join(platformArchivesDir, 'compliance')
    ];
    
    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    return platformLogsDir;
}

/**
 * Archive old platform logs with compression
 */
async function archivePlatformLogs(category, daysOld = 30) {
    const categoryConfig = PLATFORM_LOG_CATEGORIES[category];
    if (!categoryConfig) {
        throw new Error(`Unknown platform log category: ${category}`);
    }
    
    const sourceDir = categoryConfig.subdirectory 
        ? path.join(platformLogsDir, categoryConfig.subdirectory)
        : platformLogsDir;
        
    const archiveDir = categoryConfig.subdirectory
        ? path.join(platformArchivesDir, categoryConfig.subdirectory)
        : platformArchivesDir;
    
    if (!fs.existsSync(sourceDir)) {
        return { archived: 0, compressed: 0 };
    }
    
    const files = await readdir(sourceDir);
    const logFiles = files.filter(file => 
        file.includes(categoryConfig.name) && 
        file.endsWith('.log')
    );
    
    let archived = 0;
    let compressed = 0;
    
    for (const file of logFiles) {
        const filePath = path.join(sourceDir, file);
        const fileStat = await stat(filePath);
        const daysSinceModified = (Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceModified > daysOld) {
            // Compress and move to archive
            const content = await readFile(filePath);
            const compressed_content = await gzip(content);
            
            const archiveFilePath = path.join(archiveDir, `${file}.gz`);
            await writeFile(archiveFilePath, compressed_content);
            
            // Remove original file
            await unlink(filePath);
            
            archived++;
            compressed++;
        }
    }
    
    return { archived, compressed };
}

/**
 * Apply platform-specific retention policies
 */
async function applyPlatformRetentionPolicies() {
    const results = {
        categoriesProcessed: 0,
        totalArchived: 0,
        totalCompressed: 0,
        totalDeleted: 0,
        errors: []
    };
    
    for (const [categoryKey, categoryConfig] of Object.entries(PLATFORM_LOG_CATEGORIES)) {
        try {
            // Archive old logs
            const archiveResult = await archivePlatformLogs(categoryKey, categoryConfig.compressionDelay);
            results.totalArchived += archiveResult.archived;
            results.totalCompressed += archiveResult.compressed;
            
            // Clean up very old archives (beyond retention period)
            const archiveDir = categoryConfig.subdirectory
                ? path.join(platformArchivesDir, categoryConfig.subdirectory)
                : platformArchivesDir;
                
            if (fs.existsSync(archiveDir)) {
                const archiveFiles = await readdir(archiveDir);
                const categoryArchives = archiveFiles.filter(file => 
                    file.includes(categoryConfig.name) && file.endsWith('.gz')
                );
                
                for (const file of categoryArchives) {
                    const filePath = path.join(archiveDir, file);
                    const fileStat = await stat(filePath);
                    const daysSinceModified = (Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
                    
                    // Only delete non-immutable logs beyond retention
                    if (daysSinceModified > categoryConfig.retention && !categoryConfig.immutable) {
                        await unlink(filePath);
                        results.totalDeleted++;
                    }
                }
            }
            
            results.categoriesProcessed++;
            
        } catch (error) {
            results.errors.push({
                category: categoryKey,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Get comprehensive platform storage statistics
 */
async function getPlatformStorageStatistics() {
    const stats = {
        totalSize: 0,
        totalFiles: 0,
        categories: {},
        immutableLogs: {},
        archives: {},
        oldestLog: null,
        newestLog: null
    };
    
    // Calculate directory size recursively
    async function calculateDirSize(dirPath) {
        if (!fs.existsSync(dirPath)) {
            return { size: 0, files: 0, oldest: null, newest: null };
        }
        
        const files = await readdir(dirPath);
        let totalSize = 0;
        let fileCount = 0;
        let oldestTime = null;
        let newestTime = null;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await stat(filePath);
            
            if (fileStat.isDirectory()) {
                const subStats = await calculateDirSize(filePath);
                totalSize += subStats.size;
                fileCount += subStats.files;
                
                if (!oldestTime || (subStats.oldest && subStats.oldest < oldestTime)) {
                    oldestTime = subStats.oldest;
                }
                if (!newestTime || (subStats.newest && subStats.newest > newestTime)) {
                    newestTime = subStats.newest;
                }
            } else {
                totalSize += fileStat.size;
                fileCount++;
                
                if (!oldestTime || fileStat.mtime < oldestTime) {
                    oldestTime = fileStat.mtime;
                }
                if (!newestTime || fileStat.mtime > newestTime) {
                    newestTime = fileStat.mtime;
                }
            }
        }
        
        return { size: totalSize, files: fileCount, oldest: oldestTime, newest: newestTime };
    }
    
    // Get stats for each category
    for (const [categoryKey, categoryConfig] of Object.entries(PLATFORM_LOG_CATEGORIES)) {
        const categoryDir = categoryConfig.subdirectory
            ? path.join(platformLogsDir, categoryConfig.subdirectory)
            : platformLogsDir;
            
        const categoryStats = await calculateDirSize(categoryDir);
        
        stats.categories[categoryKey] = {
            size: categoryStats.size,
            files: categoryStats.files,
            sizeMB: (categoryStats.size / 1024 / 1024).toFixed(2),
            retention: categoryConfig.retention,
            immutable: categoryConfig.immutable
        };
        
        stats.totalSize += categoryStats.size;
        stats.totalFiles += categoryStats.files;
        
        if (!stats.oldestLog || (categoryStats.oldest && categoryStats.oldest < stats.oldestLog)) {
            stats.oldestLog = categoryStats.oldest;
        }
        if (!stats.newestLog || (categoryStats.newest && categoryStats.newest > stats.newestLog)) {
            stats.newestLog = categoryStats.newest;
        }
    }
    
    // Get immutable logs statistics
    if (fs.existsSync(immutableLogsDir)) {
        const immutableStats = await calculateDirSize(immutableLogsDir);
        stats.immutableLogs = {
            size: immutableStats.size,
            files: immutableStats.files,
            sizeMB: (immutableStats.size / 1024 / 1024).toFixed(2)
        };
    }
    
    // Get archives statistics
    if (fs.existsSync(platformArchivesDir)) {
        const archiveStats = await calculateDirSize(platformArchivesDir);
        stats.archives = {
            size: archiveStats.size,
            files: archiveStats.files,
            sizeMB: (archiveStats.size / 1024 / 1024).toFixed(2)
        };
    }
    
    stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    
    return stats;
}

/**
 * Verify all immutable log chains
 */
async function verifyAllImmutableChains() {
    const results = {};
    
    for (const [categoryKey, categoryConfig] of Object.entries(PLATFORM_LOG_CATEGORIES)) {
        if (categoryConfig.immutable) {
            try {
                results[categoryKey] = await verifyImmutableChain(categoryKey);
            } catch (error) {
                results[categoryKey] = {
                    valid: false,
                    error: error.message
                };
            }
        }
    }
    
    return results;
}

/**
 * Export platform logs for compliance or analysis
 */
async function exportPlatformLogs(category, startDate, endDate, format = 'json') {
    const categoryConfig = PLATFORM_LOG_CATEGORIES[category];
    if (!categoryConfig) {
        throw new Error(`Unknown platform log category: ${category}`);
    }
    
    const exportData = {
        category,
        exportDate: new Date().toISOString(),
        startDate,
        endDate,
        format,
        entries: [],
        metadata: {
            totalEntries: 0,
            immutable: categoryConfig.immutable,
            retention: categoryConfig.retention
        }
    };
    
    // Read from regular logs
    const logDir = categoryConfig.subdirectory
        ? path.join(platformLogsDir, categoryConfig.subdirectory)
        : platformLogsDir;
        
    if (fs.existsSync(logDir)) {
        const files = await readdir(logDir);
        const logFiles = files.filter(file => 
            file.includes(categoryConfig.name) && 
            (file.endsWith('.log') || file.endsWith('.log.gz'))
        );
        
        for (const file of logFiles) {
            const filePath = path.join(logDir, file);
            // TODO: Parse log files and filter by date range
            // This would require implementing log parsing logic
        }
    }
    
    // Read from immutable logs if applicable
    if (categoryConfig.immutable) {
        const immutableFile = path.join(immutableLogsDir, `${categoryConfig.name}-immutable.log`);
        if (fs.existsSync(immutableFile)) {
            const content = await readFile(immutableFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    const entryDate = new Date(entry.timestamp);
                    
                    if (entryDate >= new Date(startDate) && entryDate <= new Date(endDate)) {
                        exportData.entries.push(entry);
                    }
                } catch (parseError) {
                    // Skip invalid entries
                }
            }
        }
    }
    
    exportData.metadata.totalEntries = exportData.entries.length;
    
    return exportData;
}

export {
    PLATFORM_LOG_CATEGORIES,
    createImmutableLogEntry,
    verifyImmutableChain,
    createPlatformDirectoryStructure,
    archivePlatformLogs,
    applyPlatformRetentionPolicies,
    getPlatformStorageStatistics,
    verifyAllImmutableChains,
    exportPlatformLogs,
    generateImmutableHash
};

export default {
    PLATFORM_LOG_CATEGORIES,
    createImmutableLogEntry,
    verifyImmutableChain,
    createPlatformDirectoryStructure,
    archivePlatformLogs,
    applyPlatformRetentionPolicies,
    getPlatformStorageStatistics,
    verifyAllImmutableChains,
    exportPlatformLogs,
    generateImmutableHash
};