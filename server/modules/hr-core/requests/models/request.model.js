// models/Request.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['permission', 'overtime', 'sick-leave', 'mission', 'day-swap'],
        required: true
    },
    details: {
        // Flexible object for request-specific fields
        type: Object,
        default: {}
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: Date,
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: String
}, {
    timestamps: true
});

// Add isActive for soft delete
requestSchema.add({ isActive: { type: Boolean, default: true } });

export default mongoose.model('Request', requestSchema);
