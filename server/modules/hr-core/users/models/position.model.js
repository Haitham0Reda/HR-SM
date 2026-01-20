// models/Position.js
import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
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
    arabicTitle: String,
    code: {
        type: String,
        sparse: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    jobDescription: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound indexes for tenant isolation and performance
positionSchema.index({ tenantId: 1, code: 1 }, { unique: true, sparse: true });
positionSchema.index({ tenantId: 1, title: 1 });
positionSchema.index({ tenantId: 1, department: 1 });
positionSchema.index({ tenantId: 1, isActive: 1 });

// Pre-save hook to auto-generate code
positionSchema.pre('validate', async function (next) {
    if (!this.code) {
        try {
            // Find all positions for this tenant and get the highest code number
            const positions = await this.constructor.find({ tenantId: this.tenantId }, { code: 1 })
                .sort({ code: -1 })
                .lean();

            let nextNumber = 1;
            const existingNumbers = new Set();

            // Extract all existing numbers
            for (const pos of positions) {
                if (pos.code) {
                    const match = pos.code.match(/\d+$/);
                    if (match) {
                        const num = parseInt(match[0]);
                        if (!isNaN(num)) {
                            existingNumbers.add(num);
                        }
                    }
                }
            }

            // Find the next available number
            while (existingNumbers.has(nextNumber)) {
                nextNumber++;
            }

            this.code = 'POS' + nextNumber.toString().padStart(3, '0');
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Add withTenant static method for tenant-aware queries
positionSchema.statics.withTenant = function (tenantId) {
    return this.find({ tenantId });
};

export default mongoose.model('Position', positionSchema);