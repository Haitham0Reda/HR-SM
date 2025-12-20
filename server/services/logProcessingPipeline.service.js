/**
 * Log Processing Pipeline Service
 * 
 * Processes incoming logs through validation, correlation ID linking,
 * security event detection, and storage routing
 * 
 * Requirements: 1.1, 4.3, 9.1, 9.2
 */

import correlationIdService from './correlationId.service.js';
import logCorrelationService from './logCorrelation.service.js';
// Frontend security detection will be imported dynamically to avoid module loading issues
let frontendSecurityDetection = null;
import backendSecurityDetection from './backendSecurityDetection.service.js';
import logStorage from './logStorage.service.js';
import tenantIsolationEnforcement from './tenantIsolationEnforcement.service.js';
import companyLogger from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';
import loggingModuleService from './loggingModule.service.js';

class LogProcessingPipeline {
    constructor() {
        this.processingStats = {
            totalProcessed: 0,
            successfullyProcessed: 0,
            failed: 0,
            securityEventsDetected: 0,
            correlationsCreated: 0,
            startTime: new Date()
        };
        
        this.maxProcessingTimeMs = 5000; // 5 second timeout
        this.enableSecurityDetection = true;
        this.enableCorrelation = true;
        
        // Module configuration cache for performance
        this.moduleConfigCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Process a single log entry through the complete pipeline
     * 
     * @param {Object} logEntry - Log entry to process
     * @returns {Object} Processing result
     */
    async processLog(logEntry) {
        const startTime = Date.now();
        const processingId = this.generateProcessingId();
        
        // Initialize result outside try block to ensure it's always defined
        let result = {
            success: false,
            correlationId: logEntry.correlationId,
            processingId,
            warnings: [],
            securityEvents: [],
            storageLocation: null,
            processingTimeMs: 0,
            moduleAware: true,
            logLevel: 'detailed' // Will be updated based on module settings
        };
        
        try {

            // Step 0: Check module settings and determine log level
            const moduleSettings = await this.getModuleSettings(logEntry.companyId);
            const shouldProcessDetailed = await this.shouldProcessDetailedLog(logEntry, moduleSettings);
            
            if (!shouldProcessDetailed) {
                // Process as essential log only
                result.logLevel = 'essential';
                return await this.processEssentialLog(logEntry, result, processingId);
            }

            // Step 1: Validate log entry
            const validationResult = this.validateLogEntry(logEntry);
            if (!validationResult.valid) {
                result.error = 'Log validation failed';
                result.validationErrors = validationResult.errors;
                this.processingStats.failed++;
                return result;
            }

            if (validationResult.warnings.length > 0) {
                result.warnings.push(...validationResult.warnings);
            }

            // Step 2: Enforce tenant isolation
            const isolationResult = tenantIsolationEnforcement.enforceRequestIsolation({
                user: { id: logEntry.userId, tenantId: logEntry.companyId },
                tenant: { tenantId: logEntry.companyId },
                headers: { 'x-tenant-id': logEntry.companyId },
                query: {},
                body: { logEntry },
                originalUrl: '/api/v1/logs',
                method: 'POST',
                ip: logEntry.ipAddress
            });

            if (!isolationResult.valid) {
                result.error = 'Tenant isolation violation';
                result.isolationViolations = isolationResult.violations;
                this.processingStats.failed++;
                
                // Log security violation
                platformLogger.platformSecurity('tenant_isolation_violation', {
                    logEntry: this.sanitizeLogEntry(logEntry),
                    violations: isolationResult.violations,
                    processingId
                });
                
                return result;
            }

            // Step 3: Correlation ID validation and linking
            if (this.enableCorrelation) {
                const correlationResult = await this.processCorrelation(logEntry);
                if (correlationResult.warnings.length > 0) {
                    result.warnings.push(...correlationResult.warnings);
                }
                result.correlationId = correlationResult.correlationId;
                
                if (correlationResult.newCorrelation) {
                    this.processingStats.correlationsCreated++;
                }
            }

            // Step 4: Security event detection (module-aware)
            if (this.enableSecurityDetection) {
                const securityResult = await this.detectSecurityEvents(logEntry, moduleSettings);
                if (securityResult.events.length > 0) {
                    result.securityEvents = securityResult.events;
                    this.processingStats.securityEventsDetected += securityResult.events.length;
                    
                    // Log high-priority security events
                    for (const event of securityResult.events) {
                        if (event.severity === 'high' || event.severity === 'critical') {
                            platformLogger.platformSecurity('high_priority_security_event', {
                                event,
                                logEntry: this.sanitizeLogEntry(logEntry),
                                processingId,
                                moduleSettings: {
                                    enabled: moduleSettings.enabled,
                                    securityLogging: moduleSettings.features.securityLogging
                                }
                            });
                        }
                    }
                }
                
                if (securityResult.warnings.length > 0) {
                    result.warnings.push(...securityResult.warnings);
                }
            }

            // Step 5: Storage routing (module-aware)
            const storageResult = await this.routeToStorage(logEntry, result.securityEvents, moduleSettings);
            if (!storageResult.success) {
                result.error = 'Storage routing failed';
                result.storageError = storageResult.error;
                this.processingStats.failed++;
                return result;
            }

            result.storageLocation = storageResult.location;
            result.success = true;
            this.processingStats.successfullyProcessed++;

        } catch (error) {
            const logger = await companyLogger.getLoggerForTenant(logEntry.companyId, logEntry.companyName);
            logger.error('Log processing pipeline error', {
                correlationId: logEntry.correlationId,
                processingId,
                error: error.message,
                stack: error.stack,
                logEntry: this.sanitizeLogEntry(logEntry)
            });

            result.error = 'Processing pipeline exception';
            result.exception = error.message;
            this.processingStats.failed++;
        } finally {
            result.processingTimeMs = Date.now() - startTime;
            this.processingStats.totalProcessed++;
            
            // Check for processing timeout
            if (result.processingTimeMs > this.maxProcessingTimeMs) {
                result.warnings.push(`Processing took ${result.processingTimeMs}ms, exceeding ${this.maxProcessingTimeMs}ms threshold`);
                
                platformLogger.systemPerformance({
                    component: 'log-processing-pipeline',
                    metric: 'processing_timeout',
                    value: result.processingTimeMs,
                    threshold: this.maxProcessingTimeMs,
                    logEntry: this.sanitizeLogEntry(logEntry)
                });
            }
        }

        return result;
    }

    /**
     * Validate log entry structure and content
     * 
     * @param {Object} logEntry - Log entry to validate
     * @returns {Object} Validation result
     */
    validateLogEntry(logEntry) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Required fields validation
        const requiredFields = ['timestamp', 'level', 'message', 'source', 'companyId', 'userId'];
        for (const field of requiredFields) {
            if (!logEntry[field]) {
                result.errors.push(`Missing required field: ${field}`);
                result.valid = false;
            }
        }

        // Field type validation
        if (logEntry.timestamp && !this.isValidTimestamp(logEntry.timestamp)) {
            result.errors.push('Invalid timestamp format');
            result.valid = false;
        }

        if (logEntry.level && !['debug', 'info', 'warn', 'error'].includes(logEntry.level)) {
            result.errors.push('Invalid log level');
            result.valid = false;
        }

        if (logEntry.source && logEntry.source !== 'frontend') {
            result.errors.push('Invalid source for frontend log ingestion');
            result.valid = false;
        }

        // Content validation
        if (logEntry.message && logEntry.message.length > 10000) {
            result.warnings.push('Message exceeds recommended length of 10000 characters');
        }

        if (logEntry.meta && typeof logEntry.meta !== 'object') {
            result.errors.push('Meta field must be an object');
            result.valid = false;
        }

        // Security validation
        if (logEntry.message && this.containsSuspiciousContent(logEntry.message)) {
            result.warnings.push('Message contains potentially suspicious content');
        }

        return result;
    }

    /**
     * Process correlation ID validation and linking
     * 
     * @param {Object} logEntry - Log entry to process
     * @returns {Object} Correlation result
     */
    async processCorrelation(logEntry) {
        const result = {
            correlationId: logEntry.correlationId,
            newCorrelation: false,
            warnings: []
        };

        try {
            // Validate existing correlation ID
            if (logEntry.correlationId) {
                const isValid = correlationIdService.isValidCorrelationId(logEntry.correlationId);
                if (!isValid) {
                    result.warnings.push('Invalid correlation ID format, generating new one');
                    result.correlationId = correlationIdService.generateCorrelationId();
                    result.newCorrelation = true;
                }
            } else {
                // Generate new correlation ID
                result.correlationId = correlationIdService.generateCorrelationId();
                result.newCorrelation = true;
            }

            // Link with existing logs
            await logCorrelationService.linkLog({
                ...logEntry,
                correlationId: result.correlationId
            });

        } catch (error) {
            result.warnings.push(`Correlation processing failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Detect security events in log entry (module-aware)
     * 
     * @param {Object} logEntry - Log entry to analyze
     * @param {Object} moduleSettings - Module configuration
     * @returns {Object} Security detection result
     */
    async detectSecurityEvents(logEntry, moduleSettings) {
        const result = {
            events: [],
            warnings: []
        };

        try {
            // Always perform essential security detection regardless of module settings
            const essentialResult = await this.detectEssentialSecurityEvents(logEntry);
            result.events.push(...essentialResult.events);
            result.warnings.push(...essentialResult.warnings);

            // Only perform detailed security detection if module allows it
            if (moduleSettings.enabled && moduleSettings.features.securityLogging) {
                // Frontend security detection
                if (logEntry.source === 'frontend') {
                    if (!frontendSecurityDetection) {
                        try {
                            frontendSecurityDetection = (await import('../../client/hr-app/src/services/frontendSecurityDetection.service.js')).default;
                        } catch (error) {
                            // Frontend security detection not available, skip
                            result.warnings.push('Frontend security detection not available');
                        }
                    }
                    
                    if (frontendSecurityDetection) {
                        const frontendEvents = await frontendSecurityDetection.analyzeLogEntry(logEntry);
                        result.events.push(...frontendEvents);
                    }
                }

                // Backend security detection (for API calls logged from frontend)
                if (logEntry.meta && logEntry.meta.apiCall) {
                    const backendEvents = await backendSecurityDetection.analyzeLogEntry(logEntry);
                    result.events.push(...backendEvents);
                }

                // Cross-system security analysis
                const crossSystemEvents = await this.analyzeCrossSystemSecurity(logEntry);
                result.events.push(...crossSystemEvents);
            } else {
                result.warnings.push('Detailed security detection disabled by module configuration');
            }

        } catch (error) {
            result.warnings.push(`Security detection failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Route log to appropriate storage based on type and security level (module-aware)
     * 
     * @param {Object} logEntry - Log entry to store
     * @param {Array} securityEvents - Detected security events
     * @param {Object} moduleSettings - Module configuration
     * @returns {Object} Storage result
     */
    async routeToStorage(logEntry, securityEvents = [], moduleSettings) {
        try {
            // Determine storage type based on log content and security events
            let logType = 'general';
            
            if (securityEvents.length > 0) {
                logType = 'security';
            } else if (logEntry.level === 'error') {
                logType = 'error';
            } else if (logEntry.meta && logEntry.meta.performance) {
                logType = 'performance';
            } else if (logEntry.meta && logEntry.meta.audit) {
                logType = 'audit';
            }

            // Store the log with module awareness
            const storageResult = await logStorage.storeLog(logEntry, {
                type: logType,
                companyId: logEntry.companyId,
                securityEvents,
                source: 'frontend-ingestion',
                moduleAware: true,
                moduleSettings: {
                    enabled: moduleSettings.enabled,
                    features: moduleSettings.features
                },
                logLevel: this.isEssentialLog(logEntry) ? 'essential' : 'detailed'
            });

            return {
                success: true,
                location: storageResult.filePath,
                type: logType
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze cross-system security patterns
     * 
     * @param {Object} logEntry - Log entry to analyze
     * @returns {Array} Security events
     */
    async analyzeCrossSystemSecurity(logEntry) {
        const events = [];

        try {
            // Check for rapid successive requests
            if (logEntry.meta && logEntry.meta.apiCall) {
                const recentLogs = await logCorrelationService.getRecentUserLogs(
                    logEntry.userId,
                    logEntry.companyId,
                    60000 // Last minute
                );

                const apiCalls = recentLogs.filter(log => log.meta && log.meta.apiCall);
                if (apiCalls.length > 50) { // More than 50 API calls in a minute
                    events.push({
                        id: this.generateEventId(),
                        timestamp: new Date().toISOString(),
                        eventType: 'suspicious_activity',
                        severity: 'medium',
                        source: 'cross-system',
                        description: 'Rapid API calls detected from frontend',
                        companyId: logEntry.companyId,
                        userId: logEntry.userId,
                        correlationId: logEntry.correlationId,
                        meta: {
                            apiCallCount: apiCalls.length,
                            timeWindow: '60s'
                        }
                    });
                }
            }

            // Check for error patterns
            if (logEntry.level === 'error') {
                const recentErrors = await logCorrelationService.getRecentUserLogs(
                    logEntry.userId,
                    logEntry.companyId,
                    300000 // Last 5 minutes
                );

                const errorCount = recentErrors.filter(log => log.level === 'error').length;
                if (errorCount > 10) {
                    events.push({
                        id: this.generateEventId(),
                        timestamp: new Date().toISOString(),
                        eventType: 'suspicious_activity',
                        severity: 'medium',
                        source: 'cross-system',
                        description: 'High error rate detected from user',
                        companyId: logEntry.companyId,
                        userId: logEntry.userId,
                        correlationId: logEntry.correlationId,
                        meta: {
                            errorCount,
                            timeWindow: '5m'
                        }
                    });
                }
            }

        } catch (error) {
            // Silently handle errors in security analysis to avoid breaking the pipeline
        }

        return events;
    }

    /**
     * Health check for the processing pipeline
     * 
     * @returns {Object} Health status
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.processingStats.startTime.getTime(),
            stats: { ...this.processingStats },
            components: {}
        };

        try {
            // Check correlation service
            health.components.correlation = {
                status: correlationIdService ? 'healthy' : 'unhealthy'
            };

            // Check storage service
            health.components.storage = {
                status: logStorage ? 'healthy' : 'unhealthy'
            };

            // Check security detection
            health.components.security = {
                status: this.enableSecurityDetection ? 'enabled' : 'disabled'
            };

            // Calculate success rate
            if (this.processingStats.totalProcessed > 0) {
                health.stats.successRate = this.processingStats.successfullyProcessed / this.processingStats.totalProcessed;
            } else {
                health.stats.successRate = 1.0;
            }

        } catch (error) {
            health.status = 'degraded';
            health.error = error.message;
        }

        return health;
    }

    /**
     * Get processing statistics
     * 
     * @returns {Object} Processing statistics
     */
    getStats() {
        return {
            ...this.processingStats,
            successRate: this.processingStats.totalProcessed > 0 
                ? this.processingStats.successfullyProcessed / this.processingStats.totalProcessed 
                : 1.0
        };
    }

    /**
     * Helper methods
     */

    generateProcessingId() {
        return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isValidTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date instanceof Date && !isNaN(date.getTime());
    }

    containsSuspiciousContent(message) {
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\.cookie/i,
            /window\.location/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(message));
    }

    sanitizeLogEntry(logEntry) {
        const sanitized = { ...logEntry };
        
        // Remove sensitive fields
        if (sanitized.meta) {
            const safeMeta = { ...sanitized.meta };
            delete safeMeta.password;
            delete safeMeta.token;
            delete safeMeta.apiKey;
            delete safeMeta.secret;
            sanitized.meta = safeMeta;
        }

        // Truncate long messages
        if (sanitized.message && sanitized.message.length > 200) {
            sanitized.message = sanitized.message.substring(0, 200) + '... [truncated]';
        }

        return sanitized;
    }

    /**
     * Get module settings for a company with caching
     * 
     * @param {string} companyId - Company ID
     * @returns {Object} Module configuration
     */
    async getModuleSettings(companyId) {
        const cacheKey = `module_${companyId}`;
        const cached = this.moduleConfigCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
            return cached.config;
        }
        
        try {
            const config = await loggingModuleService.getConfig(companyId);
            this.moduleConfigCache.set(cacheKey, {
                config,
                timestamp: Date.now()
            });
            return config;
        } catch (error) {
            // Fallback to default settings if module service fails
            return {
                enabled: true,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: true,
                    userActionLogging: false,
                    frontendLogging: true,
                    detailedErrorLogging: true
                }
            };
        }
    }

    /**
     * Determine if detailed logging should be processed
     * 
     * @param {Object} logEntry - Log entry to check
     * @param {Object} moduleSettings - Module configuration
     * @returns {boolean} Whether to process detailed logging
     */
    async shouldProcessDetailedLog(logEntry, moduleSettings) {
        // Always process essential logs regardless of module settings
        if (this.isEssentialLog(logEntry)) {
            return true;
        }
        
        // If module is disabled, only process essential logs
        if (!moduleSettings.enabled) {
            return false;
        }
        
        // Check feature-specific settings
        const eventType = this.determineEventType(logEntry);
        
        switch (eventType) {
            case 'user_action':
                return moduleSettings.features.userActionLogging;
            case 'performance_metric':
                return moduleSettings.features.performanceLogging;
            case 'frontend_event':
                return moduleSettings.features.frontendLogging;
            case 'detailed_error':
                return moduleSettings.features.detailedErrorLogging;
            case 'audit_event':
                return moduleSettings.features.auditLogging;
            case 'security_event':
                return moduleSettings.features.securityLogging;
            default:
                return true; // Process by default for unknown event types
        }
    }

    /**
     * Check if a log entry is essential (cannot be disabled)
     * 
     * @param {Object} logEntry - Log entry to check
     * @returns {boolean} Whether the log is essential
     */
    isEssentialLog(logEntry) {
        const essentialPatterns = [
            'authentication_attempt',
            'authorization_failure',
            'security_breach',
            'data_access_violation',
            'system_error',
            'compliance_event',
            'platform_security_event'
        ];
        
        // Check message content for essential patterns
        const message = logEntry.message.toLowerCase();
        if (essentialPatterns.some(pattern => message.includes(pattern))) {
            return true;
        }
        
        // Check log level - errors are always essential
        if (logEntry.level === 'error') {
            return true;
        }
        
        // Check meta data for essential markers
        if (logEntry.meta) {
            if (logEntry.meta.essential === true) {
                return true;
            }
            if (logEntry.meta.security === true) {
                return true;
            }
            if (logEntry.meta.audit === true) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Determine event type from log entry
     * 
     * @param {Object} logEntry - Log entry to analyze
     * @returns {string} Event type
     */
    determineEventType(logEntry) {
        const message = logEntry.message.toLowerCase();
        
        if (message.includes('user activity') || message.includes('user action')) {
            return 'user_action';
        }
        if (message.includes('performance') || logEntry.meta?.performance) {
            return 'performance_metric';
        }
        if (logEntry.source === 'frontend') {
            return 'frontend_event';
        }
        if (logEntry.level === 'error' && logEntry.meta?.detailed) {
            return 'detailed_error';
        }
        if (message.includes('audit') || logEntry.meta?.audit) {
            return 'audit_event';
        }
        if (message.includes('security') || logEntry.meta?.security) {
            return 'security_event';
        }
        
        return 'general';
    }

    /**
     * Process essential logs with minimal processing
     * 
     * @param {Object} logEntry - Log entry to process
     * @param {Object} result - Processing result object
     * @param {string} processingId - Processing ID
     * @returns {Object} Processing result
     */
    async processEssentialLog(logEntry, result, processingId) {
        try {
            // Basic validation only
            if (!logEntry.companyId || !logEntry.message) {
                result.error = 'Essential log validation failed';
                this.processingStats.failed++;
                return result;
            }

            // Minimal correlation ID handling
            if (!logEntry.correlationId) {
                result.correlationId = correlationIdService.generateCorrelationId();
                logEntry.correlationId = result.correlationId;
            }

            // Essential security detection (always enabled)
            const securityResult = await this.detectEssentialSecurityEvents(logEntry);
            if (securityResult.events.length > 0) {
                result.securityEvents = securityResult.events;
                this.processingStats.securityEventsDetected += securityResult.events.length;
            }

            // Store as essential log
            const storageResult = await logStorage.storeLog(logEntry, {
                type: 'essential',
                companyId: logEntry.companyId,
                securityEvents: result.securityEvents,
                source: 'frontend-ingestion',
                moduleAware: true,
                logLevel: 'essential'
            });

            result.storageLocation = storageResult.filePath;
            result.success = true;
            this.processingStats.successfullyProcessed++;

        } catch (error) {
            result.error = 'Essential log processing failed';
            result.exception = error.message;
            this.processingStats.failed++;
            
            // Log processing error to platform logger
            platformLogger.error('Essential log processing failed', {
                correlationId: logEntry.correlationId,
                processingId,
                error: error.message,
                companyId: logEntry.companyId
            });
        }

        return result;
    }

    /**
     * Detect essential security events (always enabled regardless of module settings)
     * 
     * @param {Object} logEntry - Log entry to analyze
     * @returns {Object} Security detection result
     */
    async detectEssentialSecurityEvents(logEntry) {
        const result = {
            events: [],
            warnings: []
        };

        try {
            // Only detect critical security events that cannot be disabled
            const criticalPatterns = [
                'authentication failure',
                'unauthorized access',
                'security breach',
                'data violation',
                'system compromise'
            ];

            const message = logEntry.message.toLowerCase();
            for (const pattern of criticalPatterns) {
                if (message.includes(pattern)) {
                    result.events.push({
                        id: this.generateEventId(),
                        timestamp: new Date().toISOString(),
                        eventType: 'critical_security_event',
                        severity: 'critical',
                        source: 'essential-detection',
                        description: `Critical security pattern detected: ${pattern}`,
                        companyId: logEntry.companyId,
                        userId: logEntry.userId,
                        correlationId: logEntry.correlationId,
                        essential: true,
                        meta: {
                            pattern,
                            originalMessage: logEntry.message.substring(0, 200)
                        }
                    });
                }
            }

        } catch (error) {
            result.warnings.push(`Essential security detection failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Clear module configuration cache
     */
    clearModuleCache() {
        this.moduleConfigCache.clear();
    }

    /**
     * Get module cache statistics
     */
    getModuleCacheStats() {
        return {
            cacheSize: this.moduleConfigCache.size,
            cacheExpiryTime: this.cacheExpiryTime,
            cachedCompanies: Array.from(this.moduleConfigCache.keys())
        };
    }
}

export default new LogProcessingPipeline();