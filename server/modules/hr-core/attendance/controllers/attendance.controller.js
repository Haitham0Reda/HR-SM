// Attendance Controller
import Attendance from '../models/attendance.model.js';
import { getHolidayInfo } from '../../holidays/utils/holidayChecker.js';
import logger from '../../../../utils/logger.js';
import multiTenantDB from '../../../../config/multiTenant.js';
import { 
    logControllerAction, 
    logControllerError, 
    logDataAccess, 
    logSecurityEvent,
    logAdminAction,
    withLogging 
} from '../../../../utils/controllerLogger.js';

// Helper function to get tenant-specific models with safe registration
const getTenantModels = async (tenantId) => {
    try {
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Import the tenant model registry
        const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
        
        // Register all HR models (User, Department, Position)
        const hrModels = await registerHRModels(tenantConnection);
        
        // Register Attendance model
        let TenantAttendance;
        if (tenantConnection.models.Attendance) {
            TenantAttendance = tenantConnection.models.Attendance;
        } else {
            TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);
        }
        
        return {
            Attendance: TenantAttendance,
            User: hrModels.User,
            Department: hrModels.Department,
            Position: hrModels.Position
        };
    } catch (error) {
        console.error(`Error getting tenant models for ${tenantId}:`, error.message);
        throw new Error(`Failed to get tenant models: ${error.message}`);
    }
};

export const getAllAttendance = async (req, res) => {
    try {
        // Log controller action start
        logControllerAction(req, 'getAllAttendance', {
            controller: 'AttendanceController',
            filters: req.query
        });

        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            logSecurityEvent(req, 'missing_tenant_context', {
                severity: 'medium',
                controller: 'AttendanceController',
                action: 'getAllAttendance'
            });
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        // Get tenant-specific models
        const { Attendance: TenantAttendance } = await getTenantModels(tenantId);

        // Build query with tenant isolation
        const query = { tenantId };
        
        // Extract query parameters for filtering
        const {
            department,
            departments, // Support multiple departments
            employee,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Department filtering
        if (department) {
            query.department = department;
        } else if (departments) {
            // Support multiple departments (comma-separated or array)
            const deptArray = Array.isArray(departments) 
                ? departments 
                : departments.split(',').map(d => d.trim());
            query.department = { $in: deptArray };
        }

        // Employee filtering
        if (employee) {
            query.employee = employee;
        }

        // Status filtering
        if (status) {
            const statusArray = Array.isArray(status) 
                ? status 
                : status.split(',').map(s => s.trim());
            query.status = { $in: statusArray };
        }

        // Date range filtering
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the entire end date
                query.date.$lte = end;
            }
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [attendance, totalCount] = await Promise.all([
            TenantAttendance.find(query)
                .populate('employee', 'username email employeeId personalInfo')
                .populate('department', 'name code')
                .populate('position', 'title')
                .populate('device', 'deviceName deviceType')
                .populate('approvedBy', 'username email personalInfo')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            TenantAttendance.countDocuments(query)
        ]);

        // Calculate summary statistics for the filtered results
        const summary = await TenantAttendance.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalHours: { $sum: '$hours.actual' }
                }
            }
        ]);

        // Get department summary if filtering by specific departments
        let departmentSummary = null;
        if (department || departments) {
            const deptQuery = { ...query };
            departmentSummary = await TenantAttendance.aggregate([
                { $match: deptQuery },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'department',
                        foreignField: '_id',
                        as: 'deptInfo'
                    }
                },
                { $unwind: '$deptInfo' },
                {
                    $group: {
                        _id: {
                            departmentId: '$department',
                            departmentName: '$deptInfo.name',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        totalHours: { $sum: '$hours.actual' }
                    }
                },
                {
                    $group: {
                        _id: {
                            departmentId: '$_id.departmentId',
                            departmentName: '$_id.departmentName'
                        },
                        statusBreakdown: {
                            $push: {
                                status: '$_id.status',
                                count: '$count',
                                totalHours: '$totalHours'
                            }
                        },
                        totalEmployees: { $sum: '$count' },
                        totalHours: { $sum: '$totalHours' }
                    }
                }
            ]);
        }

        // Log data access
        logDataAccess(req, 'attendance', {
            operation: 'read',
            recordsAccessed: attendance.length,
            filters: { department: department || departments, employee, status, startDate, endDate },
            sensitiveData: true
        });

        res.json({
            success: true,
            data: attendance,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalRecords: totalCount,
                limit: parseInt(limit),
                hasNext: skip + attendance.length < totalCount,
                hasPrev: parseInt(page) > 1
            },
            summary: summary.reduce((acc, item) => {
                acc[item._id] = {
                    count: item.count,
                    totalHours: item.totalHours
                };
                return acc;
            }, {}),
            departmentSummary,
            filters: {
                department: department || departments,
                employee,
                status,
                startDate,
                endDate
            }
        });
    } catch (err) {
        logControllerError(req, err, {
            controller: 'AttendanceController',
            action: 'getAllAttendance'
        });
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

export const createAttendance = async (req, res) => {
    try {
        // Log controller action start
        logControllerAction(req, 'createAttendance', {
            controller: 'AttendanceController',
            employeeId: req.body.employee,
            date: req.body.date
        });

        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            logSecurityEvent(req, 'missing_tenant_context', {
                severity: 'medium',
                controller: 'AttendanceController',
                action: 'createAttendance'
            });
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get tenant-specific models
        const { Attendance: TenantAttendance } = await getTenantModels(tenantId);

        const attendanceData = { ...req.body, tenantId };
        
        // Get holiday information for the date
        const holidayInfo = getHolidayInfo(attendanceData.date);
        
        // Automatically set weekend or official holiday
        if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
            attendanceData.status = 'absent';
            attendanceData.notes = holidayInfo.note || 'Official Holiday';
            attendanceData.isWorkingDay = false;
            // Remove check-in/check-out for holidays
            delete attendanceData.checkIn;
            delete attendanceData.checkOut;
        }
        
        const attendance = new TenantAttendance(attendanceData);
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        
        // Log data access for attendance creation
        logDataAccess(req, 'attendance', {
            operation: 'create',
            recordsAccessed: 1,
            recordIds: [attendance._id.toString()],
            sensitiveData: true,
            employeeId: attendanceData.employee
        });
        
        res.status(201).json(attendance);
    } catch (err) {
        logControllerError(req, err, {
            controller: 'AttendanceController',
            action: 'createAttendance'
        });
        res.status(400).json({ error: err.message });
    }
};

export const getAttendanceById = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const attendance = await Attendance.findOne({ _id: req.params.id, tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title');
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAttendance = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Get holiday information for the date if date is being updated
        if (updateData.date) {
            const holidayInfo = getHolidayInfo(updateData.date);
            
            // Automatically set weekend or official holiday
            if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
                updateData.status = 'absent';
                updateData.notes = holidayInfo.note || 'Official Holiday';
                updateData.isWorkingDay = false;
                // Remove check-in/check-out for holidays
                delete updateData.checkIn;
                delete updateData.checkOut;
            }
        }
        
        const attendance = await Attendance.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title');
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndDelete(req.params.id);
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json({ message: 'Attendance deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get today's attendance with department filtering
 */
export const getTodayAttendance = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Build query with tenant isolation
        const query = {
            tenantId,
            date: { $gte: today, $lt: tomorrow }
        };

        // Extract department filtering
        const { department, departments, status } = req.query;

        // Department filtering
        if (department) {
            query.department = department;
        } else if (departments) {
            const deptArray = Array.isArray(departments) 
                ? departments 
                : departments.split(',').map(d => d.trim());
            query.department = { $in: deptArray };
        }

        // Status filtering
        if (status) {
            const statusArray = Array.isArray(status) 
                ? status 
                : status.split(',').map(s => s.trim());
            query.status = { $in: statusArray };
        }
        
        const attendance = await Attendance.find(query)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('device', 'deviceName deviceType')
            .sort({ 'checkIn.time': -1 });
        
        // Calculate summary
        const summary = {
            total: attendance.length,
            present: 0,
            absent: 0,
            late: 0,
            earlyLeave: 0,
            onTime: 0,
            workFromHome: 0,
            onLeave: 0
        };
        
        attendance.forEach(record => {
            switch (record.status) {
                case 'on-time':
                case 'present':
                    summary.present++;
                    summary.onTime++;
                    break;
                case 'late':
                    summary.present++;
                    summary.late++;
                    break;
                case 'work-from-home':
                    summary.present++;
                    summary.workFromHome++;
                    break;
                case 'vacation':
                case 'sick-leave':
                case 'mission':
                    summary.onLeave++;
                    break;
                case 'absent':
                case 'forgot-check-in':
                case 'forgot-check-out':
                    if (record.isWorkingDay) {
                        summary.absent++;
                    }
                    break;
                default:
                    if (record.checkIn.time) {
                        summary.present++;
                    } else if (record.isWorkingDay) {
                        summary.absent++;
                    }
            }
            
            if (record.checkOut.isEarly) {
                summary.earlyLeave++;
            }
        });

        // Get department breakdown if multiple departments or no filter
        let departmentBreakdown = null;
        if (!department) {
            departmentBreakdown = await Attendance.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'department',
                        foreignField: '_id',
                        as: 'deptInfo'
                    }
                },
                { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            departmentId: '$department',
                            departmentName: '$deptInfo.name'
                        },
                        total: { $sum: 1 },
                        present: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['on-time', 'present', 'late', 'work-from-home']] },
                                    1, 0
                                ]
                            }
                        },
                        absent: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $in: ['$status', ['absent', 'forgot-check-in', 'forgot-check-out']] },
                                        { $eq: ['$isWorkingDay', true] }
                                    ]},
                                    1, 0
                                ]
                            }
                        },
                        late: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
                            }
                        },
                        onLeave: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['vacation', 'sick-leave', 'mission']] },
                                    1, 0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        departmentId: '$_id.departmentId',
                        departmentName: { $ifNull: ['$_id.departmentName', 'Unassigned'] },
                        total: 1,
                        present: 1,
                        absent: 1,
                        late: 1,
                        onLeave: 1,
                        _id: 0
                    }
                },
                { $sort: { departmentName: 1 } }
            ]);
        }
        
        res.json({
            success: true,
            date: today,
            summary,
            departmentBreakdown,
            data: attendance,
            filters: {
                department: department || departments,
                status
            }
        });
    } catch (error) {
        logger.error('Error fetching today\'s attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get monthly attendance with department filtering
 */
export const getMonthlyAttendance = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const { year, month, department, departments, employee } = req.query;
        
        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Build query with tenant isolation
        const query = {
            tenantId,
            date: { $gte: startDate, $lte: endDate }
        };

        // Department filtering
        if (department) {
            query.department = department;
        } else if (departments) {
            const deptArray = Array.isArray(departments) 
                ? departments 
                : departments.split(',').map(d => d.trim());
            query.department = { $in: deptArray };
        }

        // Employee filtering
        if (employee) {
            query.employee = employee;
        }
        
        const attendance = await Attendance.find(query)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('device', 'deviceName deviceType')
            .sort({ date: 1, 'employee.employeeId': 1 });
        
        // Calculate monthly summary
        const summary = {
            totalRecords: attendance.length,
            workingDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            earlyLeaveDays: 0,
            vacationDays: 0,
            sickLeaveDays: 0,
            missionDays: 0,
            workFromHomeDays: 0,
            totalHours: 0,
            expectedHours: 0,
            overtimeHours: 0
        };
        
        const uniqueDates = new Set();
        const employeeStats = new Map();
        
        attendance.forEach(record => {
            uniqueDates.add(record.date.toISOString().split('T')[0]);
            
            // Track per-employee stats
            const empId = record.employee._id.toString();
            if (!employeeStats.has(empId)) {
                employeeStats.set(empId, {
                    employee: record.employee,
                    department: record.department,
                    workingDays: 0,
                    presentDays: 0,
                    absentDays: 0,
                    lateDays: 0,
                    totalHours: 0,
                    expectedHours: 0
                });
            }
            const empStats = employeeStats.get(empId);
            
            if (record.isWorkingDay) {
                summary.workingDays++;
                empStats.workingDays++;
                summary.expectedHours += record.hours.expected;
                empStats.expectedHours += record.hours.expected;
            }
            
            summary.totalHours += record.hours.actual;
            summary.overtimeHours += record.hours.overtime;
            empStats.totalHours += record.hours.actual;
            
            switch (record.status) {
                case 'on-time':
                case 'present':
                    summary.presentDays++;
                    empStats.presentDays++;
                    break;
                case 'late':
                    summary.presentDays++;
                    summary.lateDays++;
                    empStats.presentDays++;
                    empStats.lateDays++;
                    break;
                case 'work-from-home':
                    summary.presentDays++;
                    summary.workFromHomeDays++;
                    empStats.presentDays++;
                    break;
                case 'vacation':
                    summary.vacationDays++;
                    break;
                case 'sick-leave':
                    summary.sickLeaveDays++;
                    break;
                case 'mission':
                    summary.missionDays++;
                    summary.presentDays++;
                    empStats.presentDays++;
                    break;
                case 'absent':
                case 'forgot-check-in':
                case 'forgot-check-out':
                    if (record.isWorkingDay) {
                        summary.absentDays++;
                        empStats.absentDays++;
                    }
                    break;
            }
            
            if (record.checkOut.isEarly) {
                summary.earlyLeaveDays++;
            }
        });
        
        summary.uniqueDates = uniqueDates.size;

        // Get department breakdown if not filtering by specific department
        let departmentBreakdown = null;
        if (!department) {
            departmentBreakdown = await Attendance.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'department',
                        foreignField: '_id',
                        as: 'deptInfo'
                    }
                },
                { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            departmentId: '$department',
                            departmentName: '$deptInfo.name'
                        },
                        totalRecords: { $sum: 1 },
                        workingDays: {
                            $sum: { $cond: ['$isWorkingDay', 1, 0] }
                        },
                        presentDays: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['on-time', 'present', 'late', 'work-from-home', 'mission']] },
                                    1, 0
                                ]
                            }
                        },
                        absentDays: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $in: ['$status', ['absent', 'forgot-check-in', 'forgot-check-out']] },
                                        { $eq: ['$isWorkingDay', true] }
                                    ]},
                                    1, 0
                                ]
                            }
                        },
                        lateDays: {
                            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
                        },
                        totalHours: { $sum: '$hours.actual' },
                        expectedHours: { $sum: '$hours.expected' },
                        overtimeHours: { $sum: '$hours.overtime' }
                    }
                },
                {
                    $project: {
                        departmentId: '$_id.departmentId',
                        departmentName: { $ifNull: ['$_id.departmentName', 'Unassigned'] },
                        totalRecords: 1,
                        workingDays: 1,
                        presentDays: 1,
                        absentDays: 1,
                        lateDays: 1,
                        totalHours: 1,
                        expectedHours: 1,
                        overtimeHours: 1,
                        attendanceRate: {
                            $cond: [
                                { $gt: ['$workingDays', 0] },
                                { $multiply: [{ $divide: ['$presentDays', '$workingDays'] }, 100] },
                                0
                            ]
                        },
                        _id: 0
                    }
                },
                { $sort: { departmentName: 1 } }
            ]);
        }
        
        res.json({
            success: true,
            period: {
                startDate,
                endDate,
                month: startDate.getMonth() + 1,
                year: startDate.getFullYear()
            },
            summary,
            departmentBreakdown,
            employeeStats: Array.from(employeeStats.values()),
            data: attendance,
            filters: {
                department: department || departments,
                employee
            }
        });
    } catch (error) {
        logger.error('Error fetching monthly attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Manual check-in
 */
export const manualCheckIn = async (req, res) => {
    try {
        const { employeeId, date, time, notes } = req.body;
        
        const checkInDate = date ? new Date(date) : new Date();
        checkInDate.setHours(0, 0, 0, 0);
        
        const checkInTime = time ? new Date(time) : new Date();
        
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Find or create attendance record
        let attendance = await Attendance.findOne({
            tenantId,
            employee: employeeId,
            date: checkInDate
        });
        
        if (!attendance) {
            const employee = await Attendance.findOne({ _id: employeeId }).populate('department position');
            
            attendance = new Attendance({
                tenantId,
                employee: employeeId,
                department: employee?.department,
                position: employee?.position,
                date: checkInDate,
                source: 'manual'
            });
        }
        
        attendance.checkIn = {
            time: checkInTime,
            method: 'manual',
            location: 'office'
        };
        
        if (notes) {
            attendance.notes = notes;
        }
        
        attendance.approvedBy = req.user._id;
        attendance.approvedAt = new Date();
        
        // Log admin action for manual check-in
        logAdminAction(req, 'manual_check_in', {
            employeeId,
            date: checkInDate,
            time: checkInTime,
            notes,
            attendanceId: attendance._id.toString()
        });
        
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        
        logger.info(`Manual check-in recorded by ${req.user.firstName || req.user.email} for employee ${employeeId}`);
        
        res.json({
            success: true,
            message: 'Manual check-in recorded successfully',
            data: attendance
        });
    } catch (error) {
        logger.error('Error recording manual check-in:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get attendance statistics by department
 */
export const getAttendanceByDepartment = async (req, res) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        const { startDate, endDate, status } = req.query;
        
        // Build base query
        const query = { tenantId };
        
        // Date range filtering
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        } else {
            // Default to current month if no date range specified
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfMonth, $lte: endOfMonth };
        }

        // Status filtering
        if (status) {
            const statusArray = Array.isArray(status) 
                ? status 
                : status.split(',').map(s => s.trim());
            query.status = { $in: statusArray };
        }

        const departmentStats = await Attendance.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'department',
                    foreignField: '_id',
                    as: 'deptInfo'
                }
            },
            { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: {
                        departmentId: '$department',
                        departmentName: '$deptInfo.name',
                        departmentCode: '$deptInfo.code'
                    },
                    totalRecords: { $sum: 1 },
                    workingDays: {
                        $sum: { $cond: ['$isWorkingDay', 1, 0] }
                    },
                    presentCount: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['on-time', 'present', 'late', 'work-from-home', 'mission']] },
                                1, 0
                            ]
                        }
                    },
                    absentCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['absent', 'forgot-check-in', 'forgot-check-out']] },
                                    { $eq: ['$isWorkingDay', true] }
                                ]},
                                1, 0
                            ]
                        }
                    },
                    lateCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
                    },
                    onTimeCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'on-time'] }, 1, 0] }
                    },
                    workFromHomeCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'work-from-home'] }, 1, 0] }
                    },
                    vacationCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'vacation'] }, 1, 0] }
                    },
                    sickLeaveCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'sick-leave'] }, 1, 0] }
                    },
                    missionCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'mission'] }, 1, 0] }
                    },
                    totalHours: { $sum: '$hours.actual' },
                    expectedHours: { $sum: '$hours.expected' },
                    overtimeHours: { $sum: '$hours.overtime' },
                    uniqueEmployees: { $addToSet: '$employee' }
                }
            },
            {
                $project: {
                    departmentId: '$_id.departmentId',
                    departmentName: { $ifNull: ['$_id.departmentName', 'Unassigned'] },
                    departmentCode: { $ifNull: ['$_id.departmentCode', 'N/A'] },
                    totalRecords: 1,
                    workingDays: 1,
                    presentCount: 1,
                    absentCount: 1,
                    lateCount: 1,
                    onTimeCount: 1,
                    workFromHomeCount: 1,
                    vacationCount: 1,
                    sickLeaveCount: 1,
                    missionCount: 1,
                    totalHours: { $round: ['$totalHours', 2] },
                    expectedHours: { $round: ['$expectedHours', 2] },
                    overtimeHours: { $round: ['$overtimeHours', 2] },
                    uniqueEmployeeCount: { $size: '$uniqueEmployees' },
                    attendanceRate: {
                        $cond: [
                            { $gt: ['$workingDays', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$presentCount', '$workingDays'] }, 100] }, 2] },
                            0
                        ]
                    },
                    punctualityRate: {
                        $cond: [
                            { $gt: ['$presentCount', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$onTimeCount', '$presentCount'] }, 100] }, 2] },
                            0
                        ]
                    },
                    averageHoursPerDay: {
                        $cond: [
                            { $gt: ['$workingDays', 0] },
                            { $round: [{ $divide: ['$totalHours', '$workingDays'] }, 2] },
                            0
                        ]
                    },
                    _id: 0
                }
            },
            { $sort: { departmentName: 1 } }
        ]);

        // Calculate overall statistics
        const overallStats = departmentStats.reduce((acc, dept) => {
            acc.totalRecords += dept.totalRecords;
            acc.workingDays += dept.workingDays;
            acc.presentCount += dept.presentCount;
            acc.absentCount += dept.absentCount;
            acc.lateCount += dept.lateCount;
            acc.onTimeCount += dept.onTimeCount;
            acc.totalHours += dept.totalHours;
            acc.expectedHours += dept.expectedHours;
            acc.overtimeHours += dept.overtimeHours;
            acc.uniqueEmployeeCount += dept.uniqueEmployeeCount;
            return acc;
        }, {
            totalRecords: 0,
            workingDays: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            onTimeCount: 0,
            totalHours: 0,
            expectedHours: 0,
            overtimeHours: 0,
            uniqueEmployeeCount: 0
        });

        // Calculate overall rates
        overallStats.attendanceRate = overallStats.workingDays > 0 
            ? Math.round((overallStats.presentCount / overallStats.workingDays) * 100 * 100) / 100
            : 0;
        overallStats.punctualityRate = overallStats.presentCount > 0 
            ? Math.round((overallStats.onTimeCount / overallStats.presentCount) * 100 * 100) / 100
            : 0;
        overallStats.averageHoursPerDay = overallStats.workingDays > 0 
            ? Math.round((overallStats.totalHours / overallStats.workingDays) * 100) / 100
            : 0;

        res.json({
            success: true,
            period: {
                startDate: query.date.$gte,
                endDate: query.date.$lte
            },
            overallStats,
            departmentStats,
            filters: {
                startDate,
                endDate,
                status
            }
        });
    } catch (error) {
        logger.error('Error fetching department attendance statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Manual check-out
 */
export const manualCheckOut = async (req, res) => {
    try {
        const { employeeId, date, time, notes } = req.body;
        
        const checkOutDate = date ? new Date(date) : new Date();
        checkOutDate.setHours(0, 0, 0, 0);
        
        const checkOutTime = time ? new Date(time) : new Date();
        
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.user?.tenantId || req.tenant?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Find attendance record
        const attendance = await Attendance.findOne({
            tenantId,
            employee: employeeId,
            date: checkOutDate
        });
        
        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found. Please check-in first.'
            });
        }
        
        attendance.checkOut = {
            time: checkOutTime,
            method: 'manual',
            location: 'office'
        };
        
        if (notes) {
            attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
        }
        
        attendance.approvedBy = req.user._id;
        attendance.approvedAt = new Date();
        
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        
        logger.info(`Manual check-out recorded by ${req.user.firstName || req.user.email} for employee ${employeeId}`);
        
        res.json({
            success: true,
            message: 'Manual check-out recorded successfully',
            data: attendance
        });
    } catch (error) {
        logger.error('Error recording manual check-out:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
