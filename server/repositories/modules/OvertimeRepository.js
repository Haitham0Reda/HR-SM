import BaseRepository from '../BaseRepository.js';
import Overtime from '../../modules/hr-core/overtime/models/overtime.model.js';
import { Op } from 'sequelize';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';

/**
 * Repository for Overtime model operations with compensation tracking and analytics
 */
class OvertimeRepository extends BaseRepository {
    constructor() {
        super(Overtime);
    }

    /**
     * Find overtime records by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overtime records
     */
    async findByEmployee(employeeId, options = {}) {
        try {
            const where = { employee_id: employeeId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.status) {
                where.status = options.status;
            }

            if (options.compensationType) {
                where.compensation_type = options.compensationType;
            }

            if (options.compensated !== undefined) {
                where.compensated = options.compensated;
            }

            if (options.dateRange) {
                where.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                    { model: Position, as: 'position', attributes: ['id', 'title'] },
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: User, as: 'rejectedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find overtime records by status
     * @param {string} status - Overtime status
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overtime records
     */
    async findByStatus(status, options = {}) {
        try {
            const where = { status };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.employeeId) {
                where.employee_id = options.employeeId;
            }

            if (options.compensationType) {
                where.compensation_type = options.compensationType;
            }

            if (options.dateRange) {
                where.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: User, as: 'rejectedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find pending overtime for approval
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Pending overtime records
     */
    async findPendingOvertime(departmentId = null, options = {}) {
        try {
            const where = { status: 'pending' };

            if (departmentId) {
                where.department_id = departmentId;
            }

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    {
                        model: User,
                        as: 'employee',
                        attributes: ['id', 'first_name', 'last_name', 'employee_id', 'email', 'department_id', 'position_id'],
                        include: [
                            { model: Department, as: 'department', attributes: ['id', 'name', 'code', 'manager_id'] },
                            { model: Position, as: 'position', attributes: ['id', 'title', 'code'] }
                        ]
                    },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
                ],
                order: [['created_at', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findPendingOvertime');
        }
    }

    /**
     * Find overtime by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overtime records
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const where = { department_id: departmentId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.status) {
                where.status = options.status;
            }

            if (options.compensationType) {
                where.compensation_type = options.compensationType;
            }

            if (options.dateRange) {
                where.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    {
                        model: User,
                        as: 'employee',
                        attributes: ['id', 'first_name', 'last_name', 'employee_id', 'position_id'],
                        include: [{ model: Position, as: 'position', attributes: ['id', 'title', 'code'] }]
                    },
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: User, as: 'rejectedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find overtime by compensation type
     * @param {string} compensationType - Compensation type
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overtime records
     */
    async findByCompensationType(compensationType, options = {}) {
        try {
            const where = { compensation_type: compensationType };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.status) {
                where.status = options.status;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.compensated !== undefined) {
                where.compensated = options.compensated;
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByCompensationType');
        }
    }

    /**
     * Find uncompensated overtime
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Uncompensated overtime records
     */
    async findUncompensatedOvertime(options = {}) {
        try {
            const where = {
                status: 'approved',
                compensated: false
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.employeeId) {
                where.employee_id = options.employeeId;
            }

            if (options.compensationType) {
                where.compensation_type = options.compensationType;
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findUncompensatedOvertime');
        }
    }

    /**
     * Get overtime by date range
     * @param {string} employeeId - Employee ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overtime records
     */
    async findByDateRange(employeeId, startDate, endDate, options = {}) {
        try {
            const where = {
                employee_id: employeeId,
                date: { [Op.gte]: startDate, [Op.lte]: endDate }
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.status) {
                where.status = options.status;
            }

            return await this.findAll({
                where,
                tenantId: options.tenantId,
                include: [
                    { model: User, as: 'approvedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { model: User, as: 'rejectedBy', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['date', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDateRange');
        }
    }

    /**
     * Get monthly overtime statistics
     * @param {string} employeeId - Employee ID
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Monthly statistics
     */
    async getMonthlyStats(employeeId, year, month, options = {}) {
        try {
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59);

            const where = {
                employee_id: employeeId,
                date: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            const results = await this.model.findAll({
                where,
                attributes: [
                    'compensation_type',
                    'status',
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('duration')), 'totalHours']
                ],
                group: ['compensation_type', 'status'],
                raw: true
            });

            return results;
        } catch (error) {
            throw this._handleError(error, 'getMonthlyStats');
        }
    }

    /**
     * Get total uncompensated hours for employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Uncompensated hours by type
     */
    async getTotalUncompensatedHours(employeeId, options = {}) {
        try {
            const where = {
                employee_id: employeeId,
                status: 'approved',
                compensated: false
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            const results = await this.model.findAll({
                where,
                attributes: [
                    'compensation_type',
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('duration')), 'totalHours'],
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count']
                ],
                group: ['compensation_type'],
                raw: true
            });

            return results;
        } catch (error) {
            throw this._handleError(error, 'getTotalUncompensatedHours');
        }
    }

    /**
     * Get overtime analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Overtime analytics
     */
    async getOvertimeAnalytics(filters = {}, options = {}) {
        try {
            const where = {};

            if (filters.tenantId) {
                where.tenant_id = filters.tenantId;
            }

            if (filters.departmentId) {
                where.department_id = filters.departmentId;
            }

            if (filters.dateRange) {
                where.date = {
                    [Op.gte]: filters.dateRange.startDate,
                    [Op.lte]: filters.dateRange.endDate
                };
            }

            if (filters.employeeIds && filters.employeeIds.length > 0) {
                where.employee_id = { [Op.in]: filters.employeeIds };
            }

            const monthlyAnalytics = await this.model.findAll({
                where,
                attributes: [
                    'compensation_type',
                    'status',
                    [this.model.sequelize.fn('EXTRACT', this.model.sequelize.literal('MONTH FROM date')), 'month'],
                    [this.model.sequelize.fn('EXTRACT', this.model.sequelize.literal('YEAR FROM date')), 'year'],
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('duration')), 'totalHours'],
                    [this.model.sequelize.fn('AVG', this.model.sequelize.col('duration')), 'avgHours'],
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.literal('DISTINCT employee_id')), 'employeeCount'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal('CASE WHEN compensated THEN 1 ELSE 0 END')), 'compensatedCount']
                ],
                group: ['compensation_type', 'status', this.model.sequelize.literal('EXTRACT(MONTH FROM date)'), this.model.sequelize.literal('EXTRACT(YEAR FROM date)')],
                order: [[this.model.sequelize.literal('EXTRACT(YEAR FROM date)'), 'DESC'], [this.model.sequelize.literal('EXTRACT(MONTH FROM date)'), 'DESC'], ['compensation_type', 'ASC']],
                raw: true
            });

            // Get compensation analytics
            const compensationAnalytics = await this.model.findAll({
                where,
                attributes: [
                    'compensation_type',
                    'compensated',
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('duration')), 'totalHours']
                ],
                group: ['compensation_type', 'compensated'],
                raw: true
            });

            return {
                monthlyAnalytics,
                compensationAnalytics
            };
        } catch (error) {
            throw this._handleError(error, 'getOvertimeAnalytics');
        }
    }

    /**
     * Approve overtime
     * @param {string} overtimeId - Overtime ID
     * @param {string} approverId - Approver user ID
     * @param {string} [notes] - Approval notes
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated overtime record
     */
    async approveOvertime(overtimeId, approverId, notes = '', options = {}) {
        try {
            const updateData = {
                status: 'approved',
                approved_by_id: approverId,
                approved_at: new Date()
            };

            if (notes && typeof notes === 'string') {
                updateData.approver_notes = notes.trim();
            }

            return await this.update(overtimeId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'approveOvertime');
        }
    }

    /**
     * Reject overtime
     * @param {string} overtimeId - Overtime ID
     * @param {string} rejecterId - Rejector user ID
     * @param {string} reason - Rejection reason
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated overtime record
     */
    async rejectOvertime(overtimeId, rejecterId, reason, options = {}) {
        try {
            const updateData = {
                status: 'rejected',
                rejected_by_id: rejecterId,
                rejected_at: new Date(),
                rejection_reason: reason && typeof reason === 'string' ? reason.trim() : ''
            };

            return await this.update(overtimeId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'rejectOvertime');
        }
    }

    /**
     * Mark overtime as compensated
     * @param {string} overtimeId - Overtime ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated overtime record
     */
    async markCompensated(overtimeId, options = {}) {
        try {
            const updateData = {
                compensated: true,
                compensated_at: new Date()
            };

            return await this.update(overtimeId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'markCompensated');
        }
    }

    /**
     * Bulk mark overtime as compensated
     * @param {Array} overtimeIds - Array of overtime IDs
     * @param {Object} [options] - Update options
     * @returns {Promise<Array>} Updated overtime records
     */
    async bulkMarkCompensated(overtimeIds, options = {}) {
        try {
            return await this.withTransaction(async (session) => {
                const results = [];
                
                for (const overtimeId of overtimeIds) {
                    const result = await this.markCompensated(overtimeId, { ...options, session });
                    if (result) {
                        results.push(result);
                    }
                }
                
                return results;
            });
        } catch (error) {
            throw this._handleError(error, 'bulkMarkCompensated');
        }
    }

    /**
     * Calculate overtime duration from time strings
     * @param {string} startTime - Start time (HH:MM format)
     * @param {string} endTime - End time (HH:MM format)
     * @returns {number} Duration in hours
     */
    calculateOvertimeDuration(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        const durationMinutes = endMinutes - startMinutes;
        return durationMinutes / 60; // Convert to hours
    }

    /**
     * Get overtime summary for employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Overtime summary
     */
    async getEmployeeOvertimeSummary(employeeId, options = {}) {
        try {
            const where = { employee_id: employeeId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.dateRange) {
                where.date = {
                    [Op.gte]: options.dateRange.startDate,
                    [Op.lte]: options.dateRange.endDate
                };
            }

            const result = await this.model.findOne({
                where,
                attributes: [
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'totalRequests'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN status = 'approved' THEN 1 ELSE 0 END")), 'approvedRequests'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN status = 'rejected' THEN 1 ELSE 0 END")), 'rejectedRequests'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pendingRequests'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('duration')), 'totalHours'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN status = 'approved' THEN duration ELSE 0 END")), 'approvedHours'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN compensated THEN duration ELSE 0 END")), 'compensatedHours'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN status = 'approved' AND NOT compensated THEN duration ELSE 0 END")), 'uncompensatedHours']
                ],
                raw: true
            });

            return result || {
                totalRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                pendingRequests: 0,
                totalHours: 0,
                approvedHours: 0,
                compensatedHours: 0,
                uncompensatedHours: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getEmployeeOvertimeSummary');
        }
    }
}

export default OvertimeRepository;