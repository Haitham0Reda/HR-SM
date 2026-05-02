import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

class AttendanceRepository extends BaseRepository {
    constructor() {
        super(Attendance);
    }

    async findByEmployeeAndDateRange(employeeId, startDate, endDate, options = {}) {
        try {
            const filter = {
                employeeId,
                date: { [Op.gte]: startDate, [Op.lte]: endDate }
            };
            if (options.tenantId) filter.tenantId = options.tenantId;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['date', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployeeAndDateRange');
        }
    }

    async findByDepartmentAndDate(departmentId, date, options = {}) {
        try {
            const dateStr = new Date(date).toISOString().slice(0, 10);
            const filter = { departmentId, date: dateStr };
            if (options.tenantId) filter.tenantId = options.tenantId;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'employeeId', 'personalInfo'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
                ],
                order: [['employeeId', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartmentAndDate');
        }
    }

    async findByStatus(status, options = {}) {
        try {
            const filter = { status };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.departmentId) filter.departmentId = options.departmentId;
            if (options.dateRange) {
                filter.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'employeeId', 'personalInfo'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
                ],
                order: [['date', 'DESC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    async getEmployeeMetrics(employeeId, startDate, endDate, options = {}) {
        try {
            const filter = {
                employeeId,
                date: { [Op.gte]: startDate, [Op.lte]: endDate }
            };
            if (options.tenantId) filter.tenantId = options.tenantId;

            const attendance = await this.findAll(filter);

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
                    metrics.expectedHours += record.hours?.expected || 0;
                }

                metrics.actualHours += record.hours?.actual || 0;
                metrics.workFromHomeHours += record.hours?.workFromHome || 0;
                metrics.totalHours += record.hours?.totalHours || 0;
                metrics.overtimeHours += record.hours?.overtime || 0;

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
                        if (record.isWorkingDay) metrics.absentDays++;
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

    async getDepartmentSummary(departmentId, date, options = {}) {
        try {
            const dateStr = new Date(date).toISOString().slice(0, 10);
            const tenantFilter = options.tenantId ? `AND tenant_id = :tenantId` : '';

            return await this.model.sequelize.query(
                `SELECT
                   status,
                   COUNT(*)                                        AS "count",
                   SUM((hours->>'totalHours')::numeric)           AS "totalHours"
                 FROM attendances
                 WHERE department_id = :departmentId
                   AND date = :date
                   ${tenantFilter}
                 GROUP BY status`,
                {
                    replacements: {
                        departmentId,
                        date: dateStr,
                        ...(options.tenantId ? { tenantId: options.tenantId } : {})
                    },
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            throw this._handleError(error, 'getDepartmentSummary');
        }
    }

    async getCurrentlyPresent(departmentId = null, options = {}) {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const deptFilter = departmentId ? `AND department_id = :departmentId` : '';
            const tenantFilter = options.tenantId ? `AND tenant_id = :tenantId` : '';

            return await this.model.sequelize.query(
                `SELECT * FROM attendances
                 WHERE date = :today
                   AND check_in->>'time' IS NOT NULL
                   AND (check_out->>'time' IS NULL OR check_out->>'time' = '')
                   ${deptFilter}
                   ${tenantFilter}
                 ORDER BY check_in->>'time' DESC`,
                {
                    replacements: {
                        today,
                        ...(departmentId ? { departmentId } : {}),
                        ...(options.tenantId ? { tenantId: options.tenantId } : {})
                    },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'getCurrentlyPresent');
        }
    }

    async getAttendanceAnalytics(filters = {}, options = {}) {
        try {
            const conditions = ['1=1'];
            const replacements = {};

            if (filters.tenantId) {
                conditions.push('tenant_id = :tenantId');
                replacements.tenantId = filters.tenantId;
            }
            if (filters.departmentId) {
                conditions.push('department_id = :departmentId');
                replacements.departmentId = filters.departmentId;
            }
            if (filters.dateRange) {
                conditions.push('date >= :startDate AND date <= :endDate');
                replacements.startDate = filters.dateRange.startDate;
                replacements.endDate = filters.dateRange.endDate;
            }
            if (filters.employeeIds && filters.employeeIds.length > 0) {
                const placeholders = filters.employeeIds.map((_, i) => `:empId${i}`).join(', ');
                conditions.push(`employee_id IN (${placeholders})`);
                filters.employeeIds.forEach((id, i) => { replacements[`empId${i}`] = id; });
            }

            return await this.model.sequelize.query(
                `SELECT
                   status,
                   department_id                                       AS "department",
                   TO_CHAR(date, 'YYYY-MM-DD')                       AS "date",
                   COUNT(*)                                           AS "count",
                   SUM((hours->>'actual')::numeric)                  AS "totalActualHours",
                   SUM((hours->>'expected')::numeric)                AS "totalExpectedHours",
                   SUM((hours->>'overtime')::numeric)                AS "totalOvertimeHours",
                   AVG((check_in->>'lateMinutes')::numeric)          AS "avgLateMinutes",
                   AVG((check_out->>'earlyMinutes')::numeric)        AS "avgEarlyMinutes"
                 FROM attendances
                 WHERE ${conditions.join(' AND ')}
                 GROUP BY status, department_id, TO_CHAR(date, 'YYYY-MM-DD')
                 ORDER BY TO_CHAR(date, 'YYYY-MM-DD') ASC, department_id ASC`,
                { replacements, type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw this._handleError(error, 'getAttendanceAnalytics');
        }
    }

    async findByFlags(flags = {}, options = {}) {
        try {
            const filter = {};
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.departmentId) filter.departmentId = options.departmentId;
            if (options.dateRange) {
                filter.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            const flagFilter = {};
            if (flags.isLate) flagFilter.isLate = true;
            if (flags.isEarlyDeparture) flagFilter.isEarlyDeparture = true;
            if (flags.isMissing) flagFilter.isMissing = true;
            if (flags.needsApproval) flagFilter.needsApproval = true;

            if (Object.keys(flagFilter).length > 0) {
                filter.flags = { [Op.contains]: flagFilter };
            }

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'employeeId', 'personalInfo'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
                ],
                order: [['date', 'DESC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByFlags');
        }
    }

    async createFromLeave(leave, options = {}) {
        try {
            const records = [];
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const attendanceDate = new Date(date).toISOString().slice(0, 10);
                const employeeId = leave.employeeId || leave.employee;

                let attendance = await this.findOne(
                    { employeeId, date: attendanceDate },
                    { tenantId: options.tenantId }
                );

                if (!attendance) {
                    const attendanceData = {
                        employeeId,
                        departmentId: leave.departmentId || leave.department,
                        positionId: leave.positionId || leave.position,
                        date: attendanceDate,
                        leaveId: leave.id || leave._id,
                        autoGenerated: true,
                        isWorkingDay: leave.leaveType !== 'mission'
                    };

                    if (options.tenantId) attendanceData.tenantId = options.tenantId;

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
                            attendanceData.hours = {
                                actual: 8, expected: 8, overtime: 0, workFromHome: 0, totalHours: 8
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
