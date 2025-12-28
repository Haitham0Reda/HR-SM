import BaseRepository from '../BaseRepository.js';
import Overtime from '../../modules/hr-core/overtime/models/overtime.model.js';
import mongoose from 'mongoose';

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
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.compensationType) {
                filter.compensationType = options.compensationType;
            }

            if (options.compensated !== undefined) {
                filter.compensated = options.compensated;
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
                    { path: 'department', select: 'name code' },
                    { path: 'position', select: 'title' },
                    { path: 'approvedBy rejectedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: -1 }
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
            const filter = { status };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.employeeId) {
                filter.employee = options.employeeId;
            }

            if (options.compensationType) {
                filter.compensationType = options.compensationType;
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
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy rejectedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: -1 }
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
                    { path: 'department', select: 'name code' }
                ],
                sort: { createdAt: 1 }
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
            const filter = { department: departmentId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.compensationType) {
                filter.compensationType = options.compensationType;
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
                    {
                        path: 'employee',
                        select: 'firstName lastName employeeId position',
                        populate: { path: 'position', select: 'title code' }
                    },
                    { path: 'approvedBy rejectedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: -1 }
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
            const filter = { compensationType };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.compensated !== undefined) {
                filter.compensated = options.compensated;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: -1 }
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
            const filter = {
                status: 'approved',
                compensated: false
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.employeeId) {
                filter.employee = options.employeeId;
            }

            if (options.compensationType) {
                filter.compensationType = options.compensationType;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: 1 }
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
            const filter = {
                employee: employeeId,
                date: { $gte: startDate, $lte: endDate }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'approvedBy rejectedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { date: 1 }
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

            const matchFilter = {
                employee: new mongoose.Types.ObjectId(employeeId),
                date: { $gte: monthStart, $lte: monthEnd }
            };

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            compensationType: '$compensationType',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        totalHours: { $sum: '$duration' }
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
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
            const matchFilter = {
                employee: new mongoose.Types.ObjectId(employeeId),
                status: 'approved',
                compensated: false
            };

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$compensationType',
                        totalHours: { $sum: '$duration' },
                        count: { $sum: 1 }
                    }
                }
            ];

            return await this.model.aggregate(pipeline);
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
                            compensationType: '$compensationType',
                            status: '$status',
                            month: { $month: '$date' },
                            year: { $year: '$date' }
                        },
                        count: { $sum: 1 },
                        totalHours: { $sum: '$duration' },
                        avgHours: { $avg: '$duration' },
                        employees: { $addToSet: '$employee' },
                        compensatedCount: {
                            $sum: { $cond: ['$compensated', 1, 0] }
                        }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.compensationType': 1 }
                }
            ];

            const monthlyAnalytics = await this.model.aggregate(pipeline);

            // Get compensation analytics
            const compensationAnalytics = await this.model.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            compensationType: '$compensationType',
                            compensated: '$compensated'
                        },
                        count: { $sum: 1 },
                        totalHours: { $sum: '$duration' }
                    }
                }
            ]);

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
                approvedBy: approverId,
                approvedAt: new Date()
            };

            if (notes && typeof notes === 'string') {
                updateData.approverNotes = notes.trim();
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
                rejectedBy: rejecterId,
                rejectedAt: new Date(),
                rejectionReason: reason && typeof reason === 'string' ? reason.trim() : ''
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
                compensatedAt: new Date()
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
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.dateRange) {
                filter.date = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            const pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalRequests: { $sum: 1 },
                        approvedRequests: {
                            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                        },
                        rejectedRequests: {
                            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                        },
                        pendingRequests: {
                            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                        },
                        totalHours: { $sum: '$duration' },
                        approvedHours: {
                            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$duration', 0] }
                        },
                        compensatedHours: {
                            $sum: { $cond: ['$compensated', '$duration', 0] }
                        },
                        uncompensatedHours: {
                            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'approved'] }, { $eq: ['$compensated', false] }] }, '$duration', 0] }
                        }
                    }
                }
            ];

            const result = await this.model.aggregate(pipeline);
            return result[0] || {
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