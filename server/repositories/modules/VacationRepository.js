import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import Vacation from '../../modules/hr-core/vacations/models/vacation.model.js';

class VacationRepository extends BaseRepository {
    constructor() {
        super(Vacation);
    }

    async findByEmployee(employeeId, options = {}) {
        try {
            const filter = { employeeId };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.status) filter.status = options.status;
            if (options.vacationType) filter.vacationType = options.vacationType;
            if (options.dateRange) {
                filter[Op.or] = [
                    {
                        startDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate }
                    },
                    {
                        endDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate }
                    },
                    {
                        startDate: { [Op.lte]: options.dateRange.startDate },
                        endDate: { [Op.gte]: options.dateRange.endDate }
                    }
                ];
            }

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['startDate', 'DESC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    async findByStatus(status, options = {}) {
        try {
            const filter = { status };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.departmentId) filter.departmentId = options.departmentId;
            if (options.vacationType) filter.vacationType = options.vacationType;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['createdAt', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    async findPendingVacations(departmentId = null, options = {}) {
        try {
            const filter = { status: 'pending' };
            if (departmentId) filter.departmentId = departmentId;
            if (options.tenantId) filter.tenantId = options.tenantId;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['createdAt', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findPendingVacations');
        }
    }

    async findActiveVacations(departmentId = null, options = {}) {
        try {
            const now = new Date();
            const filter = {
                status: 'approved',
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            };
            if (departmentId) filter.departmentId = departmentId;
            if (options.tenantId) filter.tenantId = options.tenantId;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['endDate', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findActiveVacations');
        }
    }

    async findUpcomingVacations(daysAhead = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            const filter = {
                status: 'approved',
                startDate: { [Op.gt]: now, [Op.lte]: futureDate }
            };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.departmentId) filter.departmentId = options.departmentId;

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['startDate', 'ASC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findUpcomingVacations');
        }
    }

    async findByDepartment(departmentId, options = {}) {
        try {
            const filter = { departmentId };
            if (options.tenantId) filter.tenantId = options.tenantId;
            if (options.status) filter.status = options.status;
            if (options.vacationType) filter.vacationType = options.vacationType;
            if (options.dateRange) {
                filter[Op.or] = [
                    {
                        startDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate }
                    },
                    {
                        endDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate }
                    }
                ];
            }

            return await this.findAll(filter, {
                tenantId: options.tenantId,
                order: [['startDate', 'DESC']],
                limit: options.limit,
                offset: options.offset
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    async hasOverlappingVacation(employeeId, startDate, endDate, excludeVacationId = null, options = {}) {
        try {
            const filter = {
                employeeId,
                status: { [Op.in]: ['pending', 'approved'] },
                startDate: { [Op.lte]: endDate },
                endDate: { [Op.gte]: startDate }
            };
            if (excludeVacationId) filter.id = { [Op.ne]: excludeVacationId };
            if (options.tenantId) filter.tenantId = options.tenantId;

            const overlapping = await this.findOne(filter);
            return !!overlapping;
        } catch (error) {
            throw this._handleError(error, 'hasOverlappingVacation');
        }
    }

    async getVacationStats(departmentId, year = new Date().getFullYear(), options = {}) {
        try {
            const yearStart = new Date(year, 0, 1).toISOString().slice(0, 10);
            const yearEnd = new Date(year, 11, 31).toISOString().slice(0, 10);
            const tenantFilter = options.tenantId ? `AND tenant_id = :tenantId` : '';

            return await this.model.sequelize.query(
                `SELECT
                   vacation_type    AS "vacationType",
                   status,
                   COUNT(*)         AS "count",
                   SUM(duration)    AS "totalDays"
                 FROM vacations
                 WHERE department_id = :departmentId
                   AND start_date >= :yearStart
                   AND start_date <= :yearEnd
                   ${tenantFilter}
                 GROUP BY vacation_type, status`,
                {
                    replacements: {
                        departmentId,
                        yearStart,
                        yearEnd,
                        ...(options.tenantId ? { tenantId: options.tenantId } : {})
                    },
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            throw this._handleError(error, 'getVacationStats');
        }
    }

    async getVacationBalance(employeeId, year = new Date().getFullYear(), options = {}) {
        try {
            const yearStart = new Date(year, 0, 1).toISOString().slice(0, 10);
            const yearEnd = new Date(year, 11, 31).toISOString().slice(0, 10);

            const filter = {
                employeeId,
                status: 'approved',
                startDate: { [Op.gte]: yearStart, [Op.lte]: yearEnd }
            };
            if (options.tenantId) filter.tenantId = options.tenantId;

            const vacations = await this.findAll(filter);

            const balance = {
                year,
                annual: { used: 0, count: 0 },
                casual: { used: 0, count: 0 },
                sick: { used: 0, count: 0 },
                unpaid: { used: 0, count: 0 },
                total: { used: 0, count: 0 }
            };

            vacations.forEach(vacation => {
                const type = vacation.vacationType;
                const days = vacation.duration || 0;

                if (balance[type]) {
                    balance[type].used += days;
                    balance[type].count += 1;
                }

                balance.total.used += days;
                balance.total.count += 1;
            });

            return balance;
        } catch (error) {
            throw this._handleError(error, 'getVacationBalance');
        }
    }

    async approveVacation(vacationId, approverId, notes = '', options = {}) {
        try {
            const updateData = {
                status: 'approved',
                approvedBy: approverId,
                approvedAt: new Date()
            };
            if (notes && typeof notes === 'string') updateData.approverNotes = notes.trim();

            return await this.update(vacationId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'approveVacation');
        }
    }

    async rejectVacation(vacationId, rejecterId, reason, options = {}) {
        try {
            const updateData = {
                status: 'rejected',
                rejectedBy: rejecterId,
                rejectedAt: new Date(),
                rejectionReason: reason && typeof reason === 'string' ? reason.trim() : ''
            };

            return await this.update(vacationId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'rejectVacation');
        }
    }

    async cancelVacation(vacationId, userId, reason, options = {}) {
        try {
            const updateData = {
                status: 'cancelled',
                cancelledBy: userId,
                cancelledAt: new Date(),
                cancellationReason: reason && typeof reason === 'string' ? reason.trim() : ''
            };

            return await this.update(vacationId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'cancelVacation');
        }
    }

    async getVacationAnalytics(filters = {}, options = {}) {
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
                conditions.push('start_date >= :startDate AND start_date <= :endDate');
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
                   vacation_type                          AS "vacationType",
                   status,
                   EXTRACT(MONTH FROM start_date)        AS "month",
                   EXTRACT(YEAR FROM start_date)         AS "year",
                   COUNT(*)                              AS "count",
                   SUM(duration)                         AS "totalDays",
                   AVG(duration)                         AS "avgDuration",
                   COUNT(DISTINCT employee_id)           AS "uniqueEmployees"
                 FROM vacations
                 WHERE ${conditions.join(' AND ')}
                 GROUP BY vacation_type, status, EXTRACT(MONTH FROM start_date), EXTRACT(YEAR FROM start_date)
                 ORDER BY EXTRACT(YEAR FROM start_date) DESC, EXTRACT(MONTH FROM start_date) DESC, vacation_type ASC`,
                { replacements, type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw this._handleError(error, 'getVacationAnalytics');
        }
    }

    calculateWorkingDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        let workingDays = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
            current.setDate(current.getDate() + 1);
        }

        return workingDays;
    }
}

export default VacationRepository;
