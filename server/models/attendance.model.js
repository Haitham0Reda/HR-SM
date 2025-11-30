// models/Attendance.js
import mongoose from 'mongoose';
import { isWeekend, isHoliday, getHolidayInfo } from '../utils/holidayChecker.js';

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Employee's department (denormalized for faster queries)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    // Employee's position (denormalized for faster queries)
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    date: {
        type: Date,
        required: true
    },
    // Scheduled work times
    schedule: {
        startTime: {
            type: String,  // Format: "HH:MM" (e.g., "09:00")
            default: '09:00'
        },
        endTime: {
            type: String,  // Format: "HH:MM" (e.g., "17:00")
            default: '17:00'
        },
        expectedHours: {
            type: Number,  // Expected working hours for the day
            default: 8
        }
    },
    // Check-in information
    checkIn: {
        time: Date,
        method: {
            type: String,
            enum: ['biometric', 'manual', 'wfh']
        },
        location: {
            type: String,
            enum: ['office', 'home', 'remote']
        },
        isLate: {
            type: Boolean,
            default: false
        },
        lateMinutes: {
            type: Number,
            default: 0
        }
    },
    // Check-out information
    checkOut: {
        time: Date,
        method: {
            type: String,
            enum: ['biometric', 'manual', 'wfh']
        },
        location: {
            type: String,
            enum: ['office', 'home', 'remote']
        },
        isEarly: {
            type: Boolean,
            default: false
        },
        earlyMinutes: {
            type: Number,
            default: 0
        }
    },
    // Hours tracking
    hours: {
        actual: {
            type: Number,  // Actual hours worked (checkOut - checkIn)
            default: 0
        },
        expected: {
            type: Number,  // Expected hours for the day
            default: 8
        },
        overtime: {
            type: Number,  // Overtime hours (actual - expected, if positive)
            default: 0
        },
        workFromHome: {
            type: Number,  // Hours worked from home
            default: 0
        },
        totalHours: {
            type: Number,  // Total hours including WFH
            default: 0
        }
    },
    // Work from home tracking
    workFromHome: {
        isWFH: {
            type: Boolean,
            default: false
        },
        approved: {
            type: Boolean,
            default: false
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String
    },
    // Attendance status
    status: {
        type: String,
        enum: [
            'on-time',           // Arrived on time or early
            'late',              // Arrived late
            'present',           // Present (general)
            'absent',            // Did not check in/out
            'vacation',          // On approved vacation
            'sick-leave',        // On approved sick leave
            'mission',           // On approved mission
            'work-from-home',    // Working from home
            'half-day',          // Half day (present for partial time)
            'official-holiday',  // Official holiday
            'weekend',           // Weekend day
            'early-departure',   // Left early
            'forgot-check-in',   // Forgot to check in
            'forgot-check-out'   // Forgot to check out
        ],
        default: 'absent'
    },
    // Leave reference (if on vacation/sick leave/mission)
    leave: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leave'
    },
    // Link to permission requests that affected this attendance record
    permissionRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    // Indicates if this record was adjusted based on an approved permission
    adjustedByPermission: {
        type: Boolean,
        default: false
    },
    // Flags for attendance issues
    flags: {
        isLate: {
            type: Boolean,
            default: false
        },
        isEarlyDeparture: {
            type: Boolean,
            default: false
        },
        isMissing: {
            type: Boolean,
            default: false
        },
        needsApproval: {
            type: Boolean,
            default: false
        }
    },
    // Notes and approvals
    notes: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    // Metadata
    isWorkingDay: {
        type: Boolean,
        default: true  // False for weekends and holidays
    },
    autoGenerated: {
        type: Boolean,
        default: false  // True if generated automatically (e.g., for leaves)
    }
}, {
    timestamps: true
});

// Virtual for total working hours including WFH
attendanceSchema.virtual('totalWorkingHours').get(function () {
    return this.hours.actual + this.hours.workFromHome;
});

// Virtual to check if employee was on time
attendanceSchema.virtual('isOnTime').get(function () {
    return !this.checkIn.isLate && this.checkIn.time !== null;
});

// Virtual to check if it's a full day of work
attendanceSchema.virtual('isFullDay').get(function () {
    return this.hours.actual >= this.hours.expected;
});

// Pre-save middleware to enforce weekends and official holidays
attendanceSchema.pre('save', function(next) {
    // Get holiday information for the date
    const holidayInfo = getHolidayInfo(this.date);
    
    // Check if it's a weekend or official holiday
    if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
        // Automatically set as official holiday
        this.status = 'absent';
        this.notes = holidayInfo.note || 'Official Holiday';
        this.isWorkingDay = false;
        
        // Clear check-in/check-out for holidays
        this.checkIn = {
            time: null,
            method: undefined,
            location: undefined,
            isLate: false,
            lateMinutes: 0
        };
        this.checkOut = {
            time: null,
            method: undefined,
            location: undefined,
            isEarly: false,
            earlyMinutes: 0
        };
        
        // Clear hours for holidays
        this.hours = {
            actual: 0,
            expected: 0,
            overtime: 0,
            workFromHome: 0,
            totalHours: 0
        };
    }
    
    next();
});

/**
 * Helper method to parse time string (HH:MM) to Date object for today
 */
attendanceSchema.methods._parseTime = function (timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(this.date);
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Helper method to determine attendance status
 */
attendanceSchema.methods._determineStatus = function () {
    // If leave is linked, use leave-based status
    if (this.leave) {
        // Status will be set based on leave type
        return;
    }

    // Work from home
    if (this.workFromHome.isWFH && this.workFromHome.approved) {
        this.status = 'work-from-home';
        return;
    }

    // Weekend or holiday
    if (!this.isWorkingDay) {
        this.status = this.status || 'weekend';
        return;
    }

    // No check-in
    if (!this.checkIn.time) {
        this.status = 'absent';
        this.flags.isMissing = true;
        return;
    }

    // No check-out (forgot to check out)
    if (this.checkIn.time && !this.checkOut.time) {
        this.status = 'forgot-check-out';
        this.flags.needsApproval = true;
        return;
    }

    // Late arrival
    if (this.checkIn.isLate && this.checkOut.time) {
        this.status = 'late';
        return;
    }

    // Early departure
    if (this.checkOut.isEarly && !this.checkIn.isLate) {
        this.status = 'early-departure';
        return;
    }

    // On time
    if (this.checkIn.time && this.checkOut.time && !this.checkIn.isLate && !this.checkOut.isEarly) {
        this.status = 'on-time';
        return;
    }

    // Default to present
    this.status = 'present';
};

/**
 * Instance method to mark attendance based on approved leave
 */
attendanceSchema.methods.markAsLeave = async function (leave) {
    this.leave = leave._id;
    this.autoGenerated = true;
    this.isWorkingDay = leave.leaveType !== 'mission'; // Missions are working days

    switch (leave.leaveType) {
        case 'annual':
        case 'casual':
            this.status = 'vacation';
            break;
        case 'sick':
            this.status = 'sick-leave';
            break;
        case 'mission':
            this.status = 'mission';
            // For missions, mark as full day worked
            this.hours.actual = this.schedule.expectedHours;
            this.hours.totalHours = this.schedule.expectedHours;
            break;
        default:
            this.status = 'vacation';
    }

    return await this.save();
};

/**
 * Instance method to record check-in
 */
attendanceSchema.methods.recordCheckIn = async function (method = 'biometric', location = 'office') {
    this.checkIn.time = new Date();
    this.checkIn.method = method;
    this.checkIn.location = location;

    if (location === 'home') {
        this.workFromHome.isWFH = true;
    }

    return await this.save();
};

/**
 * Instance method to record check-out
 */
attendanceSchema.methods.recordCheckOut = async function (method = 'biometric', location = 'office') {
    this.checkOut.time = new Date();
    this.checkOut.method = method;
    this.checkOut.location = location;

    return await this.save();
};

/**
 * Static method to get employee attendance for a date range
 */
attendanceSchema.statics.getEmployeeAttendance = function (employeeId, startDate, endDate) {
    return this.find({
        employee: employeeId,
        date: { $gte: startDate, $lte: endDate }
    })
        .populate('leave', 'leaveType startDate endDate status')
        .populate('permissionRequests', 'permissionType time status')
        .populate('approvedBy', 'username employeeId personalInfo')
        .sort({ date: 1 });
};

/**
 * Static method to get attendance metrics for an employee
 */
attendanceSchema.statics.getEmployeeMetrics = async function (employeeId, startDate, endDate) {
    const attendance = await this.find({
        employee: employeeId,
        date: { $gte: startDate, $lte: endDate }
    });

    const metrics = {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        earlyDepartureDays: 0,
        vacationDays: 0,
        sickLeaveDays: 0,
        missionDays: 0,
        workFromHomeDays: 0,
        expectedHours: 0,
        actualHours: 0,
        workFromHomeHours: 0,
        totalHours: 0,
        overtimeHours: 0
    };

    attendance.forEach(record => {
        if (record.isWorkingDay) {
            metrics.workingDays++;
            metrics.expectedHours += record.hours.expected;
        }

        metrics.actualHours += record.hours.actual;
        metrics.workFromHomeHours += record.hours.workFromHome;
        metrics.totalHours += record.hours.totalHours;
        metrics.overtimeHours += record.hours.overtime;

        switch (record.status) {
            case 'on-time':
            case 'present':
                metrics.presentDays++;
                break;
            case 'late':
                metrics.presentDays++;
                metrics.lateDays++;
                break;
            case 'early-departure':
                metrics.presentDays++;
                metrics.earlyDepartureDays++;
                break;
            case 'absent':
            case 'forgot-check-in':
            case 'forgot-check-out':
                if (record.isWorkingDay) {
                    metrics.absentDays++;
                }
                break;
            case 'vacation':
                metrics.vacationDays++;
                break;
            case 'sick-leave':
                metrics.sickLeaveDays++;
                break;
            case 'mission':
                metrics.missionDays++;
                metrics.presentDays++;
                break;
            case 'work-from-home':
                metrics.workFromHomeDays++;
                metrics.presentDays++;
                break;
        }
    });

    return metrics;
};

/**
 * Static method to get department attendance summary
 */
attendanceSchema.statics.getDepartmentSummary = async function (departmentId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const summary = await this.aggregate([
        {
            $match: {
                department: new mongoose.Types.ObjectId(departmentId),
                date: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalHours: { $sum: '$hours.totalHours' }
            }
        }
    ]);

    return summary;
};

/**
 * Static method to create attendance records for approved leaves
 */
attendanceSchema.statics.createFromLeave = async function (leave) {
    const records = [];
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const attendanceDate = new Date(date);

        // Check if record already exists
        let attendance = await this.findOne({
            employee: leave.employee,
            date: attendanceDate
        });

        if (!attendance) {
            attendance = new this({
                employee: leave.employee,
                department: leave.department,
                position: leave.position,
                date: attendanceDate
            });
        }

        await attendance.markAsLeave(leave);
        records.push(attendance);
    }

    return records;
};

/**
 * Static method to get employees who are currently checked in
 */
attendanceSchema.statics.getCurrentlyPresent = function (departmentId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
        date: today,
        'checkIn.time': { $exists: true, $ne: null },
        'checkOut.time': { $exists: false }
    };

    if (departmentId) {
        query.department = departmentId;
    }

    return this.find(query)
        .populate({
            path: 'employee',
            select: 'username employeeId personalInfo department position',
            populate: [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title' }
            ]
        })
        .sort({ 'checkIn.time': -1 });
};

// Compound indexes for better performance
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ employee: 1, status: 1 });
attendanceSchema.index({ department: 1, date: 1 });
attendanceSchema.index({ department: 1, status: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ adjustedByPermission: 1 });
attendanceSchema.index({ 'flags.isLate': 1 });
attendanceSchema.index({ 'flags.isEarlyDeparture': 1 });
attendanceSchema.index({ 'flags.needsApproval': 1 });
attendanceSchema.index({ leave: 1 });
attendanceSchema.index({ isWorkingDay: 1 });

export default mongoose.model('Attendance', attendanceSchema);