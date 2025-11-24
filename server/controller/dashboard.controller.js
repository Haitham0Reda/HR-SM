import DashboardConfig from '../models/dashboardConfig.model.js';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import logger from '../utils/logger.js';

/**
 * Get dashboard configuration
 * @route GET /api/dashboard/config
 * @access Private
 */
export const getDashboardConfig = async (req, res) => {
    try {
        const config = await DashboardConfig.getConfig();
        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId profile');

        res.json(config);
    } catch (error) {
        logger.error('Error fetching dashboard config:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update dashboard configuration
 * @route PUT /api/dashboard/config
 * @access Private (Admin/HR only)
 */
export const updateDashboardConfig = async (req, res) => {
    try {
        const config = await DashboardConfig.getConfig();

        // Update configuration fields
        if (req.body.employeeOfTheMonth) {
            config.employeeOfTheMonth = {
                ...config.employeeOfTheMonth,
                ...req.body.employeeOfTheMonth,
                updatedAt: new Date()
            };
        }

        if (req.body.widgets) {
            config.widgets = {
                ...config.widgets,
                ...req.body.widgets
            };
        }

        if (req.body.quickActionCards) {
            config.quickActionCards = {
                ...config.quickActionCards,
                ...req.body.quickActionCards
            };
        }

        config.updatedBy = req.user._id;
        await config.save();

        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId profile');

        logger.info(`Dashboard config updated by ${req.user.username}`, {
            userId: req.user._id,
            action: 'UPDATE_DASHBOARD_CONFIG'
        });

        res.json(config);
    } catch (error) {
        logger.error('Error updating dashboard config:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get employee of the month
 * @route GET /api/dashboard/employee-of-month
 * @access Private
 */
export const getEmployeeOfTheMonth = async (req, res) => {
    try {
        const config = await DashboardConfig.getConfig();
        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId profile');

        res.json(config.employeeOfTheMonth);
    } catch (error) {
        logger.error('Error fetching employee of the month:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Set employee of the month
 * @route POST /api/dashboard/employee-of-month
 * @access Private (Admin/HR only)
 */
export const setEmployeeOfTheMonth = async (req, res) => {
    try {
        const { employeeId, month } = req.body;

        // Validate employee exists
        if (employeeId) {
            const employee = await User.findById(employeeId);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
        }

        const config = await DashboardConfig.getConfig();
        config.employeeOfTheMonth = {
            enabled: true,
            selectedEmployee: employeeId || null,
            month: month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            updatedAt: new Date()
        };
        config.updatedBy = req.user._id;

        await config.save();
        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId profile');

        logger.info(`Employee of the month set by ${req.user.username}`, {
            userId: req.user._id,
            employeeId,
            month,
            action: 'SET_EMPLOYEE_OF_MONTH'
        });

        res.json(config.employeeOfTheMonth);
    } catch (error) {
        logger.error('Error setting employee of the month:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/statistics
 * @access Private
 */
export const getDashboardStatistics = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's attendance for the user
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

        const statistics = {
            todayAttendance: {
                checkIn: todayAttendance?.checkIn || null,
                checkOut: todayAttendance?.checkOut || null,
                status: todayAttendance?.status || 'absent',
                workingHours
            }
        };

        res.json(statistics);
    } catch (error) {
        logger.error('Error fetching dashboard statistics:', error);
        res.status(500).json({ error: error.message });
    }
};
