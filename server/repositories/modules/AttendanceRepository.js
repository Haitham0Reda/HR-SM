import BaseRepository from '../BaseRepository.js';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';
import mongoose from 'mongoose';

/**
 * Repository for Attendance model operations with date range queries and analytics
 */
class AttendanceRepository extends BaseRepository {
    constructor() {
        super(Attendance);
    }

    /**
     * Find attendance records by employee and date range
     * @param {string} employeeId - Employee ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Attendance records
     */
    async findByEmployeeAndDateRange(employeeId, startDate, endDate, options = {}) {
        try {
            const filter = {
                employee: employeeId,
                date: { $gte: startDate, $lte: endDate }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            return await this.find(filter, {
                ...options,
                sort: { date: 1 },
                populate: [
                    { path: 'leave', select: 'leaveType startDate endDate status' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployeeAndDateRange');
        }
    }

    /**
     * Find attendance records by department and date
     * @param {string} departmentId - Department ID
     * @param {Date} date - Specific date
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Attendance records
     */
    async findByDepartmentAndDate(departmentId, date, options = {}) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const filter = {
                department: departmentId,
                date: { $gte: startOfDay, $lte: endOfDay }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' }
                ],
                sort: { 'employee.firstName': 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartmentAndDate');
        }
    }

    /**
     * Find attendance records by status
     * @param {string} status - Attendance status
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Attendance records
     */
    async findByStatus(status, options = {}) {
        try {
            const filter = { status };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.dateRange) {
                filter.date = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' }
                ],
                sort: { date: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Get attendance metrics for an employee
     * @param {string} employeeId - Employee ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Attendance metrics
     */
    async getEmployeeMetrics(employeeId, startDate, endDate, options = {}) {
        try {
            const filter = {
                employee: employeeId,
                date: { $gte: startDate, $lte: endDate }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            const attendance = await this.find(filter);

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
        } catch (error) {
            throw this._handleError(error, 'getEmployeeMetrics');
        }
    }

    /**
     * Get department attendance summary for a specific date
     * @param {string} departmentId - Department ID
     * @param {Date} date - Specific date
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Department summary
     */
    async getDepartmentSummary(departmentId, date, options = {}) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const matchFilter = {
                department: new mongoose.Types.ObjectId(departmentId),
                date: { $gte: startOfDay, $lte: endOfDay }
            };

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalHours: { $sum: '$hours.totalHours' }
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getDepartmentSummary');
        }
    }

    /**
     * Get currently present employees
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Currently present employees
     */
    async getCurrentlyPresent(departmentId = null, options = {}) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filter = {
                date: today,
                'checkIn.time': { $exists: true, $ne: null },
                'checkOut.time': { $exists: false }
            };

            if (departmentId) {
                filter.department = departmentId;
            }

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    {
                        path: 'employee',
                        select: 'firstName lastName employeeId department position',
                        populate: [
                            { path: 'department', select: 'name code' },
                            { path: 'position', select: 'title' }
                        ]
                    }
                ],
                sort: { 'checkIn.time': -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'getCurrentlyPresent');
        }
    }

    /**
     * Get attendance analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Analytics data
     */
    async getAttendanceAnalytics(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(filters.departmentId);
            }

            if (filters.dateRange) {
                matchFilter.date = {
                    $gte: filters.dateRange.startDate,
                    $lte: filters.dateRange.endDate
                };
            }

            if (filters.employeeIds && filters.employeeIds.length > 0) {
                matchFilter.employee = {
                    $in: filters.employeeIds.map(id => new mongoose.Types.ObjectId(id))
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            status: '$status',
                            department: '$department',
                            date: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$date'
                                }
                            }
                        },
                        count: { $sum: 1 },
                        totalActualHours: { $sum: '$hours.actual' },
                        totalExpectedHours: { $sum: '$hours.expected' },
                        totalOvertimeHours: { $sum: '$hours.overtime' },
                        avgLateMinutes: { $avg: '$checkIn.lateMinutes' },
                        avgEarlyMinutes: { $avg: '$checkOut.earlyMinutes' }
                    }
                },
                {
                    $sort: { '_id.date': 1, '_id.department': 1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getAttendanceAnalytics');
        }
    }

    /**
     * Find employees with attendance flags (late, early departure, missing)
     * @param {Object} flags - Flag criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Flagged attendance records
     */
    async findByFlags(flags = {}, options = {}) {
        try {
            const filter = {};

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.dateRange) {
                filter.date = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            // Build flags filter
            if (flags.isLate) {
                filter['flags.isLate'] = true;
            }

            if (flags.isEarlyDeparture) {
                filter['flags.isEarlyDeparture'] = true;
            }

            if (flags.isMissing) {
                filter['flags.isMissing'] = true;
            }

            if (flags.needsApproval) {
                filter['flags.needsApproval'] = true;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName' }
                ],
                sort: { date: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByFlags');
        }
    }

    /**
     * Create attendance records from approved leave
     * @param {Object} leave - Leave object
     * @param {Object} [options] - Creation options
     * @returns {Promise<Array>} Created attendance records
     */
    async createFromLeave(leave, options = {}) {
        try {
            const records = [];
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const attendanceDate = new Date(date);

                // Check if record already exists
                let attendance = await this.findOne({
                    employee: leave.employee,
                    date: attendanceDate
                }, { tenantId: options.tenantId });

                if (!attendance) {
                    const attendanceData = {
                        employee: leave.employee,
                        department: leave.department,
                        position: leave.position,
                        date: attendanceDate,
                        leave: leave._id,
                        autoGenerated: true,
                        isWorkingDay: leave.leaveType !== 'mission'
                    };

                    if (options.tenantId) {
                        attendanceData.tenantId = options.tenantId;
                    }

                    // Set status based on leave type
                    switch (leave.leaveType) {
                        case 'annual':
                        case 'casual':
                            attendanceData.status = 'vacation';
                            break;
                        case 'sick':
                            attendanceData.status = 'sick-leave';
                            break;
                        case 'mission':
                            attendanceData.status = 'mission';
                            // For missions, mark as full day worked
                            attendanceData.hours = {
                                actual: 8,
                                expected: 8,
                                overtime: 0,
                                workFromHome: 0,
                                totalHours: 8
                            };
                            break;
                        default:
                            attendanceData.status = 'vacation';
                    }

                    attendance = await this.create(attendanceData, options);
                }

                records.push(attendance);
            }

            return records;
        } catch (error) {
            throw this._handleError(error, 'createFromLeave');
        }
    }
}

export default AttendanceRepository;