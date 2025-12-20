/**
 * Log Maintenance Service
 * 
 * Provides automated log rotation, compression, and cleanup utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import loggingConfigManager from '../config/logging.config.js';

class LogMaintenanceService {
    constructor() {
        this.configManager = loggingConfigManager;
        this.isRunning = false;
        this.stats = {
            lastRun: null,
            filesProcessed: 0,
            bytesCompressed: 0,
            filesDeleted: 0,
            errors: []
        };
    }
    
    /**
     * Initialize the maintenance service
     */
    async initialize() {
        await this.configManager.initialize();
        console.log('Log maintenance service initialized');
    }
    
    /**
     * Run complete maintenance cycle
     */
    async runMaintenance(options = {}) {
        if (this.isRunning) {
            throw new Error('Maintenance is already running');
        }
        
        this.isRunning = true;
        this.stats = {
            lastRun: new Date(),
            filesProcessed: 0,
            bytesCompressed: 0,
            filesDeleted: 0,
            errors: []
        };
        
        try {
            console.log('Starting log maintenance cycle...');
            
            // Get all configured companies
            const companies = Array.from(this.configManager.companyConfigs.keys());
            
            // Add default company if no specific companies configured
            if (companies.length === 0) {
                companies.push('default');
            }
            
            // Process each company's logs
            for (const companyId of companies) {
                await this.processCompanyLogs(companyId, options);
            }
            
            // Process platform logs
            await this.processPlatformLogs(options);
            
            // Generate maintenance report
            const report = this.generateMaintenanceReport();
            
            console.log('Log maintenance cycle completed:', report);
            
            return {
                success: true,
                report
            };
        } catch (error) {
            this.stats.errors.push({
                timestamp: new Date(),
                error: error.message,
                stack: error.stack
            });
            
            console.error('Log maintenance failed:', error);
            
            return {
                success: false,
                error: error.message,
                report: this.generateMaintenanceReport()
            };
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Process logs for a specific company
     */
    async processCompanyLogs(companyId, options = {}) {
        try {
            const logTypes = Object.keys(this.configManager.config.logTypes);
            
            for (const logType of logTypes) {
                const config = this.configManager.getLogTypeConfig(logType, companyId);
                const retentionPolicy = this.configManager.getRetentionPolicy(logType, companyId);
                
                // Skip platform logs in company processing
                if (config.crossTenant) {
                    continue;
                }
                
                const logDir = this.getLogDirectory(companyId, logType);
                
                // Ensure log directory exists
                await fs.mkdir(logDir, { recursive: true });
                
                // Process logs in this directory
                await this.processLogDirectory(logDir, retentionPolicy, options);
            }
        } catch (error) {
            this.stats.errors.push({
                timestamp: new Date(),
                companyId,
                error: error.message
            });
            console.error(`Error processing logs for company ${companyId}:`, error);
        }
    }
    
    /**
     * Process platform logs
     */
    async processPlatformLogs(options = {}) {
        try {
            const platformConfig = this.configManager.getLogTypeConfig('platform');
            const retentionPolicy = this.configManager.getRetentionPolicy('platform');
            
            const logDir = path.join(process.cwd(), platformConfig.directory);
            
            // Ensure log directory exists
            await fs.mkdir(logDir, { recursive: true });
            
            // Process platform logs
            await this.processLogDirectory(logDir, retentionPolicy, options);
        } catch (error) {
            this.stats.errors.push({
                timestamp: new Date(),
                type: 'platform',
                error: error.message
            });
            console.error('Error processing platform logs:', error);
        }
    }
    
    /**
     * Process logs in a specific directory
     */
    async processLogDirectory(logDir, retentionPolicy, options = {}) {
        try {
            const files = await fs.readdir(logDir);
            const logFiles = files.filter(file => this.isLogFile(file));
            
            for (const file of logFiles) {
                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);
                
                // Check if file needs rotation
                if (this.needsRotation(file, stats, options)) {
                    await this.rotateLogFile(filePath, options);
                }
                
                // Check if file needs compression
                if (this.needsCompression(file, stats, options)) {
                    await this.compressLogFile(filePath, options);
                }
                
                // Check if file should be deleted
                if (this.shouldDelete(file, stats, retentionPolicy, options)) {
                    await this.deleteLogFile(filePath, options);
                }
                
                this.stats.filesProcessed++;
            }
        } catch (error) {
            console.error(`Error processing log directory ${logDir}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if a file is a log file
     */
    isLogFile(filename) {
        const logExtensions = ['.log', '.json', '.txt'];
        const ext = path.extname(filename).toLowerCase();
        return logExtensions.includes(ext) || filename.includes('audit') || filename.includes('error');
    }
    
    /**
     * Check if log file needs rotation
     */
    needsRotation(filename, stats, options = {}) {
        if (options.skipRotation) {
            return false;
        }
        
        // Don't rotate already rotated files
        if (filename.includes('.gz') || /\d{4}-\d{2}-\d{2}/.test(filename)) {
            return false;
        }
        
        const config = this.configManager.getEnvironmentConfig();
        const maxSize = this.parseFileSize(config.maxFileSize || '20m');
        
        return stats.size > maxSize;
    }
    
    /**
     * Check if log file needs compression
     */
    needsCompression(filename, stats, options = {}) {
        if (options.skipCompression) {
            return false;
        }
        
        // Don't compress already compressed files
        if (filename.includes('.gz')) {
            return false;
        }
        
        // Don't compress current day's files
        const today = new Date().toISOString().split('T')[0];
        if (filename.includes(today)) {
            return false;
        }
        
        // Compress files older than 1 day
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return stats.mtime < oneDayAgo;
    }
    
    /**
     * Check if log file should be deleted
     */
    shouldDelete(filename, stats, retentionPolicy, options = {}) {
        if (options.skipDeletion) {
            return false;
        }
        
        const retentionMs = retentionPolicy.retentionDays * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - retentionMs);
        
        return stats.mtime < cutoffDate;
    }
    
    /**
     * Rotate a log file
     */
    async rotateLogFile(filePath, options = {}) {
        try {
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const basename = path.basename(filePath, ext);
            const timestamp = new Date().toISOString().split('T')[0];
            
            const rotatedPath = path.join(dir, `${basename}-${timestamp}${ext}`);
            
            // Check if rotated file already exists
            let counter = 1;
            let finalPath = rotatedPath;
            while (await this.fileExists(finalPath)) {
                finalPath = path.join(dir, `${basename}-${timestamp}-${counter}${ext}`);
                counter++;
            }
            
            await fs.rename(filePath, finalPath);
            
            console.log(`Rotated log file: ${filePath} -> ${finalPath}`);
            
            return finalPath;
        } catch (error) {
            console.error(`Error rotating log file ${filePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Compress a log file
     */
    async compressLogFile(filePath, options = {}) {
        try {
            const compressedPath = `${filePath}.gz`;
            
            // Check if compressed file already exists
            if (await this.fileExists(compressedPath)) {
                console.log(`Compressed file already exists: ${compressedPath}`);
                return compressedPath;
            }
            
            const originalStats = await fs.stat(filePath);
            
            // Create compression pipeline
            const readStream = createReadStream(filePath);
            const gzipStream = createGzip({ level: 9 });
            const writeStream = createWriteStream(compressedPath);
            
            await pipeline(readStream, gzipStream, writeStream);
            
            // Verify compression was successful
            const compressedStats = await fs.stat(compressedPath);
            
            if (compressedStats.size > 0) {
                // Delete original file
                await fs.unlink(filePath);
                
                const compressionRatio = (1 - compressedStats.size / originalStats.size) * 100;
                this.stats.bytesCompressed += originalStats.size - compressedStats.size;
                
                console.log(`Compressed log file: ${filePath} (${compressionRatio.toFixed(1)}% reduction)`);
                
                return compressedPath;
            } else {
                // Compression failed, remove empty compressed file
                await fs.unlink(compressedPath);
                throw new Error('Compression resulted in empty file');
            }
        } catch (error) {
            console.error(`Error compressing log file ${filePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a log file
     */
    async deleteLogFile(filePath, options = {}) {
        try {
            if (options.dryRun) {
                console.log(`Would delete log file: ${filePath}`);
                return;
            }
            
            await fs.unlink(filePath);
            this.stats.filesDeleted++;
            
            console.log(`Deleted expired log file: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting log file ${filePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Get log directory for a company and log type
     */
    getLogDirectory(companyId, logType) {
        const config = this.configManager.getLogTypeConfig(logType, companyId);
        const baseDir = config.directory || 'logs';
        
        if (companyId === 'default') {
            return path.join(process.cwd(), baseDir);
        }
        
        return path.join(process.cwd(), baseDir, 'companies', companyId);
    }
    
    /**
     * Parse file size string to bytes
     */
    parseFileSize(sizeStr) {
        const units = {
            'b': 1,
            'k': 1024,
            'm': 1024 * 1024,
            'g': 1024 * 1024 * 1024
        };
        
        const match = sizeStr.toLowerCase().match(/^(\d+)([kmg]?)$/);
        if (!match) {
            return 20 * 1024 * 1024; // Default 20MB
        }
        
        const size = parseInt(match[1]);
        const unit = match[2] || 'b';
        
        return size * units[unit];
    }
    
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Generate maintenance report
     */
    generateMaintenanceReport() {
        return {
            timestamp: this.stats.lastRun,
            duration: this.stats.lastRun ? Date.now() - this.stats.lastRun.getTime() : 0,
            filesProcessed: this.stats.filesProcessed,
            bytesCompressed: this.stats.bytesCompressed,
            filesDeleted: this.stats.filesDeleted,
            errors: this.stats.errors,
            success: this.stats.errors.length === 0
        };
    }
    
    /**
     * Get maintenance statistics
     */
    getMaintenanceStats() {
        return {
            success: true,
            data: {
                isRunning: this.isRunning,
                lastRun: this.stats.lastRun,
                stats: this.stats
            }
        };
    }
    
    /**
     * Get log directory statistics
     */
    async getLogDirectoryStats(companyId = null) {
        try {
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                compressedFiles: 0,
                oldestFile: null,
                newestFile: null,
                logTypes: {}
            };
            
            const logTypes = Object.keys(this.configManager.config.logTypes);
            
            for (const logType of logTypes) {
                const logDir = companyId ? 
                    this.getLogDirectory(companyId, logType) : 
                    path.join(process.cwd(), 'logs');
                
                try {
                    const dirStats = await this.getDirectoryStats(logDir);
                    stats.totalFiles += dirStats.fileCount;
                    stats.totalSize += dirStats.totalSize;
                    stats.compressedFiles += dirStats.compressedFiles;
                    
                    if (!stats.oldestFile || (dirStats.oldestFile && dirStats.oldestFile < stats.oldestFile)) {
                        stats.oldestFile = dirStats.oldestFile;
                    }
                    
                    if (!stats.newestFile || (dirStats.newestFile && dirStats.newestFile > stats.newestFile)) {
                        stats.newestFile = dirStats.newestFile;
                    }
                    
                    stats.logTypes[logType] = dirStats;
                } catch (error) {
                    // Directory might not exist, which is fine
                    stats.logTypes[logType] = {
                        fileCount: 0,
                        totalSize: 0,
                        compressedFiles: 0,
                        error: error.message
                    };
                }
            }
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get statistics for a specific directory
     */
    async getDirectoryStats(dirPath) {
        const stats = {
            fileCount: 0,
            totalSize: 0,
            compressedFiles: 0,
            oldestFile: null,
            newestFile: null
        };
        
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileStats = await fs.stat(filePath);
                
                if (fileStats.isFile() && this.isLogFile(file)) {
                    stats.fileCount++;
                    stats.totalSize += fileStats.size;
                    
                    if (file.includes('.gz')) {
                        stats.compressedFiles++;
                    }
                    
                    if (!stats.oldestFile || fileStats.mtime < stats.oldestFile) {
                        stats.oldestFile = fileStats.mtime;
                    }
                    
                    if (!stats.newestFile || fileStats.mtime > stats.newestFile) {
                        stats.newestFile = fileStats.mtime;
                    }
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        return stats;
    }
}

// Create singleton instance
const logMaintenanceService = new LogMaintenanceService();

export default logMaintenanceService;
export { LogMaintenanceService };