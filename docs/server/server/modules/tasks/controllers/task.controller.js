import Task from '../models/task.model.js';
import TaskReport from '../models/taskReport.model.js';
import User from '../../hr-core/users/models/user.model.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get tenant ID from request (in a real system, this would come from auth middleware)
const getTenantId = (req) => {
    // For now, we'll use a placeholder. In a real implementation, this would come from the authenticated user's tenant
    return req.user?.tenantId || 'default-tenant';
};

// Get all tasks for the current user
export const getUserTasks = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const tasks = await Task.find({
            $or: [
                { assignee: req.user._id },
                { assigner: req.user._id }
            ],
            tenantId
        })
            .populate('assignee', 'username personalInfo')
            .populate('assigner', 'username personalInfo')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get task by ID
export const getTaskById = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const task = await Task.findOne({
            _id: req.params.id,
            tenantId
        })
            .populate('assignee', 'username personalInfo')
            .populate('assigner', 'username personalInfo');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new task
export const createTask = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        // Only managers and above can create tasks
        if (!['manager', 'hr', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only managers can create tasks' });
        }

        const { title, description, priority, assignee, startDate, dueDate } = req.body;

        // Validate assignee exists
        const assigneeUser = await User.findById(assignee);
        if (!assigneeUser) {
            return res.status(404).json({ error: 'Assignee not found' });
        }

        const task = new Task({
            title,
            description,
            priority,
            assignee,
            assigner: req.user._id,
            startDate,
            dueDate,
            tenantId
        });

        await task.save();

        // Populate references
        await task.populate('assignee', 'username personalInfo');
        await task.populate('assigner', 'username personalInfo');

        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Update task
export const updateTask = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the assigner or admins can update the task
        if (task.assigner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to update this task' });
        }

        const { title, description, priority, assignee, startDate, dueDate, status } = req.body;

        // Validate assignee exists if being updated
        if (assignee) {
            const assigneeUser = await User.findById(assignee);
            if (!assigneeUser) {
                return res.status(404).json({ error: 'Assignee not found' });
            }
        }

        // Update allowed fields
        if (title) task.title = title;
        if (description) task.description = description;
        if (priority) task.priority = priority;
        if (assignee) task.assignee = assignee;
        if (startDate) task.startDate = startDate;
        if (dueDate) task.dueDate = dueDate;
        if (status) task.status = status;

        await task.save();

        // Populate references
        await task.populate('assignee', 'username personalInfo');
        await task.populate('assigner', 'username personalInfo');

        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the assigner or admins can delete the task
        if (task.assigner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this task' });
        }

        await task.remove();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update task status
export const updateTaskStatus = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { status } = req.body;

        const task = await Task.findOne({
            _id: req.params.id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Validate status transition
        const validTransitions = {
            'assigned': ['in-progress'],
            'in-progress': ['submitted'],
            'submitted': ['reviewed'],
            'reviewed': ['completed', 'rejected'],
            'completed': [],
            'rejected': ['in-progress']
        };

        // Check if the user is authorized to make this status change
        const isAssignee = task.assignee.toString() === req.user._id.toString();
        const isAssigner = task.assigner.toString() === req.user._id.toString();

        // Assignee can move from assigned -> in-progress -> submitted
        // Assigner can move from submitted -> reviewed -> completed/rejected
        // Assigner can also reject from reviewed back to in-progress
        if (isAssignee && ['assigned', 'in-progress', 'submitted'].includes(task.status) &&
            validTransitions[task.status].includes(status)) {
            task.status = status;
        } else if (isAssigner && ['submitted', 'reviewed'].includes(task.status) &&
            validTransitions[task.status].includes(status)) {
            task.status = status;
        } else {
            return res.status(403).json({ error: 'Not authorized to change task status' });
        }

        await task.save();

        // Populate references
        await task.populate('assignee', 'username personalInfo');
        await task.populate('assigner', 'username personalInfo');

        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get task reports for a task
export const getTaskReports = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        const reports = await TaskReport.find({
            taskId: req.params.id,
            tenantId
        })
            .populate('reviewedBy', 'username personalInfo')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create or update task report
export const upsertTaskReport = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { reportText, timeSpent } = req.body;

        // Check if task exists and user is the assignee
        const task = await Task.findOne({
            _id: req.params.id,
            assignee: req.user._id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        // Check if a report already exists for this task
        let report = await TaskReport.findOne({
            taskId: task._id,
            tenantId
        });

        if (!report) {
            // Create new report
            report = new TaskReport({
                taskId: task._id,
                reportText,
                timeSpent,
                tenantId
            });
        } else {
            // Update existing report if it's not yet submitted
            if (report.status !== 'draft') {
                return res.status(400).json({ error: 'Report already submitted' });
            }
            report.reportText = reportText;
            report.timeSpent = timeSpent;
        }

        await report.save();
        await report.populate('reviewedBy', 'username personalInfo');

        res.json(report);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Submit task report
export const submitTaskReport = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        // Check if task exists and user is the assignee
        const task = await Task.findOne({
            _id: req.params.id,
            assignee: req.user._id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        // Get or create report
        let report = await TaskReport.findOne({
            taskId: task._id,
            tenantId
        });

        if (!report) {
            return res.status(404).json({ error: 'No report found for this task' });
        }

        // Update task status to submitted
        task.status = 'submitted';
        await task.save();

        // Submit report
        report.status = 'submitted';
        report.submittedAt = new Date();
        await report.save();

        await report.populate('reviewedBy', 'username personalInfo');

        res.json({ task, report });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Review task report
export const reviewTaskReport = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { status, reviewComments } = req.body; // status: 'approved' or 'rejected'

        // Check if task exists and user is the assigner
        const task = await Task.findOne({
            _id: req.params.id,
            assigner: req.user._id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned by you' });
        }

        // Get report
        const report = await TaskReport.findOne({
            taskId: task._id,
            tenantId
        });

        if (!report) {
            return res.status(404).json({ error: 'No report found for this task' });
        }

        // Update report
        report.status = status; // 'approved' or 'rejected'
        report.reviewComments = reviewComments;
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        // Update task status based on review
        if (status === 'approved') {
            task.status = 'completed';
        } else if (status === 'rejected') {
            task.status = 'rejected';
        }
        await task.save();

        await report.populate('reviewedBy', 'username personalInfo');

        res.json({ task, report });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Upload file for task report
export const uploadReportFile = async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check if task exists and user is the assignee
        const task = await Task.findOne({
            _id: req.params.id,
            assignee: req.user._id,
            tenantId
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        // Get or create report
        let report = await TaskReport.findOne({
            taskId: task._id,
            tenantId
        });

        if (!report) {
            // Create new report if it doesn't exist
            report = new TaskReport({
                taskId: task._id,
                reportText: '',
                tenantId
            });
        }

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads', 'task-reports');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        // Move file to permanent location
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, req.file.buffer);

        // Add file to report
        if (!report.files) {
            report.files = [];
        }

        report.files.push({
            filename: fileName,
            originalName: req.file.originalname,
            path: filePath,
            size: req.file.size,
            mimeType: req.file.mimetype
        });

        await report.save();
        await report.populate('reviewedBy', 'username personalInfo');

        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Download report file
export const downloadReportFile = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { fileId } = req.params;

        // Find report containing the file
        const report = await TaskReport.findOne({
            'files.filename': fileId,
            tenantId
        });

        if (!report) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if user has access to this report
        const task = await Task.findById(report.taskId);
        if (!task ||
            (req.user._id.toString() !== task.assignee.toString() &&
                req.user._id.toString() !== task.assigner.toString() &&
                !['admin', 'hr'].includes(req.user.role))) {
            return res.status(403).json({ error: 'Not authorized to access this file' });
        }

        // Find the file
        const file = report.files.find(f => f.filename === fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Serve the file
        res.download(file.path, file.originalName);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};