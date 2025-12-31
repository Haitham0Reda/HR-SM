import express from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';
import {
    getDashboardConfig,
    updateDashboardConfig,
    getEmployeeOfTheMonth,
    setEmployeeOfTheMonth,
    getDashboardStatistics,
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// Main dashboard endpoint - combines all dashboard data
router.get('/', requireAuth, async (req, res) => {
    try {
        // Get dashboard statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's attendance for the user
        const Attendance = (await import('../../hr-core/attendance/models/attendance.model.js')).default;
        const todayAttendance = await Attendance.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Calculate working hours if checked in
        let workingHours = '0h 0m';
        if (todayAttendance && todayAttendance.checkIn) {
            const checkInTime = new Date(todayAttendance.checkIn);
            const checkOutTime = todayAttendance.checkOut ? new Date(todayAttendance.checkOut) : new Date();
            const diffMs = checkOutTime - checkInTime;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${hours}h ${minutes}m`;
        }

        const dashboardData = {
            success: true,
            data: {
                todayAttendance: {
                    checkIn: todayAttendance?.checkIn || null,
                    checkOut: todayAttendance?.checkOut || null,
                    status: todayAttendance?.status || 'absent',
                    workingHours
                },
                statistics: {
                    totalEmployees: 8,
                    activeProjects: 5,
                    pendingRequests: 3,
                    upcomingEvents: 2
                },
                employeeOfTheMonth: null, // Will be populated if available
                recentActivities: []
            }
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get dashboard configuration
router.get('/config', requireAuth, getDashboardConfig);

// Update dashboard configuration (admin/hr only)
router.put('/config', requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updateDashboardConfig);

// Get employee of the month
router.get('/employee-of-month', requireAuth, getEmployeeOfTheMonth);

// Set employee of the month (admin/hr only)
router.post('/employee-of-month', requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), setEmployeeOfTheMonth);

// Get dashboard statistics
router.get('/statistics', requireAuth, getDashboardStatistics);

export default router;
