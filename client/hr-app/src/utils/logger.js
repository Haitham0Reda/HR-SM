const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Log levels
const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

// Security event types for frontend detection
const SECURITY_EVENT_TYPES = {
    XSS_ATTEMPT: 'xss_attempt',
    SCRIPT_INJECTION: 'script_injection',
    SUSPICIOUS_NAVIGATION: 'suspicious_navigation',
    RAPID_REQUESTS: 'rapid_requests',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    CLIENT_SIDE_TAMPERING: 'client_side_tampering'
};

// Performance metric types
const PERFORMANCE_METRIC_TYPES = {
    PAGE_LOAD_TIME: 'page_load_time',
    API_RESPONSE_TIME: 'api_response_time',
    RENDER_TIME: 'render_time',
    MEMORY_USAGE: 'memory_usage',
    NAVIGATION_TIME: 'navigation_time'
};

// Enhanced Logger Class with batching, correlation IDs, security detection, and module awareness
class EnhancedFrontendLogger {
    constructor() {
        this.logQueue = [];
        this.batchSize = 20; // Increased batch size
        this.batchTimeout = 15000; // Increased to 15 seconds to reduce frequency
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.correlationId = null;
        this.sessionId = this.generateSessionId();
        this.userContext = {};
        this.companyContext = {};
        this.performanceObserver = null;
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.moduleConfig = null;
        this.moduleConfigLastFetch = 0;
        this.moduleConfigCacheDuration = 300000; // 5 minutes
        
        // Circuit breaker for rate limiting
        this.rateLimitedUntil = 0;
        this.consecutiveFailures = 0;
        
        // Start batch processing
        this.startBatchProcessor();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Setup security monitoring
        this.setupSecurityMonitoring();
    }

    generateSessionId() {
        return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateCorrelationId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 8);
        return `corr_${timestamp}_${random}`;
    }

    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }

    setUserContext(user) {
        this.userContext = {
            userId: user.id || user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        };
    }

    setCompanyContext(company) {
        this.companyContext = {
            companyId: company.id || company._id,
            companyName: company.name,
            tenantId: company.tenantId
        };
        
        // Reset module config when company context changes
        this.moduleConfig = null;
        this.moduleConfigLastFetch = 0;
    }

    async fetchModuleConfig() {
        const now = Date.now();
        
        // Return cached config if still valid
        if (this.moduleConfig && (now - this.moduleConfigLastFetch) < this.moduleConfigCacheDuration) {
            return this.moduleConfig;
        }
        
        // If no company context, assume all logging is enabled
        if (!this.companyContext.tenantId) {
            return {
                enabled: true,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: true,
                    userActionLogging: true,
                    frontendLogging: true,
                    detailedErrorLogging: true
                }
            };
        }
        
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_URL}/logging/module-config`, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                this.moduleConfig = await response.json();
                this.moduleConfigLastFetch = now;
                return this.moduleConfig;
            } else {
                // Fallback to permissive config on error
                console.warn('Failed to fetch module config, using fallback');
                return {
                    enabled: true,
                    features: {
                        auditLogging: true,
                        securityLogging: true,
                        performanceLogging: false,
                        userActionLogging: false,
                        frontendLogging: true,
                        detailedErrorLogging: false
                    }
                };
            }
        } catch (error) {
            console.warn('Error fetching module config:', error);
            // Fallback to essential logging only
            return {
                enabled: false,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: false,
                    userActionLogging: false,
                    frontendLogging: false,
                    detailedErrorLogging: false
                }
            };
        }
    }

    async isFeatureEnabled(feature) {
        const config = await this.fetchModuleConfig();
        
        // If module is disabled, only essential features are available
        if (!config.enabled) {
            return this.isEssentialFeature(feature);
        }
        
        return config.features[feature] || false;
    }

    isEssentialFeature(feature) {
        const essentialFeatures = [
            'securityLogging',
            'auditLogging'
        ];
        
        return essentialFeatures.includes(feature);
    }

    classifyLogEntry(level, message, meta = {}) {
        const actionType = meta.actionType || 'general';
        const eventType = meta.eventType;
        
        // Essential log events that cannot be disabled
        const essentialConditions = [
            // Security events are always essential
            meta.security === true,
            actionType === 'security_event',
            
            // JavaScript errors are essential
            actionType === 'javascript_error',
            actionType === 'promise_rejection',
            
            // Authentication and authorization events
            actionType === 'api_call' && (meta.endpoint?.includes('auth') || meta.endpoint?.includes('login')),
            
            // Security threat detection
            meta.securityThreats && meta.securityThreats.length > 0,
            eventType === SECURITY_EVENT_TYPES.XSS_ATTEMPT,
            eventType === SECURITY_EVENT_TYPES.SCRIPT_INJECTION,
            eventType === SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
            
            // Critical errors
            level === LOG_LEVELS.ERROR,
            
            // Failed API calls with security implications
            actionType === 'api_call' && meta.status >= 400,
            
            // Navigation to admin areas without proper authorization
            actionType === 'navigation' && meta.to?.includes('/admin') && this.userContext.role !== 'admin'
        ];
        
        const isEssential = essentialConditions.some(condition => condition === true);
        
        let reason = null;
        if (isEssential) {
            if (meta.security || actionType === 'security_event') {
                reason = 'security_event';
            } else if (actionType === 'javascript_error' || actionType === 'promise_rejection') {
                reason = 'critical_error';
            } else if (level === LOG_LEVELS.ERROR) {
                reason = 'error_level';
            } else if (actionType === 'api_call' && meta.status >= 400) {
                reason = 'failed_api_call';
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

    async createLogEntry(level, message, meta = {}) {
        // Generate correlation ID if not set
        if (!this.correlationId) {
            this.correlationId = this.generateCorrelationId();
        }

        // Classify the log entry
        const logClassification = this.classifyLogEntry(level, message, meta);

        // Detect security threats
        const securityThreats = this.detectSecurityThreats(message, meta);

        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            source: 'frontend',
            correlationId: this.correlationId,
            sessionId: this.sessionId,
            ...this.userContext,
            ...this.companyContext,
            logClassification: logClassification.classification,
            isEssential: logClassification.isEssential,
            essentialReason: logClassification.reason,
            meta: {
                userAgent: navigator.userAgent,
                pageUrl: window.location.href,
                referrer: document.referrer,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink
                } : null,
                ...meta
            },
            securityThreats: securityThreats.length > 0 ? securityThreats : undefined
        };
    }

    detectSecurityThreats(message, meta) {
        const threats = [];
        
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
        
        // Rapid request detection
        const now = Date.now();
        if (now - this.lastRequestTime < 100) { // Less than 100ms between requests
            this.requestCount++;
            if (this.requestCount > 10) { // More than 10 rapid requests
                threats.push({
                    type: SECURITY_EVENT_TYPES.RAPID_REQUESTS,
                    severity: 'medium',
                    request_count: this.requestCount,
                    time_window: now - this.lastRequestTime
                });
            }
        } else {
            this.requestCount = 0;
        }
        this.lastRequestTime = now;
        
        // Suspicious navigation detection
        if (meta.navigation && meta.navigation.suspicious) {
            threats.push({
                type: SECURITY_EVENT_TYPES.SUSPICIOUS_NAVIGATION,
                severity: 'medium',
                navigation_pattern: meta.navigation.pattern
            });
        }
        
        return threats;
    }

    setupPerformanceMonitoring() {
        // Performance Observer for navigation timing (with throttling)
        if ('PerformanceObserver' in window) {
            try {
                let lastLogTime = 0;
                const LOG_THROTTLE_MS = 10000; // Only log performance metrics every 10 seconds
                
                this.performanceObserver = new PerformanceObserver((list) => {
                    const now = Date.now();
                    if (now - lastLogTime < LOG_THROTTLE_MS) {
                        return; // Skip logging if too frequent
                    }
                    lastLogTime = now;
                    
                    // Only log significant performance entries
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'navigation' || 
                            (entry.entryType === 'measure' && entry.duration > 100)) {
                            this.logPerformanceMetric(entry);
                        }
                    }
                });
                
                this.performanceObserver.observe({ 
                    entryTypes: ['navigation', 'measure'] // Removed 'paint' to reduce noise
                });
            } catch (error) {
                console.warn('Performance monitoring not available:', error);
            }
        }
        
        // Page load performance (only once per page)
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.performance(PERFORMANCE_METRIC_TYPES.PAGE_LOAD_TIME, navigation.loadEventEnd - navigation.fetchStart, {
                        page: window.location.pathname,
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                        firstPaint: this.getFirstPaint()
                    });
                }
            }, 0);
        });
    }

    setupSecurityMonitoring() {
        // Monitor for client-side tampering
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Check for potential security-related errors
            const errorMessage = args.join(' ');
            if (errorMessage.includes('Content Security Policy') || 
                errorMessage.includes('Mixed Content') ||
                errorMessage.includes('CORS')) {
                this.security('Security-related console error detected', {
                    eventType: SECURITY_EVENT_TYPES.CLIENT_SIDE_TAMPERING,
                    error: errorMessage
                });
            }
            originalConsoleError.apply(console, args);
        };
        
        // Monitor for unauthorized access attempts
        window.addEventListener('beforeunload', () => {
            if (this.userContext.userId && window.location.href.includes('/admin') && 
                this.userContext.role !== 'admin') {
                this.security('Unauthorized admin access attempt', {
                    eventType: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
                    attempted_url: window.location.href,
                    user_role: this.userContext.role
                });
            }
        });
    }

    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }

    logPerformanceMetric(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.performance(PERFORMANCE_METRIC_TYPES.NAVIGATION_TIME, entry.duration, {
                    type: entry.type,
                    redirectCount: entry.redirectCount
                });
                break;
            case 'measure':
                this.performance(PERFORMANCE_METRIC_TYPES.RENDER_TIME, entry.duration, {
                    name: entry.name
                });
                break;
            case 'paint':
                this.performance(PERFORMANCE_METRIC_TYPES.PAGE_LOAD_TIME, entry.startTime, {
                    paintType: entry.name
                });
                break;
        }
    }

    addToQueue(logEntry) {
        this.logQueue.push(logEntry);
        
        // Send immediately if it's an error or security event
        if (logEntry.level === LOG_LEVELS.ERROR || logEntry.securityThreats) {
            this.flushQueue();
        }
    }

    startBatchProcessor() {
        setInterval(() => {
            if (this.logQueue.length > 0) {
                this.flushQueue();
            }
        }, this.batchTimeout);
    }

    async flushQueue() {
        if (this.logQueue.length === 0) return;
        
        const batch = this.logQueue.splice(0, this.batchSize);
        await this.sendBatchToBackend(batch);
    }

    async sendBatchToBackend(batch, retryCount = 0) {
        // Check circuit breaker
        if (Date.now() < this.rateLimitedUntil) {
            console.warn('Logging circuit breaker active, skipping batch');
            this.storeFailedLogs(batch);
            return;
        }

        // If we have too many consecutive failures, activate circuit breaker
        if (this.consecutiveFailures >= 3) {
            const backoffTime = Math.min(30000 * this.consecutiveFailures, 180000); // Max 3 minutes
            this.rateLimitedUntil = Date.now() + backoffTime;
            console.warn(`Too many consecutive failures (${this.consecutiveFailures}), circuit breaker active for ${backoffTime/1000}s`);
            this.storeFailedLogs(batch);
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Add correlation ID to headers
            if (this.correlationId) {
                headers['X-Correlation-ID'] = this.correlationId;
            }

            const response = await fetch(`${API_URL}/logs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    logs: batch,
                    batchId: this.generateCorrelationId(),
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                // Handle rate limiting specifically
                if (response.status === 429) {
                    this.consecutiveFailures++;
                    // Activate circuit breaker for increasing durations
                    const backoffTime = Math.min(60000 * this.consecutiveFailures, 300000); // Max 5 minutes
                    this.rateLimitedUntil = Date.now() + backoffTime;
                    console.warn(`Rate limited, circuit breaker active for ${backoffTime/1000}s`);
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Reset circuit breaker on success
            this.consecutiveFailures = 0;
            this.rateLimitedUntil = 0;

        } catch (error) {
            this.consecutiveFailures++;
            
            // Check if it's a network error (server not available)
            const isNetworkError = error.message.includes('fetch') || 
                                 error.message.includes('NetworkError') ||
                                 error.message.includes('ERR_CONNECTION_REFUSED') ||
                                 error.name === 'TypeError' ||
                                 !navigator.onLine;

            if (isNetworkError && this.consecutiveFailures >= 2) {
                // For network errors, activate circuit breaker faster
                const backoffTime = 60000; // 1 minute for network errors
                this.rateLimitedUntil = Date.now() + backoffTime;
                console.warn(`Network error detected, circuit breaker active for ${backoffTime/1000}s`);
                this.storeFailedLogs(batch);
                return;
            }

            if (retryCount < this.maxRetries) {
                // Exponential backoff retry
                setTimeout(() => {
                    this.sendBatchToBackend(batch, retryCount + 1);
                }, this.retryDelay * Math.pow(2, retryCount));
            } else {
                // Store failed logs in localStorage as fallback
                this.storeFailedLogs(batch);
            }
        }
    }

    storeFailedLogs(logs) {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('failedLogs') || '[]');
            const updatedLogs = [...existingLogs, ...logs].slice(-100); // Keep only last 100
            localStorage.setItem('failedLogs', JSON.stringify(updatedLogs));
        } catch (error) {
            // Ignore localStorage errors
        }
    }

    // Enhanced logging methods with module awareness
    async log(level, message, meta = {}) {
        const logEntry = await this.createLogEntry(level, message, meta);
        
        // Check if logging should be captured based on module configuration
        const actionType = meta.actionType || 'general';
        const shouldLog = await this.shouldLogEvent(actionType, level);
        
        // Always log essential events regardless of module settings
        if (!shouldLog && !logEntry.isEssential) {
            // Skip logging if module configuration doesn't allow it and it's not essential
            return null;
        }
        
        // Always log to console in development
        if (process.env.NODE_ENV === 'development') {
            console[level](message, logEntry);
        }
        
        // Add to queue for backend transmission
        this.addToQueue(logEntry);
        
        return logEntry;
    }

    async shouldLogEvent(actionType, level = 'info') {
        const config = await this.fetchModuleConfig();
        
        // If module is disabled, only log essential events
        if (!config.enabled) {
            return false; // Essential events are handled separately in the log method
        }
        
        // Check feature-specific logging
        switch (actionType) {
            case 'user_interaction':
            case 'user_action':
                return config.features.userActionLogging;
            case 'performance_metric':
                return config.features.performanceLogging;
            case 'api_call':
                return config.features.frontendLogging;
            case 'javascript_error':
            case 'promise_rejection':
                return config.features.detailedErrorLogging;
            case 'security_event':
                return config.features.securityLogging;
            case 'navigation':
                return config.features.frontendLogging;
            default:
                return config.features.frontendLogging; // Default to frontend logging setting
        }
    }

    async info(message, meta = {}) {
        return await this.log(LOG_LEVELS.INFO, message, meta);
    }

    async warn(message, meta = {}) {
        return await this.log(LOG_LEVELS.WARN, message, meta);
    }

    async error(message, meta = {}) {
        return await this.log(LOG_LEVELS.ERROR, message, meta);
    }

    async debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            return await this.log(LOG_LEVELS.DEBUG, message, meta);
        }
    }

    // Specialized logging methods with module awareness
    async userAction(action, details = {}) {
        return await this.info(`User Action: ${action}`, { 
            action, 
            actionType: 'user_interaction',
            ...details 
        });
    }

    async apiCall(method, endpoint, status, error = null, responseTime = null) {
        const message = `API ${method} ${endpoint} - Status: ${status}`;
        const meta = { 
            method, 
            endpoint, 
            status, 
            actionType: 'api_call',
            responseTime
        };
        
        // Log performance metric only if performance logging is enabled
        if (responseTime && await this.isFeatureEnabled('performanceLogging')) {
            await this.performance(PERFORMANCE_METRIC_TYPES.API_RESPONSE_TIME, responseTime, {
                method,
                endpoint,
                status
            });
        }
        
        if (error) {
            return await this.error(message, { ...meta, error: error.message });
        } else if (status >= 400) {
            return await this.warn(message, meta);
        } else {
            return await this.info(message, meta);
        }
    }

    async performance(metric, value, context = {}) {
        // Performance logging is controlled by module configuration
        const performanceEnabled = await this.isFeatureEnabled('performanceLogging');
        if (!performanceEnabled) {
            return null; // Skip performance logging if disabled
        }
        
        return await this.info(`Performance: ${metric} = ${value}ms`, {
            performance: true,
            metric,
            value,
            context,
            actionType: 'performance_metric'
        });
    }

    async security(message, meta = {}) {
        // Security logging is always enabled (essential feature)
        return await this.warn(`Security Event: ${message}`, {
            security: true,
            eventType: meta.eventType || SECURITY_EVENT_TYPES.SUSPICIOUS_NAVIGATION,
            severity: meta.severity || 'medium',
            actionType: 'security_event',
            ...meta
        });
    }

    async navigation(from, to, loadTime = null) {
        const meta = {
            from,
            to,
            loadTime,
            actionType: 'navigation'
        };
        
        // Log performance metric only if performance logging is enabled
        if (loadTime && await this.isFeatureEnabled('performanceLogging')) {
            await this.performance(PERFORMANCE_METRIC_TYPES.NAVIGATION_TIME, loadTime, { from, to });
        }
        
        return await this.info(`Navigation: ${from} -> ${to}`, meta);
    }

    // Global error handlers with module awareness
    setupGlobalErrorHandler() {
        window.addEventListener('error', async (event) => {
            // JavaScript errors are always essential and logged regardless of module settings
            await this.error('Uncaught JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                actionType: 'javascript_error'
            });
        });

        window.addEventListener('unhandledrejection', async (event) => {
            // Promise rejections are always essential and logged regardless of module settings
            await this.error('Unhandled Promise Rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack,
                actionType: 'promise_rejection'
            });
        });
    }

    // Force essential logging (platform override)
    async forceEssentialLog(level, message, meta = {}) {
        const logEntry = await this.createLogEntry(level, message, {
            ...meta,
            platformOverride: true,
            isEssential: true,
            essentialReason: 'platform_override'
        });
        
        // Always log to console in development
        if (process.env.NODE_ENV === 'development') {
            console[level](message, logEntry);
        }
        
        // Add to queue for backend transmission
        this.addToQueue(logEntry);
        
        return logEntry;
    }

    // Check if logging is essential
    isEssentialLogging(level, message, meta = {}) {
        const classification = this.classifyLogEntry(level, message, meta);
        return classification.isEssential;
    }

    // Utility methods
    getStats() {
        return {
            queueSize: this.logQueue.length,
            sessionId: this.sessionId,
            correlationId: this.correlationId,
            userContext: this.userContext,
            companyContext: this.companyContext,
            moduleConfig: this.moduleConfig,
            moduleConfigLastFetch: this.moduleConfigLastFetch
        };
    }

    clearQueue() {
        this.logQueue = [];
    }

    // Clear module config cache
    clearModuleConfigCache() {
        this.moduleConfig = null;
        this.moduleConfigLastFetch = 0;
    }
}

// Create singleton instance
const enhancedLogger = new EnhancedFrontendLogger();

// Backward compatibility functions (async)
export const logInfo = async (message, meta = {}) => {
    return await enhancedLogger.info(message, meta);
};

export const logWarn = async (message, meta = {}) => {
    return await enhancedLogger.warn(message, meta);
};

export const logError = async (message, meta = {}) => {
    return await enhancedLogger.error(message, meta);
};

export const logDebug = async (message, meta = {}) => {
    return await enhancedLogger.debug(message, meta);
};

export const logUserAction = async (action, details = {}) => {
    return await enhancedLogger.userAction(action, details);
};

export const logApiCall = async (method, endpoint, status, error = null) => {
    return await enhancedLogger.apiCall(method, endpoint, status, error);
};

export const setupGlobalErrorHandler = () => {
    return enhancedLogger.setupGlobalErrorHandler();
};

// Enhanced logger interface with module awareness
const logger = {
    // Core logging methods (async)
    info: async (message, meta = {}) => await enhancedLogger.info(message, meta),
    warn: async (message, meta = {}) => await enhancedLogger.warn(message, meta),
    error: async (message, meta = {}) => await enhancedLogger.error(message, meta),
    debug: async (message, meta = {}) => await enhancedLogger.debug(message, meta),
    
    // Specialized methods (async)
    userAction: async (action, details = {}) => await enhancedLogger.userAction(action, details),
    apiCall: async (method, endpoint, status, error = null, responseTime = null) => 
        await enhancedLogger.apiCall(method, endpoint, status, error, responseTime),
    performance: async (metric, value, context = {}) => await enhancedLogger.performance(metric, value, context),
    security: async (message, meta = {}) => await enhancedLogger.security(message, meta),
    navigation: async (from, to, loadTime = null) => await enhancedLogger.navigation(from, to, loadTime),
    
    // Configuration methods
    setCorrelationId: (correlationId) => enhancedLogger.setCorrelationId(correlationId),
    setUserContext: (user) => enhancedLogger.setUserContext(user),
    setCompanyContext: (company) => enhancedLogger.setCompanyContext(company),
    
    // Module awareness methods
    isFeatureEnabled: async (feature) => await enhancedLogger.isFeatureEnabled(feature),
    fetchModuleConfig: async () => await enhancedLogger.fetchModuleConfig(),
    forceEssentialLog: async (level, message, meta = {}) => await enhancedLogger.forceEssentialLog(level, message, meta),
    isEssentialLogging: (level, message, meta = {}) => enhancedLogger.isEssentialLogging(level, message, meta),
    
    // Utility methods
    setupGlobalErrorHandler: () => enhancedLogger.setupGlobalErrorHandler(),
    getStats: () => enhancedLogger.getStats(),
    clearQueue: () => enhancedLogger.clearQueue(),
    clearModuleConfigCache: () => enhancedLogger.clearModuleConfigCache(),
    
    // Constants
    SECURITY_EVENT_TYPES,
    PERFORMANCE_METRIC_TYPES,
    LOG_LEVELS
};

export default logger;
