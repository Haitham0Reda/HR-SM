// models/Announcement.js
import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    arabicTitle: String,
    content: {
        type: String,
        required: true
    },
    arabicContent: String,
    type: {
        type: String,
        enum: ['general', 'urgent', 'policy', 'event', 'maintenance']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    targetAudience: {
        type: String,
        enum: ['all', 'department', 'specific'],
        default: 'all'
    },
    departments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }],
    employees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    publishDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachments: [String]
}, {
    timestamps: true
});

export default mongoose.model('Announcement', announcementSchema);