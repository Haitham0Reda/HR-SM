/**
 * Security Middleware
 * 
 * Middleware for security checks and validations
 */
import SecuritySettings from '../models/securitySettings.model.js';
import SecurityAudit from '../models/securityAudit.model.js';

/**
 * Check if IP is whitelisted
 */
export const checkIPWhitelist = async (req, res, next) => {
    try {
        const settings = await SecuritySettings.getSettings();

        if (!settings.ipWhitelist.enabled) {
            return next();
        }

        const clientIP = req.ip || req.connection.remoteAddress;

        if (!settings.isIPWhitelisted(clientIP)) {
            // Log blocked IP
            await SecurityAudit.logEvent({
                eventType: 'ip-blocked',
                ipAddress: clientIP,
                userAgent: req.get('user-agent'),
                requestUrl: req.originalUrl,
                requestMethod: req.method,
                severity: 'critical',
                success: false,
                errorMessage: 'IP address not whitelisted'
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied. Your IP address is not authorized.'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking IP whitelist:', error);
        next();
    }
};

/**
 * Check if system is in development mode
 */
export const checkDevelopmentMode = async (req, res, next) => {
    try {
        const settings = await SecuritySettings.getSettings();

        if (!settings.developmentMode.enabled) {
            return next();
        }

        // Allow access for admin and allowed users
        if (req.user && (
            req.user.role === 'admin' ||
            settings.developmentMode.allowedUsers.some(id => id.toString() === req.user._id.toString())
        )) {
            return next();
        }

        // Log unauthorized access attempt
        if (req.user) {
            await SecurityAudit.logEvent({
                eventType: 'unauthorized-access',
                user: req.user._id,
                username: req.user.username,
                userEmail: req.user.email,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                requestUrl: req.originalUrl,
                requestMethod: req.method,
                details: {
                    reason: 'System in development mode'
                },
                severity: 'warning',
                success: false
            });
        }

        return res.status(503).json({
            success: false,
            message: settings.developmentMode.maintenanceMessage || 'System is currently under maintenance.'
        });
    } catch (error) {
        console.error('Error checking development mode:', error);
        next();
    }
};

/**
 * Check if account is locked
 */
export const checkAccountLocked = async (req, res, next) => {
    try {
        if (!req.user) return next();

        if (req.user.isAccountLocked()) {
            const lockoutUntil = req.user.accountLockout.lockoutUntil;

            await SecurityAudit.logAuth('unauthorized-access', req.user, req, {
                reason: 'Account locked',
                lockoutUntil
            });

            return res.status(403).json({
                success: false,
                message: `Account is locked. Please try again after ${lockoutUntil.toLocaleString()}`
            });
        }

        next();
    } catch (error) {
        console.error('Error checking account lock:', error);
        next();
    }
};

/**
 * Check password expiration
 */
export const checkPasswordExpiration = async (req, res, next) => {
    try {
        if (!req.user) return next();

        // Skip for password change endpoints
        if (req.originalUrl.includes('/change-password') || req.originalUrl.includes('/reset-password')) {
            return next();
        }

        if (req.user.isPasswordExpired()) {
            return res.status(403).json({
                success: false,
                message: 'Your password has expired. Please change your password.',
                passwordExpired: true
            });
        }

        // Check if password is expiring soon
        const settings = await SecuritySettings.getSettings();
        if (settings.passwordPolicy.expirationWarningDays > 0 && req.user.passwordExpiresAt) {
            const daysUntilExpiry = Math.ceil(
                (req.user.passwordExpiresAt - new Date()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry <= settings.passwordPolicy.expirationWarningDays && daysUntilExpiry > 0) {
                res.setHeader('X-Password-Expiry-Warning', daysUntilExpiry);
            }
        }

        next();
    } catch (error) {
        console.error('Error checking password expiration:', error);
        next();
    }
};

/**
 * Require 2FA if enforced
 */
export const require2FA = async (req, res, next) => {
    try {
        if (!req.user) return next();

        const settings = await SecuritySettings.getSettings();

        if (!settings.twoFactorAuth.enforced) {
            return next();
        }

        // Skip for 2FA setup endpoints
        if (req.originalUrl.includes('/2fa/setup') || req.originalUrl.includes('/2fa/enable')) {
            return next();
        }

        if (!req.user.twoFactorAuth.enabled) {
            return res.status(403).json({
                success: false,
                message: 'Two-factor authentication is required. Please enable 2FA.',
                require2FA: true
            });
        }

        next();
    } catch (error) {
        console.error('Error checking 2FA requirement:', error);
        next();
    }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = async (req, res, next) => {
    try {
        if (!req.body.password) return next();

        const settings = await SecuritySettings.getSettings();
        const validation = settings.validatePassword(req.body.password);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet security requirements',
                errors: validation.errors
            });
        }

        next();
    } catch (error) {
        console.error('Error validating password:', error);
        next();
    }
};

/**
 * Check password history
 */
export const checkPasswordHistory = async (req, res, next) => {
    try {
        if (!req.body.password || !req.user) return next();

        const settings = await SecuritySettings.getSettings();

        if (settings.passwordPolicy.historyCount === 0) {
            return next();
        }

        const isInHistory = await req.user.isPasswordInHistory(
            req.body.password,
            settings.passwordPolicy.historyCount
        );

        if (isInHistory) {
            return res.status(400).json({
                success: false,
                message: `Password cannot be the same as your last ${settings.passwordPolicy.historyCount} passwords`
            });
        }

        next();
    } catch (error) {
        console.error('Error checking password history:', error);
        next();
    }
};

/**
 * Log security event
 */
export const logSecurityEvent = (eventType, severity = 'info') => {
    return async (req, res, next) => {
        try {
            await SecurityAudit.logAuth(eventType, req.user, req, {
                requestBody: req.body
            });

            next();
        } catch (error) {
            console.error('Error logging security event:', error);
            next();
        }
    };
};

/**
 * Validate security settings update
 */
export const validateSecuritySettings = (req, res, next) => {
    const updates = req.body;

    // Handle case where twoFactorAuth is sent as boolean instead of object
    if (typeof updates.twoFactorAuth === 'boolean') {
        updates.twoFactorAuth = {
            enabled: updates.twoFactorAuth,
            enforced: updates.twoFactorAuth // Default to same value
        };
    }

    // Validate 2FA settings
    if (updates.twoFactorAuth) {
        if (updates.twoFactorAuth.backupCodesCount !== undefined) {
            const count = parseInt(updates.twoFactorAuth.backupCodesCount);
            if (isNaN(count) || count < 5 || count > 20) {
                return res.status(400).json({
                    success: false,
                    message: 'Backup codes count must be between 5 and 20'
                });
            }
        }
    }

    // Validate password policy
    if (updates.passwordPolicy) {
        const policy = updates.passwordPolicy;

        if (policy.minLength !== undefined) {
            const len = parseInt(policy.minLength);
            if (isNaN(len) || len < 6 || len > 128) {
                return res.status(400).json({
                    success: false,
                    message: 'Password minimum length must be between 6 and 128'
                });
            }
        }

        if (policy.expirationDays !== undefined) {
            const days = parseInt(policy.expirationDays);
            if (isNaN(days) || days < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Password expiration days must be 0 or positive number'
                });
            }
        }

        if (policy.historyCount !== undefined) {
            const count = parseInt(policy.historyCount);
            if (isNaN(count) || count < 0 || count > 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Password history count must be between 0 and 24'
                });
            }
        }
    }

    // Validate account lockout
    if (updates.accountLockout) {
        const lockout = updates.accountLockout;

        if (lockout.maxAttempts !== undefined) {
            const attempts = parseInt(lockout.maxAttempts);
            if (isNaN(attempts) || attempts < 3 || attempts > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Max login attempts must be between 3 and 10'
                });
            }
        }

        if (lockout.lockoutDuration !== undefined) {
            const duration = parseInt(lockout.lockoutDuration);
            if (isNaN(duration) || duration < 5 || duration > 1440) {
                return res.status(400).json({
                    success: false,
                    message: 'Lockout duration must be between 5 and 1440 minutes'
                });
            }
        }
    }

    // Validate session management
    if (updates.sessionManagement) {
        const session = updates.sessionManagement;

        if (session.maxConcurrentSessions !== undefined) {
            const max = parseInt(session.maxConcurrentSessions);
            if (isNaN(max) || max < 1 || max > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Max concurrent sessions must be between 1 and 10'
                });
            }
        }

        if (session.sessionTimeout !== undefined) {
            const timeout = parseInt(session.sessionTimeout);
            if (isNaN(timeout) || timeout < 15 || timeout > 1440) {
                return res.status(400).json({
                    success: false,
                    message: 'Session timeout must be between 15 and 1440 minutes'
                });
            }
        }
    }

    next();
};

/**
 * Validate IP address format
 */
export const validateIPAddress = (req, res, next) => {
    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({
            success: false,
            message: 'IP address is required'
        });
    }

    // Basic IP validation (IPv4)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (!ipRegex.test(ip)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid IP address format'
        });
    }

    // Check if each octet is valid
    const octets = ip.split('.');
    for (const octet of octets) {
        const num = parseInt(octet);
        if (num < 0 || num > 255) {
            return res.status(400).json({
                success: false,
                message: 'Invalid IP address. Each octet must be between 0 and 255'
            });
        }
    }

    next();
};

export default {
    checkIPWhitelist,
    checkDevelopmentMode,
    checkAccountLocked,
    checkPasswordExpiration,
    require2FA,
    validatePasswordStrength,
    checkPasswordHistory,
    logSecurityEvent,
    validateSecuritySettings,
    validateIPAddress
};
