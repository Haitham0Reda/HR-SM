/**
 * Report Controller
 * 
 * Manages custom reports, execution, and exports
 */
import Report from '../models/report.model.js';
import ReportExecution from '../models/reportExecution.model.js';
import User from '../../hr-core/users/models/user.model.js';
import Attendance from '../../hr-core/attendance/models/attendance.model.js';
import Vacation from '../../hr-core/vacations/models/vacation.model.js';
import Mission from '../../hr-core/missions/models/mission.model.js';
import SickLeave from '../../hr-core/vacations/models/sickLeave.model.js';
import Payroll from '../../payroll/models/payroll.model.js';
import Request from '../../hr-core/requests/models/request.model.js';

/**
 * Get all reports for user
 */
export const getAllReports = async (req, res) => {
    try {
        const { reportType, isTemplate, page = 1, limit = 50 } = req.query;

        const query = {
            $or: [
                { createdBy: req.user._id },
                { isPublic: true },
                { 'sharedWith.user': req.user._id }
            ],
            isActive: true
        };

        if (reportType) query.reportType = reportType;
        if (isTemplate !== undefined) query.isTemplate = isTemplate === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reports = await Report.find(query)
            .populate('createdBy', 'username email employeeId personalInfo')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Report.countDocuments(query);

        res.json({
            success: true,
            reports,
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
 * Get report by ID
 */
export const getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
            .populate('createdBy', 'username email profile')
            .populate('lastModifiedBy', 'username email')
            .populate('sharedWith.user', 'username email profile');

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Check access
        const hasAccess = report.isPublic ||
            report.createdBy._id.toString() === req.user._id.toString() ||
            report.sharedWith.some(s => s.user._id.toString() === req.user._id.toString()) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            success: true,
            report
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create new report
 */
export const createReport = async (req, res) => {
    try {
        const reportData = {
            ...req.body,
            createdBy: req.user._id
        };

        // Calculate next run if scheduled
        const report = new Report(reportData);
        if (report.schedule.enabled) {
            report.schedule.nextRun = report.calculateNextRun();
        }

        await report.save();
        await report.populate('createdBy', 'username email profile');

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            report
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update report
 */
export const updateReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Check edit permission
        const canEdit = report.createdBy.toString() === req.user._id.toString() ||
            report.sharedWith.some(s =>
                s.user.toString() === req.user._id.toString() && s.permission === 'edit'
            ) ||
            req.user.role === 'admin';

        if (!canEdit) {
            return res.status(403).json({ error: 'No edit permission' });
        }

        Object.assign(report, req.body);
        report.lastModifiedBy = req.user._id;

        // Recalculate next run if schedule changed
        if (report.schedule.enabled) {
            report.schedule.nextRun = report.calculateNextRun();
        }

        await report.save();
        await report.populate('createdBy lastModifiedBy', 'username email profile');

        res.json({
            success: true,
            message: 'Report updated successfully',
            report
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete report
 */
export const deleteReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Only creator or admin can delete
        if (report.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        report.isActive = false;
        await report.save();

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Execute report
 */
export const executeReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const { startDate, endDate, additionalFilters } = req.body;

        // Create execution record
        const execution = new ReportExecution({
            report: report._id,
            reportName: report.name,
            executedBy: req.user._id,
            executionType: 'manual',
            parameters: {
                startDate,
                endDate,
                filters: report.filters,
                additionalParams: additionalFilters
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            status: 'running'
        });

        await execution.save();

        try {
            // Execute report based on type
            const results = await executeReportQuery(report, { startDate, endDate, additionalFilters });

            // Mark as completed
            await execution.markCompleted(results.length, results);
            await report.recordRun();

            res.json({
                success: true,
                message: 'Report executed successfully',
                executionId: execution._id,
                results,
                count: results.length
            });
        } catch (error) {
            await execution.markFailed(error);
            throw error;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Helper: Execute report query
 */
async function executeReportQuery(report, params) {
    const { startDate, endDate, additionalFilters } = params;

    let Model;
    let query = {};

    // Select model based on report type
    switch (report.reportType) {
        case 'employee':
            Model = User;
            query.isActive = true;
            break;
        case 'attendance':
            Model = Attendance;
            if (startDate) query.date = { $gte: new Date(startDate) };
            if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
            break;
        case 'leave':
            // Legacy leave type - now split into vacation, mission, sick-leave
            // Default to vacation for backward compatibility
            Model = Vacation;
            if (startDate) query.startDate = { $gte: new Date(startDate) };
            if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };
            break;
        case 'vacation':
            Model = Vacation;
            if (startDate) query.startDate = { $gte: new Date(startDate) };
            if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };
            break;
        case 'mission':
            Model = Mission;
            if (startDate) query.startDate = { $gte: new Date(startDate) };
            if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };
            break;
        case 'sick-leave':
            Model = SickLeave;
            if (startDate) query.startDate = { $gte: new Date(startDate) };
            if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };
            break;
        case 'payroll':
            Model = Payroll;
            if (startDate) query.payPeriodStart = { $gte: new Date(startDate) };
            if (endDate) query.payPeriodEnd = { ...query.payPeriodEnd, $lte: new Date(endDate) };
            break;
        case 'request':
            Model = Request;
            break;
        default:
            throw new Error('Invalid report type');
    }

    // Apply filters
    report.filters.forEach(filter => {
        query = applyFilter(query, filter);
    });

    // Apply additional filters
    if (additionalFilters) {
        Object.assign(query, additionalFilters);
    }

    // Build field projection
    const projection = {};
    report.fields.forEach(field => {
        projection[field.fieldName] = 1;
    });

    // Execute query
    let queryBuilder = Model.find(query, projection);

    // Apply sorting
    if (report.sorting && report.sorting.length > 0) {
        const sortObj = {};
        report.sorting.forEach(sort => {
            sortObj[sort.field] = sort.order === 'asc' ? 1 : -1;
        });
        queryBuilder = queryBuilder.sort(sortObj);
    }

    // Apply grouping if specified
    if (report.groupBy && report.groupBy.length > 0) {
        // Use aggregation for grouping
        const pipeline = [
            { $match: query }
        ];

        const groupStage = {
            _id: {}
        };

        report.groupBy.forEach(field => {
            groupStage._id[field] = `$${field}`;
        });

        report.fields.forEach(field => {
            if (field.aggregation && field.aggregation !== 'none') {
                groupStage[field.fieldName] = {
                    [`$${field.aggregation}`]: `$${field.fieldName}`
                };
            }
        });

        pipeline.push({ $group: groupStage });

        return await Model.aggregate(pipeline);
    }

    return await queryBuilder.limit(10000).exec(); // Max 10k records
}

/**
 * Helper: Apply filter to query
 */
function applyFilter(query, filter) {
    const { field, operator, value } = filter;

    switch (operator) {
        case 'equals':
            query[field] = value;
            break;
        case 'notEquals':
            query[field] = { $ne: value };
            break;
        case 'contains':
            query[field] = { $regex: value, $options: 'i' };
            break;
        case 'notContains':
            query[field] = { $not: { $regex: value, $options: 'i' } };
            break;
        case 'startsWith':
            query[field] = { $regex: `^${value}`, $options: 'i' };
            break;
        case 'endsWith':
            query[field] = { $regex: `${value}$`, $options: 'i' };
            break;
        case 'greaterThan':
            query[field] = { $gt: value };
            break;
        case 'lessThan':
            query[field] = { $lt: value };
            break;
        case 'greaterThanOrEqual':
            query[field] = { $gte: value };
            break;
        case 'lessThanOrEqual':
            query[field] = { $lte: value };
            break;
        case 'between':
            query[field] = { $gte: value[0], $lte: value[1] };
            break;
        case 'in':
            query[field] = { $in: value };
            break;
        case 'notIn':
            query[field] = { $nin: value };
            break;
        case 'isNull':
            query[field] = null;
            break;
        case 'isNotNull':
            query[field] = { $ne: null };
            break;
    }

    return query;
}

/**
 * Export report
 */
export const exportReport = async (req, res) => {
    try {
        const { executionId } = req.params;
        const { format = 'excel' } = req.query;

        const execution = await ReportExecution.findById(executionId)
            .populate('report');

        if (!execution) {
            return res.status(404).json({ error: 'Report execution not found' });
        }

        const results = execution.resultData;

        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'No data to export' });
        }

        // Export based on format
        switch (format) {
            case 'csv':
                return exportToCSV(res, execution.reportName, results);
            case 'excel':
                return await exportToExcel(res, execution.reportName, results);
            case 'pdf':
                return await exportToPDF(res, execution.reportName, results, execution.report);
            case 'html':
                return exportToHTML(res, execution.reportName, results);
            default:
                return res.json({ success: true, results });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Helper: Export to CSV
 */
function exportToCSV(res, reportName, data) {
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',')
        )
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`${reportName}-${Date.now()}.csv`);
    res.send(csv);
}

/**
 * Helper: Export to Excel (placeholder)
 */
async function exportToExcel(res, reportName, data) {
    // Would require exceljs or similar library
    // For now, return CSV
    return exportToCSV(res, reportName, data);
}

/**
 * Helper: Export to PDF (placeholder)
 */
async function exportToPDF(res, reportName, data, report) {
    // Would require pdfkit or similar library
    // For now, return HTML
    return exportToHTML(res, reportName, data);
}

/**
 * Helper: Export to HTML
 */
function exportToHTML(res, reportName, data) {
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${reportName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>${reportName}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Total Records: ${data.length}</p>
    <table>
        <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
    </table>
</body>
</html>`;

    res.header('Content-Type', 'text/html');
    res.send(html);
}

/**
 * Get report templates
 */
export const getTemplates = async (req, res) => {
    try {
        const templates = await Report.getTemplates();

        res.json({
            success: true,
            templates
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get execution history
 */
export const getExecutionHistory = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { limit = 50, page = 1 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const history = await ReportExecution.getHistory(reportId, {
            limit: parseInt(limit),
            skip
        });

        const total = await ReportExecution.countDocuments({ report: reportId });

        res.json({
            success: true,
            history,
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
 * Get report statistics
 */
export const getReportStatistics = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { days = 30 } = req.query;

        const stats = await ReportExecution.getStatistics(reportId, parseInt(days));

        res.json({
            success: true,
            statistics: stats,
            period: `Last ${days} days`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Share report
 */
export const shareReport = async (req, res) => {
    try {
        const { userId, permission = 'view' } = req.body;

        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Only creator can share
        if (report.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if already shared
        const existing = report.sharedWith.find(s => s.user.toString() === userId);
        if (existing) {
            existing.permission = permission;
        } else {
            report.sharedWith.push({ user: userId, permission });
        }

        await report.save();
        await report.populate('sharedWith.user', 'username email profile');

        res.json({
            success: true,
            message: 'Report shared successfully',
            sharedWith: report.sharedWith
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Unshare report
 */
export const unshareReport = async (req, res) => {
    try {
        const { userId } = req.params;

        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Only creator can unshare
        if (report.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        report.sharedWith = report.sharedWith.filter(s => s.user.toString() !== userId);
        await report.save();

        res.json({
            success: true,
            message: 'Report unshared successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
