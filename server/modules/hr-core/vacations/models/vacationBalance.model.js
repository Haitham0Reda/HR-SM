/**
 * VacationBalance Model (Sequelize)
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
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const VacationBalance = mainAppDb.define('VacationBalance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    employee: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: () => new Date().getFullYear()
    },
    // Annual vacation balance - stored as JSONB
    annual: {
        type: DataTypes.JSONB,
        defaultValue: {
            allocated: 0,
            used: 0,
            pending: 0,
            available: 0,
            carriedOver: 0
        }
    },
    // Casual leave balance - stored as JSONB
    casual: {
        type: DataTypes.JSONB,
        defaultValue: {
            allocated: 7,
            used: 0,
            pending: 0,
            available: 7
        }
    },
    // Sick leave balance - stored as JSONB
    sick: {
        type: DataTypes.JSONB,
        defaultValue: {
            allocated: 10,
            used: 0,
            pending: 0,
            available: 10
        }
    },
    // Eligibility tracking - stored as JSONB
    eligibility: {
        type: DataTypes.JSONB,
        defaultValue: {
            isEligible: false,
            eligibleFrom: null,
            probationEnds: null,
            tenure: 0
        }
    },
    // Flexible hours tracking - stored as JSONB
    flexibleHours: {
        type: DataTypes.JSONB,
        defaultValue: {
            allocated: 0,
            used: 0,
            pending: 0,
            available: 0
        }
    },
    // History of vacation usage - stored as JSONB array
    history: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    lastCalculated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_calculated'
    }
}, {
    tableName: 'vacation_balances',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee'] },
        { fields: ['tenant_id', 'employee', 'year'], unique: true }
    ]
});

/**
 * Define associations
 */
VacationBalance.associate = (models) => {
    VacationBalance.belongsTo(models.User, {
        foreignKey: 'employee',
        as: 'employeeDetails'
    });
};

/**
 * Instance method: Get total available days across all types
 */
VacationBalance.prototype.getTotalAvailable = function () {
    return (this.annual?.available || 0) + 
           (this.casual?.available || 0) + 
           (this.sick?.available || 0);
};

/**
 * Instance method: Get total used days
 */
VacationBalance.prototype.getTotalUsed = function () {
    return (this.annual?.used || 0) + 
           (this.casual?.used || 0) + 
           (this.sick?.used || 0);
};

/**
 * Instance method: Convert flexible hours to days (8 hours = 1 day)
 */
VacationBalance.prototype.getFlexibleHoursAvailableDays = function () {
    return (this.flexibleHours?.available || 0) / 8;
};

/**
 * Instance method: Convert flexible hours used to days
 */
VacationBalance.prototype.getFlexibleHoursUsedDays = function () {
    return (this.flexibleHours?.used || 0) / 8;
};

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
VacationBalance.calculateAnnualAllocation = function (tenureYears) {
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
VacationBalance.prototype.recalculate = async function () {
    try {
        const User = mainAppDb.models.User;
        const Leave = mainAppDb.models.Leave;

        // Fetch employee details to get hire date
        const employee = await User.findByPk(this.employee);
        if (!employee || !employee.employment?.hireDate) {
            return this; // Cannot calculate without hire date
        }

        // Calculate tenure from hire date to now
        const hireDate = new Date(employee.employment.hireDate);
        const now = new Date();
        const tenureMonths = (now - hireDate) / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        const tenureYears = tenureMonths / 12;

        // Update eligibility status (3-month minimum employment requirement)
        const eligibility = { ...this.eligibility };
        eligibility.tenure = Math.floor(tenureYears * 10) / 10; // Round to 1 decimal
        eligibility.isEligible = tenureYears >= 0.25; // Eligible after 3 months

        // Set eligibility date (3 months from hire date)
        if (tenureYears >= 0.25) {
            const eligibilityDate = new Date(hireDate);
            eligibilityDate.setMonth(eligibilityDate.getMonth() + 3);
            eligibility.eligibleFrom = eligibilityDate;
            eligibility.probationEnds = eligibilityDate;
        }
        this.eligibility = eligibility;

        // Calculate and set annual allocation based on current tenure
        const annualAllocation = VacationBalance.calculateAnnualAllocation(tenureYears);
        const annual = { ...this.annual };
        annual.allocated = annualAllocation;
        this.annual = annual;

        // Set casual leave allocation (always 7 days for eligible employees)
        const casual = { ...this.casual };
        casual.allocated = tenureYears >= 0.25 ? 7 : 0;
        this.casual = casual;

        // Set flexible hours allocation (8 hours = 1 day)
        const flexibleHours = { ...this.flexibleHours };
        flexibleHours.allocated = 8;
        this.flexibleHours = flexibleHours;

        // Fetch all leaves for this employee within the balance year
        const yearStart = new Date(this.year, 0, 1);              // January 1st
        const yearEnd = new Date(this.year, 11, 31, 23, 59, 59); // December 31st

        const leaves = await Leave.findAll({
            where: {
                employee: this.employee,
                startDate: {
                    [Op.gte]: yearStart,
                    [Op.lte]: yearEnd
                }
            }
        });

        // Reset all counters before recalculation
        annual.used = 0;
        annual.pending = 0;
        casual.used = 0;
        casual.pending = 0;
        const sick = { ...this.sick };
        sick.used = 0;
        sick.pending = 0;
        flexibleHours.used = 0;
        flexibleHours.pending = 0;

        // Aggregate leave days by type and status
        leaves.forEach(leave => {
            const duration = leave.duration || 0;

            // Add to 'used' if approved
            if (leave.status === 'approved') {
                if (leave.leaveType === 'annual') annual.used += duration;
                else if (leave.leaveType === 'casual') casual.used += duration;
                else if (leave.leaveType === 'sick') sick.used += duration;
            }
            // Add to 'pending' if awaiting approval
            else if (leave.status === 'pending') {
                if (leave.leaveType === 'annual') annual.pending += duration;
                else if (leave.leaveType === 'casual') casual.pending += duration;
                else if (leave.leaveType === 'sick') sick.pending += duration;
            }
        });

        // Calculate remaining available days for each leave type
        // Formula: available = allocated + carriedOver - used - pending
        annual.available = Math.max(0,
            annual.allocated + annual.carriedOver - annual.used - annual.pending
        );
        casual.available = Math.max(0,
            casual.allocated - casual.used - casual.pending
        );
        sick.available = Math.max(0,
            sick.allocated - sick.used - sick.pending
        );
        flexibleHours.available = Math.max(0,
            flexibleHours.allocated - flexibleHours.used - flexibleHours.pending
        );

        this.annual = annual;
        this.casual = casual;
        this.sick = sick;
        this.flexibleHours = flexibleHours;
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
VacationBalance.prototype.hasSufficientBalance = function (leaveType, duration) {
    const type = this[leaveType];
    if (!type) return false;
    return (type.available || 0) >= duration;
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
VacationBalance.prototype.reserveBalance = async function (leaveType, duration) {
    const type = { ...this[leaveType] };
    if (!type || (type.available || 0) < duration) {
        throw new Error(`Insufficient ${leaveType} leave balance`);
    }

    type.pending = (type.pending || 0) + duration;    // Add to pending
    type.available = (type.available || 0) - duration;  // Subtract from available
    this[leaveType] = type;
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
VacationBalance.prototype.releaseBalance = async function (leaveType, duration) {
    const type = { ...this[leaveType] };
    if (!type) return this;

    type.pending = Math.max(0, (type.pending || 0) - duration); // Remove from pending
    type.available = (type.available || 0) + duration;          // Return to available
    this[leaveType] = type;
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
VacationBalance.prototype.confirmUsage = async function (leaveType, duration) {
    const type = { ...this[leaveType] };
    if (!type) return this;

    type.pending = Math.max(0, (type.pending || 0) - duration); // Remove from pending
    type.used = (type.used || 0) + duration;                    // Add to used
    this[leaveType] = type;
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
VacationBalance.prototype.useVacation = async function (leaveType, duration, reason) {
    const type = { ...this[leaveType] };
    if (!type) return this;

    // Directly use available days (not pending days)
    type.used = (type.used || 0) + duration;                    // Add to used
    type.available = (type.available || 0) - duration;          // Remove from available
    this[leaveType] = type;

    // Add history tracking
    const history = [...(this.history || [])];
    history.push({
        type: leaveType,
        days: duration,
        action: 'used',
        date: new Date(),
        reason: reason
    });
    this.history = history;

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
VacationBalance.prototype.returnVacation = async function (leaveType, duration, reason) {
    const type = { ...this[leaveType] };
    if (!type) return this;

    type.used = Math.max(0, (type.used || 0) - duration);       // Remove from used
    type.available = (type.available || 0) + duration;          // Add to available
    this[leaveType] = type;

    // Add history tracking
    const history = [...(this.history || [])];
    history.push({
        type: leaveType,
        days: duration,
        action: 'returned',
        date: new Date(),
        reason: reason
    });
    this.history = history;

    return await this.save();
};

/**
 * Initialize vacation balance for a new employee or current year
 * Creates a new balance record and calculates initial values
 * 
 * @param {UUID} employeeId - Employee's user ID
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<VacationBalance>} Initialized balance
 * @throws {Error} If employee not found
 */
VacationBalance.initializeForEmployee = async function (employeeId, tenantId) {
    const User = mainAppDb.models.User;
    const employee = await User.findByPk(employeeId);

    if (!employee) {
        throw new Error('Employee not found');
    }

    const year = new Date().getFullYear();

    // Check if balance already exists for current year
    let balance = await this.findOne({ 
        where: { 
            employee: employeeId, 
            year,
            tenantId
        } 
    });

    if (!balance) {
        // Create new balance record
        balance = await this.create({
            employee: employeeId,
            tenantId,
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
 * @param {UUID} employeeId - Employee's user ID
 * @param {String} tenantId - Tenant ID
 * @param {Number} currentYear - Current year to carry over from
 * @returns {Promise<VacationBalance>} Next year's balance with carry-over applied
 */
VacationBalance.carryOverToNextYear = async function (employeeId, tenantId, currentYear) {
    const currentBalance = await this.findOne({
        where: {
            employee: employeeId,
            tenantId,
            year: currentYear
        }
    });

    if (!currentBalance) return null;

    const maxCarryOver = 5; // Policy: maximum 5 days can be carried over
    const unusedDays = Math.min(currentBalance.annual?.available || 0, maxCarryOver);

    const nextYear = currentYear + 1;
    let nextBalance = await this.findOne({
        where: {
            employee: employeeId,
            tenantId,
            year: nextYear
        }
    });

    // Create or update next year's balance with carried over days
    if (!nextBalance) {
        nextBalance = await this.create({
            employee: employeeId,
            tenantId,
            year: nextYear,
            annual: {
                allocated: 0,
                used: 0,
                pending: 0,
                available: 0,
                carriedOver: unusedDays
            }
        });
    } else {
        const annual = { ...nextBalance.annual };
        annual.carriedOver = unusedDays;
        nextBalance.annual = annual;
        await nextBalance.save();
    }

    return await nextBalance.recalculate();
};

export default VacationBalance;







