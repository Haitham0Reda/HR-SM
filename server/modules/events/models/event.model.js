// models/Event.js
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    location: String,
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'events'
});

// Compound indexes for tenant isolation and performance
eventSchema.index({ tenantId: 1, startDate: -1 });
eventSchema.index({ tenantId: 1, createdBy: 1 });
eventSchema.index({ tenantId: 1, isPublic: 1 });

// Add withTenant static method for tenant-aware queries
eventSchema.statics.withTenant = function (tenantId) {
    return this.find({ tenantId });
};

export default mongoose.model('Event', eventSchema);
