/**
 * Mixed Vacation Model
 * 
 * Manages vacation policies that combine official holidays with personal leave days
 */
import mongoose from 'mongoose';

const mixedVacationSchema = new mongoose.Schema({
    // Policy Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: String,

    // Date Range
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },

    // Total Days
    totalDays: {
        type: Number,
        required: true,
        min: 1
    },

    // Official Holidays (automatically detected from Holiday model)
    officialHolidays: [{
        date: Date,
        name: String,
        dayOfWeek: String
    }],
    officialHolidayCount: {
        type: Number,
        default: 0
    },

    // Personal Days Required
    personalDaysRequired: {
        type: Number,
        required: true,
        min: 0
    },

    // Deduction Strategy
    deductionStrategy: {
        type: String,
        enum: ['annual-first', 'casual-first', 'proportional', 'auto'],
        default: 'auto' // Auto: annual first, fallback to casual
    },

    // location/Department Filter
    applicableTo: {
        departments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        }],
        allEmployees: {
            type: Boolean,
            default: false
        }
    },

    // Employee Applications
    applications: [{
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'applied'],
            default: 'pending'
        },

        // Deduction Breakdown
        deduction: {
            annualDays: {
                type: Number,
                default: 0
            },
            casualDays: {
                type: Number,
                default: 0
            },
            totalDeducted: {
                type: Number,
                default: 0
            }
        },

        // Balance Before
        balanceBefore: {
            annual: Number,
            casual: Number
        },

        // Balance After
        balanceAfter: {
            annual: Number,
            casual: Number
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        notes: String
    }],

    // Policy Status
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled'],
        default: 'draft'
    },

    // Auto-apply
    autoApply: {
        enabled: {
            type: Boolean,
            default: false
        },
        appliedAt: Date,
        appliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appliedCount: {
            type: Number,
            default: 0
        }
    },

    // Statistics
    stats: {
        totalApplicants: {
            type: Number,
            default: 0
        },
        approvedCount: {
            type: Number,
            default: 0
        },
        rejectedCount: {
            type: Number,
            default: 0
        },
        totalAnnualDeducted: {
            type: Number,
            default: 0
        },
        totalCasualDeducted: {
            type: Number,
            default: 0
        }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
mixedVacationSchema.index({ startDate: 1, endDate: 1 });
mixedVacationSchema.index({ status: 1 });
mixedVacationSchema.index({ 'applications.employee': 1 });

// Virtual for duration in days
mixedVacationSchema.virtual('durationDays').get(function () {
    const diffTime = this.endDate - this.startDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Method to calculate personal days required
mixedVacationSchema.methods.calculatePersonalDays = function () {
    this.personalDaysRequired = this.totalDays - this.officialHolidayCount;
    return this.personalDaysRequired;
};

// Method to detect official holidays in date range
mixedVacationSchema.methods.detectOfficialHolidays = async function (locationId) {
    const Holiday = mongoose.model('Holiday');

    const holidaySettings = await Holiday.getOrCreateForlocation(locationId);

    const holidays = holidaySettings.officialHolidays.filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate >= this.startDate && holidayDate <= this.endDate;
    });

    this.officialHolidays = holidays.map(h => ({
        date: h.date,
        name: h.name,
        dayOfWeek: h.dayOfWeek
    }));

    this.officialHolidayCount = holidays.length;
    this.calculatePersonalDays();

    return this;
};

// Method to calculate deduction for employee
mixedVacationSchema.methods.calculateDeduction = async function (employeeId) {
    const VacationBalance = mongoose.model('VacationBalance');

    const balance = await VacationBalance.findOne({ employee: employeeId });

    if (!balance) {
        throw new Error('Employee vacation balance not found');
    }

    const personalDays = this.personalDaysRequired;
    let annualDeduct = 0;
    let casualDeduct = 0;

    switch (this.deductionStrategy) {
        case 'annual-first':
        case 'auto':
            // Try to deduct from annual first
            annualDeduct = Math.min(personalDays, balance.annual.available);
            casualDeduct = personalDays - annualDeduct;
            break;

        case 'casual-first':
            // Try to deduct from casual first
            casualDeduct = Math.min(personalDays, balance.casual.available);
            annualDeduct = personalDays - casualDeduct;
            break;

        case 'proportional':
            // Distribute proportionally
            const totalAvailable = balance.annual.available + balance.casual.available;
            if (totalAvailable >= personalDays) {
                const annualRatio = balance.annual.available / totalAvailable;
                annualDeduct = Math.floor(personalDays * annualRatio);
                casualDeduct = personalDays - annualDeduct;
            } else {
                annualDeduct = balance.annual.available;
                casualDeduct = balance.casual.available;
            }
            break;
    }

    // Check if sufficient balance
    const totalDeduct = annualDeduct + casualDeduct;
    const totalAvailable = balance.annual.available + balance.casual.available;

    if (totalDeduct > totalAvailable) {
        throw new Error(`Insufficient leave balance. Required: ${personalDays} days, Available: ${totalAvailable} days`);
    }

    return {
        annualDays: annualDeduct,
        casualDays: casualDeduct,
        totalDeducted: totalDeduct,
        balanceBefore: {
            annual: balance.annual.available,
            casual: balance.casual.available
        },
        balanceAfter: {
            annual: balance.annual.available - annualDeduct,
            casual: balance.casual.available - casualDeduct
        },
        sufficient: totalDeduct <= totalAvailable
    };
};

// Method to test policy on employee
mixedVacationSchema.methods.testOnEmployee = async function (employeeId) {
    try {
        const deduction = await this.calculateDeduction(employeeId);

        return {
            success: true,
            employee: employeeId,
            policy: {
                name: this.name,
                totalDays: this.totalDays,
                officialHolidays: this.officialHolidayCount,
                personalDaysRequired: this.personalDaysRequired
            },
            deduction,
            canApply: deduction.sufficient
        };
    } catch (error) {
        return {
            success: false,
            employee: employeeId,
            error: error.message
        };
    }
};

// Method to apply to employee
mixedVacationSchema.methods.applyToEmployee = async function (employeeId, approvedBy = null) {
    const VacationBalance = mongoose.model('VacationBalance');

    // Check if already applied
    const existing = this.applications.find(
        app => app.employee.toString() === employeeId.toString()
    );

    if (existing) {
        throw new Error('Policy already applied to this employee');
    }

    // Calculate deduction
    const deduction = await this.calculateDeduction(employeeId);

    if (!deduction.sufficient) {
        throw new Error('Insufficient leave balance');
    }

    // Deduct from balance
    const balance = await VacationBalance.findOne({ employee: employeeId });

    balance.annual.used += deduction.annualDays;
    // Only subtract from pending if there are pending days
    if (balance.annual.pending >= deduction.annualDays) {
        balance.annual.pending -= deduction.annualDays;
    }
    balance.casual.used += deduction.casualDays;
    // Only subtract from pending if there are pending days
    if (balance.casual.pending >= deduction.casualDays) {
        balance.casual.pending -= deduction.casualDays;
    }

    await balance.save();

    // Add application
    this.applications.push({
        employee: employeeId,
        status: approvedBy ? 'approved' : 'applied',
        deduction: {
            annualDays: deduction.annualDays,
            casualDays: deduction.casualDays,
            totalDeducted: deduction.totalDeducted
        },
        balanceBefore: deduction.balanceBefore,
        balanceAfter: deduction.balanceAfter,
        approvedBy,
        approvedAt: approvedBy ? new Date() : null
    });

    // Update statistics
    this.stats.totalApplicants += 1;
    if (approvedBy) {
        this.stats.approvedCount += 1;
    }
    this.stats.totalAnnualDeducted += deduction.annualDays;
    this.stats.totalCasualDeducted += deduction.casualDays;

    await this.save();

    return this;
};

// Method to apply to all eligible employees
mixedVacationSchema.methods.applyToAll = async function (approvedBy) {
    const User = mongoose.model('User');

    let query = { isActive: true };

    // Filter by location/department if specified
    if (!this.applicableTo.allEmployees) {
        const filters = [];

        if (this.applicableTo.departments.length > 0) {
            filters.push({ department: { $in: this.applicableTo.departments } });
        }

        if (filters.length > 0) {
            query.$or = filters;
        }
    }

    const employees = await User.find(query).select('_id');

    const results = {
        total: employees.length,
        success: 0,
        failed: 0,
        errors: []
    };

    for (const employee of employees) {
        try {
            await this.applyToEmployee(employee._id, approvedBy);
            results.success += 1;
        } catch (error) {
            results.failed += 1;
            results.errors.push({
                employee: employee._id,
                error: error.message
            });
        }
    }

    // Update auto-apply info
    this.autoApply.appliedAt = new Date();
    this.autoApply.appliedBy = approvedBy;
    this.autoApply.appliedCount = results.success;

    await this.save();

    return results;
};

// Static method to find active policies
mixedVacationSchema.statics.findActivePolicies = async function () {

    const now = new Date();

    const query = {
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    };

    try {
        const result = await this.find(query).populate('createdBy', 'username email');

        return result;
    } catch (err) {

        throw err;
    }
};

// Static method to find upcoming policies
mixedVacationSchema.statics.findUpcomingPolicies = async function (days = 30) {

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const query = {
        status: 'active',
        startDate: { $gte: now, $lte: future }
    };

    try {
        const result = await this.find(query).populate('createdBy', 'username email');

        return result;
    } catch (err) {

        throw err;
    }
};

export default mongoose.model('MixedVacation', mixedVacationSchema);
