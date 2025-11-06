/**
 * Permission Audit Model
 * 
 * Tracks all permission changes for security and compliance
 */
import mongoose from 'mongoose';

const permissionAuditSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['role-change', 'permission-added', 'permission-removed', 'permission-reset'],
        required: true
    },
    changes: {
        previousRole: String,
        newRole: String,
        addedPermissions: [String],
        removedPermissions: [String],
        permissionsAdded: [String],  // New individual permissions granted
        permissionsRemoved: [String]  // New individual permissions revoked
    },
    reason: {
        type: String,
        maxlength: 500
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
permissionAuditSchema.index({ user: 1, timestamp: -1 });
permissionAuditSchema.index({ modifiedBy: 1, timestamp: -1 });
permissionAuditSchema.index({ action: 1, timestamp: -1 });

// Static method to log permission change
permissionAuditSchema.statics.logChange = async function (data) {
    return await this.create(data);
};

// Static method to get user's audit trail
permissionAuditSchema.statics.getUserAuditTrail = function (userId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({ user: userId })
        .populate('modifiedBy', 'username email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get recent permission changes
permissionAuditSchema.statics.getRecentChanges = function (days = 30, options = {}) {
    const { limit = 100 } = options;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return this.find({ timestamp: { $gte: dateThreshold } })
        .populate('user', 'username email role')
        .populate('modifiedBy', 'username email')
        .sort({ timestamp: -1 })
        .limit(limit);
};

export default mongoose.model('PermissionAudit', permissionAuditSchema);