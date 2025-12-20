/**
 * Log Search Engine Service
 * Provides efficient search capabilities across company logs with complex query support
 * Requirements: 5.5, 6.4
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';
import readline from 'readline';
import crypto from 'crypto';
import { getCorrelatedLogs, searchLogs as correlationSearch } from './logCorrelation.service.js';
import { LOG_TYPES, PLATFORM_LOG_TYPES } from './logStorage.service.js';
import loggingModuleService, { ESSENTIAL_LOG_EVENTS } from './loggingModule.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const gunzip = promisify(zlib.gunzip);

// Base directories
const baseLogsDir = path.join(__dirname, '../../logs');
const companyLogsDir = path.join(baseLogsDir, 'companies');
const platformLogsDir = path.join(baseLogsDir, 'platform');

/**
 * Search query interface
 */
class SearchQuery {
    constructor(options = {}) {
        // Basic filters
        this.tenantId = options.tenantId;
        this.userId = options.userId;
        this.sessionId = options.sessionId;
        this.correlationId = options.correlationId;
        
        // Time range
        this.startTime = options.startTime ? new Date(options.startTime) : null;
        this.endTime = options.endTime ? new Date(options.endTime) : null;
        
        // Log levels
        this.levels = options.levels || ['info', 'warn', 'error', 'debug'];
        
        // Log types
        this.logTypes = options.logTypes || Object.keys(LOG_TYPES);
        
        // Text search
        this.message = options.message;
        this.messageRegex = options.messageRegex;
        
        // Metadata filters
        this.security = options.security;
        this.audit = options.audit;
        this.performance = options.performance;
        this.compliance = options.compliance;
        
        // Advanced filters
        this.endpoint = options.endpoint;
        this.method = options.method;
        this.statusCode = options.statusCode;
        this.ipAddress = options.ipAddress;
        this.userAgent = options.userAgent;
        
        // Result options
        this.limit = options.limit || 1000;
        this.offset = options.offset || 0;
        this.sortBy = options.sortBy || 'timestamp';
        this.sortOrder = options.sortOrder || 'desc';
        
        // Include options
        this.includeContext = options.includeContext || false;
        this.includeCorrelated = options.includeCorrelated || false;
        
        // Platform access options
        this.bypassModuleSettings = options.bypassModuleSettings || false;
        this.platformAccess = options.platformAccess || false;
        this.essentialOnly = options.essentialOnly || false;
        this.companyId = options.companyId;
    }

    /**
     * Validate query parameters
     */
    validate() {
        const errors = [];
        
        if (this.startTime && this.endTime && this.startTime > this.endTime) {
            errors.push('Start time must be before end time');
        }
        
        if (this.limit < 1 || this.limit > 10000) {
            errors.push('Limit must be between 1 and 10000');
        }
        
        if (this.offset < 0) {
            errors.push('Offset must be non-negative');
        }
        
        if (!['timestamp', 'level', 'message'].includes(this.sortBy)) {
            errors.push('Invalid sortBy field');
        }
        
        if (!['asc', 'desc'].includes(this.sortOrder)) {
            errors.push('Invalid sortOrder');
        }
        
        return errors;
    }
}

/**
 * Search result interface
 */
class SearchResult {
    constructor() {
        this.entries = [];
        this.totalCount = 0;
        this.searchTime = 0;
        this.filesSearched = 0;
        this.correlatedEntries = [];
        this.facets = {
            levels: {},
            logTypes: {},
            sources: {},
            timeDistribution: {}
        };
    }

    addEntry(entry) {
        this.entries.push(entry);
        this.updateFacets(entry);
    }

    updateFacets(entry) {
        // Update level facets
        this.facets.levels[entry.level] = (this.facets.levels[entry.level] || 0) + 1;
        
        // Update log type facets
        const logType = entry.logType || 'application';
        this.facets.logTypes[logType] = (this.facets.logTypes[logType] || 0) + 1;
        
        // Update source facets
        this.facets.sources[entry.source] = (this.facets.sources[entry.source] || 0) + 1;
        
        // Update time distribution (by hour)
        const hour = new Date(entry.timestamp).getHours();
        this.facets.timeDistribution[hour] = (this.facets.timeDistribution[hour] || 0) + 1;
    }

    sort(sortBy, sortOrder) {
        this.entries.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'timestamp') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            } else {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            }
        });
    }

    paginate(offset, limit) {
        this.totalCount = this.entries.length;
        this.entries = this.entries.slice(offset, offset + limit);
    }
}

/**
 * Log Search Engine
 */
class LogSearchEngine {
    constructor() {
        this.indexCache = new Map(); // File path -> last modified time
        this.searchCache = new Map(); // Query hash -> cached results
        this.maxCacheSize = 100;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Search logs with complex query support
     */
    async search(queryOptions) {
        const startTime = Date.now();
        const query = new SearchQuery(queryOptions);
        
        // Validate query
        const validationErrors = query.validate();
        if (validationErrors.length > 0) {
            throw new Error(`Invalid query: ${validationErrors.join(', ')}`);
        }
        
        // Check cache first
        const queryHash = this.hashQuery(query);
        const cachedResult = this.searchCache.get(queryHash);
        if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTimeout) {
            return cachedResult.result;
        }
        
        const result = new SearchResult();
        
        try {
            // Search company logs if tenantId is specified
            if (query.tenantId) {
                await this.searchCompanyLogs(query, result);
            } else {
                // Search all company logs (admin search)
                await this.searchAllCompanyLogs(query, result);
            }
            
            // Search platform logs if requested
            if (query.logTypes.includes('platform')) {
                await this.searchPlatformLogs(query, result);
            }
            
            // Add correlated entries if requested
            if (query.includeCorrelated) {
                await this.addCorrelatedEntries(query, result);
            }
            
            // Sort and paginate results
            result.sort(query.sortBy, query.sortOrder);
            result.paginate(query.offset, query.limit);
            
            result.searchTime = Date.now() - startTime;
            
            // Cache result
            this.cacheResult(queryHash, result);
            
            return result;
            
        } catch (error) {
            console.error('Search error:', error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Search logs for a specific company
     */
    async searchCompanyLogs(query, result) {
        const companyId = query.companyId || query.tenantId;
        const companyDir = await this.getCompanyDirectory(companyId);
        if (!companyDir || !fs.existsSync(companyDir)) {
            return;
        }
        
        // Check module settings unless bypassed
        let allowedLogTypes = query.logTypes;
        if (!query.bypassModuleSettings && !query.platformAccess) {
            allowedLogTypes = await this.filterLogTypesByModuleSettings(companyId, query.logTypes);
        }
        
        // If essential only, filter to essential log types
        if (query.essentialOnly) {
            allowedLogTypes = allowedLogTypes.filter(logType => 
                this.isEssentialLogType(logType)
            );
        }
        
        // Search each allowed log type
        for (const logType of allowedLogTypes) {
            if (LOG_TYPES[logType]) {
                await this.searchLogType(companyDir, logType, query, result);
            }
        }
    }

    /**
     * Search all company logs (admin function)
     */
    async searchAllCompanyLogs(query, result) {
        if (!fs.existsSync(companyLogsDir)) {
            return;
        }
        
        const companies = await readdir(companyLogsDir);
        
        for (const company of companies) {
            const companyPath = path.join(companyLogsDir, company);
            const companyStat = await stat(companyPath);
            
            if (companyStat.isDirectory()) {
                // Check module settings unless bypassed
                let allowedLogTypes = query.logTypes;
                if (!query.bypassModuleSettings && !query.platformAccess) {
                    allowedLogTypes = await this.filterLogTypesByModuleSettings(company, query.logTypes);
                }
                
                // If essential only, filter to essential log types
                if (query.essentialOnly) {
                    allowedLogTypes = allowedLogTypes.filter(logType => 
                        this.isEssentialLogType(logType)
                    );
                }
                
                // Search each allowed log type for this company
                for (const logType of allowedLogTypes) {
                    if (LOG_TYPES[logType]) {
                        await this.searchLogType(companyPath, logType, query, result);
                    }
                }
            }
        }
    }

    /**
     * Search platform logs
     */
    async searchPlatformLogs(query, result) {
        if (!fs.existsSync(platformLogsDir)) {
            return;
        }
        
        // Search each platform log type
        for (const logType of Object.keys(PLATFORM_LOG_TYPES)) {
            await this.searchPlatformLogType(platformLogsDir, logType, query, result);
        }
    }

    /**
     * Search specific log type in a directory
     */
    async searchLogType(baseDir, logType, query, result) {
        const logConfig = LOG_TYPES[logType];
        const logDir = logConfig.subdirectory ? path.join(baseDir, logConfig.subdirectory) : baseDir;
        
        if (!fs.existsSync(logDir)) {
            return;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            // Filter files by date range if specified
            const filteredFiles = await this.filterFilesByDateRange(logDir, logFiles, query);
            
            // Search each file
            for (const file of filteredFiles) {
                const filePath = path.join(logDir, file);
                await this.searchLogFile(filePath, logType, query, result);
                result.filesSearched++;
            }
            
        } catch (error) {
            console.error(`Error searching log type ${logType} in ${logDir}:`, error);
        }
    }

    /**
     * Search platform log type
     */
    async searchPlatformLogType(baseDir, logType, query, result) {
        const logConfig = PLATFORM_LOG_TYPES[logType];
        const logDir = logConfig.subdirectory ? path.join(baseDir, logConfig.subdirectory) : baseDir;
        
        if (!fs.existsSync(logDir)) {
            return;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            // Filter files by date range if specified
            const filteredFiles = await this.filterFilesByDateRange(logDir, logFiles, query);
            
            // Search each file
            for (const file of filteredFiles) {
                const filePath = path.join(logDir, file);
                await this.searchLogFile(filePath, logType, query, result);
                result.filesSearched++;
            }
            
        } catch (error) {
            console.error(`Error searching platform log type ${logType} in ${logDir}:`, error);
        }
    }

    /**
     * Filter log files by date range
     */
    async filterFilesByDateRange(logDir, files, query) {
        if (!query.startTime && !query.endTime) {
            return files;
        }
        
        const filteredFiles = [];
        
        for (const file of files) {
            const filePath = path.join(logDir, file);
            
            try {
                // Extract date from filename (YYYY-MM-DD format)
                const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    const fileDate = new Date(dateMatch[1]);
                    
                    // Check if file date is within range
                    if (query.startTime && fileDate < query.startTime) {
                        continue;
                    }
                    if (query.endTime && fileDate > query.endTime) {
                        continue;
                    }
                }
                
                filteredFiles.push(file);
                
            } catch (error) {
                // If we can't determine the date, include the file
                filteredFiles.push(file);
            }
        }
        
        return filteredFiles;
    }

    /**
     * Search individual log file
     */
    async searchLogFile(filePath, logType, query, result) {
        try {
            let content;
            
            // Handle compressed files
            if (filePath.endsWith('.gz')) {
                const compressedContent = await readFile(filePath);
                const decompressed = await gunzip(compressedContent);
                content = decompressed.toString('utf8');
            } else {
                content = await readFile(filePath, 'utf8');
            }
            
            // Parse and filter log entries
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    
                    // Add metadata
                    entry.logType = logType;
                    entry.source = entry.source || 'backend';
                    
                    if (this.matchesQuery(entry, query)) {
                        result.addEntry(entry);
                    }
                    
                } catch (parseError) {
                    // Skip invalid JSON lines
                    continue;
                }
            }
            
        } catch (error) {
            console.error(`Error searching file ${filePath}:`, error);
        }
    }

    /**
     * Filter log types based on module settings
     */
    async filterLogTypesByModuleSettings(companyId, logTypes) {
        try {
            const allowedTypes = [];
            
            for (const logType of logTypes) {
                // Always allow essential log types
                if (this.isEssentialLogType(logType)) {
                    allowedTypes.push(logType);
                    continue;
                }
                
                // Check if feature is enabled for this log type
                const featureEnabled = await this.isLogTypeFeatureEnabled(companyId, logType);
                if (featureEnabled) {
                    allowedTypes.push(logType);
                }
            }
            
            return allowedTypes;
        } catch (error) {
            console.error(`Error filtering log types for company ${companyId}:`, error);
            // On error, return essential log types only
            return logTypes.filter(logType => this.isEssentialLogType(logType));
        }
    }

    /**
     * Check if a log type is essential (cannot be disabled)
     */
    isEssentialLogType(logType) {
        const essentialTypes = ['audit', 'security', 'authentication', 'authorization'];
        return essentialTypes.includes(logType);
    }

    /**
     * Check if a log type feature is enabled for a company
     */
    async isLogTypeFeatureEnabled(companyId, logType) {
        try {
            // Map log types to module features
            const logTypeFeatureMap = {
                'audit': 'auditLogging',
                'security': 'securityLogging', 
                'performance': 'performanceLogging',
                'error': 'detailedErrorLogging',
                'frontend': 'frontendLogging',
                'user_action': 'userActionLogging'
            };
            
            const feature = logTypeFeatureMap[logType];
            if (!feature) {
                // Unknown log type, allow by default
                return true;
            }
            
            return await loggingModuleService.isFeatureEnabled(companyId, feature);
        } catch (error) {
            console.error(`Error checking feature for log type ${logType}:`, error);
            // On error, allow essential types, deny others
            return this.isEssentialLogType(logType);
        }
    }

    /**
     * Check if log entry matches query criteria
     */
    matchesQuery(entry, query) {
        // Basic filters
        if (query.tenantId && entry.tenantId !== query.tenantId) return false;
        if (query.userId && entry.userId !== query.userId) return false;
        if (query.sessionId && entry.sessionId !== query.sessionId) return false;
        if (query.correlationId && entry.correlationId !== query.correlationId) return false;
        
        // Time range
        if (query.startTime || query.endTime) {
            const entryTime = new Date(entry.timestamp);
            if (query.startTime && entryTime < query.startTime) return false;
            if (query.endTime && entryTime > query.endTime) return false;
        }
        
        // Log level
        if (!query.levels.includes(entry.level)) return false;
        
        // Text search
        if (query.message) {
            const message = entry.message.toLowerCase();
            const searchTerm = query.message.toLowerCase();
            if (!message.includes(searchTerm)) return false;
        }
        
        if (query.messageRegex) {
            const regex = new RegExp(query.messageRegex, 'i');
            if (!regex.test(entry.message)) return false;
        }
        
        // Metadata filters
        if (query.security && !entry.security) return false;
        if (query.audit && !entry.audit) return false;
        if (query.performance && !entry.performance) return false;
        if (query.compliance && !entry.compliance) return false;
        
        // Advanced filters
        if (query.endpoint && (!entry.endpoint || !entry.endpoint.includes(query.endpoint))) return false;
        if (query.method && entry.method !== query.method) return false;
        if (query.statusCode && entry.statusCode !== query.statusCode) return false;
        if (query.ipAddress && entry.ipAddress !== query.ipAddress) return false;
        if (query.userAgent && (!entry.userAgent || !entry.userAgent.includes(query.userAgent))) return false;
        
        return true;
    }

    /**
     * Add correlated log entries
     */
    async addCorrelatedEntries(query, result) {
        const correlationIds = new Set();
        
        // Collect correlation IDs from search results
        for (const entry of result.entries) {
            if (entry.correlationId) {
                correlationIds.add(entry.correlationId);
            }
        }
        
        // Get correlated entries for each correlation ID
        for (const correlationId of correlationIds) {
            try {
                const correlatedLogs = getCorrelatedLogs(correlationId);
                for (const log of correlatedLogs) {
                    // Only add if not already in results
                    const exists = result.entries.some(entry => 
                        entry.correlationId === log.correlationId && 
                        entry.timestamp === log.timestamp
                    );
                    
                    if (!exists) {
                        result.correlatedEntries.push(log);
                    }
                }
            } catch (error) {
                console.error(`Error getting correlated logs for ${correlationId}:`, error);
            }
        }
    }

    /**
     * Get company directory path
     */
    async getCompanyDirectory(tenantId) {
        // Try to find directory by tenant ID
        const possiblePaths = [
            path.join(companyLogsDir, tenantId),
            path.join(companyLogsDir, tenantId.toLowerCase()),
            path.join(companyLogsDir, tenantId.replace(/[^a-z0-9]/g, '_'))
        ];
        
        for (const dirPath of possiblePaths) {
            if (fs.existsSync(dirPath)) {
                return dirPath;
            }
        }
        
        // If not found, search all directories for matching tenant ID in log files
        if (fs.existsSync(companyLogsDir)) {
            const companies = await readdir(companyLogsDir);
            
            for (const company of companies) {
                const companyPath = path.join(companyLogsDir, company);
                const companyStat = await stat(companyPath);
                
                if (companyStat.isDirectory()) {
                    // Check if this directory contains logs for the tenant
                    const hasMatchingLogs = await this.directoryContainsTenant(companyPath, tenantId);
                    if (hasMatchingLogs) {
                        return companyPath;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Check if directory contains logs for specific tenant
     */
    async directoryContainsTenant(dirPath, tenantId) {
        try {
            const files = await readdir(dirPath);
            const logFiles = files.filter(file => file.endsWith('.log')).slice(0, 3); // Check first 3 files
            
            for (const file of logFiles) {
                const filePath = path.join(dirPath, file);
                const content = await readFile(filePath, 'utf8');
                
                if (content.includes(`"tenantId":"${tenantId}"`)) {
                    return true;
                }
            }
            
        } catch (error) {
            // Ignore errors
        }
        
        return false;
    }

    /**
     * Generate query hash for caching
     */
    hashQuery(query) {
        const queryString = JSON.stringify(query, Object.keys(query).sort());
        return crypto.createHash('md5').update(queryString).digest('hex');
    }

    /**
     * Cache search result
     */
    cacheResult(queryHash, result) {
        // Limit cache size
        if (this.searchCache.size >= this.maxCacheSize) {
            const oldestKey = this.searchCache.keys().next().value;
            this.searchCache.delete(oldestKey);
        }
        
        this.searchCache.set(queryHash, {
            result: result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Get search statistics
     */
    getStats() {
        return {
            cacheSize: this.searchCache.size,
            maxCacheSize: this.maxCacheSize,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }

    /**
     * Calculate cache hit rate
     */
    calculateCacheHitRate() {
        // This would need to be tracked over time in a real implementation
        return 0; // Placeholder
    }

    /**
     * Real-time search with streaming results
     */
    async *streamSearch(queryOptions) {
        const query = new SearchQuery(queryOptions);
        
        // Validate query
        const validationErrors = query.validate();
        if (validationErrors.length > 0) {
            throw new Error(`Invalid query: ${validationErrors.join(', ')}`);
        }
        
        // Stream results from company logs
        if (query.tenantId) {
            yield* this.streamCompanyLogs(query);
        } else {
            yield* this.streamAllCompanyLogs(query);
        }
        
        // Stream platform logs if requested
        if (query.logTypes.includes('platform')) {
            yield* this.streamPlatformLogs(query);
        }
    }

    /**
     * Stream company logs
     */
    async *streamCompanyLogs(query) {
        const companyId = query.companyId || query.tenantId;
        const companyDir = await this.getCompanyDirectory(companyId);
        if (!companyDir || !fs.existsSync(companyDir)) {
            return;
        }
        
        // Check module settings unless bypassed
        let allowedLogTypes = query.logTypes;
        if (!query.bypassModuleSettings && !query.platformAccess) {
            allowedLogTypes = await this.filterLogTypesByModuleSettings(companyId, query.logTypes);
        }
        
        // If essential only, filter to essential log types
        if (query.essentialOnly) {
            allowedLogTypes = allowedLogTypes.filter(logType => 
                this.isEssentialLogType(logType)
            );
        }
        
        for (const logType of allowedLogTypes) {
            if (LOG_TYPES[logType]) {
                yield* this.streamLogType(companyDir, logType, query);
            }
        }
    }

    /**
     * Stream all company logs
     */
    async *streamAllCompanyLogs(query) {
        if (!fs.existsSync(companyLogsDir)) {
            return;
        }
        
        const companies = await readdir(companyLogsDir);
        
        for (const company of companies) {
            const companyPath = path.join(companyLogsDir, company);
            const companyStat = await stat(companyPath);
            
            if (companyStat.isDirectory()) {
                // Check module settings unless bypassed
                let allowedLogTypes = query.logTypes;
                if (!query.bypassModuleSettings && !query.platformAccess) {
                    allowedLogTypes = await this.filterLogTypesByModuleSettings(company, query.logTypes);
                }
                
                // If essential only, filter to essential log types
                if (query.essentialOnly) {
                    allowedLogTypes = allowedLogTypes.filter(logType => 
                        this.isEssentialLogType(logType)
                    );
                }
                
                for (const logType of allowedLogTypes) {
                    if (LOG_TYPES[logType]) {
                        yield* this.streamLogType(companyPath, logType, query);
                    }
                }
            }
        }
    }

    /**
     * Stream platform logs
     */
    async *streamPlatformLogs(query) {
        if (!fs.existsSync(platformLogsDir)) {
            return;
        }
        
        for (const logType of Object.keys(PLATFORM_LOG_TYPES)) {
            yield* this.streamPlatformLogType(platformLogsDir, logType, query);
        }
    }

    /**
     * Stream log type
     */
    async *streamLogType(baseDir, logType, query) {
        const logConfig = LOG_TYPES[logType];
        const logDir = logConfig.subdirectory ? path.join(baseDir, logConfig.subdirectory) : baseDir;
        
        if (!fs.existsSync(logDir)) {
            return;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            const filteredFiles = await this.filterFilesByDateRange(logDir, logFiles, query);
            
            for (const file of filteredFiles) {
                const filePath = path.join(logDir, file);
                yield* this.streamLogFile(filePath, logType, query);
            }
            
        } catch (error) {
            console.error(`Error streaming log type ${logType} in ${logDir}:`, error);
        }
    }

    /**
     * Stream platform log type
     */
    async *streamPlatformLogType(baseDir, logType, query) {
        const logConfig = PLATFORM_LOG_TYPES[logType];
        const logDir = logConfig.subdirectory ? path.join(baseDir, logConfig.subdirectory) : baseDir;
        
        if (!fs.existsSync(logDir)) {
            return;
        }
        
        try {
            const files = await readdir(logDir);
            const logFiles = files.filter(file => 
                file.includes(logConfig.name) && 
                (file.endsWith('.log') || file.endsWith('.log.gz'))
            );
            
            const filteredFiles = await this.filterFilesByDateRange(logDir, logFiles, query);
            
            for (const file of filteredFiles) {
                const filePath = path.join(logDir, file);
                yield* this.streamLogFile(filePath, logType, query);
            }
            
        } catch (error) {
            console.error(`Error streaming platform log type ${logType} in ${logDir}:`, error);
        }
    }

    /**
     * Stream log file
     */
    async *streamLogFile(filePath, logType, query) {
        try {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: filePath.endsWith('.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream,
                crlfDelay: Infinity
            });
            
            for await (const line of rl) {
                if (!line.trim()) continue;
                
                try {
                    const entry = JSON.parse(line);
                    entry.logType = logType;
                    entry.source = entry.source || 'backend';
                    
                    if (this.matchesQuery(entry, query)) {
                        yield entry;
                    }
                    
                } catch (parseError) {
                    // Skip invalid JSON lines
                    continue;
                }
            }
            
        } catch (error) {
            console.error(`Error streaming file ${filePath}:`, error);
        }
    }
}

// Create singleton instance
const logSearchEngine = new LogSearchEngine();

/**
 * Search logs with complex query support
 */
export async function searchLogs(queryOptions) {
    return await logSearchEngine.search(queryOptions);
}

/**
 * Stream search results in real-time
 */
export async function* streamSearchLogs(queryOptions) {
    yield* logSearchEngine.streamSearch(queryOptions);
}

/**
 * Clear search cache
 */
export function clearSearchCache() {
    return logSearchEngine.clearCache();
}

/**
 * Get search engine statistics
 */
export function getSearchStats() {
    return logSearchEngine.getStats();
}

export default {
    searchLogs,
    streamSearchLogs,
    clearSearchCache,
    getSearchStats,
    SearchQuery,
    SearchResult
};