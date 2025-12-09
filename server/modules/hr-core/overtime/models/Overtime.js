// Overtime Model - Moved to HR-Core module
import mongoose from 'mongoose';

const overtimeSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true
    },
    hours: {
        type: Number,
        required: true,
        min: 0
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'paid'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'processing'],
        default: 'unpaid'
    },
    paidAt: Date,
    notes: String
}, {
    timestamps: true
});

// Compound indexes for tenant isolation
overtimeSchema.index({ tenantId: 1, employee: 1, status: 1 });
overtimeSchema.index({ tenantId: 1, date: 1 });
overtimeSchema.index({ tenantId: 1, paymentStatus: 1 });

export default mongoose.model('Overtime', overtimeSchema);
