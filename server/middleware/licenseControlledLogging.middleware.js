/**
 * License-Controlled Logging Middleware
 * 
 * Enforces platform control over company logging capabilities through license validation.
 * Ensures that all logging operations are subject to license restrictions and platform policies.
 */

import licenseControlledLoggingService from '../services/licenseControlledLogging.service.js';
import { MODULES } from '../platform/system/models/license.model.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Middleware to validate logging license before allowing log operations
 */
export const requireLoggingLicense = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (!tenantId) {
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for logging operations'
                });
            }

            // Check logging license
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
            
            if (!licenseCheck.valid) {
                // Log the license violation attempt
                platformLogger.licenseEvent('logging_license_violation', tenantId, {
                    error: licenseCheck.error,
                    reason: licenseCheck.reason,
                    requestPath: req.path,
                    requestMethod: req.method,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });

                return res.status(403).json({
                    error: 'LOGGING_LICENSE_REQUIRED',
                    message: 'Valid logging license required for this operation',
                    details: {
                        licenseError: licenseCheck.error,
                        reason: licenseCheck.reason
                    },
                    upgradeUrl: `/settings/license?module=${MODULES.LOGGING}`
                });
            }

            // Attach logging capabilities to request
            req.loggingCapabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
            
            // Log successful license validation
            platformLogger.adminAction('Logging license validated', 'system', {
                tenantId,
                tier: licenseCheck.tier,
                requestPath: req.path,
                timestamp: new Date().toISOString()
            });

            next();

        } catch (error) {
            platformLogger.error('Logging license validation error', {
                error: error.message,
                stack: error.stack,
                path: req.path
            });

            return res.status(500).json({
                error: 'LICENSE_VALIDATION_FAILED',
                message: 'An error occurred during logging license validation'
            });
        }
    };
};

/**
 * Middleware to check specific logging feature permissions
 */
export const requireLoggingFeature = (feature) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (!tenantId) {
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for feature validation'
                });
            }

            // Check feature permission
            const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(tenantId, feature);
            
            if (!featureCheck.allowed) {
                // Log the feature access attempt
                platformLogger.licenseEvent('logging_feature_access_denied', tenantId, {
                    feature,
                    reason: featureCheck.reason,
                    tier: featureCheck.tier,
                    requestPath: req.path,
                    timestamp: new Date().toISOString()
                });

                return res.status(403).json({
                    error: 'FEATURE_NOT_LICENSED',
                    message: `Feature '${feature}' is not included in your current license`,
                    feature,
                    reason: featureCheck.reason,
                    upgradeRequired: featureCheck.upgradeRequired,
                    upgradeUrl: featureCheck.upgradeUrl
                });
            }

            // Log successful feature access
            platformLogger.adminAction('Logging feature access granted', 'system', {
                tenantId,
                feature,
                tier: featureCheck.tier,
                requestPath: req.path,
                timestamp: new Date().toISOString()
            });

            next();

        } catch (error) {
            platformLogger.error('Logging feature validation error', {
                feature,
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'FEATURE_VALIDATION_FAILED',
                message: 'An error occurred during feature validation'
            });
        }
    };
};

/**
 * Middleware to enforce daily usage limits
 */
export const enforceUsageLimits = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (!tenantId) {
                return res.status(400).json({
                    error: 'TENANT_ID_REQUIRED',
                    message: 'Tenant ID is required for usage limit enforcement'
                });
            }

            // Get logging capabilities to check limits
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
            
            // Check daily usage
            const usageCheck = await licenseControlledLoggingService.checkDailyUsage(tenantId, capabilities.limits);
            
            if (!usageCheck.allowed) {
                // Log usage limit exceeded
                platformLogger.licenseEvent('logging_usage_limit_exceeded', tenantId, {
                    currentUsage: usageCheck.currentUsage,
                    limit: usageCheck.limit,
                    percentage: usageCheck.percentage,
                    requestPath: req.path,
                    timestamp: new Date().toISOString()
                });

                return res.status(429).json({
                    error: 'USAGE_LIMIT_EXCEEDED',
                    message: 'Daily logging limit exceeded',
                    currentUsage: usageCheck.currentUsage,
                    limit: usageCheck.limit,
                    percentage: usageCheck.percentage,
                    upgradeUrl: `/settings/license?upgrade=${capabilities.tier}`
                });
            }

            // Attach usage info to request
            req.loggingUsage = usageCheck;

            next();

        } catch (error) {
            platformLogger.error('Usage limit enforcement error', {
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'USAGE_LIMIT_CHECK_FAILED',
                message: 'An error occurred during usage limit check'
            });
        }
    };
};

/**
 * Middleware to log and track all logging operations for platform monitoring
 */
export const trackLoggingOperation = () => {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        // Store original end function
        const originalEnd = res.end;
        
        // Override end function to log completion
        res.end = function(chunk, encoding) {
            // Call original end function
            originalEnd.call(this, chunk, encoding);
            
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (tenantId) {
                const duration = Date.now() - startTime;
                
                // Log the operation to platform logger
                platformLogger.adminAction('Logging operation tracked', 'system', {
                    tenantId,
                    operation: `${req.method} ${req.path}`,
                    statusCode: res.statusCode,
                    duration,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    userId: req.user?.id,
                    timestamp: new Date().toISOString(),
                    success: res.statusCode < 400
                });

                // Record usage if operation was successful
                if (res.statusCode < 400) {
                    licenseControlledLoggingService.recordLogEvent(
                        tenantId, 
                        req.path.includes('log') ? 'log_operation' : 'api_call',
                        1
                    ).catch(error => {
                        platformLogger.error('Failed to record log event usage', {
                            tenantId,
                            error: error.message
                        });
                    });
                }
            }
        };
        
        next();
    };
};

/**
 * Middleware to enforce platform policies on log data
 */
export const enforcePlatformPolicies = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (tenantId && req.body) {
                // Enforce platform policies on the log data
                const policies = await licenseControlledLoggingService.enforcePlatformPolicies(tenantId, req.body);
                
                if (policies.blocked) {
                    platformLogger.platformSecurity('Log data blocked by platform policy', {
                        tenantId,
                        reason: policies.reason,
                        appliedPolicies: policies.applied,
                        originalData: req.body,
                        timestamp: new Date().toISOString()
                    });

                    return res.status(403).json({
                        error: 'PLATFORM_POLICY_VIOLATION',
                        message: 'Log data violates platform policies',
                        reason: policies.reason,
                        appliedPolicies: policies.applied
                    });
                }

                // Attach policy information to request
                req.platformPolicies = policies;
            }

            next();

        } catch (error) {
            platformLogger.error('Platform policy enforcement error', {
                error: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                error: 'POLICY_ENFORCEMENT_FAILED',
                message: 'An error occurred during platform policy enforcement'
            });
        }
    };
};

/**
 * Middleware to attach logging license info without blocking (for informational purposes)
 */
export const attachLoggingLicenseInfo = () => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId || 
                           req.tenant?.id || 
                           req.user?.tenantId ||
                           req.headers['x-tenant-id'];

            if (tenantId) {
                const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
                req.loggingLicenseInfo = {
                    licensed: capabilities.licensed,
                    tier: capabilities.tier,
                    features: capabilities.features,
                    limits: capabilities.limits
                };
            }

            next();

        } catch (error) {
            // Don't block on error, just log it
            platformLogger.error('Failed to attach logging license info', {
                error: error.message
            });
            next();
        }
    };
};

export default {
    requireLoggingLicense,
    requireLoggingFeature,
    enforceUsageLimits,
    trackLoggingOperation,
    enforcePlatformPolicies,
    attachLoggingLicenseInfo
};