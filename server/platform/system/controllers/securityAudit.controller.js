/**
 * Security Audit Controller
 * 
 * Manages security audit logs and monitoring
 */
import SecurityAudit from '../models/securityAudit.model.js';
import User from '../models/user.model.js';

/**
 * Get all security audit logs
 */
export const getAllAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            eventType,
            severity,
            userId,
            startDate,
            endDate,
            ipAddress
        } = req.query;

        const query = {};

        if (eventType) query.eventType = eventType;
        if (severity) query.severity = severity;
        if (userId) query.user = userId;
        if (ipAddress) query.ipAddress = ipAddress;

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await SecurityAudit.find(query)
            .populate('user', 'username email employeeId personalInfo role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await SecurityAudit.countDocuments(query);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get audit log by ID
 */
export const getAuditLogById = async (req, res) => {
    try {
        const log = await SecurityAudit.findById(req.params.id)
            .populate('user', 'username email profile role');

        if (!log) {
            return res.status(404).json({ error: 'Audit log not found' });
        }

        res.json({
            success: true,
            log
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get user activity logs
 */
export const getUserActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 100, skip = 0, eventType } = req.query;

        const logs = await SecurityAudit.getUserActivity(userId, {
            limit: parseInt(limit),
            skip: parseInt(skip),
            eventType
        });

        const total = await SecurityAudit.countDocuments({
            user: userId,
            ...(eventType && { eventType })
        });

        res.json({
            success: true,
            logs,
            total
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get suspicious activities
 */
export const getSuspiciousActivities = async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const activities = await SecurityAudit.getSuspiciousActivities(parseInt(days));

        res.json({
            success: true,
            activities,
            count: activities.length,
            period: `Last ${days} days`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get failed login attempts
 */
export const getFailedLogins = async (req, res) => {
    try {
        const { minutes = 30 } = req.query;

        const logs = await SecurityAudit.find({
            eventType: 'login-failed',
            timestamp: {
                $gte: new Date(Date.now() - parseInt(minutes) * 60 * 1000)
            }
        })
            .populate('user', 'username email profile')
            .sort({ timestamp: -1 });

        res.json({
            success: true,
            failedLogins: logs,
            count: logs.length,
            period: `Last ${minutes} minutes`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get security statistics
 */
export const getSecurityStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const stats = await SecurityAudit.getSecurityStats(parseInt(days));

        res.json({
            success: true,
            stats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get login history
 */
export const getLoginHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, page = 1 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await SecurityAudit.find({
            user: userId,
            eventType: { $in: ['login-success', 'login-failed', 'logout'] }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await SecurityAudit.countDocuments({
            user: userId,
            eventType: { $in: ['login-success', 'login-failed', 'logout'] }
        });

        res.json({
            success: true,
            loginHistory: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get 2FA activity
 */
export const get2FAActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await SecurityAudit.find({
            user: userId,
            eventType: {
                $in: ['2fa-enabled', '2fa-disabled', '2fa-verified', '2fa-failed']
            }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            twoFactorActivity: logs,
            count: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get password activity
 */
export const getPasswordActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await SecurityAudit.find({
            user: userId,
            eventType: {
                $in: ['password-changed', 'password-reset-requested', 'password-reset-completed', 'password-expired']
            }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            passwordActivity: logs,
            count: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get account events
 */
export const getAccountEvents = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await SecurityAudit.find({
            user: userId,
            eventType: {
                $in: ['account-locked', 'account-unlocked', 'account-created', 'account-updated', 'account-deleted']
            }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            accountEvents: logs,
            count: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get permission changes
 */
export const getPermissionChanges = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await SecurityAudit.find({
            user: userId,
            eventType: {
                $in: ['role-changed', 'permission-added', 'permission-removed']
            }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            permissionChanges: logs,
            count: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get data access logs
 */
export const getDataAccessLogs = async (req, res) => {
    try {
        const { limit = 100, page = 1, eventType } = req.query;

        const query = {
            eventType: eventType || {
                $in: ['data-accessed', 'data-modified', 'data-deleted', 'data-exported']
            }
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await SecurityAudit.find(query)
            .populate('user', 'username email employeeId personalInfo')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await SecurityAudit.countDocuments(query);

        res.json({
            success: true,
            dataAccessLogs: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get system events
 */
export const getSystemEvents = async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;

        const query = {
            eventType: {
                $in: ['settings-changed', 'backup-created', 'maintenance-mode-enabled', 'maintenance-mode-disabled']
            }
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await SecurityAudit.find(query)
            .populate('user', 'username email profile')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await SecurityAudit.countDocuments(query);

        res.json({
            success: true,
            systemEvents: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get IP activity
 */
export const getIPActivity = async (req, res) => {
    try {
        const { ipAddress } = req.params;
        const { limit = 100, page = 1 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await SecurityAudit.find({ ipAddress })
            .populate('user', 'username email profile')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await SecurityAudit.countDocuments({ ipAddress });

        res.json({
            success: true,
            ipActivity: logs,
            ipAddress,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Export audit logs (compliance reports)
 */
export const exportAuditLogs = async (req, res) => {
    try {
        const { startDate, endDate, eventType, format = 'json' } = req.query;

        const query = {};

        if (eventType) query.eventType = eventType;

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await SecurityAudit.find(query)
            .populate('user', 'username email profile role')
            .sort({ timestamp: -1 })
            .limit(10000); // Max 10k records per export

        // Log export action
        await SecurityAudit.logEvent({
            eventType: 'data-exported',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                exportType: 'Audit Logs',
                recordCount: logs.length,
                filters: { startDate, endDate, eventType }
            },
            severity: 'warning',
            success: true
        });

        if (format === 'csv') {
            // Convert to CSV format
            const csv = convertToCSV(logs);
            res.header('Content-Type', 'text/csv');
            res.attachment(`audit-logs-${Date.now()}.csv`);
            return res.send(csv);
        }

        res.json({
            success: true,
            logs,
            count: logs.length,
            exportDate: new Date()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Helper: Convert logs to CSV
 */
function convertToCSV(logs) {
    const headers = ['Timestamp', 'Event Type', 'User', 'Email', 'Role', 'IP Address', 'Severity', 'Success', 'Details'];
    const rows = logs.map(log => [
        log.timestamp,
        log.eventType,
        log.username || 'N/A',
        log.userEmail || 'N/A',
        log.userRole || 'N/A',
        log.ipAddress || 'N/A',
        log.severity,
        log.success ? 'Yes' : 'No',
        JSON.stringify(log.details || {})
    ]);

    return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
}

/**
 * Delete old audit logs (cleanup)
 */
export const cleanupOldLogs = async (req, res) => {
    try {
        const { days = 365 } = req.body;

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

        const result = await SecurityAudit.deleteMany({
            timestamp: { $lt: dateThreshold }
        });

        // Log cleanup action
        await SecurityAudit.logEvent({
            eventType: 'data-deleted',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                action: 'Audit Log Cleanup',
                deletedCount: result.deletedCount,
                olderThan: `${days} days`
            },
            severity: 'warning',
            success: true
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} old audit logs`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
