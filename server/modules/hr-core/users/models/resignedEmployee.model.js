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
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

resignedEmployeeSchema.add({
    resignationType: {
        type: String,
        enum: ['resignation-letter', 'termination'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'archived'],
        default: 'pending'
    },
    penalties: [
        {
            description: String,
            amount: {
                type: Number,
                default: 0
            },
            currency: {
                type: String,
                default: 'USD'
            },
            addedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedDate: Date,
    letterGenerated: {
        type: Boolean,
        default: false
    },
    letterGeneratedDate: Date,
    letterGeneratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    letterContent: String
});

resignedEmployeeSchema.virtual('totalPenaltyAmount').get(function () {
    if (!this.penalties || this.penalties.length === 0) return 0;
    return this.penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
});

resignedEmployeeSchema.virtual('totalPenalties').get(function () {
    if (!this.penalties || this.penalties.length === 0) return 0;
    return this.penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
});

resignedEmployeeSchema.virtual('canModify').get(function () {
    return !this.isLocked;
});

resignedEmployeeSchema.virtual('reason').get(function () {
    const map = {
        'better-opportunity': 'Better opportunity',
        'personal-reasons': 'Personal reasons',
        'relocation': 'Relocation',
        'career-change': 'Career change',
        'health-issues': 'Health issues',
        'family-reasons': 'Family reasons',
        'retirement': 'Retirement',
        'termination': 'Termination',
        'other': 'Other'
    };
    return map[this.resignationReason] || this.resignationReason;
});

resignedEmployeeSchema.set('toJSON', { virtuals: true });
resignedEmployeeSchema.set('toObject', { virtuals: true });

resignedEmployeeSchema.methods.addPenalty = async function (penalty, addedById) {
    if (this.isLocked) throw new Error('Cannot modify penalties after 24 hours');
    const entry = {
        description: penalty.description,
        amount: penalty.amount,
        currency: penalty.currency || 'USD',
        addedBy: addedById
    };
    if (!this.penalties) this.penalties = [];
    this.penalties.push(entry);
    return await this.save();
};

resignedEmployeeSchema.methods.removePenalty = async function (penaltyId) {
    if (this.isLocked) throw new Error('Cannot modify penalties after 24 hours');
    this.penalties = (this.penalties || []).filter(p => p._id.toString() !== penaltyId.toString());
    return await this.save();
};

resignedEmployeeSchema.methods.updateResignationType = async function (newType) {
    this.resignationType = newType;
    return await this.save();
};

resignedEmployeeSchema.methods.lock = async function () {
    this.isLocked = true;
    this.lockedDate = new Date();
    return await this.save();
};

resignedEmployeeSchema.methods.generateLetter = async function (byUserId) {
    let content = 'TO WHOM IT MAY CONCERN\n\n';
    if (this.resignationType === 'resignation-letter') {
        content += 'This is a resignation letter.\n';
    } else if (this.resignationType === 'termination') {
        content += 'This employee has been terminated.\n';
    }
    const total = this.penalties && this.penalties.length ? this.penalties.reduce((s, p) => s + (p.amount || 0), 0) : 0;
    if (total > 0) {
        const currency = this.penalties[0].currency || 'USD';
        content += `Pending Penalties: ${total} ${currency}`;
    }
    this.letterGenerated = true;
    this.letterGeneratedDate = new Date();
    this.letterGeneratedBy = byUserId;
    this.letterContent = content;
    return await this.save();
};

resignedEmployeeSchema.statics.findAllResigned = function (filter = {}) {
    return this.find(filter).sort({ resignationDate: -1 });
};

resignedEmployeeSchema.statics.toArabicNumerals = function (num) {
    const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
    const str = String(num);
    let out = '';
    for (const ch of str) {
        out += map[ch] ?? ch;
    }
    return out;
};

resignedEmployeeSchema.pre('save', function (next) {
    if (!this.isLocked) {
        const base = this.createdAt || new Date();
        const diffMs = Date.now() - base.getTime();
        const hours = diffMs / 3600000;
        if (hours >= 24) {
            this.isLocked = true;
            this.lockedDate = new Date();
        }
    }
    next();
});

// Indexes for better query performance
resignedEmployeeSchema.index({ tenantId: 1, resignationDate: -1 });
resignedEmployeeSchema.index({ tenantId: 1, department: 1 });
resignedEmployeeSchema.index({ tenantId: 1, resignationReason: 1 });

const ResignedEmployee = mongoose.model('ResignedEmployee', resignedEmployeeSchema);

export default ResignedEmployee;
