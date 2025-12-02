/**
 * VacationBalance Model
 * 
 * Tracks employee vacation and leave balances for different leave types.
 * Automatically calculates allocations based on tenure and manages balance usage.
 * 
 * Features:
 * - Tenure-based allocation: 0-5 years (21 days), 5-10 years (28 days), 10+ years (30 days)
 * - 6-month probation period before eligibility
 * - Tracks allocated, used, pending, and available balances
 * - Supports carry-over of up to 5 annual days to next year
 * - Auto-recalculation based on approved/pending leaves
 */
import mongoose from 'mongoose';

const vacationBalanceSchema = new mongoose.Schema({
    // Reference to the employee (User)
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,  // One balance record per employee per year
        index: true
    },
    // Year for which this balance applies
    year: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    },
    // Annual vacation balance - based on tenure
    annual: {
        allocated: {        // Total days allocated for the year based on tenure
            type: Number,
            default: 0,
            min: 0
        },
        used: {             // Days already used (approved leaves)
            type: Number,
            default: 0,
            min: 0
        },
        pending: {          // Days reserved for pending leave requests
            type: Number,
            default: 0,
            min: 0
        },
        available: {        // Days available to request (allocated + carriedOver - used - pending)
            type: Number,
            default: 0,
            min: 0
        },
        carriedOver: {      // Days carried over from previous year (max 5)
            type: Number,
            default: 0,
            min: 0
        }
    },
    // Casual leave balance - for short-notice personal matters
    casual: {
        allocated: {        // Fixed allocation: 7 days per year
            type: Number,
            default: 7,
            min: 0
        },
        used: {             // Days already used
            type: Number,
            default: 0,
            min: 0
        },
        pending: {          // Days reserved for pending requests
            type: Number,
            default: 0,
            min: 0
        },
        available: {        // Days available to request
            type: Number,
            default: 7,
            min: 0
        }
    },
    // Sick leave balance - requires medical documentation if > 2 days
    sick: {
        allocated: {        // Fixed allocation: 10 days per year
            type: Number,
            default: 10,
            min: 0
        },
        used: {             // Days already used
            type: Number,
            default: 0,
            min: 0
        },
        pending: {          // Days reserved for pending requests
            type: Number,
            default: 0,
            min: 0
        },
        available: {        // Days available to request
            type: Number,
            default: 10,
            min: 0
        }
    },
    // Eligibility tracking based on hire date and tenure
    eligibility: {
        isEligible: {       // True if employee has completed 3 months from hire date
            type: Boolean,
            default: false
        },
        eligibleFrom: Date, // Date when employee becomes eligible (hire date + 3 months)
        probationEnds: Date,// Same as eligibleFrom - end of probation period
        tenure: {           // Current tenure in years (calculated from hire date)
            type: Number,
            default: 0
        }
    },
    // Flexible hours tracking - 8 hours equals 1 day
    flexibleHours: {
        allocated: {        // Total flexible hours per year (8 hours = 1 day)
            type: Number,
            default: 0,
            min: 0
        },
        used: {             // Flexible hours already used
            type: Number,
            default: 0,
            min: 0
        },
        pending: {          // Flexible hours reserved for pending requests
            type: Number,
            default: 0,
            min: 0
        },
        available: {        // Flexible hours available
            type: Number,
            default: 0,
            min: 0
        }
    },
    // History of vacation usage and returns
    history: [{
        type: {             // Type of leave (annual, casual, sick)
            type: String,
            required: true
        },
        days: {             // Number of days
            type: Number,
            required: true
        },
        action: {           // Action performed (used, returned, reserved, etc.)
            type: String,
            required: true
        },
        date: {             // Date of action
            type: Date,
            default: Date.now
        },
        reason: String      // Reason for the action
    }],
    // Timestamp of last balance recalculation
    lastCalculated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Virtual for total available days across all types
vacationBalanceSchema.virtual('totalAvailable').get(function () {
    return this.annual.available + this.casual.available + this.sick.available;
});

// Virtual for total used days
vacationBalanceSchema.virtual('totalUsed').get(function () {
    return this.annual.used + this.casual.used + this.sick.used;
});

// Virtual to convert flexible hours to days (8 hours = 1 day)
vacationBalanceSchema.virtual('flexibleHours.availableDays').get(function () {
    return this.flexibleHours.available / 8;
});

// Virtual to convert flexible hours used to days
vacationBalanceSchema.virtual('flexibleHours.usedDays').get(function () {
    return this.flexibleHours.used / 8;
});

/**
 * Calculate annual vacation allocation based on employee tenure
 * 
 * Allocation rules:
 * - 3-5 months: 0 days
 * - 6+ months: 8 days
 * - 1+ years: 14 days
 * - 10+ years: 23 days
 * 
 * @param {Number} tenureYears - Employee's tenure in years
 * @returns {Number} Number of annual vacation days allocated
 */
vacationBalanceSchema.statics.calculateAnnualAllocation = function (tenureYears) {
    if (tenureYears < 0.5) return 0;   // 3-5 months: 0 days
    if (tenureYears < 1) return 8;     // 6+ months: 8 days
    if (tenureYears < 10) return 14;   // 1+ years: 14 days
    return 23;                          // 10+ years: 23 days
};

/**
 * Recalculate vacation balance based on employee's hire date and leave records
 * 
 * This method:
 * 1. Calculates employee tenure from hire date
 * 2. Determines eligibility (6 months minimum)
 * 3. Allocates annual days based on tenure
 * 4. Aggregates all approved and pending leaves for the year
 * 5. Updates used, pending, and available balances
 * 
 * @returns {Promise<VacationBalance>} Updated balance document
 */
vacationBalanceSchema.methods.recalculate = async function () {
    try {
        const User = mongoose.model('User');
        const Leave = mongoose.model('Leave');

        // Fetch employee details to get hire date
        const employee = await User.findById(this.employee);
        if (!employee || !employee.employment?.hireDate) {
            return this; // Cannot calculate without hire date
        }

        // Calculate tenure from hire date to now
        const hireDate = new Date(employee.employment.hireDate);
        const now = new Date();
        const tenureMonths = (now - hireDate) / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        const tenureYears = tenureMonths / 12;

        // Update eligibility status (3-month minimum employment requirement)
        this.eligibility.tenure = Math.floor(tenureYears * 10) / 10; // Round to 1 decimal
        this.eligibility.isEligible = tenureYears >= 0.25; // Eligible after 3 months

        // Set eligibility date (3 months from hire date)
        if (tenureYears >= 0.25) {
            const eligibilityDate = new Date(hireDate);
            eligibilityDate.setMonth(eligibilityDate.getMonth() + 3);
            this.eligibility.eligibleFrom = eligibilityDate;
            this.eligibility.probationEnds = eligibilityDate;
        }

        // Calculate and set annual allocation based on current tenure
        const annualAllocation = this.constructor.calculateAnnualAllocation(tenureYears);
        this.annual.allocated = annualAllocation;

        // Set casual leave allocation (always 7 days for eligible employees)
        this.casual.allocated = tenureYears >= 0.25 ? 7 : 0;

        // Set flexible hours allocation (8 hours = 1 day)
        this.flexibleHours.allocated = 8;

        // Fetch all leaves for this employee within the balance year
        const yearStart = new Date(this.year, 0, 1);              // January 1st
        const yearEnd = new Date(this.year, 11, 31, 23, 59, 59); // December 31st

        const leaves = await Leave.find({
            employee: this.employee,
            startDate: { $gte: yearStart, $lte: yearEnd }
        });

        // Reset all counters before recalculation
        this.annual.used = 0;
        this.annual.pending = 0;
        this.casual.used = 0;
        this.casual.pending = 0;
        this.sick.used = 0;
        this.sick.pending = 0;
        this.flexibleHours.used = 0;
        this.flexibleHours.pending = 0;

        // Aggregate leave days by type and status
        leaves.forEach(leave => {
            const duration = leave.duration || 0;

            // Add to 'used' if approved
            if (leave.status === 'approved') {
                if (leave.leaveType === 'annual') this.annual.used += duration;
                else if (leave.leaveType === 'casual') this.casual.used += duration;
                else if (leave.leaveType === 'sick') this.sick.used += duration;
            }
            // Add to 'pending' if awaiting approval
            else if (leave.status === 'pending') {
                if (leave.leaveType === 'annual') this.annual.pending += duration;
                else if (leave.leaveType === 'casual') this.casual.pending += duration;
                else if (leave.leaveType === 'sick') this.sick.pending += duration;
            }
        });

        // Calculate remaining available days for each leave type
        // Formula: available = allocated + carriedOver - used - pending
        this.annual.available = Math.max(0,
            this.annual.allocated + this.annual.carriedOver - this.annual.used - this.annual.pending
        );
        this.casual.available = Math.max(0,
            this.casual.allocated - this.casual.used - this.casual.pending
        );
        this.sick.available = Math.max(0,
            this.sick.allocated - this.sick.used - this.sick.pending
        );
        this.flexibleHours.available = Math.max(0,
            this.flexibleHours.allocated - this.flexibleHours.used - this.flexibleHours.pending
        );

        this.lastCalculated = new Date();

        return await this.save();
    } catch (error) {

        throw error;
    }
};

/**
 * Check if employee has sufficient balance for a leave request
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days requested
 * @returns {Boolean} True if sufficient balance available
 */
vacationBalanceSchema.methods.hasSufficientBalance = function (leaveType, duration) {
    const type = this[leaveType];
    if (!type) return false;
    return type.available >= duration;
};

/**
 * Reserve balance when a leave request is submitted (status: pending)
 * Moves days from 'available' to 'pending'
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days to reserve
 * @returns {Promise<VacationBalance>} Updated balance
 * @throws {Error} If insufficient balance
 */
vacationBalanceSchema.methods.reserveBalance = async function (leaveType, duration) {
    const type = this[leaveType];
    if (!type || type.available < duration) {
        throw new Error(`Insufficient ${leaveType} leave balance`);
    }

    type.pending += duration;    // Add to pending
    type.available -= duration;  // Subtract from available
    return await this.save();
};

/**
 * Release reserved balance when a leave request is rejected or cancelled
 * Moves days from 'pending' back to 'available'
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days to release
 * @returns {Promise<VacationBalance>} Updated balance
 */
vacationBalanceSchema.methods.releaseBalance = async function (leaveType, duration) {
    const type = this[leaveType];
    if (!type) return this;

    type.pending = Math.max(0, type.pending - duration); // Remove from pending
    type.available += duration;                          // Return to available
    return await this.save();
};

/**
 * Confirm balance usage when a leave request is approved
 * Moves days from 'pending' to 'used'
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days to confirm
 * @returns {Promise<VacationBalance>} Updated balance
 */
vacationBalanceSchema.methods.confirmUsage = async function (leaveType, duration) {
    const type = this[leaveType];
    if (!type) return this;

    type.pending = Math.max(0, type.pending - duration); // Remove from pending
    type.used += duration;                                // Add to used
    return await this.save();
};

/**
 * Use vacation days (directly use available days, not pending days)
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days to use
 * @param {String} reason - Reason for using vacation
 * @returns {Promise<VacationBalance>} Updated balance
 */
vacationBalanceSchema.methods.useVacation = async function (leaveType, duration, reason) {
    const type = this[leaveType];
    if (!type) return this;

    // Directly use available days (not pending days)
    type.used += duration;                                // Add to used
    type.available -= duration;                           // Remove from available

    // Add history tracking
    if (!this.history) {
        this.history = [];
    }
    this.history.push({
        type: leaveType,
        days: duration,
        action: 'used',
        date: new Date(),
        reason: reason
    });

    return await this.save();
};

/**
 * Return vacation days (opposite of useVacation with history tracking)
 * 
 * @param {String} leaveType - Type of leave (annual, casual, sick)
 * @param {Number} duration - Number of days to return
 * @param {String} reason - Reason for returning vacation
 * @returns {Promise<VacationBalance>} Updated balance
 */
vacationBalanceSchema.methods.returnVacation = async function (leaveType, duration, reason) {
    const type = this[leaveType];
    if (!type) return this;

    type.used = Math.max(0, type.used - duration);        // Remove from used
    type.available += duration;                           // Add to available

    // Add history tracking
    if (!this.history) {
        this.history = [];
    }
    this.history.push({
        type: leaveType,
        days: duration,
        action: 'returned',
        date: new Date(),
        reason: reason
    });

    return await this.save();
};

/**
 * Initialize vacation balance for a new employee or current year
 * Creates a new balance record and calculates initial values
 * 
 * @param {ObjectId} employeeId - Employee's user ID
 * @returns {Promise<VacationBalance>} Initialized balance
 * @throws {Error} If employee not found
 */
vacationBalanceSchema.statics.initializeForEmployee = async function (employeeId) {
    const User = mongoose.model('User');
    const employee = await User.findById(employeeId);

    if (!employee) {
        throw new Error('Employee not found');
    }

    const year = new Date().getFullYear();

    // Check if balance already exists for current year
    let balance = await this.findOne({ employee: employeeId, year });

    if (!balance) {
        // Create new balance record
        balance = new this({
            employee: employeeId,
            year
        });
    }

    // Recalculate to populate all fields based on hire date and leaves
    return await balance.recalculate();
};

/**
 * Carry over unused annual vacation days to next year
 * Maximum 5 days can be carried over
 * 
 * @param {ObjectId} employeeId - Employee's user ID
 * @param {Number} currentYear - Current year to carry over from
 * @returns {Promise<VacationBalance>} Next year's balance with carry-over applied
 */
vacationBalanceSchema.statics.carryOverToNextYear = async function (employeeId, currentYear) {
    const currentBalance = await this.findOne({
        employee: employeeId,
        year: currentYear
    });

    if (!currentBalance) return null;

    const maxCarryOver = 5; // Policy: maximum 5 days can be carried over
    const unusedDays = Math.min(currentBalance.annual.available, maxCarryOver);

    const nextYear = currentYear + 1;
    let nextBalance = await this.findOne({
        employee: employeeId,
        year: nextYear
    });

    // Create or update next year's balance with carried over days
    if (!nextBalance) {
        nextBalance = new this({
            employee: employeeId,
            year: nextYear,
            annual: {
                carriedOver: unusedDays
            }
        });
    } else {
        nextBalance.annual.carriedOver = unusedDays;
    }

    return await nextBalance.recalculate();
};

// Compound indexes for query optimization
vacationBalanceSchema.index({ employee: 1, year: 1 }, { unique: true }); // Ensure one balance per employee per year

export default mongoose.model('VacationBalance', vacationBalanceSchema);
