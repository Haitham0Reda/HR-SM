/**
 * License-Controlled Logging Service
 * 
 * Ensures that all company logging capabilities are controlled by the platform
 * through the license system. The platform has full control over what companies
 * can log, how much they can log, and for how long logs are retained.
 */

import licenseValidator from '../platform/system/services/licenseValidator.service.js';
import { MODULES } from '../platform/system/models/license.model.js';
import loggingModuleService from './loggingModule.service.js';
import platformLogger from '../utils/platformLogger.js';
import EventEmitter from 'events';

// Default logging limits by tier
const LOGGING_LIMITS_BY_TIER = {
    starter: {
        dailyLogEntries: 10000,
        retentionDays: 30,
        storageGB: 1,
        features: {
            auditLogging: true,
            securityLogging: true,
            performanceLogging: false,
            userActionLogging: false,
            frontendLogging: false,
            detailedErrorLogging: false,
            realTimeMonitoring: false,
            logExport: false,
            customRetention: false
        }
    },
    business: {
        dailyLogEntries: 100000,
        retentionDays: 90,
        storageGB: 10,
        features: {
            auditLogging: true,
            securityLogging: true,
            performanceLogging: true,
            userActionLogging: true,
            frontendLogging: true,
            detailedErrorLogging: true,
            realTimeMonitoring: false,
            logExport: true,
            customRetention: false
        }
    },
    enterprise: {
        dailyLogEntries: 1000000,
        retentionDays: 365,
        storageGB: 100,
        features: {
            auditLogging: true,
            securityLogging: true,
            performanceLogging: true,
            userActionLogging: true,
            frontendLogging: true,
            detailedErrorLogging: true,
            realTimeMonitoring: true,
            logExport: true,
            customRetention: true
        }
    }
};

// Essential logging that cannot be disabled (platform requirements)
const ESSENTIAL_LOGGING_FEATURES = [
    'auditLogging',
    'securityLogging'
];

// Platform-mandated log events that must always be logged
const PLATFORM_MANDATORY_EVENTS = [
    'authentication_attempt',
    'authorization_failure',
    'security_breach',
    'data_access_violation',
    'system_error',
    'compliance_event',
    'license_violation',
    'platform_security_event',
    'cross_tenant_access',
    'admin_action'
];

/**
 * License-Controlled Logging Service
 */
class LicenseControlledLoggingService extends EventEmitter {
    constructor() {
        super();
        this.usageCache = new Map(); // Cache for daily usage tracking
        this.initialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            // Initialize the underlying logging module service
            if (!loggingModuleService.initialized) {
                await loggingModuleService.initialize();
            }

            // Set up usage tracking cleanup
            this.setupUsageCleanup();

            this.initialized = true;
            platformLogger.info('License-Controlled Logging Service initialized');
        } catch (error) {
            platformLogger.error('Failed to initialize License-Controlled Logging Service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Check if a company has valid logging license
     */
    async hasValidLoggingLicense(tenantId) {
        try {
            const validation = await licenseValidator.validateModuleAccess(
                tenantId,
                MODULES.LOGGING,
                { skipCache: false }
            );

            return {
                valid: validation.valid,
                tier: validation.license?.tier,
                limits: validation.license?.limits,
                error: validation.error,
                reason: validation.reason
            };
        } catch (error) {
            platformLogger.error('Error checking logging license', {
                tenantId,
                error: error.message
            });
            return {
                valid: false,
                error: 'LICENSE_CHECK_FAILED',
                reason: 'Unable to verify logging license'
            };
        }
    }

    /**
     * Get logging capabilities for a company based on their license
     */
    async getLoggingCapabilities(tenantId) {
        const licenseCheck = await this.hasValidLoggingLicense(tenantId);

        if (!licenseCheck.valid) {
            // Return minimal capabilities for unlicensed companies
            return {
                licensed: false,
                tier: null,
                limits: LOGGING_LIMITS_BY_TIER.starter, // Minimal limits
                features: {
                    // Only essential features for unlicensed companies
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: false,
                    userActionLogging: false,
                    frontendLogging: false,
                    detailedErrorLogging: false,
                    realTimeMonitoring: false,
                    logExport: false,
                    customRetention: false
                },
                mandatoryEvents: PLATFORM_MANDATORY_EVENTS,
                error: licenseCheck.error,
                reason: licenseCheck.reason
            };
        }

        const tier = licenseCheck.tier || 'starter';
        const tierLimits = LOGGING_LIMITS_BY_TIER[tier] || LOGGING_LIMITS_BY_TIER.starter;

        // Merge license-specific limits with tier defaults
        const limits = {
            ...tierLimits,
            ...(licenseCheck.limits?.customLimits?.logging || {})
        };

        return {
            licensed: true,
            tier,
            limits,
            features: limits.features,
            mandatoryEvents: PLATFORM_MANDATORY_EVENTS,
            licenseExpiresAt: licenseCheck.expiresAt
        };
    }

    /**
     * Check if a specific logging feature is allowed for a company
     */
    async isLoggingFeatureAllowed(tenantId, feature) {
        // Always allow essential features
        if (ESSENTIAL_LOGGING_FEATURES.includes(feature)) {
            return {
                allowed: true,
                reason: 'Essential feature - platform requirement'
            };
        }

        const capabilities = await this.getLoggingCapabilities(tenantId);

        if (!capabilities.licensed) {
            return {
                allowed: false,
                reason: 'Logging module not licensed',
                upgradeRequired: true,
                upgradeUrl: `/settings/license?module=${MODULES.LOGGING}`
            };
        }

        const allowed = capabilities.features[feature] || false;

        return {
            allowed,
            reason: allowed ? 'Feature included in license' : 'Feature not included in current tier',
            tier: capabilities.tier,
            upgradeRequired: !allowed,
            upgradeUrl: !allowed ? `/settings/license?upgrade=${capabilities.tier}` : null
        };
    }

    /**
     * Check if a log event should be captured based on license and platform requirements
     */
    async shouldCaptureLogEvent(tenantId, eventType, logLevel = 'info') {
        // Always capture platform-mandatory events
        if (PLATFORM_MANDATORY_EVENTS.includes(eventType)) {
            return {
                allowed: true,
                reason: 'Platform-mandatory event',
                mandatory: true
            };
        }

        // Check license-based permissions
        const capabilities = await this.getLoggingCapabilities(tenantId);

        // Check daily usage limits
        const usageCheck = await this.checkDailyUsage(tenantId, capabilities.limits);
        if (!usageCheck.allowed) {
            // Still allow essential events even if over limit
            if (PLATFORM_MANDATORY_EVENTS.includes(eventType)) {
                return {
                    allowed: true,
                    reason: 'Platform-mandatory event (over limit)',
                    mandatory: true,
                    overLimit: true
                };
            }

            return {
                allowed: false,
                reason: 'Daily logging limit exceeded',
                currentUsage: usageCheck.currentUsage,
                limit: usageCheck.limit,
                upgradeRequired: true
            };
        }

        // Check feature-specific permissions
        let featureRequired = null;
        switch (eventType) {
            case 'user_action':
                featureRequired = 'userActionLogging';
                break;
            case 'performance_metric':
                featureRequired = 'performanceLogging';
                break;
            case 'frontend_event':
                featureRequired = 'frontendLogging';
                break;
            case 'detailed_error':
                featureRequired = 'detailedErrorLogging';
                break;
            case 'audit_event':
                featureRequired = 'auditLogging';
                break;
            case 'security_event':
                featureRequired = 'securityLogging';
                break;
        }

        if (featureRequired) {
            const featureCheck = await this.isLoggingFeatureAllowed(tenantId, featureRequired);
            if (!featureCheck.allowed) {
                return {
                    allowed: false,
                    reason: `Feature '${featureRequired}' not licensed`,
                    featureRequired,
                    upgradeRequired: true,
                    upgradeUrl: featureCheck.upgradeUrl
                };
            }
        }

        return {
            allowed: true,
            reason: 'Event permitted by license',
            licensed: capabilities.licensed,
            tier: capabilities.tier
        };
    }

    /**
     * Check daily usage against license limits
     */
    async checkDailyUsage(tenantId, limits) {
        const today = new Date().toISOString().split('T')[0];
        const usageKey = `${tenantId}:${today}`;
        
        let currentUsage = this.usageCache.get(usageKey) || 0;
        const dailyLimit = limits.dailyLogEntries || LOGGING_LIMITS_BY_TIER.starter.dailyLogEntries;

        return {
            allowed: currentUsage < dailyLimit,
            currentUsage,
            limit: dailyLimit,
            percentage: (currentUsage / dailyLimit) * 100
        };
    }

    /**
     * Record a log event (increment usage counter)
     */
    async recordLogEvent(tenantId, eventType, size = 1) {
        const today = new Date().toISOString().split('T')[0];
        const usageKey = `${tenantId}:${today}`;
        
        const currentUsage = this.usageCache.get(usageKey) || 0;
        this.usageCache.set(usageKey, currentUsage + size);

        // Log usage metrics to platform logger
        const capabilities = await this.getLoggingCapabilities(tenantId);
        const newUsage = currentUsage + size;
        const percentage = (newUsage / capabilities.limits.dailyLogEntries) * 100;

        if (percentage > 90) {
            platformLogger.warn('Company approaching daily logging limit', {
                tenantId,
                eventType,
                currentUsage: newUsage,
                limit: capabilities.limits.dailyLogEntries,
                percentage: percentage.toFixed(2)
            });
        }

        // Emit usage event for monitoring
        this.emit('logEventRecorded', {
            tenantId,
            eventType,
            size,
            totalUsage: newUsage,
            dailyLimit: capabilities.limits.dailyLogEntries,
            percentage
        });
    }

    /**
     * Enforce platform logging policies
     */
    async enforcePlatformPolicies(tenantId, logData) {
        const policies = {
            applied: [],
            blocked: false,
            reason: null
        };

        // Check if this is a platform-mandatory event
        if (PLATFORM_MANDATORY_EVENTS.includes(logData.eventType)) {
            policies.applied.push('PLATFORM_MANDATORY');
            
            // Ensure platform logger also receives this event
            platformLogger.adminAction('Company mandatory event captured', 'system', {
                tenantId,
                eventType: logData.eventType,
                timestamp: new Date().toISOString(),
                originalData: logData
            });
        }

        // Check for license violations in the log data
        if (this.detectLicenseViolation(logData)) {
            policies.applied.push('LICENSE_VIOLATION_DETECTED');
            
            platformLogger.licenseEvent('license_violation_detected', tenantId, {
                violationType: 'logging_abuse',
                logData: logData,
                timestamp: new Date().toISOString()
            });
        }

        // Check for security events that need platform attention
        if (logData.security || logData.eventType?.includes('security')) {
            policies.applied.push('SECURITY_EVENT_ESCALATION');
            
            platformLogger.platformSecurity('Company security event escalated', {
                tenantId,
                originalEvent: logData,
                escalatedAt: new Date().toISOString()
            });
        }

        return policies;
    }

    /**
     * Detect potential license violations in log data
     */
    detectLicenseViolation(logData) {
        // Check for attempts to bypass logging restrictions
        if (logData.message?.includes('bypass') && logData.message?.includes('license')) {
            return true;
        }

        // Check for suspicious volume patterns
        if (logData.volume && logData.volume > 10000) {
            return true;
        }

        // Check for attempts to access unlicensed features
        if (logData.featureAccess && logData.unlicensed) {
            return true;
        }

        return false;
    }

    /**
     * Get logging usage statistics for a company
     */
    async getUsageStatistics(tenantId, days = 30) {
        const stats = {
            tenantId,
            period: `${days} days`,
            dailyUsage: {},
            totalEvents: 0,
            averageDaily: 0,
            peakDay: null,
            peakUsage: 0
        };

        // Calculate usage for the specified period
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const usageKey = `${tenantId}:${dateKey}`;
            
            const dayUsage = this.usageCache.get(usageKey) || 0;
            stats.dailyUsage[dateKey] = dayUsage;
            stats.totalEvents += dayUsage;

            if (dayUsage > stats.peakUsage) {
                stats.peakUsage = dayUsage;
                stats.peakDay = dateKey;
            }
        }

        stats.averageDaily = Math.round(stats.totalEvents / days);

        return stats;
    }

    /**
     * Force essential logging for a company (platform override)
     */
    async forceEssentialLogging(tenantId, reason, adminUser) {
        const override = {
            tenantId,
            reason,
            adminUser,
            timestamp: new Date().toISOString(),
            essentialEvents: PLATFORM_MANDATORY_EVENTS,
            duration: '24 hours' // Override lasts 24 hours
        };

        // Log the override action
        platformLogger.adminAction('Essential logging forced', adminUser, {
            ...override,
            action: 'force_essential_logging'
        });

        // Emit event for other services
        this.emit('essentialLoggingForced', override);

        return override;
    }

    /**
     * Suspend logging for a company (platform control)
     */
    async suspendLogging(tenantId, reason, adminUser) {
        const suspension = {
            tenantId,
            reason,
            adminUser,
            timestamp: new Date().toISOString(),
            suspendedAt: new Date().toISOString()
        };

        // Log the suspension
        platformLogger.adminAction('Company logging suspended', adminUser, {
            ...suspension,
            action: 'suspend_logging'
        });

        // Update the logging module configuration to disable all non-essential features
        await loggingModuleService.updateConfig(tenantId, {
            enabled: false,
            features: {
                auditLogging: true, // Keep essential
                securityLogging: true, // Keep essential
                performanceLogging: false,
                userActionLogging: false,
                frontendLogging: false,
                detailedErrorLogging: false
            },
            suspendedBy: adminUser,
            suspendedAt: new Date().toISOString(),
            suspensionReason: reason
        }, adminUser);

        this.emit('loggingSuspended', suspension);

        return suspension;
    }

    /**
     * Setup periodic cleanup of usage cache
     */
    setupUsageCleanup() {
        // Clean up usage cache every hour
        setInterval(() => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of data
            const cutoffString = cutoffDate.toISOString().split('T')[0];

            let cleanedCount = 0;
            for (const [key] of this.usageCache.entries()) {
                const [, dateString] = key.split(':');
                if (dateString < cutoffString) {
                    this.usageCache.delete(key);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                platformLogger.info('Cleaned up logging usage cache', {
                    entriesRemoved: cleanedCount,
                    cutoffDate: cutoffString
                });
            }
        }, 60 * 60 * 1000); // Every hour
    }

    /**
     * Get platform logging control summary
     */
    async getPlatformControlSummary() {
        const summary = {
            totalCompanies: 0,
            licensedCompanies: 0,
            unlicensedCompanies: 0,
            tierDistribution: {
                starter: 0,
                business: 0,
                enterprise: 0
            },
            totalDailyEvents: 0,
            platformMandatoryEvents: PLATFORM_MANDATORY_EVENTS.length,
            essentialFeatures: ESSENTIAL_LOGGING_FEATURES.length
        };

        // This would typically query all companies from the database
        // For now, we'll return the structure
        return summary;
    }
}

// Create singleton instance
const licenseControlledLoggingService = new LicenseControlledLoggingService();

export default licenseControlledLoggingService;
export {
    LicenseControlledLoggingService,
    LOGGING_LIMITS_BY_TIER,
    ESSENTIAL_LOGGING_FEATURES,
    PLATFORM_MANDATORY_EVENTS
};