/**
 * Security Settings Controller
 * 
 * Manages system-wide security configuration
 */
import SecuritySettings from '../models/securitySettings.model.js';
import SecurityAudit from '../models/securityAudit.model.js';

/**
 * Get current security settings
 */
export const getSecuritySettings = async (req, res) => {
    try {
        const settings = await SecuritySettings.getSettings();

        res.json({
            success: true,
            settings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update security settings
 */
export const updateSecuritySettings = async (req, res) => {
    try {
        const updates = req.body;
        const settings = await SecuritySettings.updateSettings(updates, req.user._id);

        // Log security settings change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestUrl: req.originalUrl,
            requestMethod: req.method,
            details: {
                settingsChanged: Object.keys(updates)
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Security settings updated successfully',
            settings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update 2FA settings
 */
export const update2FASettings = async (req, res) => {
    try {
        const { enabled, enforced, backupCodesCount } = req.body;

        const settings = await SecuritySettings.getSettings();

        if (enabled !== undefined) settings.twoFactorAuth.enabled = enabled;
        if (enforced !== undefined) settings.twoFactorAuth.enforced = enforced;
        if (backupCodesCount !== undefined) settings.twoFactorAuth.backupCodesCount = backupCodesCount;

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: '2FA Settings',
                changes: { enabled, enforced, backupCodesCount }
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: '2FA settings updated successfully',
            twoFactorAuth: settings.twoFactorAuth
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update password policy
 */
export const updatePasswordPolicy = async (req, res) => {
    try {
        const policy = req.body;

        const settings = await SecuritySettings.getSettings();
        Object.assign(settings.passwordPolicy, policy);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'Password Policy',
                changes: policy
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Password policy updated successfully',
            passwordPolicy: settings.passwordPolicy
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update account lockout settings
 */
export const updateLockoutSettings = async (req, res) => {
    try {
        const lockout = req.body;

        const settings = await SecuritySettings.getSettings();
        Object.assign(settings.accountLockout, lockout);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'Account Lockout',
                changes: lockout
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Account lockout settings updated successfully',
            accountLockout: settings.accountLockout
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Add IP to whitelist
 */
export const addIPToWhitelist = async (req, res) => {
    try {
        const { ip, description } = req.body;

        if (!ip) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        const settings = await SecuritySettings.getSettings();

        // Check if IP already exists
        const exists = settings.ipWhitelist.allowedIPs.some(entry => entry.ip === ip);
        if (exists) {
            return res.status(400).json({ error: 'IP address already whitelisted' });
        }

        settings.ipWhitelist.allowedIPs.push({
            ip,
            description: description || '',
            addedBy: req.user._id,
            addedDate: new Date()
        });

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'IP Whitelist',
                action: 'Added IP',
                ip,
                description
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'IP added to whitelist successfully',
            ipWhitelist: settings.ipWhitelist
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Remove IP from whitelist
 */
export const removeIPFromWhitelist = async (req, res) => {
    try {
        const { ipId } = req.params;

        const settings = await SecuritySettings.getSettings();

        // Find the index of the IP entry to remove
        const ipIndex = settings.ipWhitelist.allowedIPs.findIndex(entry => entry._id.toString() === ipId);
        if (ipIndex === -1) {
            return res.status(404).json({ error: 'IP not found in whitelist' });
        }

        const removedIP = settings.ipWhitelist.allowedIPs[ipIndex].ip;
        // Remove the IP entry from the array
        settings.ipWhitelist.allowedIPs.splice(ipIndex, 1);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'IP Whitelist',
                action: 'Removed IP',
                ip: removedIP
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'IP removed from whitelist successfully',
            ipWhitelist: settings.ipWhitelist
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Toggle IP whitelist
 */
export const toggleIPWhitelist = async (req, res) => {
    try {
        const { enabled } = req.body;

        const settings = await SecuritySettings.getSettings();
        settings.ipWhitelist.enabled = enabled;

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'IP Whitelist',
                action: enabled ? 'Enabled' : 'Disabled'
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: `IP whitelist ${enabled ? 'enabled' : 'disabled'} successfully`,
            ipWhitelist: settings.ipWhitelist
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update session management settings
 */
export const updateSessionSettings = async (req, res) => {
    try {
        const session = req.body;

        const settings = await SecuritySettings.getSettings();
        Object.assign(settings.sessionManagement, session);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'Session Management',
                changes: session
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Session settings updated successfully',
            sessionManagement: settings.sessionManagement
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Enable development mode
 */
export const enableDevelopmentMode = async (req, res) => {
    try {
        const { allowedUsers, maintenanceMessage } = req.body;

        const settings = await SecuritySettings.getSettings();

        settings.developmentMode.enabled = true;
        settings.developmentMode.enabledDate = new Date();
        settings.developmentMode.enabledBy = req.user._id;

        if (allowedUsers) settings.developmentMode.allowedUsers = allowedUsers;
        if (maintenanceMessage) settings.developmentMode.maintenanceMessage = maintenanceMessage;

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'maintenance-mode-enabled',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                allowedUsersCount: allowedUsers?.length || 0,
                message: maintenanceMessage
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Development mode enabled successfully',
            developmentMode: settings.developmentMode
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Disable development mode
 */
export const disableDevelopmentMode = async (req, res) => {
    try {
        const settings = await SecuritySettings.getSettings();

        settings.developmentMode.enabled = false;
        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'maintenance-mode-disabled',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Development mode disabled successfully',
            developmentMode: settings.developmentMode
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update audit settings
 */
export const updateAuditSettings = async (req, res) => {
    try {
        const audit = req.body;

        const settings = await SecuritySettings.getSettings();
        Object.assign(settings.auditSettings, audit);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        // Log change
        await SecurityAudit.logEvent({
            eventType: 'settings-changed',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                section: 'Audit Settings',
                changes: audit
            },
            severity: 'critical',
            success: true
        });

        res.json({
            success: true,
            message: 'Audit settings updated successfully',
            auditSettings: settings.auditSettings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Test password against current policy
 */
export const testPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const settings = await SecuritySettings.getSettings();
        const validation = settings.validatePassword(password);

        res.json({
            success: true,
            validation
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
