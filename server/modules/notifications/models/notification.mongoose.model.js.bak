// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['request', 'announcement', 'payroll', 'attendance', 'permission', 'leave', 'request-control', 'custom', 'info', 'warning', 'error', 'success', 'task', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    dismissed: {
        type: Boolean,
        default: false
    },
    dismissedAt: {
        type: Date
    },
    snoozed: {
        type: Boolean,
        default: false
    },
    snoozeUntil: {
        type: Date
    },
    sent: {
        type: Boolean,
        default: true
    },
    sentAt: {
        type: Date
    },
    scheduledFor: {
        type: Date
    },
    isSystem: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    relatedModel: {
        type: String, // Name of the related model (e.g., 'Request', 'Event', 'Payroll', 'Survey', 'DocumentTemplate', 'Announcement', 'Attendance', 'Leave', 'Position', 'Department', 'User', etc.)
        required: false
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    }
}, {
    timestamps: true
});

// Indexes for performance
notificationSchema.index({ tenantId: 1, recipient: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, type: 1 });
notificationSchema.index({ tenantId: 1, priority: 1 });
notificationSchema.index({ tenantId: 1, relatedModel: 1, relatedId: 1 });
notificationSchema.index({ tenantId: 1, scheduledFor: 1, sent: 1 });

export default mongoose.model('Notification', notificationSchema);
