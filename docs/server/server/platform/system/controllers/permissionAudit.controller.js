/**
 * Permission Audit Controller
 * 
 * Manages permission audit logs and tracking
 */
import PermissionAudit from '../models/permissionAudit.model.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import SecurityAudit from '../models/securityAudit.model.js';

/**
 * Get all permission audits
 */
export const getAllPermissionAudits = async (req, res) => {
    try {
        const { action, page = 1, limit = 50 } = req.query;

        const query = {};
        if (action) query.action = action;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const audits = await PermissionAudit.find(query)
            .populate('user', 'username email role')
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments(query);

        res.json({
            success: true,
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get permission audit by ID
 */
export const getPermissionAuditById = async (req, res) => {
    try {
        const audit = await PermissionAudit.findById(req.params.id)
            .populate('user', 'username email role')
            .populate('modifiedBy', 'username email role');

        if (!audit) {
            return res.status(404).json({ success: false, error: 'Permission audit not found' });
        }

        res.json({
            success: true,
            audit
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get user's permission audit trail
 */
export const getUserPermissionAuditTrail = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Use direct query instead of non-existent method
        const audits = await PermissionAudit.find({ user: userId })
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments({ user: userId });

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get recent permission changes
 */
export const getRecentPermissionChanges = async (req, res) => {
    try {
        const { days = 30, page = 1, limit = 100 } = req.query;

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const audits = await PermissionAudit.find({ timestamp: { $gte: dateThreshold } })
            .populate('user', 'username email role')
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments({ timestamp: { $gte: dateThreshold } });

        res.json({
            success: true,
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get permission changes by action type
 */
export const getPermissionChangesByAction = async (req, res) => {
    try {
        const { action } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Validate action type
        const validActions = ['role-change', 'permission-added', 'permission-removed', 'permission-reset'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action type' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const audits = await PermissionAudit.find({ action })
            .populate('user', 'username email role')
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments({ action });

        res.json({
            success: true,
            action,
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get permission changes for a specific user
 */
export const getPermissionChangesByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const audits = await PermissionAudit.find({ user: userId })
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments({ user: userId });

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get permission changes made by a specific modifier
 */
export const getPermissionChangesByModifier = async (req, res) => {
    try {
        const { modifierId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Check if modifier exists
        const modifier = await User.findById(modifierId);
        if (!modifier) {
            return res.status(404).json({ success: false, error: 'Modifier not found' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const audits = await PermissionAudit.find({ modifiedBy: modifierId })
            .populate('user', 'username email role')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await PermissionAudit.countDocuments({ modifiedBy: modifierId });

        res.json({
            success: true,
            modifier: {
                id: modifier._id,
                username: modifier.username,
                email: modifier.email,
                role: modifier.role
            },
            audits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Export permission audit logs
 */
export const exportPermissionAuditLogs = async (req, res) => {
    try {
        const { action, startDate, endDate, format = 'json' } = req.query;

        const query = {};
        if (action) query.action = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const audits = await PermissionAudit.find(query)
            .populate('user', 'username email role')
            .populate('modifiedBy', 'username email role')
            .sort({ timestamp: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            let csv = 'ID,User,Modified By,Action,Reason,IP Address,Timestamp,Created At\n';
            audits.forEach(audit => {
                csv += `"${audit._id}","${audit.user?.username || 'Unknown'}","${audit.modifiedBy?.username || 'Unknown'}","${audit.action}","${audit.reason || ''}","${audit.ipAddress || ''}","${audit.timestamp}","${audit.createdAt}"\n`;
            });

            res.header('Content-Type', 'text/csv');
            res.attachment('permission-audits.csv');
            return res.send(csv);
        } else {
            // Default to JSON
            res.header('Content-Type', 'application/json');
            res.attachment('permission-audits.json');
            return res.json({ success: true, audits });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Cleanup old permission audits
 */
export const cleanupOldPermissionAudits = async (req, res) => {
    try {
        const { days = 90 } = req.body;

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

        const result = await PermissionAudit.deleteMany({
            timestamp: { $lt: dateThreshold }
        });

        // Log cleanup
        await SecurityAudit.create({
            eventType: 'permission-audit-cleanup',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                deletedCount: result.deletedCount,
                retentionDays: parseInt(days)
            },
            severity: 'info',
            success: true
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} old permission audit records`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};