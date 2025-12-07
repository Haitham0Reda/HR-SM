import Task from '../models/Task.js';
import TaskReport from '../models/TaskReport.js';
import AuditLog from '../../hr-core/models/AuditLog.js';
import { sendNotification } from '../services/notificationService.js';
import { deleteFile } from '../../../shared/utils/fileUtils.js';

// Submit task report
export const submitTaskReport = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { reportText, timeSpent } = req.body;

        const task = await Task.findOne({
            _id: taskId,
            tenantId: req.tenantId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assignee can submit report
        if (!task.canSubmitReport(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned employee can submit a report'
            });
        }

        // Check if task is in correct status
        if (!['in-progress', 'rejected'].includes(task.status)) {
            return res.status(400).json({
                success: false,
                message: 'Task must be in-progress or rejected to submit a report'
            });
        }

        // Get previous version number
        const lastReport = await TaskReport.findOne({ task: taskId, tenantId: req.tenantId })
            .sort({ version: -1 });
        const version = lastReport ? lastReport.version + 1 : 1;

        // Handle file uploads
        const files = req.files ? req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date()
        })) : [];

        const report = await TaskReport.create({
            task: taskId,
            submittedBy: req.user.id,
            reportText,
            timeSpent,
            files,
            version,
            tenantId: req.tenantId,
            createdBy: req.user.id
        });

        // Update task status
        task.status = 'submitted';
        task.updatedBy = req.user.id;
        await task.save();

        await report.populate('submittedBy', 'firstName lastName email');

        // Log audit
        await AuditLog.create({
            action: 'create',
            resource: 'TaskReport',
            resourceId: report._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'tasks'
        });

        // Notify manager
        await sendNotification({
            type: 'report_submitted',
            recipientId: task.assignedBy,
            taskId: task._id,
            reportId: report._id,
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

// Get reports for a task
export const getTaskReports = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findOne({
            _id: taskId,
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

        const reports = await TaskReport.getHistoryForTask(taskId, req.tenantId);

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

// Get single report
export const getReport = async (req, res) => {
    try {
        const report = await TaskReport.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        })
            .populate('task')
            .populate('submittedBy', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName email');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Check access
        const task = report.task;
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

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Review report (approve/reject)
export const reviewReport = async (req, res) => {
    try {
        const { action, comments } = req.body; // action: 'approve' or 'reject'

        const report = await TaskReport.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        }).populate('task');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const task = report.task;

        // Only manager who assigned the task can review
        if (task.assignedBy.toString() !== req.user.id && !['Admin', 'HR'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only the task assigner can review this report'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Report has already been reviewed'
            });
        }

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
                message: 'Invalid action. Use "approve" or "reject"'
            });
        }

        await report.save();
        task.updatedBy = req.user.id;
        await task.save();

        await report.populate('submittedBy', 'firstName lastName email');
        await report.populate('reviewedBy', 'firstName lastName email');

        // Log audit
        await AuditLog.create({
            action: 'update',
            resource: 'TaskReport',
            resourceId: report._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'tasks',
            changes: { action, comments }
        });

        // Notify employee
        await sendNotification({
            type: action === 'approve' ? 'report_approved' : 'report_rejected',
            recipientId: report.submittedBy._id,
            taskId: task._id,
            reportId: report._id,
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

// Download report file
export const downloadReportFile = async (req, res) => {
    try {
        const { reportId, fileId } = req.params;

        const report = await TaskReport.findOne({
            _id: reportId,
            tenantId: req.tenantId
        }).populate('task');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const file = report.files.id(fileId);
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check access
        const task = report.task;
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

        res.download(file.path, file.originalName);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get report analytics
export const getReportAnalytics = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        const filter = { tenantId: req.tenantId };

        if (userId) {
            filter.submittedBy = userId;
        } else if (req.user.role === 'Employee') {
            filter.submittedBy = req.user.id;
        }

        if (startDate || endDate) {
            filter.submittedAt = {};
            if (startDate) filter.submittedAt.$gte = new Date(startDate);
            if (endDate) filter.submittedAt.$lte = new Date(endDate);
        }

        const [statusStats, avgReviewTime, resubmissionRate] = await Promise.all([
            TaskReport.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            TaskReport.aggregate([
                {
                    $match: {
                        ...filter,
                        reviewedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        reviewTime: { $subtract: ['$reviewedAt', '$submittedAt'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$reviewTime' }
                    }
                }
            ]),
            TaskReport.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$task',
                        versions: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalTasks: { $sum: 1 },
                        resubmitted: {
                            $sum: { $cond: [{ $gt: ['$versions', 1] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                statusDistribution: statusStats,
                avgReviewTime: avgReviewTime[0]?.avgTime || 0,
                resubmissionRate: resubmissionRate[0] || { totalTasks: 0, resubmitted: 0 }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
