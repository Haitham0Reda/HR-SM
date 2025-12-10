/**
 * Backup Execution Controller
 * 
 * Manages backup execution operations and history
 */
import BackupExecution from '../models/backupExecution.model.js';
import Backup from '../models/backup.model.js';
import SecurityAudit from '../models/securityAudit.model.js';

/**
 * Get all backup executions
 */
export const getAllBackupExecutions = async (req, res) => {
    try {
        const { status, executionType, page = 1, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (executionType) query.executionType = executionType;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const executions = await BackupExecution.find(query)
            .populate('backup', 'name backupType')
            .populate('triggeredBy', 'username email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await BackupExecution.countDocuments(query);

        res.status(200).json({
            success: true,
            executions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get backup execution by ID
 */
export const getBackupExecutionById = async (req, res) => {
    try {
        const execution = await BackupExecution.findById(req.params.id)
            .populate('backup', 'name backupType description')
            .populate('triggeredBy', 'username email');

        if (!execution) {
            return res.status(404).json({ error: 'Backup execution not found' });
        }

        res.status(200).json({
            success: true,
            execution
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get execution history for a specific backup
 */
export const getBackupExecutionHistory = async (req, res) => {
    try {
        const { backupId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;

        // Check if backup exists
        const backup = await Backup.findById(backupId);
        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        const options = {
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        };

        if (status) {
            options.status = status;
        }

        const executions = await BackupExecution.getHistory(backupId, options);

        const total = await BackupExecution.countDocuments({ backup: backupId, ...(status && { status }) });

        res.status(200).json({
            success: true,
            executions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get backup execution statistics
 */
export const getBackupExecutionStats = async (req, res) => {
    try {
        const { backupId, days = 30 } = req.query;

        let stats;
        if (backupId) {
            // Get stats for specific backup
            const backup = await Backup.findById(backupId);
            if (!backup) {
                return res.status(404).json({ error: 'Backup configuration not found' });
            }
            stats = await BackupExecution.getStatistics(backupId, parseInt(days));
        } else {
            // Get overall stats
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

            stats = await BackupExecution.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateThreshold }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgDuration: { $avg: '$duration' },
                        totalSize: { $sum: '$backupSize' },
                        avgSize: { $avg: '$backupSize' }
                    }
                }
            ]);
        }

        res.status(200).json({
            success: true,
            stats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get failed executions
 */
export const getFailedExecutions = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const executions = await BackupExecution.find({ status: 'failed' })
            .populate('backup', 'name backupType')
            .populate('triggeredBy', 'username email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await BackupExecution.countDocuments({ status: 'failed' });

        res.status(200).json({
            success: true,
            executions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get running executions
 */
export const getRunningExecutions = async (req, res) => {
    try {
        const executions = await BackupExecution.find({ status: 'running' })
            .populate('backup', 'name backupType')
            .populate('triggeredBy', 'username email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            executions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cancel a running backup execution
 */
export const cancelBackupExecution = async (req, res) => {
    try {
        const execution = await BackupExecution.findById(req.params.id);

        if (!execution) {
            return res.status(404).json({ error: 'Backup execution not found' });
        }

        if (execution.status !== 'running') {
            return res.status(400).json({ error: 'Backup execution is not running' });
        }

        execution.status = 'cancelled';
        execution.endTime = new Date();
        execution.duration = execution.endTime - execution.startTime;
        await execution.save();

        // Log cancellation
        await SecurityAudit.logEvent({
            eventType: 'backup-cancelled',
            user: req.user._id,
            username: req.user.username,
            userEmail: req.user.email,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                backupExecutionId: execution._id,
                backupName: execution.backupName
            },
            severity: 'info',
            success: true
        });

        res.status(200).json({
            success: true,
            message: 'Backup execution cancelled successfully',
            execution
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Retry a failed execution
 */
export const retryFailedExecution = async (req, res) => {
    try {
        const execution = await BackupExecution.findById(req.params.id);

        if (!execution) {
            return res.status(404).json({ error: 'Backup execution not found' });
        }

        if (execution.status !== 'failed') {
            return res.status(400).json({ error: 'Backup execution is not failed' });
        }

        // Find the original backup configuration
        const backup = await Backup.findById(execution.backup);
        if (!backup) {
            return res.status(404).json({ error: 'Backup configuration not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Retry functionality would be implemented here',
            backupId: backup._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete backup execution record
 */
export const deleteBackupExecution = async (req, res) => {
    try {
        const execution = await BackupExecution.findById(req.params.id);

        if (!execution) {
            return res.status(404).json({ error: 'Backup execution not found' });
        }

        await execution.remove();

        res.status(200).json({
            success: true,
            message: 'Backup execution record deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Export execution logs
 */
export const exportExecutionLogs = async (req, res) => {
    try {
        const { status, startDate, endDate, format = 'json' } = req.query;

        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const executions = await BackupExecution.find(query)
            .populate('backup', 'name backupType')
            .populate('triggeredBy', 'username email')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            let csv = 'ID,Backup Name,Status,Execution Type,Start Time,End Time,Duration,Size,Triggered By,Created At\n';
            executions.forEach(exec => {
                csv += `"${exec._id}","${exec.backupName}","${exec.status}","${exec.executionType}","${exec.startTime}","${exec.endTime}","${exec.duration}","${exec.backupSize}","${exec.triggeredBy?.username || 'System'}","${exec.createdAt}"\n`;
            });

            res.header('Content-Type', 'text/csv');
            res.attachment('backup-executions.csv');
            return res.send(csv);
        } else {
            // Default to JSON
            res.header('Content-Type', 'application/json');
            res.attachment('backup-executions.json');
            return res.status(200).json(executions);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};