import mongoose from 'mongoose';

const resignedEmployeeSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position',
        required: true
    },
    resignationDate: {
        type: Date,
        required: true,
        index: true
    },
    lastWorkingDay: {
        type: Date,
        required: true
    },
    resignationReason: {
        type: String,
        enum: [
            'better-opportunity',
            'personal-reasons',
            'relocation',
            'career-change',
            'health-issues',
            'family-reasons',
            'retirement',
            'termination',
            'other'
        ],
        required: true,
        index: true
    },
    resignationLetter: {
        filename: String,
        url: String,
        uploadedAt: Date
    },
    exitInterview: {
        conducted: {
            type: Boolean,
            default: false
        },
        conductedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        conductedDate: Date,
        feedback: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    handover: {
        completed: {
            type: Boolean,
            default: false
        },
        handoverTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        handoverDate: Date,
        notes: String
    },
    clearance: {
        hr: {
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearedDate: Date,
            notes: String
        },
        finance: {
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearedDate: Date,
            notes: String
        },
        it: {
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearedDate: Date,
            notes: String
        }
    },
    finalSettlement: {
        amount: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'USD'
        },
        paidDate: Date,
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    rehireEligible: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
resignedEmployeeSchema.index({ tenantId: 1, resignationDate: -1 });
resignedEmployeeSchema.index({ tenantId: 1, department: 1 });
resignedEmployeeSchema.index({ tenantId: 1, resignationReason: 1 });

const ResignedEmployee = mongoose.model('ResignedEmployee', resignedEmployeeSchema);

export default ResignedEmployee;
