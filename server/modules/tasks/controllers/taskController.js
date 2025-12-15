import Task from '../models/Task.js';
import TaskReport from '../models/TaskReport.js';
import AuditLog from '../../hr-core/models/AuditLog.js';
import { sendNotification } from '../services/notificationService.js';

// Create a new task
export const createTask = async (req, res) => {
    try {
        const { title, description, priority, assignedTo, startDate, dueDate, tags } = req.body;

        const task = await Task.create({
            title,
            description,
            priority,
            assignedTo,
            assignedBy: req.user.id,
            startDate,
            dueDate,
            tags,
            tenantId: req.tenantId
        });

        await task.populate('assignedTo', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');
        await task.populate('assignedBy', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');

        // Log audit
        await AuditLog.create({
            action: 'create',
            resource: 'Task',
            resourceId: task._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'tasks'
        });

        // Send notification to assignee
        await sendNotification({
            type: 'task_assigned',
            recipientId: assignedTo,
            taskId: task._id,
            tenantId: req.tenantId
        });

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get tasks (filtered by role)
export const getTasks = async (req, res) => {
    try {
        const { status, priority, assignedTo, assignedBy, page = 1, limit = 20 } = req.query;

        const filter = { tenantId: req.tenantId };

        // Role-based filtering
        if (req.user.role === 'Employee') {
            filter.assignedTo = req.user.id;
        } else if (req.user.role === 'Manager') {
            filter.$or = [
                { assignedBy: req.user.id },
                { assignedTo: req.user.id }
            ];
        }

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (assignedBy) filter.assignedBy = assignedBy;

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName')
            .populate('assignedBy', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Task.countDocuments(filter);

        res.json({
            success: true,
            data: tasks,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single task
export const getTask = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        })
            .populate('assignedTo', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName')
            .populate('assignedBy', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check access
        const canAccess =
            task.assignedTo._id.toString() === req.user.id ||
            task.assignedBy._id.toString() === req.user.id ||
            ['Admin', 'HR'].includes(req.user.role);

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update task
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assigner or admin can update
        if (!task.canModify(req.user.id) && !['Admin', 'HR'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only the task assigner can update this task'
            });
        }

        const allowedUpdates = ['title', 'description', 'priority', 'startDate', 'dueDate', 'tags', 'status'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        Object.assign(task, updates);
        task.updatedBy = req.user.id;
        await task.save();

        await task.populate('assignedTo', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');
        await task.populate('assignedBy', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update task status (for employees)
export const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assignee can update status
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned employee can update task status'
            });
        }

        // Validate status transition
        const validTransitions = {
            'assigned': ['in-progress'],
            'in-progress': ['submitted'],
            'rejected': ['in-progress']
        };

        if (!validTransitions[task.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${task.status} to ${status}`
            });
        }

        task.status = status;
        task.updatedBy = req.user.id;
        await task.save();

        // Notify manager when submitted
        if (status === 'submitted') {
            await sendNotification({
                type: 'task_submitted',
                recipientId: task.assignedBy,
                taskId: task._id,
                tenantId: req.tenantId
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (!task.canModify(req.user.id) && !['Admin', 'HR'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await task.deleteOne();

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get task analytics
export const getTaskAnalytics = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        const filter = { tenantId: req.tenantId };

        if (userId) {
            filter.assignedTo = userId;
        } else if (req.user.role === 'Manager') {
            filter.assignedBy = req.user.id;
        } else if (req.user.role === 'Employee') {
            filter.assignedTo = req.user.id;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [statusStats, priorityStats, completionRate, avgCompletionTime] = await Promise.all([
            Task.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Task.aggregate([
                { $match: filter },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Task.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        }
                    }
                }
            ]),
            Task.aggregate([
                {
                    $match: {
                        ...filter,
                        status: 'completed',
                        completedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        duration: { $subtract: ['$completedAt', '$startDate'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgDuration: { $avg: '$duration' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                statusDistribution: statusStats,
                priorityDistribution: priorityStats,
                completionRate: completionRate[0] || { total: 0, completed: 0 },
                avgCompletionTime: avgCompletionTime[0]?.avgDuration || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get task reports
export const getTaskReports = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check access
        const canAccess =
            task.assignedTo.toString() === req.user.id ||
            task.assignedBy.toString() === req.user.id ||
            ['Admin', 'HR'].includes(req.user.role);

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const reports = await TaskReport.getHistoryForTask(req.params.id, req.tenantId);

        res.json({
            success: true,
            data: reports
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create or update task report
export const upsertTaskReport = async (req, res) => {
    try {
        const { reportText, timeSpent } = req.body;

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assignee can create reports
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned employee can create reports'
            });
        }

        // Check if task is in correct status
        if (!['in-progress', 'rejected'].includes(task.status)) {
            return res.status(400).json({
                success: false,
                message: 'Task must be in progress or rejected to submit a report'
            });
        }

        // Get the latest report version
        const latestReport = await TaskReport.findOne({
            task: req.params.id,
            tenantId: req.tenantId
        }).sort({ version: -1 });

        const version = latestReport ? latestReport.version + 1 : 1;

        const report = await TaskReport.create({
            task: req.params.id,
            submittedBy: req.user.id,
            reportText,
            timeSpent,
            version,
            tenantId: req.tenantId
        });

        await report.populate('submittedBy', 'username email personalInfo.firstName personalInfo.lastName personalInfo.fullName');

        // Update task status to submitted
        task.status = 'submitted';
        task.updatedBy = req.user.id;
        await task.save();

        // Send notification to manager
        await sendNotification({
            type: 'task_report_submitted',
            recipientId: task.assignedBy,
            taskId: task._id,
            tenantId: req.tenantId
        });

        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Review task report
export const reviewTaskReport = async (req, res) => {
    try {
        const { action, comments } = req.body; // action: 'approve' or 'reject'

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assigner can review
        if (task.assignedBy.toString() !== req.user.id && !['Admin', 'HR'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only the task assigner can review reports'
            });
        }

        // Get the latest report
        const report = await TaskReport.getLatestForTask(req.params.id, req.tenantId);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'No report found for this task'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Report has already been reviewed'
            });
        }

        // Update report status
        if (action === 'approve') {
            report.approve(req.user.id, comments);
            task.status = 'completed';
            task.completedAt = new Date();
        } else if (action === 'reject') {
            report.reject(req.user.id, comments);
            task.status = 'rejected';
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "approve" or "reject"'
            });
        }

        await report.save();
        task.updatedBy = req.user.id;
        await task.save();

        // Send notification to employee
        await sendNotification({
            type: action === 'approve' ? 'task_approved' : 'task_rejected',
            recipientId: task.assignedTo,
            taskId: task._id,
            tenantId: req.tenantId
        });

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
