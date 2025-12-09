// Vacation Model - Moved to HR-Core module
import mongoose from 'mongoose';

const vacationSchema = new mongoose.Schema({
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
    vacationType: {
        type: String,
        enum: ['annual', 'sick', 'casual', 'unpaid', 'other'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    days: {
        type: Number,
        required: true
    },
    reason: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    notes: String
}, {
    timestamps: true
});

// Compound indexes for tenant isolation
vacationSchema.index({ tenantId: 1, employee: 1, status: 1 });
vacationSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Vacation', vacationSchema);
