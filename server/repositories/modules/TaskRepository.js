import BaseRepository from '../BaseRepository.js';
import Task from '../../modules/tasks/models/Task.js';
import mongoose from 'mongoose';

/**
 * Repository for Task model operations with status and assignment queries
 */
class TaskRepository extends BaseRepository {
    constructor() {
        super(Task);
    }

    /**
     * Find tasks by assigned user
     * @param {string} userId - User ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Task records
     */
    async findByAssignedTo(userId, options = {}) {
        try {
            const filter = { assignedTo: userId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.priority) {
                filter.priority = options.priority;
            }

            if (options.dateRange) {
                if (options.dateRange.startDate) {
                    filter.startDate = { $gte: options.dateRange.startDate };
                }
                if (options.dateRange.endDate) {
                    filter.dueDate = { $lte: options.dateRange.endDate };
                }
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1, priority: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByAssignedTo');
        }
    }

    /**
     * Find tasks by assigner
     * @param {string} userId - User ID who assigned the tasks
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Task records
     */
    async findByAssignedBy(userId, options = {}) {
        try {
            const filter = { assignedBy: userId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.priority) {
                filter.priority = options.priority;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByAssignedBy');
        }
    }

    /**
     * Find tasks by status
     * @param {string} status - Task status
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Task records
     */
    async findByStatus(status, options = {}) {
        try {
            const filter = { status };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.assignedTo) {
                filter.assignedTo = options.assignedTo;
            }

            if (options.assignedBy) {
                filter.assignedBy = options.assignedBy;
            }

            if (options.priority) {
                filter.priority = options.priority;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1, priority: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find tasks by priority
     * @param {string} priority - Task priority
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Task records
     */
    async findByPriority(priority, options = {}) {
        try {
            const filter = { priority };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            if (options.assignedTo) {
                filter.assignedTo = options.assignedTo;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByPriority');
        }
    }

    /**
     * Find overdue tasks
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Overdue task records
     */
    async findOverdueTasks(options = {}) {
        try {
            const now = new Date();
            const filter = {
                dueDate: { $lt: now },
                status: { $nin: ['completed', 'rejected'] }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.assignedTo) {
                filter.assignedTo = options.assignedTo;
            }

            if (options.assignedBy) {
                filter.assignedBy = options.assignedBy;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1, priority: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findOverdueTasks');
        }
    }

    /**
     * Find tasks due soon
     * @param {number} [daysAhead=7] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Tasks due soon
     */
    async findTasksDueSoon(daysAhead = 7, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            const filter = {
                dueDate: { $gte: now, $lte: futureDate },
                status: { $nin: ['completed', 'rejected'] }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.assignedTo) {
                filter.assignedTo = options.assignedTo;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1, priority: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findTasksDueSoon');
        }
    }

    /**
     * Find tasks by tags
     * @param {Array} tags - Array of tags to search for
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Task records
     */
    async findByTags(tags, options = {}) {
        try {
            const filter = { tags: { $in: tags } };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.status) {
                filter.status = options.status;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'assignedTo', select: 'firstName lastName employeeId' },
                    { path: 'assignedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { dueDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByTags');
        }
    }

    /**
     * Get task statistics for a user
     * @param {string} userId - User ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Task statistics
     */
    async getUserTaskStats(userId, options = {}) {
        try {
            const filter = { assignedTo: userId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.dateRange) {
                filter.createdAt = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            const pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: {
                            status: '$status',
                            priority: '$priority'
                        },
                        count: { $sum: 1 }
                    }
                }
            ];

            const results = await this.model.aggregate(pipeline);

            // Calculate additional metrics
            const now = new Date();
            const overdueCount = await this.count({
                ...filter,
                dueDate: { $lt: now },
                status: { $nin: ['completed', 'rejected'] }
            });

            const completedOnTimeCount = await this.count({
                ...filter,
                status: 'completed',
                completedAt: { $lte: '$dueDate' }
            });

            const totalCompleted = await this.count({
                ...filter,
                status: 'completed'
            });

            return {
                statusBreakdown: results,
                overdue: overdueCount,
                completedOnTime: completedOnTimeCount,
                totalCompleted,
                onTimeRate: totalCompleted > 0 ? (completedOnTimeCount / totalCompleted) * 100 : 0
            };
        } catch (error) {
            throw this._handleError(error, 'getUserTaskStats');
        }
    }

    /**
     * Get task analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Task analytics
     */
    async getTaskAnalytics(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.assignedBy) {
                matchFilter.assignedBy = new mongoose.Types.ObjectId(filters.assignedBy);
            }

            if (filters.assignedTo) {
                matchFilter.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
            }

            if (filters.dateRange) {
                matchFilter.createdAt = {
                    $gte: filters.dateRange.startDate,
                    $lte: filters.dateRange.endDate
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            status: '$status',
                            priority: '$priority',
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        avgDuration: {
                            $avg: {
                                $cond: [
                                    { $eq: ['$status', 'completed'] },
                                    {
                                        $divide: [
                                            { $subtract: ['$completedAt', '$createdAt'] },
                                            1000 * 60 * 60 * 24 // Convert to days
                                        ]
                                    },
                                    null
                                ]
                            }
                        }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.priority': -1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getTaskAnalytics');
        }
    }

    /**
     * Update task status
     * @param {string} taskId - Task ID
     * @param {string} status - New status
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated task
     */
    async updateTaskStatus(taskId, status, options = {}) {
        try {
            const updateData = { status };

            // Set completion timestamp if completing task
            if (status === 'completed') {
                updateData.completedAt = new Date();
            }

            return await this.update(taskId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateTaskStatus');
        }
    }

    /**
     * Add attachment to task
     * @param {string} taskId - Task ID
     * @param {Object} attachment - Attachment object
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated task
     */
    async addAttachment(taskId, attachment, options = {}) {
        try {
            const task = await this.findById(taskId, options);
            if (!task) {
                throw new Error('Task not found');
            }

            const attachmentData = {
                ...attachment,
                uploadedAt: new Date()
            };

            task.attachments.push(attachmentData);

            return await this.update(taskId, { attachments: task.attachments }, options);
        } catch (error) {
            throw this._handleError(error, 'addAttachment');
        }
    }

    /**
     * Remove attachment from task
     * @param {string} taskId - Task ID
     * @param {number} attachmentIndex - Index of attachment to remove
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated task
     */
    async removeAttachment(taskId, attachmentIndex, options = {}) {
        try {
            const task = await this.findById(taskId, options);
            if (!task) {
                throw new Error('Task not found');
            }

            if (attachmentIndex < 0 || attachmentIndex >= task.attachments.length) {
                throw new Error('Invalid attachment index');
            }

            task.attachments.splice(attachmentIndex, 1);

            return await this.update(taskId, { attachments: task.attachments }, options);
        } catch (error) {
            throw this._handleError(error, 'removeAttachment');
        }
    }

    /**
     * Add tags to task
     * @param {string} taskId - Task ID
     * @param {Array} tags - Array of tags to add
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated task
     */
    async addTags(taskId, tags, options = {}) {
        try {
            const task = await this.findById(taskId, options);
            if (!task) {
                throw new Error('Task not found');
            }

            // Add new tags, avoiding duplicates
            const existingTags = task.tags || [];
            const newTags = tags.filter(tag => !existingTags.includes(tag));
            const updatedTags = [...existingTags, ...newTags];

            return await this.update(taskId, { tags: updatedTags }, options);
        } catch (error) {
            throw this._handleError(error, 'addTags');
        }
    }

    /**
     * Remove tags from task
     * @param {string} taskId - Task ID
     * @param {Array} tags - Array of tags to remove
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated task
     */
    async removeTags(taskId, tags, options = {}) {
        try {
            const task = await this.findById(taskId, options);
            if (!task) {
                throw new Error('Task not found');
            }

            const updatedTags = (task.tags || []).filter(tag => !tags.includes(tag));

            return await this.update(taskId, { tags: updatedTags }, options);
        } catch (error) {
            throw this._handleError(error, 'removeTags');
        }
    }

    /**
     * Get all unique tags
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of unique tags
     */
    async getAllTags(options = {}) {
        try {
            const matchFilter = {};

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            const pipeline = [
                { $match: matchFilter },
                { $unwind: '$tags' },
                { $group: { _id: '$tags' } },
                { $sort: { _id: 1 } }
            ];

            const results = await this.model.aggregate(pipeline);
            return results.map(result => result._id);
        } catch (error) {
            throw this._handleError(error, 'getAllTags');
        }
    }
}

export default TaskRepository;