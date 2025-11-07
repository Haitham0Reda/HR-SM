/**
 * Security Audit Model
 * 
 * Comprehensive audit logging for security events
 */
import mongoose from 'mongoose';

const securityAuditSchema = new mongoose.Schema({
    // Event Information
    eventType: {
        type: String,
        enum: [
            // Authentication Events
            'login-success',
            'login-failed',
            'logout',
            '2fa-enabled',
            '2fa-disabled',
            '2fa-verified',
            '2fa-failed',

            // Password Events
            'password-changed',
            'password-reset-requested',
            'password-reset-completed',
            'password-expired',

            // Account Events
            'account-locked',
            'account-unlocked',
            'account-created',
            'account-deleted',
            'account-updated',

            // Permission Events
            'role-changed',
            'permission-added',
            'permission-removed',
            'permission-audit-cleanup',

            // Security Events
            'ip-blocked',
            'unauthorized-access',
            'session-terminated',
            'suspicious-activity',

            // Data Events
            'data-accessed',
            'data-modified',
            'data-deleted',
            'data-exported',

            // System Events
            'settings-changed',
            'backup-created',
            'maintenance-mode-enabled',
            'maintenance-mode-disabled'
        ],
        required: true,
        index: true
    },

    // User Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    username: String,
    userEmail: String,
    userRole: String,

    // Request Information
    ipAddress: {
        type: String,
        index: true
    },
    userAgent: String,
    requestUrl: String,
    requestMethod: String,

    // Event Details
    details: {
        type: mongoose.Schema.Types.Mixed
    },

    // Security Level
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
        index: true
    },

    // Status
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: String,

    // Metadata
    timestamp: {
        type: Date,
        default: Date.now
    },
    sessionId: String
}, {
    timestamps: true
});

// Indexes for efficient querying
securityAuditSchema.index({ user: 1, timestamp: -1 });
securityAuditSchema.index({ eventType: 1, timestamp: -1 });
securityAuditSchema.index({ ipAddress: 1, timestamp: -1 });
securityAuditSchema.index({ severity: 1, timestamp: -1 });

// TTL index for automatic cleanup based on retention policy
securityAuditSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 year default

// Static method to log security event
securityAuditSchema.statics.logEvent = async function (eventData) {
    return await this.create(eventData);
};

// Static method to log authentication event
securityAuditSchema.statics.logAuth = async function (eventType, user, req, details = {}) {
    return await this.logEvent({
        eventType,
        user: user?._id,
        username: user?.username,
        userEmail: user?.email,
        userRole: user?.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        details,
        severity: eventType.includes('failed') || eventType.includes('blocked') ? 'warning' : 'info',
        success: !eventType.includes('failed')
    });
};

// Static method to get user activity
securityAuditSchema.statics.getUserActivity = function (userId, options = {}) {
    const { limit = 100, skip = 0, eventType } = options;

    const query = { user: userId };
    if (eventType) query.eventType = eventType;

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get suspicious activities
securityAuditSchema.statics.getSuspiciousActivities = function (days = 7) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return this.find({
        timestamp: { $gte: dateThreshold },
        $or: [
            { severity: 'critical' },
            { eventType: { $in: ['login-failed', 'unauthorized-access', 'ip-blocked', 'suspicious-activity'] } },
            { success: false }
        ]
    })
        .sort({ timestamp: -1 })
        .limit(500);
};

// Static method to get failed login attempts
securityAuditSchema.statics.getFailedLogins = function (userId, minutes = 30) {
    const dateThreshold = new Date();
    dateThreshold.setMinutes(dateThreshold.getMinutes() - minutes);

    return this.countDocuments({
        user: userId,
        eventType: 'login-failed',
        timestamp: { $gte: dateThreshold }
    });
};

// Static method to get security statistics
securityAuditSchema.statics.getSecurityStats = async function (days = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const stats = await this.aggregate([
        {
            $match: {
                timestamp: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                failures: {
                    $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    const severityStats = await this.aggregate([
        {
            $match: {
                timestamp: { $gte: dateThreshold }
            }
        },
        {
            $group: {
                _id: '$severity',
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        eventStats: stats,
        severityStats,
        period: `Last ${days} days`
    };
};

export default mongoose.model('SecurityAudit', securityAuditSchema);
