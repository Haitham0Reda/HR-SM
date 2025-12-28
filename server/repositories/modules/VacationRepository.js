import BaseRepository from '../BaseRepository.js';
import Vacation from '../../modules/hr-core/vacations/models/vacation.model.js';
import mongoose from 'mongoose';

/**
 * Repository for Vacation/Leave model operations with balance tracking and analytics
 */
class VacationRepository extends BaseRepository {
    constructor() {
        super(Vacation);
    }

    /**
     * Find vacations by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Vacation records
     */
    async findByEmployee(employeeId, options = {}) {
        try {
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.vacationType) {
                filter.vacationType = options.vacationType;
            }

            if (options.dateRange) {
                filter.$or = [
                    {
                        startDate: {
                            $gte: options.dateRange.startDate,
                            $lte: options.dateRange.endDate
                        }
                    },
                    {
                        endDate: {
                            $gte: options.dateRange.startDate,
                            $lte: options.dateRange.endDate
                        }
                    },
                    {
                        startDate: { $lte: options.dateRange.startDate },
                        endDate: { $gte: options.dateRange.endDate }
                    }
                ];
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    {
                        path: 'employee',
                        select: 'firstName lastName employeeId email',
                        populate: [
                            { path: 'department', select: 'name code manager' },
                            { path: 'position', select: 'title code' }
                        ]
                    },
                    { path: 'approvedBy rejectedBy cancelledBy', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'position', select: 'title' },
                    { path: 'vacationBalance' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find vacations by status
     * @param {string} status - Vacation status
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Vacation records
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

            if (options.vacationType) {
                filter.vacationType = options.vacationType;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    {
                        path: 'employee',
                        select: 'firstName lastName employeeId email department position',
                        populate: [
                            { path: 'department', select: 'name code manager' },
                            { path: 'position', select: 'title code' }
                        ]
                    },
                    { path: 'department', select: 'name code' },
                    { path: 'vacationBalance' }
                ],
                sort: { createdAt: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find pending vacations for approval
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Pending vacation records
     */
    async findPendingVacations(departmentId = null, options = {}) {
        try {
            const filter = { status: 'pending' };

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
                        select: 'firstName lastName employeeId email department position',
                        populate: [
                            { path: 'department', select: 'name code manager' },
                            { path: 'position', select: 'title code' }
                        ]
                    },
                    { path: 'department', select: 'name code' },
                    { path: 'vacationBalance' }
                ],
                sort: { createdAt: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findPendingVacations');
        }
    }

    /**
     * Find active vacations (currently ongoing)
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Active vacation records
     */
    async findActiveVacations(departmentId = null, options = {}) {
        try {
            const now = new Date();
            const filter = {
                status: 'approved',
                startDate: { $lte: now },
                endDate: { $gte: now }
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
                sort: { endDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findActiveVacations');
        }
    }

    /**
     * Find upcoming vacations
     * @param {number} [daysAhead=30] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Upcoming vacation records
     */
    async findUpcomingVacations(daysAhead = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            const filter = {
                status: 'approved',
                startDate: { $gt: now, $lte: futureDate }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
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
                sort: { startDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findUpcomingVacations');
        }
    }

    /**
     * Find vacations by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Vacation records
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const filter = { department: departmentId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.vacationType) {
                filter.vacationType = options.vacationType;
            }

            if (options.dateRange) {
                filter.$or = [
                    {
                        startDate: {
                            $gte: options.dateRange.startDate,
                            $lte: options.dateRange.endDate
                        }
                    },
                    {
                        endDate: {
                            $gte: options.dateRange.startDate,
                            $lte: options.dateRange.endDate
                        }
                    }
                ];
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    {
                        path: 'employee',
                        select: 'firstName lastName employeeId email position',
                        populate: { path: 'position', select: 'title code' }
                    },
                    { path: 'approvedBy rejectedBy cancelledBy', select: 'firstName lastName employeeId' },
                    { path: 'vacationBalance' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Check for overlapping vacations
     * @param {string} employeeId - Employee ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} [excludeVacationId] - Vacation ID to exclude from check
     * @param {Object} [options] - Query options
     * @returns {Promise<boolean>} True if overlapping vacation exists
     */
    async hasOverlappingVacation(employeeId, startDate, endDate, excludeVacationId = null, options = {}) {
        try {
            const filter = {
                employee: employeeId,
                status: { $in: ['pending', 'approved'] },
                $or: [
                    {
                        startDate: { $lte: endDate },
                        endDate: { $gte: startDate }
                    }
                ]
            };

            if (excludeVacationId) {
                filter._id = { $ne: excludeVacationId };
            }

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            const overlapping = await this.findOne(filter);
            return !!overlapping;
        } catch (error) {
            throw this._handleError(error, 'hasOverlappingVacation');
        }
    }

    /**
     * Get vacation statistics for a department
     * @param {string} departmentId - Department ID
     * @param {number} [year] - Year for statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Vacation statistics
     */
    async getVacationStats(departmentId, year = new Date().getFullYear(), options = {}) {
        try {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31, 23, 59, 59);

            const matchFilter = {
                department: new mongoose.Types.ObjectId(departmentId),
                startDate: { $gte: yearStart, $lte: yearEnd }
            };

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            vacationType: '$vacationType',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        totalDays: { $sum: '$duration' }
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getVacationStats');
        }
    }

    /**
     * Get vacation balance tracking
     * @param {string} employeeId - Employee ID
     * @param {number} [year] - Year for balance calculation
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Vacation balance summary
     */
    async getVacationBalance(employeeId, year = new Date().getFullYear(), options = {}) {
        try {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31, 23, 59, 59);

            const filter = {
                employee: employeeId,
                status: 'approved',
                startDate: { $gte: yearStart, $lte: yearEnd }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            const vacations = await this.find(filter);

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

    /**
     * Approve vacation
     * @param {string} vacationId - Vacation ID
     * @param {string} approverId - Approver user ID
     * @param {string} [notes] - Approval notes
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated vacation record
     */
    async approveVacation(vacationId, approverId, notes = '', options = {}) {
        try {
            const updateData = {
                status: 'approved',
                approvedBy: approverId,
                approvedAt: new Date()
            };

            if (notes && typeof notes === 'string') {
                updateData.approverNotes = notes.trim();
            }

            return await this.update(vacationId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'approveVacation');
        }
    }

    /**
     * Reject vacation
     * @param {string} vacationId - Vacation ID
     * @param {string} rejecterId - Rejector user ID
     * @param {string} reason - Rejection reason
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated vacation record
     */
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

    /**
     * Cancel vacation
     * @param {string} vacationId - Vacation ID
     * @param {string} userId - User ID who is cancelling
     * @param {string} reason - Cancellation reason
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated vacation record
     */
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

    /**
     * Get vacation analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Vacation analytics
     */
    async getVacationAnalytics(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(filters.departmentId);
            }

            if (filters.dateRange) {
                matchFilter.startDate = {
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
                            vacationType: '$vacationType',
                            status: '$status',
                            month: { $month: '$startDate' },
                            year: { $year: '$startDate' }
                        },
                        count: { $sum: 1 },
                        totalDays: { $sum: '$duration' },
                        avgDuration: { $avg: '$duration' },
                        employees: { $addToSet: '$employee' }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.vacationType': 1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getVacationAnalytics');
        }
    }

    /**
     * Calculate working days for vacation duration
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {number} Number of working days
     */
    calculateWorkingDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Reset time to start of day for accurate comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        let workingDays = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 6 = Saturday (weekend)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        return workingDays;
    }
}

export default VacationRepository;