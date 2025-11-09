/**
 * Resigned Employee Model
 * 
 * Manages employees who have left the organization
 */
import mongoose from 'mongoose';

const resignedEmployeeSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    // Resignation Details
    resignationType: {
        type: String,
        enum: ['resignation-letter', 'termination'],
        required: true
    },
    resignationDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    lastWorkingDay: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        maxlength: 500
    },

    // Letter Information
    letterGenerated: {
        type: Boolean,
        default: false
    },
    letterGeneratedDate: Date,
    letterGeneratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    letterContent: {
        type: String
    },

    // Arabic Disclaimer
    arabicDisclaimerGenerated: {
        type: Boolean,
        default: false
    },
    arabicDisclaimerDate: Date,

    // Penalties
    penalties: [{
        description: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'EGP'
        },
        addedDate: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String
    }],

    totalPenalties: {
        type: Number,
        default: 0
    },

    // Lock Status
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedDate: Date,

    // Processing Status
    status: {
        type: String,
        enum: ['pending', 'processed', 'archived'],
        default: 'pending'
    },

    // HR Notes
    hrNotes: {
        type: String,
        maxlength: 1000
    },

    // Metadata
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedDate: Date
}, {
    timestamps: true
});

// Indexes
resignedEmployeeSchema.index({ resignationDate: -1 });
resignedEmployeeSchema.index({ status: 1 });
resignedEmployeeSchema.index({ isLocked: 1 });

// Virtual for total penalty amount
resignedEmployeeSchema.virtual('totalPenaltyAmount').get(function () {
    return this.penalties.reduce((sum, penalty) => sum + penalty.amount, 0);
});

// Virtual to check if can be modified
resignedEmployeeSchema.virtual('canModify').get(function () {
    if (this.isLocked) return false;

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    return this.createdAt > oneDayAgo;
});

// Method to add penalty
resignedEmployeeSchema.methods.addPenalty = function (penaltyData, addedBy) {
    if (this.isLocked) {
        throw new Error('Cannot modify penalties after 24 hours');
    }

    this.penalties.push({
        ...penaltyData,
        addedBy,
        addedDate: new Date()
    });

    this.totalPenalties = this.penalties.reduce((sum, p) => sum + p.amount, 0);
    return this.save();
};

// Method to remove penalty
resignedEmployeeSchema.methods.removePenalty = function (penaltyId) {
    if (this.isLocked) {
        throw new Error('Cannot modify penalties after 24 hours');
    }

    this.penalties = this.penalties.filter(p => p._id.toString() !== penaltyId.toString());
    this.totalPenalties = this.penalties.reduce((sum, p) => sum + p.amount, 0);
    return this.save();
};

// Method to update resignation type
resignedEmployeeSchema.methods.updateResignationType = function (type) {
    if (this.isLocked) {
        throw new Error('Cannot modify resignation type after 24 hours');
    }

    this.resignationType = type;
    return this.save();
};

// Method to lock record
resignedEmployeeSchema.methods.lock = function () {
    this.isLocked = true;
    this.lockedDate = new Date();
    return this.save();
};

// Method to generate letter
resignedEmployeeSchema.methods.generateLetter = async function (generatedBy) {
    // Fetch the employee directly instead of using populate
    const User = mongoose.model('User');
    const employee = await User.findById(this.employee).select('profile employeeId department position');
    
    const letterContent = this.resignationType === 'resignation-letter'
        ? await this.generateResignationLetter(employee)
        : await this.generateTerminationLetter(employee);

    this.letterContent = letterContent;
    this.letterGenerated = true;
    this.letterGeneratedDate = new Date();
    this.letterGeneratedBy = generatedBy;

    return this.save();
};

// Generate resignation letter
resignedEmployeeSchema.methods.generateResignationLetter = function (employee) {
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
TO WHOM IT MAY CONCERN

Date: ${date}

This is to certify that ${employee.profile.firstName} ${employee.profile.lastName}, 
Employee ID: ${employee.employeeId}, was employed at our organization.

Employment Period: ${new Date(employee.employment.hireDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(this.lastWorkingDay).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

Position: ${employee.position ? 'As per records' : 'Employee'}
Department: ${employee.department ? 'As per records' : 'N/A'}

The employee submitted their resignation letter on ${new Date(this.resignationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

${this.penalties.length > 0 ? `
Pending Penalties: ${this.totalPenalties} EGP
Details:
${this.penalties.map((p, i) => `${i + 1}. ${p.description}: ${p.amount} ${p.currency}`).join('\n')}` : ''}

This letter is issued upon the employee's request for official purposes.

Sincerely,
        Human Resources Department
        `;
};

// Generate termination letter
resignedEmployeeSchema.methods.generateTerminationLetter = function (employee) {
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
TO WHOM IT MAY CONCERN

Date: ${date}

This is to certify that ${employee.profile.firstName} ${employee.profile.lastName},
        Employee ID: ${employee.employeeId}, was employed at our organization.

Employment Period: ${new Date(employee.employment.hireDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(this.lastWorkingDay).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

Position: ${employee.position ? 'As per records' : 'Employee'}
Department: ${employee.department ? 'As per records' : 'N/A'}

The employment was terminated as of ${new Date(this.resignationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

        ${this.penalties.length > 0 ? `
Pending Penalties: ${this.totalPenalties} EGP
Details:
${this.penalties.map((p, i) => `${i + 1}. ${p.description}: ${p.amount} ${p.currency}`).join('\n')}` : ''}

This letter is issued for official purposes.

                Sincerely,
            Human Resources Department
`;
};

// Pre-save hook to auto-lock after 24 hours
resignedEmployeeSchema.pre('save', function (next) {
    // Auto-calculate total penalties
    if (this.penalties && this.penalties.length > 0) {
        this.totalPenalties = this.penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
    } else {
        this.totalPenalties = 0;
    }
    
    if (!this.isLocked) {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        if (this.createdAt && this.createdAt < oneDayAgo) {
            this.isLocked = true;
            this.lockedDate = new Date();
        }
    }
    next();
});

// Static method to find all resigned employees
resignedEmployeeSchema.statics.findAllResigned = function (options = {}) {
    const { status, limit = 50, skip = 0 } = options;

    const query = status ? { status } : {};

    return this.find(query)
        .populate('employee', 'profile employeeId department position school')
        .populate('processedBy', 'username email')
        .sort({ resignationDate: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to convert number to Arabic numerals
resignedEmployeeSchema.statics.toArabicNumerals = function (num) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).split('').map(d => arabicNumerals[parseInt(d)] || d).join('');
};

export default mongoose.model('ResignedEmployee', resignedEmployeeSchema);
