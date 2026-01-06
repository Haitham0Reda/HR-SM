// models/Payroll.js
import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
    // Tenant ID for multi-tenancy
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    period: {
        type: String, // e.g., '2025-10' for October 2025
        required: true
    },
    deductions: [{
        type: {
            type: String,
            enum: ['tax', 'insurance', 'loan', 'absence', 'medical', 'transportation', 'mobile-bill', 'disciplinary-sanctions', 'other'],
            required: true
        },
        arabicName: { // Arabic name for the deduction type
            type: String
        },
        description: { type: String }, // Optional: details about the deduction
        amount: { type: Number, required: true },
    }],
    totalDeductions: {
        type: Number,
        required: true,
        default: 0
    },
    // Created by (finance manager who created this payroll)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for multi-tenant queries
payrollSchema.index({ tenantId: 1, employee: 1, period: 1 }, { unique: true });
payrollSchema.index({ tenantId: 1, period: 1 });
payrollSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Payroll', payrollSchema);