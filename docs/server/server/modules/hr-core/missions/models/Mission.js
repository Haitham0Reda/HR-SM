// Mission Model - Moved to HR-Core module
import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    notes: String
}, {
    timestamps: true
});

// Compound indexes for tenant isolation
missionSchema.index({ tenantId: 1, employee: 1, status: 1 });
missionSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Mission', missionSchema);
