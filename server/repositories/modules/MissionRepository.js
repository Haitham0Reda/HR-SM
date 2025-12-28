import BaseRepository from '../BaseRepository.js';
import Mission from '../../modules/hr-core/missions/models/Mission.js';
import mongoose from 'mongoose';

/**
 * Repository for Mission model operations with status and analytics
 */
class MissionRepository extends BaseRepository {
    constructor() {
        super(Mission);
    }

    /**
     * Find missions by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission records
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
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find missions by status
     * @param {string} status - Mission status
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission records
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

            if (options.dateRange) {
                filter.startDate = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find pending missions for approval
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Pending mission records
     */
    async findPendingMissions(departmentId = null, options = {}) {
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
                    { path: 'employee', select: 'firstName lastName employeeId department' },
                    { path: 'department', select: 'name code' }
                ],
                sort: { createdAt: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findPendingMissions');
        }
    }

    /**
     * Find active missions (currently ongoing)
     * @param {string} [departmentId] - Optional department filter
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Active mission records
     */
    async findActiveMissions(departmentId = null, options = {}) {
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
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { endDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findActiveMissions');
        }
    }

    /**
     * Find upcoming missions
     * @param {number} [daysAhead=30] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Upcoming mission records
     */
    async findUpcomingMissions(daysAhead = 30, options = {}) {
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
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findUpcomingMissions');
        }
    }

    /**
     * Find missions by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission records
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
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find missions by destination
     * @param {string} destination - Mission destination
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission records
     */
    async findByDestination(destination, options = {}) {
        try {
            const filter = {
                destination: { $regex: destination, $options: 'i' }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDestination');
        }
    }

    /**
     * Find missions by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission records
     */
    async findByDateRange(startDate, endDate, options = {}) {
        try {
            const filter = {
                $or: [
                    {
                        startDate: { $gte: startDate, $lte: endDate }
                    },
                    {
                        endDate: { $gte: startDate, $lte: endDate }
                    },
                    {
                        startDate: { $lte: startDate },
                        endDate: { $gte: endDate }
                    }
                ]
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'approvedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { startDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDateRange');
        }
    }

    /**
     * Get mission statistics for a department
     * @param {string} departmentId - Department ID
     * @param {number} [year] - Year for statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Mission statistics
     */
    async getMissionStats(departmentId, year = new Date().getFullYear(), options = {}) {
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
                            status: '$status',
                            month: { $month: '$startDate' }
                        },
                        count: { $sum: 1 },
                        avgDuration: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$endDate', '$startDate'] },
                                    1000 * 60 * 60 * 24 // Convert to days
                                ]
                            }
                        }
                    }
                },
                {
                    $sort: { '_id.month': 1, '_id.status': 1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getMissionStats');
        }
    }

    /**
     * Get mission analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Mission analytics
     */
    async getMissionAnalytics(filters = {}, options = {}) {
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
                            status: '$status',
                            destination: '$destination',
                            month: { $month: '$startDate' },
                            year: { $year: '$startDate' }
                        },
                        count: { $sum: 1 },
                        avgDuration: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$endDate', '$startDate'] },
                                    1000 * 60 * 60 * 24 // Convert to days
                                ]
                            }
                        },
                        employees: { $addToSet: '$employee' }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.status': 1 }
                }
            ];

            const monthlyAnalytics = await this.model.aggregate(pipeline);

            // Get destination analytics
            const destinationAnalytics = await this.model.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$destination',
                        count: { $sum: 1 },
                        employees: { $addToSet: '$employee' },
                        avgDuration: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$endDate', '$startDate'] },
                                    1000 * 60 * 60 * 24
                                ]
                            }
                        }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            return {
                monthlyAnalytics,
                destinationAnalytics
            };
        } catch (error) {
            throw this._handleError(error, 'getMissionAnalytics');
        }
    }

    /**
     * Approve mission
     * @param {string} missionId - Mission ID
     * @param {string} approverId - Approver user ID
     * @param {string} [notes] - Approval notes
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated mission record
     */
    async approveMission(missionId, approverId, notes = '', options = {}) {
        try {
            const updateData = {
                status: 'approved',
                approvedBy: approverId,
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

    /**
     * Reject mission
     * @param {string} missionId - Mission ID
     * @param {string} rejecterId - Rejector user ID
     * @param {string} reason - Rejection reason
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated mission record
     */
    async rejectMission(missionId, rejecterId, reason, options = {}) {
        try {
            const updateData = {
                status: 'rejected',
                approvedBy: rejecterId,
                approvedAt: new Date(),
                notes: reason && typeof reason === 'string' ? reason.trim() : ''
            };

            return await this.update(missionId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'rejectMission');
        }
    }

    /**
     * Complete mission
     * @param {string} missionId - Mission ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated mission record
     */
    async completeMission(missionId, options = {}) {
        try {
            const updateData = {
                status: 'completed'
            };

            return await this.update(missionId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'completeMission');
        }
    }

    /**
     * Cancel mission
     * @param {string} missionId - Mission ID
     * @param {string} reason - Cancellation reason
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated mission record
     */
    async cancelMission(missionId, reason, options = {}) {
        try {
            const updateData = {
                status: 'cancelled',
                notes: reason && typeof reason === 'string' ? reason.trim() : ''
            };

            return await this.update(missionId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'cancelMission');
        }
    }

    /**
     * Calculate mission duration in days
     * @param {Date} startDate - Mission start date
     * @param {Date} endDate - Mission end date
     * @returns {number} Duration in days
     */
    calculateMissionDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Reset time to start of day for accurate comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        const diffTime = end - start;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    }

    /**
     * Get popular destinations
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Popular destinations with counts
     */
    async getPopularDestinations(options = {}) {
        try {
            const matchFilter = {};

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(options.departmentId);
            }

            if (options.dateRange) {
                matchFilter.startDate = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$destination',
                        count: { $sum: 1 },
                        employees: { $addToSet: '$employee' },
                        lastMission: { $max: '$startDate' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: options.limit || 10 }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getPopularDestinations');
        }
    }
}

export default MissionRepository;