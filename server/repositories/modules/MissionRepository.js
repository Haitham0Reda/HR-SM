import BaseRepository from '../BaseRepository.js';
import Mission from '../../modules/hr-core/missions/models/Mission.js';
import { Op } from 'sequelize';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

class MissionRepository extends BaseRepository {
    constructor() {
        super(Mission);
    }

    async findByEmployee(employeeId, options = {}) {
        try {
            const where = { employeeId };
            if (options.status) {
                where.status = options.status;
            }
            if (options.dateRange) {
                where[Op.or] = [
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
            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    async findByStatus(status, options = {}) {
        try {
            const where = { status };
            if (options.departmentId) where.departmentId = options.departmentId;
            if (options.employeeId) where.employeeId = options.employeeId;
            if (options.dateRange) {
                where.startDate = { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate };
            }
            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    async findPendingMissions(departmentId = null, options = {}) {
        try {
            const where = { status: 'pending' };
            if (departmentId) where.departmentId = departmentId;
            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' }
                ],
                order: [['createdAt', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findPendingMissions');
        }
    }

    async findActiveMissions(departmentId = null, options = {}) {
        try {
            const now = new Date();
            const where = {
                status: 'approved',
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            };
            if (departmentId) where.departmentId = departmentId;
            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['endDate', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findActiveMissions');
        }
    }

    async findUpcomingMissions(daysAhead = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);
            const where = {
                status: 'approved',
                startDate: { [Op.gt]: now, [Op.lte]: futureDate }
            };
            if (options.tenantId) where.tenantId = options.tenantId;
            if (options.departmentId) where.departmentId = options.departmentId;
            return await this.findAll({
                where,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findUpcomingMissions');
        }
    }

    async findByDepartment(departmentId, options = {}) {
        try {
            const where = { departmentId };
            if (options.tenantId) where.tenantId = options.tenantId;
            if (options.status) where.status = options.status;
            if (options.dateRange) {
                where[Op.or] = [
                    { startDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate } },
                    { endDate: { [Op.gte]: options.dateRange.startDate, [Op.lte]: options.dateRange.endDate } }
                ];
            }
            return await this.findAll({
                where,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    async findByDestination(destination, options = {}) {
        try {
            const where = {
                destination: { [Op.iLike]: `%${destination}%` }
            };
            if (options.tenantId) where.tenantId = options.tenantId;
            if (options.status) where.status = options.status;
            if (options.departmentId) where.departmentId = options.departmentId;
            return await this.findAll({
                where,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDestination');
        }
    }

    async findByDateRange(startDate, endDate, options = {}) {
        try {
            const where = {
                [Op.or]: [
                    { startDate: { [Op.gte]: startDate, [Op.lte]: endDate } },
                    { endDate: { [Op.gte]: startDate, [Op.lte]: endDate } },
                    {
                        [Op.and]: [
                            { startDate: { [Op.lte]: startDate } },
                            { endDate: { [Op.gte]: endDate } }
                        ]
                    }
                ]
            };
            if (options.tenantId) where.tenantId = options.tenantId;
            if (options.status) where.status = options.status;
            if (options.departmentId) where.departmentId = options.departmentId;
            return await this.findAll({
                where,
                include: [
                    { model: User, as: 'employee' },
                    { model: Department, as: 'department' },
                    { model: User, as: 'approvedBy' }
                ],
                order: [['startDate', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDateRange');
        }
    }

    async getMissionStats(departmentId, year = new Date().getFullYear(), options = {}) {
        try {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31, 23, 59, 59);

            const result = await this.model.sequelize.query(`
                SELECT 
                    status,
                    EXTRACT(MONTH FROM "startDate") as month,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM ("endDate" - "startDate"))/86400) as "avgDuration"
                FROM "missions"
                WHERE "departmentId" = :departmentId
                    AND "startDate" >= :yearStart
                    AND "startDate" <= :yearEnd
                    ${options.tenantId ? `AND "tenantId" = :tenantId` : ''}
                GROUP BY status, EXTRACT(MONTH FROM "startDate")
                ORDER BY month ASC, status ASC
            `, {
                replacements: {
                    departmentId,
                    yearStart,
                    yearEnd,
                    ...(options.tenantId && { tenantId: options.tenantId })
                },
                type: this.model.sequelize.QueryTypes.SELECT
            });

            return result;
        } catch (error) {
            throw this._handleError(error, 'getMissionStats');
        }
    }

    async getMissionAnalytics(filters = {}, options = {}) {
        try {
            const conditions = [];
            const replacements = {};

            if (filters.tenantId) {
                conditions.push('"tenantId" = :tenantId');
                replacements.tenantId = filters.tenantId;
            }
            if (filters.departmentId) {
                conditions.push('"departmentId" = :departmentId');
                replacements.departmentId = filters.departmentId;
            }
            if (filters.dateRange) {
                conditions.push('"startDate" >= :startDate AND "startDate" <= :endDate');
                replacements.startDate = filters.dateRange.startDate;
                replacements.endDate = filters.dateRange.endDate;
            }
            if (filters.employeeIds && filters.employeeIds.length > 0) {
                conditions.push('"employeeId" = ANY(:employeeIds)');
                replacements.employeeIds = filters.employeeIds;
            }

            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

            const monthlyAnalytics = await this.model.sequelize.query(`
                SELECT 
                    status,
                    destination,
                    EXTRACT(MONTH FROM "startDate") as month,
                    EXTRACT(YEAR FROM "startDate") as year,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM ("endDate" - "startDate"))/86400) as "avgDuration",
                    ARRAY_AGG("employeeId") as employees
                FROM "missions"
                ${whereClause}
                GROUP BY status, destination, EXTRACT(MONTH FROM "startDate"), EXTRACT(YEAR FROM "startDate")
                ORDER BY year DESC, month DESC, status ASC
            `, {
                replacements,
                type: this.model.sequelize.QueryTypes.SELECT
            });

            const destinationAnalytics = await this.model.sequelize.query(`
                SELECT 
                    destination,
                    COUNT(*) as count,
                    ARRAY_AGG("employeeId") as employees,
                    AVG(EXTRACT(EPOCH FROM ("endDate" - "startDate"))/86400) as "avgDuration",
                    MAX("startDate") as "lastMission"
                FROM "missions"
                ${whereClause}
                GROUP BY destination
                ORDER BY count DESC
                LIMIT 10
            `, {
                replacements,
                type: this.model.sequelize.QueryTypes.SELECT
            });

            return { monthlyAnalytics, destinationAnalytics };
        } catch (error) {
            throw this._handleError(error, 'getMissionAnalytics');
        }
    }

    async getPopularDestinations(options = {}) {
        try {
            const conditions = [];
            const replacements = {};

            if (options.tenantId) {
                conditions.push('"tenantId" = :tenantId');
                replacements.tenantId = options.tenantId;
            }
            if (options.departmentId) {
                conditions.push('"departmentId" = :departmentId');
                replacements.departmentId = options.departmentId;
            }
            if (options.dateRange) {
                conditions.push('"startDate" >= :startDate AND "startDate" <= :endDate');
                replacements.startDate = options.dateRange.startDate;
                replacements.endDate = options.dateRange.endDate;
            }

            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

            const result = await this.model.sequelize.query(`
                SELECT 
                    destination,
                    COUNT(*) as count,
                    ARRAY_AGG("employeeId") as employees,
                    MAX("startDate") as "lastMission"
                FROM "missions"
                ${whereClause}
                GROUP BY destination
                ORDER BY count DESC
                LIMIT :limit
            `, {
                replacements: {
                    ...replacements,
                    limit: options.limit || 10
                },
                type: this.model.sequelize.QueryTypes.SELECT
            });

            return result;
        } catch (error) {
            throw this._handleError(error, 'getPopularDestinations');
        }
    }

    async approveMission(missionId, approverId, notes = '', options = {}) {
        try {
            const updateData = {
                status: 'approved',
                approvedById: approverId,
                approvedAt: new Date()
            };
            if (notes && typeof notes === 'string') {
                updateData.notes = notes.trim();
            }
            return await this.update(missionId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'approveMission');
        }
    }

    async rejectMission(missionId, rejecterId, reason, options = {}) {
        try {
            const updateData = {
                status: 'rejected',
                approvedById: rejecterId,
                approvedAt: new Date(),
                notes: reason && typeof reason === 'string' ? reason.trim() : ''
            };
            return await this.update(missionId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'rejectMission');
        }
    }

    async completeMission(missionId, options = {}) {
        try {
            return await this.update(missionId, { status: 'completed' }, options);
        } catch (error) {
            throw this._handleError(error, 'completeMission');
        }
    }

    async cancelMission(missionId, reason, options = {}) {
        try {
            return await this.update(missionId, {
                status: 'cancelled',
                notes: reason && typeof reason === 'string' ? reason.trim() : ''
            }, options);
        } catch (error) {
            throw this._handleError(error, 'cancelMission');
        }
    }

    calculateMissionDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = end - start;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
}

export default MissionRepository;
