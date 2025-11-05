/**
 * Report Configuration Model
 * 
 * Manages reporting settings including HR month configuration and date range utilities.
 * HR Month typically runs from day 21 of current month to day 20 of next month,
 * aligning with payroll cycles.
 * 
 * Features:
 * - Configurable HR month start day per campus/organization
 * - Date range calculation utilities
 * - Common date range presets (HR Month, Current Month, Previous Month)
 * - Custom range validation
 * - Campus-specific configurations
 */
import mongoose from 'mongoose';

const reportConfigSchema = new mongoose.Schema({
    // Organization/Campus reference
    organization: {
        type: String,
        default: 'default',
        index: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    // HR Month Configuration
    hrMonth: {
        // Day of month when HR month starts (default: 21)
        startDay: {
            type: Number,
            min: 1,
            max: 28,  // Max 28 to handle February
            default: 21,
            required: true
        },
        // Day of month when HR month ends (typically startDay - 1)
        endDay: {
            type: Number,
            min: 1,
            max: 31,
            default: 20,
            required: true
        },
        // Whether to use HR month as default in reports
        isDefault: {
            type: Boolean,
            default: true
        },
        // Description/label for HR month
        label: {
            type: String,
            default: 'HR Month'
        }
    },
    // Payroll cycle configuration (related to HR month)
    payrollCycle: {
        type: {
            type: String,
            enum: ['monthly', 'bi-weekly', 'weekly', 'custom'],
            default: 'monthly'
        },
        // For bi-weekly or weekly cycles
        cycleStartDate: Date,
        // Custom cycle length in days
        customCycleDays: Number
    },
    // Working days configuration
    workingDays: {
        // Days of week that are working days (0 = Sunday, 6 = Saturday)
        daysOfWeek: {
            type: [Number],
            default: [0, 1, 2, 3, 4]  // Sunday through Thursday (default for some regions)
        },
        // Alternative: Monday to Friday [1, 2, 3, 4, 5]
        weekendDays: {
            type: [Number],
            default: [5, 6]  // Friday and Saturday
        }
    },
    // Official holidays (for accurate working day calculations)
    holidays: [{
        name: String,
        date: Date,
        isRecurring: {
            type: Boolean,
            default: false
        },
        // For recurring holidays (same date every year)
        month: Number,  // 1-12
        day: Number     // 1-31
    }],
    // Report settings
    reportSettings: {
        // Default date range type for new reports
        defaultRangeType: {
            type: String,
            enum: ['hr-month', 'current-month', 'previous-month', 'custom'],
            default: 'hr-month'
        },
        // Time zone for report generation
        timezone: {
            type: String,
            default: 'UTC'
        },
        // Include weekends in reports by default
        includeWeekends: {
            type: Boolean,
            default: true
        },
        // Include holidays in reports by default
        includeHolidays: {
            type: Boolean,
            default: true
        }
    },
    // Active status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual to get current HR month range
reportConfigSchema.virtual('currentHRMonth').get(function () {
    return this.calculateHRMonth();
});

// Virtual to get previous HR month range
reportConfigSchema.virtual('previousHRMonth').get(function () {
    return this.calculateHRMonth(-1);
});

/**
 * Calculate HR month date range
 * 
 * @param {Number} offset - Month offset (0 = current, -1 = previous, 1 = next)
 * @returns {Object} Object with startDate and endDate
 */
reportConfigSchema.methods.calculateHRMonth = function (offset = 0) {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let startMonth, startYear, endMonth, endYear;

    // Determine which HR month we're in
    if (currentDay >= this.hrMonth.startDay) {
        // We're in the HR month that started this calendar month
        startMonth = currentMonth;
        startYear = currentYear;
    } else {
        // We're in the HR month that started last calendar month
        startMonth = currentMonth - 1;
        startYear = currentYear;
        if (startMonth < 0) {
            startMonth = 11;
            startYear -= 1;
        }
    }

    // Apply offset
    startMonth += offset;
    while (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
    }
    while (startMonth > 11) {
        startMonth -= 12;
        startYear += 1;
    }

    // Calculate end month (next month)
    endMonth = startMonth + 1;
    endYear = startYear;
    if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
    }

    // Create start and end dates
    const startDate = new Date(startYear, startMonth, this.hrMonth.startDay, 0, 0, 0, 0);
    const endDate = new Date(endYear, endMonth, this.hrMonth.endDay, 23, 59, 59, 999);

    return {
        startDate,
        endDate,
        label: `${this.hrMonth.label} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
};

/**
 * Calculate current calendar month range
 * 
 * @returns {Object} Object with startDate and endDate
 */
reportConfigSchema.methods.calculateCurrentMonth = function () {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month

    return {
        startDate,
        endDate,
        label: `Current Month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
};

/**
 * Calculate previous calendar month range
 * 
 * @returns {Object} Object with startDate and endDate
 */
reportConfigSchema.methods.calculatePreviousMonth = function () {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const prevMonth = month - 1;
    const prevYear = prevMonth < 0 ? year - 1 : year;
    const adjustedMonth = prevMonth < 0 ? 11 : prevMonth;

    const startDate = new Date(prevYear, adjustedMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(prevYear, adjustedMonth + 1, 0, 23, 59, 59, 999);

    return {
        startDate,
        endDate,
        label: `Previous Month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
};

/**
 * Get date range based on range type
 * 
 * @param {String} rangeType - Type of range ('hr-month', 'current-month', 'previous-month', 'custom')
 * @param {Date} customStart - Custom start date (for custom range)
 * @param {Date} customEnd - Custom end date (for custom range)
 * @returns {Object} Object with startDate and endDate
 */
reportConfigSchema.methods.getDateRange = function (rangeType, customStart = null, customEnd = null) {
    switch (rangeType) {
        case 'hr-month':
            return this.calculateHRMonth();

        case 'current-month':
            return this.calculateCurrentMonth();

        case 'previous-month':
            return this.calculatePreviousMonth();

        case 'custom':
            if (!customStart || !customEnd) {
                throw new Error('Custom range requires both start and end dates');
            }
            if (new Date(customStart) > new Date(customEnd)) {
                throw new Error('Start date must be before end date');
            }
            return {
                startDate: new Date(customStart),
                endDate: new Date(customEnd),
                label: `Custom Range (${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()})`
            };

        default:
            // Default to HR month
            return this.calculateHRMonth();
    }
};

/**
 * Calculate number of working days in a date range
 * Excludes weekends and holidays
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} Number of working days
 */
reportConfigSchema.methods.calculateWorkingDays = function (startDate, endDate) {
    let workingDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();

        // Check if it's a working day (not weekend)
        if (this.workingDays.daysOfWeek.includes(dayOfWeek)) {
            // Check if it's not a holiday
            const isHoliday = this.holidays.some(holiday => {
                if (holiday.isRecurring) {
                    return holiday.month === current.getMonth() + 1 &&
                        holiday.day === current.getDate();
                } else {
                    const holidayDate = new Date(holiday.date);
                    return holidayDate.toDateString() === current.toDateString();
                }
            });

            if (!isHoliday) {
                workingDays++;
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};

/**
 * Check if a specific date is a working day
 * 
 * @param {Date} date - Date to check
 * @returns {Boolean} True if working day
 */
reportConfigSchema.methods.isWorkingDay = function (date) {
    const dayOfWeek = date.getDay();

    // Check if it's a weekend
    if (!this.workingDays.daysOfWeek.includes(dayOfWeek)) {
        return false;
    }

    // Check if it's a holiday
    const isHoliday = this.holidays.some(holiday => {
        if (holiday.isRecurring) {
            return holiday.month === date.getMonth() + 1 &&
                holiday.day === date.getDate();
        } else {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === date.toDateString();
        }
    });

    return !isHoliday;
};

/**
 * Get all available date range options
 * 
 * @returns {Array} Array of range options with labels and date ranges
 */
reportConfigSchema.methods.getAvailableRanges = function () {
    return [
        {
            type: 'hr-month',
            label: this.hrMonth.label,
            ...this.calculateHRMonth()
        },
        {
            type: 'current-month',
            label: 'Current Month',
            ...this.calculateCurrentMonth()
        },
        {
            type: 'previous-month',
            label: 'Previous Month',
            ...this.calculatePreviousMonth()
        },
        {
            type: 'custom',
            label: 'Custom Range',
            description: 'Select custom start and end dates'
        }
    ];
};

/**
 * Get attendance summary for a date range using this configuration
 * Integrates with Attendance model
 * 
 * @param {ObjectId} departmentId - Department ID (optional)
 * @param {String} rangeType - Range type or custom dates
 * @param {Date} customStart - Custom start (optional)
 * @param {Date} customEnd - Custom end (optional)
 * @returns {Promise<Object>} Attendance summary with metrics
 */
reportConfigSchema.methods.getAttendanceSummary = async function (departmentId = null, rangeType = 'hr-month', customStart = null, customEnd = null) {
    const Attendance = mongoose.model('Attendance');
    const range = this.getDateRange(rangeType, customStart, customEnd);

    const query = {
        date: { $gte: range.startDate, $lte: range.endDate }
    };

    if (departmentId) {
        query.department = departmentId;
    }

    // Get all attendance records for the period
    const records = await Attendance.find(query)
        .populate('employee', 'profile employeeId')
        .populate('department', 'name code');

    // Calculate working days in range
    const workingDays = this.calculateWorkingDays(range.startDate, range.endDate);

    return {
        period: range.label,
        dateRange: { start: range.startDate, end: range.endDate },
        workingDays,
        totalRecords: records.length,
        records
    };
};

/**
 * Get leave summary for a date range using this configuration
 * Integrates with Leave model
 * 
 * @param {ObjectId} departmentId - Department ID (optional)
 * @param {String} rangeType - Range type
 * @param {Date} customStart - Custom start (optional)
 * @param {Date} customEnd - Custom end (optional)
 * @returns {Promise<Object>} Leave summary
 */
reportConfigSchema.methods.getLeaveSummary = async function (departmentId = null, rangeType = 'hr-month', customStart = null, customEnd = null) {
    const Leave = mongoose.model('Leave');
    const range = this.getDateRange(rangeType, customStart, customEnd);

    const query = {
        startDate: { $lte: range.endDate },
        endDate: { $gte: range.startDate }
    };

    if (departmentId) {
        query.department = departmentId;
    }

    const leaves = await Leave.find(query)
        .populate('employee', 'profile employeeId')
        .populate('department', 'name code');

    // Group by leave type and status
    const summary = leaves.reduce((acc, leave) => {
        const key = `${leave.leaveType}_${leave.status}`;
        if (!acc[key]) {
            acc[key] = {
                type: leave.leaveType,
                status: leave.status,
                count: 0,
                totalDays: 0
            };
        }
        acc[key].count++;
        acc[key].totalDays += leave.duration;
        return acc;
    }, {});

    return {
        period: range.label,
        dateRange: { start: range.startDate, end: range.endDate },
        totalLeaves: leaves.length,
        summary: Object.values(summary),
        leaves
    };
};

/**
 * Get payroll summary for HR month
 * Integrates with Payroll model
 * 
 * @param {ObjectId} departmentId - Department ID (optional)
 * @param {String} rangeType - Range type
 * @returns {Promise<Object>} Payroll summary
 */
reportConfigSchema.methods.getPayrollSummary = async function (departmentId = null, rangeType = 'hr-month') {
    const Payroll = mongoose.model('Payroll');
    const User = mongoose.model('User');
    const range = this.getDateRange(rangeType);

    // Create period string (YYYY-MM format)
    const year = range.startDate.getFullYear();
    const month = String(range.startDate.getMonth() + 1).padStart(2, '0');
    const period = `${year}-${month}`;

    let employees = [];
    if (departmentId) {
        employees = await User.find({ department: departmentId, isActive: true });
    } else {
        employees = await User.find({ isActive: true });
    }

    const employeeIds = employees.map(e => e._id);

    const payrolls = await Payroll.find({
        employee: { $in: employeeIds },
        period
    }).populate('employee', 'profile employeeId department');

    return {
        period: range.label,
        hrMonthPeriod: period,
        totalEmployees: employees.length,
        processedPayrolls: payrolls.length,
        payrolls
    };
};

/**
 * Generate comprehensive HR report for a period
 * Combines attendance, leave, and other metrics
 * 
 * @param {ObjectId} departmentId - Department ID (optional)
 * @param {String} rangeType - Range type
 * @param {Date} customStart - Custom start (optional)
 * @param {Date} customEnd - Custom end (optional)
 * @returns {Promise<Object>} Comprehensive report
 */
reportConfigSchema.methods.generateHRReport = async function (departmentId = null, rangeType = 'hr-month', customStart = null, customEnd = null) {
    const [attendance, leave, payroll] = await Promise.all([
        this.getAttendanceSummary(departmentId, rangeType, customStart, customEnd),
        this.getLeaveSummary(departmentId, rangeType, customStart, customEnd),
        rangeType === 'hr-month' ? this.getPayrollSummary(departmentId, rangeType) : null
    ]);

    const range = this.getDateRange(rangeType, customStart, customEnd);
    const workingDays = this.calculateWorkingDays(range.startDate, range.endDate);

    return {
        reportType: 'Comprehensive HR Report',
        period: range.label,
        dateRange: { start: range.startDate, end: range.endDate },
        workingDays,
        attendance,
        leave,
        payroll,
        generatedAt: new Date(),
        generatedBy: this.organization
    };
};

/**
 * Static method to get or create default configuration
 * 
 * @param {String} organization - Organization name
 * @param {ObjectId} schoolId - School ID (optional)
 * @returns {Promise<ReportConfig>} Configuration document
 */
reportConfigSchema.statics.getConfig = async function (organization = 'default', schoolId = null) {
    let config = await this.findOne({
        organization,
        school: schoolId,
        isActive: true
    });

    if (!config) {
        config = await this.create({
            organization,
            school: schoolId
        });
    }

    return config;
};

/**
 * Static method to get HR month range for organization
 * 
 * @param {String} organization - Organization name
 * @param {Number} offset - Month offset
 * @returns {Promise<Object>} Date range object
 */
reportConfigSchema.statics.getHRMonthRange = async function (organization = 'default', offset = 0) {
    const config = await this.getConfig(organization);
    return config.calculateHRMonth(offset);
};

/**
 * Static method to add holiday to configuration
 * 
 * @param {String} organization - Organization name
 * @param {Object} holiday - Holiday object {name, date, isRecurring, month, day}
 * @returns {Promise<ReportConfig>} Updated configuration
 */
reportConfigSchema.statics.addHoliday = async function (organization, holiday) {
    const config = await this.getConfig(organization);
    config.holidays.push(holiday);
    return await config.save();
};

/**
 * Static method to remove holiday from configuration
 * 
 * @param {String} organization - Organization name
 * @param {ObjectId} holidayId - Holiday ID to remove
 * @returns {Promise<ReportConfig>} Updated configuration
 */
reportConfigSchema.statics.removeHoliday = async function (organization, holidayId) {
    const config = await this.getConfig(organization);
    config.holidays = config.holidays.filter(h => h._id.toString() !== holidayId.toString());
    return await config.save();
};

/**
 * Static method to sync holidays to attendance records
 * Updates isWorkingDay flag for all attendance records on holiday dates
 * 
 * @param {String} organization - Organization name
 * @returns {Promise<Number>} Number of records updated
 */
reportConfigSchema.statics.syncHolidaysToAttendance = async function (organization) {
    const Attendance = mongoose.model('Attendance');
    const config = await this.getConfig(organization);

    let updatedCount = 0;

    for (const holiday of config.holidays) {
        const query = {};

        if (holiday.isRecurring) {
            // For recurring holidays, we need to update all years
            // This is a simplified approach - in production, you'd want to limit the date range
            const year = new Date().getFullYear();
            for (let y = year - 1; y <= year + 1; y++) {
                const holidayDate = new Date(y, holiday.month - 1, holiday.day);
                const result = await Attendance.updateMany(
                    { date: holidayDate },
                    { $set: { isWorkingDay: false, status: 'official-holiday' } }
                );
                updatedCount += result.modifiedCount;
            }
        } else {
            const result = await Attendance.updateMany(
                { date: new Date(holiday.date) },
                { $set: { isWorkingDay: false, status: 'official-holiday' } }
            );
            updatedCount += result.modifiedCount;
        }
    }

    return updatedCount;
};

/**
 * Instance method to update HR month configuration
 * 
 * @param {Number} startDay - New start day
 * @param {Number} endDay - New end day (optional)
 * @returns {Promise<ReportConfig>} Updated configuration
 */
reportConfigSchema.methods.updateHRMonth = async function (startDay, endDay = null) {
    this.hrMonth.startDay = startDay;
    if (endDay) {
        this.hrMonth.endDay = endDay;
    } else {
        // Auto-calculate end day (one day before start day)
        this.hrMonth.endDay = startDay - 1;
        if (this.hrMonth.endDay < 1) {
            this.hrMonth.endDay = 28; // Safe for all months
        }
    }
    return await this.save();
};

/**
 * Instance method to get employees count for reporting period
 * 
 * @param {String} rangeType - Range type
 * @param {Date} customStart - Custom start (optional)
 * @param {Date} customEnd - Custom end (optional)
 * @returns {Promise<Object>} Employee counts by status
 */
reportConfigSchema.methods.getEmployeeCount = async function (rangeType = 'hr-month', customStart = null, customEnd = null) {
    const User = mongoose.model('User');
    const range = this.getDateRange(rangeType, customStart, customEnd);

    // Get all employees
    const totalEmployees = await User.countDocuments({ isActive: true });

    // Get employees by employment status
    const byStatus = await User.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$employment.employmentStatus',
                count: { $sum: 1 }
            }
        }
    ]);

    // Get employees by department
    const byDepartment = await User.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$department',
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'departments',
                localField: '_id',
                foreignField: '_id',
                as: 'department'
            }
        }
    ]);

    return {
        period: range.label,
        total: totalEmployees,
        byStatus,
        byDepartment
    };
};

/**
 * Instance method to calculate expected working hours for period
 * 
 * @param {String} rangeType - Range type
 * @param {Date} customStart - Custom start (optional)
 * @param {Date} customEnd - Custom end (optional)
 * @param {Number} dailyHours - Daily working hours (default: 8)
 * @returns {Object} Expected working hours
 */
reportConfigSchema.methods.calculateExpectedHours = function (rangeType = 'hr-month', customStart = null, customEnd = null, dailyHours = 8) {
    const range = this.getDateRange(rangeType, customStart, customEnd);
    const workingDays = this.calculateWorkingDays(range.startDate, range.endDate);

    return {
        period: range.label,
        workingDays,
        dailyHours,
        totalExpectedHours: workingDays * dailyHours
    };
};

// Indexes for better query performance
reportConfigSchema.index({ organization: 1, school: 1 }, { unique: true });
reportConfigSchema.index({ organization: 1, isActive: 1 });
reportConfigSchema.index({ school: 1, isActive: 1 });
reportConfigSchema.index({ 'hrMonth.startDay': 1 });
reportConfigSchema.index({ 'payrollCycle.type': 1 });

export default mongoose.model('ReportConfig', reportConfigSchema);
