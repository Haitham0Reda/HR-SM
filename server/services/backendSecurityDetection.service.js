/**
 * Backend Security Detection Service
 * Detects and reports security threats on the server side
 * Integrates with the enhanced backend logger for comprehensive security monitoring
 */

import { SECURITY_EVENT_TYPES } from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';
import loggingModuleService from './loggingModule.service.js';

class BackendSecurityDetectionService {
    constructor() {
        this.isInitialized = false;
        this.detectionEnabled = true;
        this.securityEvents = new Map(); // tenantId -> events[]
        this.maxSecurityEventsPerTenant = 1000;
        this.attackPatterns = new Map(); // IP -> attack data
        this.suspiciousActivityThresholds = {
            failedLogins: { count: 5, timeWindow: 300000 }, // 5 failed logins in 5 minutes
            rapidRequests: { count: 100, timeWindow: 60000 }, // 100 requests in 1 minute
            privilegeEscalation: { count: 3, timeWindow: 600000 }, // 3 attempts in 10 minutes
            sqlInjectionAttempts: { count: 1, timeWindow: 60000 }, // 1 attempt in 1 minute (immediate alert)
            unauthorizedAccess: { count: 3, timeWindow: 300000 } // 3 attempts in 5 minutes
        };
        
        // Module configuration cache for performance
        this.moduleConfigCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
        
        // SQL injection patterns
        this.sqlInjectionPatterns = [
            // Union-based injection
            /(\bUNION\b.*\bSELECT\b)/i,
            /(\bUNION\b.*\bALL\b.*\bSELECT\b)/i,
            
            // Boolean-based blind injection
            /(\bAND\b.*\b1\s*=\s*1\b)/i,
            /(\bOR\b.*\b1\s*=\s*1\b)/i,
            /(\bAND\b.*\b1\s*=\s*2\b)/i,
            
            // Time-based blind injection
            /(\bWAITFOR\b.*\bDELAY\b)/i,
            /(\bSLEEP\s*\()/i,
            /(\bBENCHMARK\s*\()/i,
            
            // Error-based injection
            /(\bCONVERT\s*\()/i,
            /(\bCAST\s*\()/i,
            /(\bEXTRACTVALUE\s*\()/i,
            
            // Stacked queries
            /(;\s*DROP\b)/i,
            /(;\s*DELETE\b)/i,
            /(;\s*INSERT\b)/i,
            /(;\s*UPDATE\b)/i,
            /(;\s*CREATE\b)/i,
            /(;\s*ALTER\b)/i,
            
            // Comment-based
            /(--|\#|\/\*)/,
            /(\*\/)/,
            
            // String manipulation
            /(CHAR\s*\()/i,
            /(ASCII\s*\()/i,
            /(SUBSTRING\s*\()/i,
            /(CONCAT\s*\()/i,
            
            // Information schema
            /(information_schema)/i,
            /(sys\.databases)/i,
            /(mysql\.user)/i,
            
            // Hex encoding
            /(0x[0-9a-f]+)/i,
            
            // Special characters and encoding
            /(%27|%22|%2527|%2522)/i, // Encoded quotes
            /(%20AND%20|%20OR%20)/i, // Encoded AND/OR
            /(%3D|%3C|%3E)/i, // Encoded =, <, >
        ];
        
        // XSS patterns for server-side detection
        this.xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /eval\s*\(/gi,
            /document\.write/gi,
            /innerHTML/gi,
            /outerHTML/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /<link[^>]*>/gi,
            /<meta[^>]*>/gi,
            /String\.fromCharCode/gi,
            /unescape\s*\(/gi,
            /decodeURI/gi,
            /atob\s*\(/gi,
            /btoa\s*\(/gi
        ];
        
        // Directory traversal patterns
        this.directoryTraversalPatterns = [
            /\.\.\//g,
            /\.\.\\/g,
            /%2e%2e%2f/gi,
            /%252e%252e%252f/gi,
            /\.\.%2f/gi,
            /\.\.%5c/gi,
            /%2e%2e/gi,
            /\.\.%c0%af/gi,
            /\.\.%c1%9c/gi
        ];
        
        // Command injection patterns
        this.commandInjectionPatterns = [
            /[;&|`$(){}[\]]/,
            /\|\s*\w+/,
            /;\s*\w+/,
            /&&\s*\w+/,
            /\$\(\w+\)/,
            /`\w+`/,
            /\|\|\s*\w+/,
            />\s*\/\w+/,
            /<\s*\/\w+/
        ];
        
        // Activity tracking per IP/user
        this.activityTracking = new Map();
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        platformLogger.info('Backend security detection service initialized', {
            thresholds: this.suspiciousActivityThresholds
        });
    }

    /**
     * Analyze incoming request for security threats (module-aware)
     */
    async analyzeRequest(req, tenantId = null) {
        const clientIP = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';
        const url = req.originalUrl || req.url;
        const method = req.method;
        const headers = req.headers;
        const body = req.body;
        const query = req.query;
        
        // Track request activity
        this.trackActivity(clientIP, 'request');
        
        const threats = [];
        
        // Always perform critical security detection regardless of module settings
        const criticalThreats = await this.analyzeCriticalThreats(req, tenantId);
        threats.push(...criticalThreats);
        
        // Check if detailed security detection is enabled for this tenant
        const moduleSettings = await this.getModuleSettings(tenantId);
        const shouldPerformDetailedDetection = this.shouldPerformDetailedDetection(moduleSettings);
        
        if (shouldPerformDetailedDetection) {
            // Analyze URL for threats
            threats.push(...this.analyzeURL(url, clientIP, tenantId));
            
            // Analyze query parameters
            threats.push(...this.analyzeParameters(query, 'query', clientIP, tenantId));
            
            // Analyze request body
            if (body) {
                threats.push(...this.analyzeParameters(body, 'body', clientIP, tenantId));
            }
            
            // Analyze headers
            threats.push(...this.analyzeHeaders(headers, clientIP, tenantId));
            
            // Analyze user agent
            threats.push(...this.analyzeUserAgent(userAgent, clientIP, tenantId));
            
            // Check for rapid requests
            threats.push(...this.checkRapidRequests(clientIP, tenantId));
        }
        
        // Report all detected threats
        for (const threat of threats) {
            this.reportSecurityThreat(threat, req, tenantId, moduleSettings);
        }
        
        return threats;
    }

    /**
     * Analyze authentication events
     */
    analyzeAuthenticationEvent(eventType, userId, clientIP, tenantId, details = {}) {
        const threats = [];
        
        switch (eventType) {
            case 'login_failed':
                threats.push(...this.analyzeFailedLogin(userId, clientIP, tenantId, details));
                break;
            case 'login_success':
                this.clearFailedLoginAttempts(clientIP, userId);
                break;
            case 'password_reset_request':
                threats.push(...this.analyzePasswordResetRequest(userId, clientIP, tenantId, details));
                break;
            case 'account_locked':
                threats.push(...this.analyzeAccountLock(userId, clientIP, tenantId, details));
                break;
        }
        
        return threats;
    }

    /**
     * Analyze database operations for security threats
     */
    analyzeDatabaseOperation(operation, query, params, userId, tenantId, executionTime) {
        const threats = [];
        
        // Check for SQL injection in query
        threats.push(...this.detectSQLInjection(query, 'query', userId, tenantId));
        
        // Check for SQL injection in parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (typeof value === 'string') {
                    threats.push(...this.detectSQLInjection(value, `param_${key}`, userId, tenantId));
                }
            }
        }
        
        // Check for suspicious database operations
        threats.push(...this.analyzeSuspiciousDBOperation(operation, query, userId, tenantId, executionTime));
        
        return threats;
    }

    /**
     * Analyze privilege escalation attempts
     */
    analyzePrivilegeEscalation(userId, requestedRole, currentRole, tenantId, clientIP) {
        const threats = [];
        
        // Track privilege escalation attempts
        this.trackActivity(clientIP, 'privilege_escalation', { userId, requestedRole, currentRole });
        
        // Check if this is a suspicious privilege escalation
        if (this.isSuspiciousPrivilegeEscalation(currentRole, requestedRole)) {
            threats.push({
                type: SECURITY_EVENT_TYPES.PRIVILEGE_ESCALATION,
                severity: 'high',
                userId,
                currentRole,
                requestedRole,
                clientIP,
                tenantId,
                description: `Suspicious privilege escalation attempt from ${currentRole} to ${requestedRole}`
            });
        }
        
        // Check for rapid privilege escalation attempts
        const recentAttempts = this.getRecentActivity(clientIP, 'privilege_escalation', this.suspiciousActivityThresholds.privilegeEscalation.timeWindow);
        if (recentAttempts.length > this.suspiciousActivityThresholds.privilegeEscalation.count) {
            threats.push({
                type: SECURITY_EVENT_TYPES.PRIVILEGE_ESCALATION,
                severity: 'critical',
                userId,
                clientIP,
                tenantId,
                attemptCount: recentAttempts.length,
                description: `Multiple privilege escalation attempts detected`
            });
        }
        
        return threats;
    }

    /**
     * Analyze URL for security threats
     */
    analyzeURL(url, clientIP, tenantId) {
        const threats = [];
        
        // Check for SQL injection in URL
        threats.push(...this.detectSQLInjection(url, 'url', null, tenantId));
        
        // Check for XSS in URL
        threats.push(...this.detectXSS(url, 'url', null, tenantId));
        
        // Check for directory traversal
        threats.push(...this.detectDirectoryTraversal(url, clientIP, tenantId));
        
        // Check for command injection
        threats.push(...this.detectCommandInjection(url, 'url', null, tenantId));
        
        return threats;
    }

    /**
     * Analyze request parameters for security threats
     */
    analyzeParameters(params, source, clientIP, tenantId) {
        const threats = [];
        
        if (!params || typeof params !== 'object') return threats;
        
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string') {
                // Check for SQL injection
                threats.push(...this.detectSQLInjection(value, `${source}_${key}`, null, tenantId));
                
                // Check for XSS
                threats.push(...this.detectXSS(value, `${source}_${key}`, null, tenantId));
                
                // Check for directory traversal
                threats.push(...this.detectDirectoryTraversal(value, clientIP, tenantId));
                
                // Check for command injection
                threats.push(...this.detectCommandInjection(value, `${source}_${key}`, null, tenantId));
            }
        }
        
        return threats;
    }

    /**
     * Analyze request headers for security threats
     */
    analyzeHeaders(headers, clientIP, tenantId) {
        const threats = [];
        
        // Check for suspicious headers
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
        
        for (const header of suspiciousHeaders) {
            if (headers[header]) {
                // Check for header injection
                if (headers[header].includes('\n') || headers[header].includes('\r')) {
                    threats.push({
                        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_API_ACCESS,
                        severity: 'medium',
                        clientIP,
                        tenantId,
                        header,
                        value: headers[header],
                        description: 'Header injection attempt detected'
                    });
                }
            }
        }
        
        // Check for suspicious user agent
        if (headers['user-agent']) {
            threats.push(...this.analyzeUserAgent(headers['user-agent'], clientIP, tenantId));
        }
        
        return threats;
    }

    /**
     * Analyze user agent for security threats
     */
    analyzeUserAgent(userAgent, clientIP, tenantId) {
        const threats = [];
        
        // Check for suspicious user agents
        const suspiciousPatterns = [
            /sqlmap/i,
            /nikto/i,
            /nmap/i,
            /burp/i,
            /owasp/i,
            /zap/i,
            /w3af/i,
            /acunetix/i,
            /nessus/i,
            /openvas/i,
            /masscan/i,
            /dirb/i,
            /gobuster/i,
            /dirbuster/i
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
                    severity: 'high',
                    clientIP,
                    tenantId,
                    userAgent,
                    pattern: pattern.toString(),
                    description: 'Suspicious user agent detected (potential security tool)'
                });
            }
        }
        
        return threats;
    }

    /**
     * Detect SQL injection attempts
     */
    detectSQLInjection(input, source, userId, tenantId) {
        const threats = [];
        
        if (!input || typeof input !== 'string') return threats;
        
        for (const pattern of this.sqlInjectionPatterns) {
            if (pattern.test(input)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
                    severity: 'critical',
                    userId,
                    tenantId,
                    source,
                    input: input.substring(0, 200),
                    pattern: pattern.toString(),
                    description: `SQL injection attempt detected in ${source}`
                });
                
                // Track SQL injection attempts
                this.trackActivity(userId || 'unknown', 'sql_injection', { source, pattern: pattern.toString() });
            }
        }
        
        return threats;
    }

    /**
     * Detect XSS attempts
     */
    detectXSS(input, source, userId, tenantId) {
        const threats = [];
        
        if (!input || typeof input !== 'string') return threats;
        
        for (const pattern of this.xssPatterns) {
            if (pattern.test(input)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.XSS_ATTEMPT,
                    severity: 'high',
                    userId,
                    tenantId,
                    source,
                    input: input.substring(0, 200),
                    pattern: pattern.toString(),
                    description: `XSS attempt detected in ${source}`
                });
            }
        }
        
        return threats;
    }

    /**
     * Detect directory traversal attempts
     */
    detectDirectoryTraversal(input, clientIP, tenantId) {
        const threats = [];
        
        if (!input || typeof input !== 'string') return threats;
        
        for (const pattern of this.directoryTraversalPatterns) {
            if (pattern.test(input)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.UNAUTHORIZED_API_ACCESS,
                    severity: 'high',
                    clientIP,
                    tenantId,
                    input: input.substring(0, 200),
                    pattern: pattern.toString(),
                    description: 'Directory traversal attempt detected'
                });
            }
        }
        
        return threats;
    }

    /**
     * Detect command injection attempts
     */
    detectCommandInjection(input, source, userId, tenantId) {
        const threats = [];
        
        if (!input || typeof input !== 'string') return threats;
        
        for (const pattern of this.commandInjectionPatterns) {
            if (pattern.test(input)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.UNAUTHORIZED_API_ACCESS,
                    severity: 'critical',
                    userId,
                    tenantId,
                    source,
                    input: input.substring(0, 200),
                    pattern: pattern.toString(),
                    description: `Command injection attempt detected in ${source}`
                });
            }
        }
        
        return threats;
    }

    /**
     * Analyze failed login attempts
     */
    analyzeFailedLogin(userId, clientIP, tenantId, details) {
        const threats = [];
        
        // Track failed login attempts
        this.trackActivity(clientIP, 'failed_login', { userId, ...details });
        
        // Check for brute force attack
        const recentFailures = this.getRecentActivity(clientIP, 'failed_login', this.suspiciousActivityThresholds.failedLogins.timeWindow);
        if (recentFailures.length > this.suspiciousActivityThresholds.failedLogins.count) {
            threats.push({
                type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
                severity: 'high',
                userId,
                clientIP,
                tenantId,
                attemptCount: recentFailures.length,
                description: 'Brute force login attack detected'
            });
        }
        
        return threats;
    }

    /**
     * Analyze password reset requests
     */
    analyzePasswordResetRequest(userId, clientIP, tenantId, details) {
        const threats = [];
        
        // Track password reset requests
        this.trackActivity(clientIP, 'password_reset', { userId, ...details });
        
        // Check for excessive password reset requests
        const recentResets = this.getRecentActivity(clientIP, 'password_reset', 3600000); // 1 hour
        if (recentResets.length > 5) {
            threats.push({
                type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
                severity: 'medium',
                userId,
                clientIP,
                tenantId,
                requestCount: recentResets.length,
                description: 'Excessive password reset requests detected'
            });
        }
        
        return threats;
    }

    /**
     * Analyze account lock events
     */
    analyzeAccountLock(userId, clientIP, tenantId, details) {
        const threats = [];
        
        threats.push({
            type: SECURITY_EVENT_TYPES.AUTHENTICATION_FAILURE,
            severity: 'medium',
            userId,
            clientIP,
            tenantId,
            reason: details.reason || 'Account locked due to security policy',
            description: 'Account locked due to suspicious activity'
        });
        
        return threats;
    }

    /**
     * Analyze suspicious database operations
     */
    analyzeSuspiciousDBOperation(operation, query, userId, tenantId, executionTime) {
        const threats = [];
        
        // Check for suspicious operations
        const suspiciousOperations = ['DROP', 'TRUNCATE', 'DELETE FROM users', 'UPDATE users SET'];
        
        for (const suspiciousOp of suspiciousOperations) {
            if (query.toUpperCase().includes(suspiciousOp)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.DATA_ACCESS_VIOLATION,
                    severity: 'critical',
                    userId,
                    tenantId,
                    operation,
                    query: query.substring(0, 200),
                    executionTime,
                    description: `Suspicious database operation detected: ${suspiciousOp}`
                });
            }
        }
        
        // Check for slow queries (potential DoS)
        if (executionTime > 10000) { // 10 seconds
            threats.push({
                type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
                severity: 'medium',
                userId,
                tenantId,
                operation,
                executionTime,
                description: 'Slow database query detected (potential DoS)'
            });
        }
        
        return threats;
    }

    /**
     * Check for rapid requests from same IP
     */
    checkRapidRequests(clientIP, tenantId) {
        const threats = [];
        
        const recentRequests = this.getRecentActivity(clientIP, 'request', this.suspiciousActivityThresholds.rapidRequests.timeWindow);
        if (recentRequests.length > this.suspiciousActivityThresholds.rapidRequests.count) {
            threats.push({
                type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
                severity: 'medium',
                clientIP,
                tenantId,
                requestCount: recentRequests.length,
                timeWindow: this.suspiciousActivityThresholds.rapidRequests.timeWindow,
                description: 'Rapid request pattern detected (potential DoS)'
            });
        }
        
        return threats;
    }

    /**
     * Check if privilege escalation is suspicious
     */
    isSuspiciousPrivilegeEscalation(currentRole, requestedRole) {
        const roleHierarchy = {
            'user': 1,
            'moderator': 2,
            'admin': 3,
            'super_admin': 4
        };
        
        const currentLevel = roleHierarchy[currentRole] || 0;
        const requestedLevel = roleHierarchy[requestedRole] || 0;
        
        // Suspicious if trying to escalate more than one level
        return requestedLevel > currentLevel + 1;
    }

    /**
     * Track activity for IP/user
     */
    trackActivity(identifier, activityType, details = {}) {
        if (!this.activityTracking.has(identifier)) {
            this.activityTracking.set(identifier, []);
        }
        
        const activities = this.activityTracking.get(identifier);
        activities.push({
            type: activityType,
            timestamp: Date.now(),
            details
        });
        
        // Keep only recent activities (last 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentActivities = activities.filter(activity => activity.timestamp > oneDayAgo);
        this.activityTracking.set(identifier, recentActivities);
    }

    /**
     * Get recent activity for IP/user
     */
    getRecentActivity(identifier, activityType, timeWindow) {
        const activities = this.activityTracking.get(identifier) || [];
        const cutoff = Date.now() - timeWindow;
        
        return activities.filter(activity => 
            activity.type === activityType && activity.timestamp > cutoff
        );
    }

    /**
     * Clear failed login attempts (on successful login)
     */
    clearFailedLoginAttempts(clientIP, userId) {
        const activities = this.activityTracking.get(clientIP) || [];
        const filteredActivities = activities.filter(activity => 
            !(activity.type === 'failed_login' && activity.details.userId === userId)
        );
        this.activityTracking.set(clientIP, filteredActivities);
    }

    /**
     * Get client IP address
     */
    getClientIP(req) {
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.headers['x-forwarded-for']?.split(',')[0] || 
               'unknown';
    }

    /**
     * Report security threat
     */
    reportSecurityThreat(threat, req, tenantId) {
        if (!this.detectionEnabled) return;
        
        const enhancedThreat = {
            ...threat,
            id: this.generateThreatId(),
            timestamp: Date.now(),
            requestId: req.correlationId || req.id,
            url: req.originalUrl || req.url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        };
        
        // Store security event
        if (!this.securityEvents.has(tenantId || 'platform')) {
            this.securityEvents.set(tenantId || 'platform', []);
        }
        
        const events = this.securityEvents.get(tenantId || 'platform');
        events.push(enhancedThreat);
        
        // Limit events per tenant
        if (events.length > this.maxSecurityEventsPerTenant) {
            events.shift();
        }
        
        // Log security threat
        if (tenantId) {
            const companyLogger = req.companyLogger;
            if (companyLogger) {
                companyLogger.securityEvent(threat.type, enhancedThreat);
            }
        } else {
            platformLogger.platformSecurity(`Backend Security Threat: ${threat.type}`, {
                threat: enhancedThreat,
                eventType: threat.type,
                severity: threat.severity
            });
        }
        
        // Handle critical threats immediately
        if (threat.severity === 'critical') {
            this.handleCriticalThreat(enhancedThreat, req, tenantId);
        }
    }

    /**
     * Handle critical security threats
     */
    handleCriticalThreat(threat, req, tenantId) {
        // Log critical threat
        platformLogger.error(`CRITICAL SECURITY THREAT: ${threat.type}`, {
            threat,
            tenantId,
            immediate_action_required: true
        });
        
        // Could implement additional actions like:
        // - Block IP address
        // - Disable user account
        // - Send immediate alerts
        // - Trigger incident response
    }

    /**
     * Generate threat ID
     */
    generateThreatId() {
        return 'thr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    /**
     * Get security statistics
     */
    getSecurityStats(tenantId = null) {
        const events = tenantId ? 
            (this.securityEvents.get(tenantId) || []) : 
            Array.from(this.securityEvents.values()).flat();
        
        const threatsByType = {};
        const threatsBySeverity = {};
        
        for (const event of events) {
            threatsByType[event.type] = (threatsByType[event.type] || 0) + 1;
            threatsBySeverity[event.severity] = (threatsBySeverity[event.severity] || 0) + 1;
        }
        
        return {
            totalThreats: events.length,
            threatsByType,
            threatsBySeverity,
            recentThreats: events.slice(-10),
            detectionEnabled: this.detectionEnabled
        };
    }

    /**
     * Set detection enabled/disabled
     */
    setDetectionEnabled(enabled) {
        this.detectionEnabled = enabled;
        platformLogger.info(`Backend security detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear security events
     */
    clearSecurityEvents(tenantId = null) {
        if (tenantId) {
            this.securityEvents.delete(tenantId);
        } else {
            this.securityEvents.clear();
        }
        platformLogger.info(`Security events cleared${tenantId ? ` for tenant ${tenantId}` : ' (all tenants)'}`);
    }

    /**
     * Export security data
     */
    exportSecurityData(tenantId = null) {
        return {
            events: tenantId ? 
                (this.securityEvents.get(tenantId) || []) : 
                Object.fromEntries(this.securityEvents),
            stats: this.getSecurityStats(tenantId),
            thresholds: this.suspiciousActivityThresholds,
            activityTracking: Object.fromEntries(this.activityTracking)
        };
    }

    /**
     * Get module settings for a tenant with caching
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Object} Module configuration
     */
    async getModuleSettings(tenantId) {
        if (!tenantId) {
            // Return default settings for platform-level requests
            return {
                enabled: true,
                features: { securityLogging: true }
            };
        }
        
        const cacheKey = `module_${tenantId}`;
        const cached = this.moduleConfigCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
            return cached.config;
        }
        
        try {
            const config = await loggingModuleService.getConfig(tenantId);
            this.moduleConfigCache.set(cacheKey, {
                config,
                timestamp: Date.now()
            });
            return config;
        } catch (error) {
            // Fallback to default settings if module service fails
            return {
                enabled: true,
                features: { securityLogging: true }
            };
        }
    }

    /**
     * Determine if detailed security detection should be performed
     * 
     * @param {Object} moduleSettings - Module configuration
     * @returns {boolean} Whether to perform detailed detection
     */
    shouldPerformDetailedDetection(moduleSettings) {
        // Always perform detection if module is enabled and security logging is enabled
        return moduleSettings.enabled && moduleSettings.features.securityLogging;
    }

    /**
     * Analyze critical security threats that cannot be disabled
     * 
     * @param {Object} req - Request object
     * @param {string} tenantId - Tenant ID
     * @returns {Array} Critical security threats
     */
    async analyzeCriticalThreats(req, tenantId) {
        const threats = [];
        const clientIP = this.getClientIP(req);
        const url = req.originalUrl || req.url;
        
        // Critical SQL injection patterns (always detected)
        const criticalSQLPatterns = [
            /(\bDROP\s+TABLE\b)/i,
            /(\bDELETE\s+FROM\s+users\b)/i,
            /(\bUPDATE\s+users\s+SET\b)/i,
            /(;\s*DROP\b)/i
        ];
        
        const queryString = JSON.stringify(req.query || {}) + JSON.stringify(req.body || {}) + url;
        
        for (const pattern of criticalSQLPatterns) {
            if (pattern.test(queryString)) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
                    severity: 'critical',
                    clientIP,
                    tenantId,
                    source: 'critical_detection',
                    input: queryString.substring(0, 200),
                    pattern: pattern.toString(),
                    description: 'Critical SQL injection attempt detected (always monitored)',
                    essential: true
                });
            }
        }
        
        // Critical authentication failures (always detected)
        if (url.includes('/auth/') || url.includes('/login')) {
            this.trackActivity(clientIP, 'auth_attempt', { url, tenantId });
            
            const recentAuthAttempts = this.getRecentActivity(clientIP, 'auth_attempt', 60000); // 1 minute
            if (recentAuthAttempts.length > 10) {
                threats.push({
                    type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
                    severity: 'critical',
                    clientIP,
                    tenantId,
                    source: 'critical_detection',
                    attemptCount: recentAuthAttempts.length,
                    description: 'Critical brute force attack detected (always monitored)',
                    essential: true
                });
            }
        }
        
        return threats;
    }

    /**
     * Report security threat with module awareness
     * 
     * @param {Object} threat - Security threat
     * @param {Object} req - Request object
     * @param {string} tenantId - Tenant ID
     * @param {Object} moduleSettings - Module configuration
     */
    reportSecurityThreat(threat, req, tenantId, moduleSettings = null) {
        if (!this.detectionEnabled) return;
        
        const enhancedThreat = {
            ...threat,
            id: this.generateThreatId(),
            timestamp: Date.now(),
            requestId: req.correlationId || req.id,
            url: req.originalUrl || req.url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            moduleAware: true,
            essential: threat.essential || false
        };
        
        // Add module context if available
        if (moduleSettings) {
            enhancedThreat.moduleContext = {
                enabled: moduleSettings.enabled,
                securityLogging: moduleSettings.features.securityLogging,
                detectionLevel: threat.essential ? 'essential' : 'detailed'
            };
        }
        
        // Store security event
        if (!this.securityEvents.has(tenantId || 'platform')) {
            this.securityEvents.set(tenantId || 'platform', []);
        }
        
        const events = this.securityEvents.get(tenantId || 'platform');
        events.push(enhancedThreat);
        
        // Limit events per tenant
        if (events.length > this.maxSecurityEventsPerTenant) {
            events.shift();
        }
        
        // Log security threat
        if (tenantId) {
            const companyLogger = req.companyLogger;
            if (companyLogger) {
                companyLogger.securityEvent(threat.type, enhancedThreat);
            }
        }
        
        // Always log critical and essential threats to platform logger
        if (threat.severity === 'critical' || threat.essential) {
            platformLogger.platformSecurity(`Backend Security Threat: ${threat.type}`, {
                threat: enhancedThreat,
                eventType: threat.type,
                severity: threat.severity,
                essential: threat.essential || false,
                moduleOverride: threat.essential ? 'platform_required' : 'module_controlled'
            });
        }
        
        // Handle critical threats immediately
        if (threat.severity === 'critical') {
            this.handleCriticalThreat(enhancedThreat, req, tenantId);
        }
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
            cachedTenants: Array.from(this.moduleConfigCache.keys())
        };
    }
}

// Create singleton instance
const backendSecurityDetectionService = new BackendSecurityDetectionService();

// Auto-initialize
backendSecurityDetectionService.initialize();

export default backendSecurityDetectionService;