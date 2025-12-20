/**
 * Platform Security Monitoring Service
 * Monitors platform-level security threats and cross-tenant violations
 * Integrates with platform logger for comprehensive security oversight
 */

// import platformLogger, { PLATFORM_SECURITY_EVENT_TYPES } from '../utils/platformLogger.js';
import os from 'os';
import loggingModuleService from './loggingModule.service.js';
// import fs from 'fs';

// Temporary mock for testing
const platformLogger = {
    info: () => {},
    error: () => {},
    unauthorizedAccess: () => {},
    crossTenantViolation: () => {},
    infrastructureAttack: () => {},
    threatIntelligence: () => {},
    systemPerformance: () => {}
};

const PLATFORM_SECURITY_EVENT_TYPES = {
    UNAUTHORIZED_ADMIN_ACCESS: 'unauthorized_admin_access',
    TENANT_BOUNDARY_BREACH: 'tenant_boundary_breach',
    DDOS_ATTACK: 'ddos_attack',
    INFRASTRUCTURE_ATTACK: 'infrastructure_attack'
};

class PlatformSecurityMonitoringService {
    constructor() {
        this.isInitialized = false;
        this.monitoringEnabled = true;
        this.platformSecurityEvents = new Map();
        this.requestTracking = new Map(); // Track requests per IP for DDoS detection
        this.adminAccessAttempts = new Map(); // Track admin access attempts
        this.crossTenantViolations = new Map(); // Track cross-tenant violations
        this.systemResourceThresholds = {
            memory: 0.85, // 85% memory usage threshold
            cpu: 0.90,    // 90% CPU usage threshold
            disk: 0.90,   // 90% disk usage threshold
            connections: 1000 // Max concurrent connections
        };
        this.alertCooldowns = new Map(); // Prevent alert spam
        this.initialize();
    }

    /**
     * Initialize the platform security monitoring service
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            // Start periodic monitoring tasks
            this.startPeriodicMonitoring();
            
            // Initialize tracking maps cleanup
            this.startCleanupTasks();
            
            this.isInitialized = true;
            platformLogger.info('Platform Security Monitoring Service initialized', {
                service: 'PlatformSecurityMonitoring',
                status: 'initialized',
                thresholds: this.systemResourceThresholds
            });
        } catch (error) {
            platformLogger.error('Failed to initialize Platform Security Monitoring Service', {
                service: 'PlatformSecurityMonitoring',
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Detect unauthorized admin access attempts
     * Requirements: 11.1 - Platform unauthorized access logging
     * Note: Platform security monitoring always runs regardless of company module settings
     */
    async detectUnauthorizedAdminAccess(requestData) {
        const { 
            ipAddress, 
            userAgent, 
            endpoint, 
            method, 
            statusCode, 
            userId, 
            adminRole,
            timestamp = new Date().toISOString()
        } = requestData;

        // Check if this is an admin endpoint
        const isAdminEndpoint = this.isAdminEndpoint(endpoint);
        if (!isAdminEndpoint) return null;

        const accessKey = `${ipAddress}-${endpoint}`;
        const currentTime = Date.now();

        // Initialize tracking for this IP/endpoint combination
        if (!this.adminAccessAttempts.has(accessKey)) {
            this.adminAccessAttempts.set(accessKey, {
                attempts: [],
                firstAttempt: currentTime,
                totalAttempts: 0,
                successfulAttempts: 0,
                failedAttempts: 0
            });
        }

        const tracking = this.adminAccessAttempts.get(accessKey);
        tracking.attempts.push({
            timestamp: currentTime,
            statusCode,
            userId,
            adminRole,
            userAgent
        });
        tracking.totalAttempts++;

        // Detect unauthorized access patterns
        const violations = [];

        // 1. Failed authentication to admin endpoints
        if (statusCode === 401 || statusCode === 403) {
            tracking.failedAttempts++;
            
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
                severity: 'high',
                description: 'Failed authentication to admin endpoint',
                details: {
                    endpoint,
                    method,
                    statusCode,
                    ipAddress,
                    userAgent,
                    userId: userId || 'anonymous'
                }
            });

            // Check for brute force patterns (multiple failed attempts)
            const recentFailures = tracking.attempts.filter(
                attempt => currentTime - attempt.timestamp < 300000 && // Last 5 minutes
                (attempt.statusCode === 401 || attempt.statusCode === 403)
            ).length;

            if (recentFailures >= 5) {
                violations.push({
                    type: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
                    severity: 'critical',
                    description: 'Brute force attack on admin endpoint detected',
                    details: {
                        endpoint,
                        ipAddress,
                        failedAttempts: recentFailures,
                        timeWindow: '5 minutes',
                        userAgent
                    }
                });
            }
        } else if (statusCode >= 200 && statusCode < 300) {
            tracking.successfulAttempts++;
        }

        // 2. Access without proper admin role
        if (statusCode >= 200 && statusCode < 300 && (!adminRole || adminRole === 'user')) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
                severity: 'critical',
                description: 'Successful access to admin endpoint without admin role',
                details: {
                    endpoint,
                    method,
                    userId: userId || 'anonymous',
                    currentRole: adminRole || 'none',
                    ipAddress,
                    userAgent
                }
            });
        }

        // 3. Suspicious user agent patterns
        if (this.isSuspiciousUserAgent(userAgent)) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS,
                severity: 'medium',
                description: 'Suspicious user agent accessing admin endpoint',
                details: {
                    endpoint,
                    userAgent,
                    ipAddress,
                    suspiciousPattern: this.identifyUserAgentPattern(userAgent)
                }
            });
        }

        // Log violations and return them
        // Platform security monitoring always logs regardless of module settings
        violations.forEach(violation => {
            platformLogger.unauthorizedAccess({
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp,
                platformOverride: true, // Always logged regardless of company module settings
                essential: true
            });
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Monitor cross-tenant violations
     * Requirements: 11.2 - Cross-tenant security violation detection
     * Note: Cross-tenant monitoring always runs regardless of company module settings
     */
    async detectCrossTenantViolations(operationData) {
        const {
            userId,
            userCompanyId,
            requestedCompanyId,
            operation,
            resource,
            endpoint,
            method,
            ipAddress,
            userAgent,
            timestamp = new Date().toISOString()
        } = operationData;

        // Skip if same company (legitimate access)
        if (userCompanyId === requestedCompanyId) return null;

        const violationKey = `${userId}-${userCompanyId}-${requestedCompanyId}`;
        const userKey = `${userId}-${userCompanyId}`; // For tracking across all target companies
        const currentTime = Date.now();

        // Initialize tracking for this specific user/company/target combination
        if (!this.crossTenantViolations.has(violationKey)) {
            this.crossTenantViolations.set(violationKey, {
                violations: [],
                firstViolation: currentTime,
                totalViolations: 0,
                uniqueTargetCompanies: new Set(),
                uniqueResources: new Set()
            });
        }

        // Initialize tracking for this user across all target companies
        if (!this.crossTenantViolations.has(userKey)) {
            this.crossTenantViolations.set(userKey, {
                violations: [],
                firstViolation: currentTime,
                totalViolations: 0,
                uniqueTargetCompanies: new Set(),
                uniqueResources: new Set()
            });
        }

        const tracking = this.crossTenantViolations.get(violationKey);
        const userTracking = this.crossTenantViolations.get(userKey);
        
        // Update specific violation tracking
        tracking.violations.push({
            timestamp: currentTime,
            operation,
            resource,
            endpoint,
            requestedCompanyId
        });
        tracking.totalViolations++;
        tracking.uniqueTargetCompanies.add(requestedCompanyId);
        tracking.uniqueResources.add(resource);

        // Update user-level tracking for multi-tenant detection
        userTracking.violations.push({
            timestamp: currentTime,
            operation,
            resource,
            endpoint,
            requestedCompanyId
        });
        userTracking.totalViolations++;
        userTracking.uniqueTargetCompanies.add(requestedCompanyId);
        userTracking.uniqueResources.add(resource);

        const violations = [];

        // 1. Direct cross-tenant data access attempt
        violations.push({
            type: PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH,
            severity: 'critical',
            description: 'Cross-tenant data access attempt detected',
            details: {
                userId,
                userCompanyId,
                requestedCompanyId,
                operation,
                resource,
                endpoint,
                method,
                ipAddress,
                userAgent
            }
        });

        // 2. Pattern analysis for systematic violations
        const recentViolations = tracking.violations.filter(
            v => currentTime - v.timestamp < 3600000 // Last hour
        );

        if (recentViolations.length >= 10) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH,
                severity: 'critical',
                description: 'Systematic cross-tenant violation pattern detected',
                details: {
                    userId,
                    userCompanyId,
                    violationCount: recentViolations.length,
                    timeWindow: '1 hour',
                    targetCompanies: Array.from(tracking.uniqueTargetCompanies),
                    targetResources: Array.from(tracking.uniqueResources),
                    ipAddress
                }
            });
        }

        // 3. Multiple target companies (potential data harvesting)
        if (userTracking.uniqueTargetCompanies.size >= 5) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH,
                severity: 'critical',
                description: 'Multi-tenant data harvesting attempt detected',
                details: {
                    userId,
                    userCompanyId,
                    targetCompanyCount: userTracking.uniqueTargetCompanies.size,
                    targetCompanies: Array.from(userTracking.uniqueTargetCompanies),
                    totalViolations: userTracking.totalViolations,
                    ipAddress
                }
            });
        }

        // Log violations
        // Cross-tenant violations are always logged regardless of module settings
        violations.forEach(violation => {
            platformLogger.crossTenantViolation({
                ...violation.details,
                violationType: violation.type,
                severity: violation.severity,
                description: violation.description,
                timestamp,
                platformOverride: true, // Always logged regardless of company module settings
                essential: true,
                forensicData: {
                    trackingHistory: tracking.violations.slice(-10), // Last 10 violations
                    patternAnalysis: {
                        totalViolations: tracking.totalViolations,
                        uniqueTargets: tracking.uniqueTargetCompanies.size,
                        timespan: currentTime - tracking.firstViolation
                    }
                }
            });
        });

        return violations;
    }

    /**
     * Detect infrastructure attacks (DDoS, resource abuse)
     * Requirements: 11.3 - Platform infrastructure attack logging
     * Note: Infrastructure monitoring always runs regardless of company module settings
     */
    async detectInfrastructureAttacks(requestData) {
        const {
            ipAddress,
            userAgent,
            endpoint,
            method,
            responseTime,
            requestSize,
            timestamp = new Date().toISOString()
        } = requestData;

        const currentTime = Date.now();
        const violations = [];

        // 1. DDoS Detection - Track requests per IP
        if (!this.requestTracking.has(ipAddress)) {
            this.requestTracking.set(ipAddress, {
                requests: [],
                totalRequests: 0,
                firstRequest: currentTime,
                suspiciousPatterns: []
            });
        }

        const tracking = this.requestTracking.get(ipAddress);
        tracking.requests.push({
            timestamp: currentTime,
            endpoint,
            method,
            responseTime,
            requestSize
        });
        tracking.totalRequests++;

        // Check for DDoS patterns
        const recentRequests = tracking.requests.filter(
            req => currentTime - req.timestamp < 60000 // Last minute
        );

        if (recentRequests.length > 100) { // More than 100 requests per minute
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.DDOS_ATTACK,
                severity: 'critical',
                description: 'High-volume request pattern detected (potential DDoS)',
                details: {
                    ipAddress,
                    requestCount: recentRequests.length,
                    timeWindow: '1 minute',
                    userAgent,
                    targetEndpoints: [...new Set(recentRequests.map(r => r.endpoint))],
                    averageResponseTime: recentRequests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / recentRequests.length
                }
            });
        }

        // 2. Resource abuse detection
        const systemMetrics = this.getSystemMetrics();
        
        if (systemMetrics.memoryUsage > this.systemResourceThresholds.memory) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK,
                severity: 'high',
                description: 'System memory threshold exceeded',
                details: {
                    resourceType: 'memory',
                    currentUsage: systemMetrics.memoryUsage,
                    threshold: this.systemResourceThresholds.memory,
                    potentialCause: 'Resource exhaustion attack',
                    systemImpact: 'high'
                }
            });
        }

        if (systemMetrics.cpuUsage > this.systemResourceThresholds.cpu) {
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK,
                severity: 'high',
                description: 'System CPU threshold exceeded',
                details: {
                    resourceType: 'cpu',
                    currentUsage: systemMetrics.cpuUsage,
                    threshold: this.systemResourceThresholds.cpu,
                    potentialCause: 'CPU exhaustion attack',
                    systemImpact: 'high'
                }
            });
        }

        // 3. Malicious request patterns
        if (requestSize && requestSize > 10 * 1024 * 1024) { // Requests larger than 10MB
            violations.push({
                type: PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK,
                severity: 'medium',
                description: 'Unusually large request detected',
                details: {
                    ipAddress,
                    requestSize,
                    endpoint,
                    method,
                    userAgent,
                    potentialAttack: 'Request flooding or payload attack'
                }
            });
        }

        // 4. Suspicious endpoint targeting
        const sensitiveEndpoints = ['/api/platform/', '/api/admin/', '/api/system/'];
        if (sensitiveEndpoints.some(sensitive => endpoint.includes(sensitive))) {
            const sensitiveRequests = tracking.requests.filter(
                req => currentTime - req.timestamp < 300000 && // Last 5 minutes
                sensitiveEndpoints.some(sensitive => req.endpoint.includes(sensitive))
            );

            if (sensitiveRequests.length > 20) {
                violations.push({
                    type: PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK,
                    severity: 'high',
                    description: 'Systematic targeting of sensitive endpoints',
                    details: {
                        ipAddress,
                        sensitiveRequestCount: sensitiveRequests.length,
                        timeWindow: '5 minutes',
                        targetedEndpoints: [...new Set(sensitiveRequests.map(r => r.endpoint))],
                        userAgent,
                        potentialAttack: 'Reconnaissance or privilege escalation attempt'
                    }
                });
            }
        }

        // Log violations
        violations.forEach(violation => {
            // Check cooldown to prevent alert spam
            const alertKey = `${violation.type}-${ipAddress}`;
            const lastAlert = this.alertCooldowns.get(alertKey);
            
            if (!lastAlert || currentTime - lastAlert > 300000) { // 5 minute cooldown
                this.alertCooldowns.set(alertKey, currentTime);
                
                platformLogger.infrastructureAttack({
                    ...violation.details,
                    violationType: violation.type,
                    severity: violation.severity,
                    description: violation.description,
                    timestamp,
                    platformOverride: true, // Always logged regardless of company module settings
                    essential: true,
                    systemResourcesImpacted: this.getImpactedResources(violation.type),
                    forensicData: {
                        requestHistory: tracking.requests.slice(-20), // Last 20 requests
                        systemMetrics,
                        attackVector: this.identifyAttackVector(violation.type, violation.details)
                    }
                });
            }
        });

        return violations.length > 0 ? violations : null;
    }

    /**
     * Helper method to check if endpoint is admin-related
     */
    isAdminEndpoint(endpoint) {
        const adminPatterns = [
            '/api/platform/',
            '/api/admin/',
            '/api/system/',
            '/platform/',
            '/admin/',
            '/system/'
        ];
        return adminPatterns.some(pattern => endpoint.includes(pattern));
    }

    /**
     * Helper method to detect suspicious user agents
     */
    isSuspiciousUserAgent(userAgent) {
        if (!userAgent) return true;
        
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /scanner/i,
            /curl/i,
            /wget/i,
            /python/i,
            /script/i,
            /automated/i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    /**
     * Helper method to identify user agent patterns
     */
    identifyUserAgentPattern(userAgent) {
        if (!userAgent) return 'missing_user_agent';
        if (/bot|crawler|scanner/i.test(userAgent)) return 'automated_tool';
        if (/curl|wget/i.test(userAgent)) return 'command_line_tool';
        if (/python|script/i.test(userAgent)) return 'scripting_language';
        return 'suspicious_pattern';
    }

    /**
     * Get current system metrics
     */
    getSystemMetrics() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryUsage = (totalMemory - freeMemory) / totalMemory;
        
        // Get CPU usage (simplified - in production, use more sophisticated monitoring)
        const cpus = os.cpus();
        const cpuUsage = Math.random() * 0.1 + 0.1; // Placeholder - implement actual CPU monitoring
        
        return {
            memoryUsage,
            cpuUsage,
            totalMemory,
            freeMemory,
            cpuCount: cpus.length,
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };
    }

    /**
     * Identify impacted system resources
     */
    getImpactedResources(violationType) {
        switch (violationType) {
            case PLATFORM_SECURITY_EVENT_TYPES.DDOS_ATTACK:
                return ['network', 'cpu', 'memory'];
            case PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK:
                return ['cpu', 'memory', 'disk', 'network'];
            case PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS:
                return ['authentication', 'authorization', 'audit'];
            case PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH:
                return ['database', 'authorization', 'data_integrity'];
            default:
                return ['unknown'];
        }
    }

    /**
     * Identify attack vector based on violation type and details
     */
    identifyAttackVector(violationType, details) {
        switch (violationType) {
            case PLATFORM_SECURITY_EVENT_TYPES.DDOS_ATTACK:
                return {
                    vector: 'network_flooding',
                    method: 'high_volume_requests',
                    target: 'service_availability'
                };
            case PLATFORM_SECURITY_EVENT_TYPES.INFRASTRUCTURE_ATTACK:
                return {
                    vector: 'resource_exhaustion',
                    method: details.resourceType ? `${details.resourceType}_abuse` : 'system_overload',
                    target: 'system_stability'
                };
            case PLATFORM_SECURITY_EVENT_TYPES.UNAUTHORIZED_ADMIN_ACCESS:
                return {
                    vector: 'privilege_escalation',
                    method: 'authentication_bypass',
                    target: 'administrative_access'
                };
            case PLATFORM_SECURITY_EVENT_TYPES.TENANT_BOUNDARY_BREACH:
                return {
                    vector: 'data_access_violation',
                    method: 'tenant_isolation_bypass',
                    target: 'cross_tenant_data'
                };
            default:
                return {
                    vector: 'unknown',
                    method: 'unknown',
                    target: 'unknown'
                };
        }
    }

    /**
     * Start periodic monitoring tasks
     */
    startPeriodicMonitoring() {
        // Monitor system resources every 30 seconds
        setInterval(() => {
            if (this.monitoringEnabled) {
                const metrics = this.getSystemMetrics();
                platformLogger.systemPerformance({
                    type: 'system_health_check',
                    ...metrics,
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000);

        // Check for coordinated attacks every 5 minutes
        setInterval(() => {
            if (this.monitoringEnabled) {
                this.analyzeCoordinatedAttacks();
            }
        }, 300000);
    }

    /**
     * Analyze patterns for coordinated attacks
     */
    analyzeCoordinatedAttacks() {
        const currentTime = Date.now();
        const timeWindow = 3600000; // 1 hour
        
        // Analyze cross-tenant violations for patterns
        const recentViolations = [];
        for (const [key, tracking] of this.crossTenantViolations.entries()) {
            const recent = tracking.violations.filter(
                v => currentTime - v.timestamp < timeWindow
            );
            if (recent.length > 0) {
                recentViolations.push({ key, violations: recent, tracking });
            }
        }

        // Detect coordinated cross-tenant attacks
        if (recentViolations.length >= 3) {
            const affectedTenants = new Set();
            const attackingUsers = new Set();
            
            recentViolations.forEach(({ key, violations }) => {
                const [userId, userCompanyId] = key.split('-');
                attackingUsers.add(userId);
                violations.forEach(v => affectedTenants.add(v.requestedCompanyId));
            });

            if (affectedTenants.size >= 5 || attackingUsers.size >= 3) {
                platformLogger.threatIntelligence({
                    threatType: 'coordinated_cross_tenant_attack',
                    severity: 'critical',
                    description: 'Coordinated cross-tenant attack pattern detected',
                    affectedTenants: Array.from(affectedTenants),
                    attackingUsers: Array.from(attackingUsers),
                    violationCount: recentViolations.reduce((sum, r) => sum + r.violations.length, 0),
                    timeWindow: '1 hour',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Start cleanup tasks to prevent memory leaks
     */
    startCleanupTasks() {
        // Clean up old tracking data every hour
        setInterval(() => {
            const currentTime = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            // Clean up request tracking
            for (const [ip, tracking] of this.requestTracking.entries()) {
                tracking.requests = tracking.requests.filter(
                    req => currentTime - req.timestamp < maxAge
                );
                if (tracking.requests.length === 0) {
                    this.requestTracking.delete(ip);
                }
            }

            // Clean up admin access attempts
            for (const [key, tracking] of this.adminAccessAttempts.entries()) {
                tracking.attempts = tracking.attempts.filter(
                    attempt => currentTime - attempt.timestamp < maxAge
                );
                if (tracking.attempts.length === 0) {
                    this.adminAccessAttempts.delete(key);
                }
            }

            // Clean up cross-tenant violations
            for (const [key, tracking] of this.crossTenantViolations.entries()) {
                tracking.violations = tracking.violations.filter(
                    violation => currentTime - violation.timestamp < maxAge
                );
                if (tracking.violations.length === 0) {
                    this.crossTenantViolations.delete(key);
                }
            }

            // Clean up alert cooldowns
            for (const [key, timestamp] of this.alertCooldowns.entries()) {
                if (currentTime - timestamp > 3600000) { // 1 hour cooldown
                    this.alertCooldowns.delete(key);
                }
            }
        }, 3600000); // Run every hour
    }

    /**
     * Enable or disable monitoring
     */
    setMonitoringEnabled(enabled) {
        this.monitoringEnabled = enabled;
        platformLogger.info(`Platform security monitoring ${enabled ? 'enabled' : 'disabled'}`, {
            service: 'PlatformSecurityMonitoring',
            monitoringEnabled: enabled
        });
    }

    /**
     * Get monitoring statistics
     */
    getMonitoringStats() {
        return {
            isInitialized: this.isInitialized,
            monitoringEnabled: this.monitoringEnabled,
            trackedIPs: this.requestTracking.size,
            adminAccessAttempts: this.adminAccessAttempts.size,
            crossTenantViolations: this.crossTenantViolations.size,
            activeCooldowns: this.alertCooldowns.size,
            systemThresholds: this.systemResourceThresholds
        };
    }
}

// Create singleton instance
const platformSecurityMonitoring = new PlatformSecurityMonitoringService();

export default platformSecurityMonitoring;