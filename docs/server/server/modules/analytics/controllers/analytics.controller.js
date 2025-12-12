/**
 * Analytics Controller
 * 
 * Provides analytics dashboards and KPI tracking
 */
import User from '../../hr-core/users/models/user.model.js';
import Attendance from '../../hr-core/attendance/models/attendance.model.js';
import Vacation from '../../hr-core/vacations/models/vacation.model.js';
import Mission from '../../hr-core/missions/models/mission.model.js';
import SickLeave from '../../hr-core/vacations/models/sickLeave.model.js';
import Payroll from '../../payroll/models/payroll.model.js';
import Request from '../../hr-core/requests/models/request.model.js';

/**
 * Get HR dashboard overview
 */
export const getHRDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Employee statistics
        const totalEmployees = await User.countDocuments({ isActive: true });
        const activeEmployees = await User.countDocuments({
            isActive: true,
            'employment.employmentStatus': 'active'
        });

        // Attendance statistics
        const attendanceStats = await Attendance.aggregate([
            {
                $match: dateFilter.$gte ? { date: dateFilter } : {}
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Leave statistics - aggregate from multiple models
        const vacationStats = await Vacation.aggregate([
            {
                $match: {
                    status: { $ne: 'rejected' },
                    ...(dateFilter.$gte && { startDate: dateFilter })
                }
            },
            {
                $group: {
                    _id: 'vacation',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const missionStats = await Mission.aggregate([
            {
                $match: {
                    status: { $ne: 'rejected' },
                    ...(dateFilter.$gte && { startDate: dateFilter })
                }
            },
            {
                $group: {
                    _id: 'mission',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const sickLeaveStats = await SickLeave.aggregate([
            {
                $match: {
                    status: { $ne: 'rejected' },
                    ...(dateFilter.$gte && { startDate: dateFilter })
                }
            },
            {
                $group: {
                    _id: 'sick-leave',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const leaveStats = [...vacationStats, ...missionStats, ...sickLeaveStats];

        // Pending requests
        const pendingRequests = await Request.countDocuments({
            status: 'pending'
        });

        res.json({
            success: true,
            dashboard: {
                employees: {
                    total: totalEmployees,
                    active: activeEmployees,
                    inactive: totalEmployees - activeEmployees
                },
                attendance: attendanceStats,
                leaves: leaveStats,
                pendingRequests
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get attendance analytics
 */
export const getAttendanceAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, departmentId } = req.query;

        const matchStage = {};

        if (startDate && endDate) {
            matchStage.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const pipeline = [
            { $match: matchStage }
        ];

        // Add department filter if specified
        if (departmentId) {
            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'employee'
                }
            });
            pipeline.push({
                $match: {
                    'employee.department': mongoose.Types.ObjectId(departmentId)
                }
            });
        }

        // Daily attendance trend
        const dailyTrend = await Attendance.aggregate([
            ...pipeline,
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': 1 }
            }
        ]);

        // Status distribution
        const statusDistribution = await Attendance.aggregate([
            ...pipeline,
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Average check-in/out times
        const timeStats = await Attendance.aggregate([
            ...pipeline,
            {
                $match: {
                    checkInTime: { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgCheckIn: { $avg: { $hour: '$checkInTime' } },
                    avgCheckOut: { $avg: { $hour: '$checkOutTime' } }
                }
            }
        ]);

        res.json({
            success: true,
            analytics: {
                dailyTrend,
                statusDistribution,
                averageTimes: timeStats[0] || {}
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get leave analytics
 */
export const getLeaveAnalytics = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Leave type distribution - aggregate from all leave types
        const vacationByType = await Vacation.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfYear, $lte: endOfYear },
                    status: { $in: ['approved', 'pending'] }
                }
            },
            {
                $group: {
                    _id: 'vacation',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const missionByType = await Mission.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfYear, $lte: endOfYear },
                    status: { $in: ['approved', 'pending'] }
                }
            },
            {
                $group: {
                    _id: 'mission',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const sickLeaveByType = await SickLeave.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfYear, $lte: endOfYear },
                    status: { $in: ['approved', 'pending'] }
                }
            },
            {
                $group: {
                    _id: 'sick-leave',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]);

        const leaveByType = [...vacationByType, ...missionByType, ...sickLeaveByType];

        // Monthly leave trend - combine all types
        const vacationTrend = await Vacation.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfYear, $lte: endOfYear },
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: { $month: '$startDate' },
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // TODO: Add mission and sick leave trends
        const monthlyTrend = vacationTrend;

        // Department-wise leave - TODO: Update to use new models
        const leaveByDepartment = []; /* await Vacation.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfYear, $lte: endOfYear },
                    status: 'approved'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            {
                $unwind: '$employee'
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'employee.department',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $unwind: '$department'
            },
            {
                $group: {
                    _id: '$department.name',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$duration' }
                }
            }
        ]); */

        res.json({
            success: true,
            analytics: {
                byType: leaveByType,
                monthlyTrend,
                byDepartment: leaveByDepartment
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get employee analytics
 */
export const getEmployeeAnalytics = async (req, res) => {
    try {
        // Department distribution
        const employeesByDepartment = await User.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'department',
                    foreignField: '_id',
                    as: 'dept'
                }
            },
            {
                $unwind: { path: '$dept', preserveNullAndEmptyArrays: true }
            },
            {
                $group: {
                    _id: '$dept.name',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Role distribution
        const employeesByRole = await User.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Employment status
        const employeesByStatus = await User.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $group: {
                    _id: '$employment.employmentStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Age distribution
        const today = new Date();
        const ageDistribution = await User.aggregate([
            {
                $match: {
                    isActive: true,
                    'personalInfo.dateOfBirth': { $exists: true }
                }
            },
            {
                $project: {
                    age: {
                        $subtract: [
                            today.getFullYear(),
                            { $year: '$profile.dateOfBirth' }
                        ]
                    }
                }
            },
            {
                $bucket: {
                    groupBy: '$age',
                    boundaries: [18, 25, 35, 45, 55, 65, 100],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            analytics: {
                byDepartment: employeesByDepartment,
                byRole: employeesByRole,
                byStatus: employeesByStatus,
                ageDistribution
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get payroll analytics
 */
export const getPayrollAnalytics = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Monthly payroll summary
        const monthlyPayroll = await Payroll.aggregate([
            {
                $match: {
                    payPeriodStart: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { $month: '$payPeriodStart' },
                    totalGrossPay: { $sum: '$grossPay' },
                    totalNetPay: { $sum: '$netPay' },
                    totalDeductions: { $sum: '$totalDeductions' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Department payroll
        const departmentPayroll = await Payroll.aggregate([
            {
                $match: {
                    payPeriodStart: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            {
                $unwind: '$employee'
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'employee.department',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $unwind: { path: '$department', preserveNullAndEmptyArrays: true }
            },
            {
                $group: {
                    _id: '$department.name',
                    totalGrossPay: { $sum: '$grossPay' },
                    totalNetPay: { $sum: '$netPay' },
                    avgSalary: { $avg: '$netPay' }
                }
            }
        ]);

        res.json({
            success: true,
            analytics: {
                monthlyPayroll,
                departmentPayroll
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get KPIs
 */
export const getKPIs = async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Employee turnover rate
        const totalEmployees = await User.countDocuments({ isActive: true });
        const resigned = await User.countDocuments({
            'employment.resignationDate': { $gte: thirtyDaysAgo }
        });
        const turnoverRate = totalEmployees > 0 ? (resigned / totalEmployees) * 100 : 0;

        // Attendance rate
        const totalAttendance = await Attendance.countDocuments({
            date: { $gte: thirtyDaysAgo }
        });
        const presentCount = await Attendance.countDocuments({
            date: { $gte: thirtyDaysAgo },
            status: 'present'
        });
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        // Leave utilization - aggregate from all leave types
        const vacationLeaves = await Vacation.countDocuments({
            startDate: { $gte: thirtyDaysAgo },
            status: 'approved'
        });
        const missionLeaves = await Mission.countDocuments({
            startDate: { $gte: thirtyDaysAgo },
            status: 'approved'
        });
        const sickLeaves = await SickLeave.countDocuments({
            startDate: { $gte: thirtyDaysAgo },
            status: 'approved'
        });
        const totalLeaves = [{ totalDays: vacationLeaves + missionLeaves + sickLeaves }];

        // Average time to hire (placeholder)
        const avgTimeToHire = 0;

        res.json({
            success: true,
            kpis: {
                turnoverRate: turnoverRate.toFixed(2),
                attendanceRate: attendanceRate.toFixed(2),
                leaveUtilization: totalLeaves[0]?.totalDays || 0,
                avgTimeToHire,
                totalEmployees,
                period: 'Last 30 days'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get trend analysis
 */
export const getTrendAnalysis = async (req, res) => {
    try {
        const { metric, period = '6months' } = req.query;

        let startDate = new Date();

        switch (period) {
            case '3months':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case '1year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(startDate.getMonth() - 6);
        }

        let trendData;

        switch (metric) {
            case 'attendance':
                trendData = await Attendance.aggregate([
                    {
                        $match: {
                            date: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$date' },
                                month: { $month: '$date' }
                            },
                            present: {
                                $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                            },
                            absent: {
                                $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                            },
                            total: { $sum: 1 }
                        }
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1 }
                    }
                ]);
                break;

            case 'employees':
                // Employee count trend would require historical data
                trendData = [];
                break;

            default:
                return res.status(400).json({ error: 'Invalid metric' });
        }

        res.json({
            success: true,
            trend: trendData,
            metric,
            period
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
