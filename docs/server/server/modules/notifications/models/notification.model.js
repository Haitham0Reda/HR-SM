// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['request', 'announcement', 'payroll', 'attendance', 'permission', 'leave', 'request-control', 'custom'],
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
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
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

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ relatedModel: 1, relatedId: 1 });

export default mongoose.model('Notification', notificationSchema);
