import DashboardConfig from '../models/dashboardConfig.model.js';
import User from '../../hr-core/users/models/user.model.js';
import Attendance from '../../hr-core/attendance/models/attendance.model.js';
import logger from '../../../utils/logger.js';

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
        let employeeOfMonthChanged = false;
        let newEmployeeId = null;

        // Update configuration fields
        if (req.body.employeeOfTheMonth) {
            // Check if employee of the month changed
            const oldEmployeeId = config.employeeOfTheMonth?.selectedEmployee?.toString();
            newEmployeeId = req.body.employeeOfTheMonth.selectedEmployee;

            if (newEmployeeId && oldEmployeeId !== newEmployeeId) {
                employeeOfMonthChanged = true;
            }

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

        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId personalInfo');

        // Send email notification if employee of the month changed
        if (employeeOfMonthChanged && newEmployeeId) {
            try {
                const employee = await User.findById(newEmployeeId);
                if (employee && employee.email) {
                    await sendEmployeeOfMonthEmail(employee, config.employeeOfTheMonth.month);
                }
            } catch (emailError) {
                logger.error('Error sending employee of the month email:', emailError);
                // Don't fail the request if email fails
            }
        }

        logger.info(`Dashboard config updated by ${req.user.username}`, {
            userId: req.user._id,
            action: 'UPDATE_DASHBOARD_CONFIG',
            employeeOfMonthChanged
        });

        res.json(config);
    } catch (error) {
        logger.error('Error updating dashboard config:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Send email notification to Employee of the Month
 */
async function sendEmployeeOfMonthEmail(employee, month) {
    const transporter = await import('../config/email.js').then(m => m.default);

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@company.com',
        to: employee.email,
        subject: `🏆 Congratulations! You are the Employee of the Month - ${month}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .trophy { font-size: 60px; margin-bottom: 10px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .highlight { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="trophy">🏆</div>
                        <h1 style="margin: 0;">Congratulations!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">Employee of the Month</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${employee.personalInfo?.fullName || employee.username}</strong>,</p>
                        
                        <div class="highlight">
                            <h2 style="margin-top: 0; color: #667eea;">🎉 You've Been Selected!</h2>
                            <p>We are thrilled to announce that you have been selected as the <strong>Employee of the Month for ${month}</strong>!</p>
                        </div>
                        
                        <p>This recognition is a testament to your:</p>
                        <ul>
                            <li>Outstanding performance and dedication</li>
                            <li>Positive attitude and team spirit</li>
                            <li>Exceptional contributions to the company</li>
                            <li>Commitment to excellence</li>
                        </ul>
                        
                        <p>Your hard work and dedication have not gone unnoticed. You are an inspiration to your colleagues and a valuable asset to our team.</p>
                        
                        <p>Thank you for your continued commitment and excellence!</p>
                        
                        <p style="margin-top: 30px;">
                            <strong>Best regards,</strong><br>
                            HR Department
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Employee of the Month email sent to ${employee.email}`);
    } catch (error) {
        logger.error('Failed to send Employee of the Month email:', error);
        throw error;
    }
}

/**
 * Get employee of the month
 * @route GET /api/dashboard/employee-of-month
 * @access Private
 */
export const getEmployeeOfTheMonth = async (req, res) => {
    try {
        const config = await DashboardConfig.getConfig();
        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId personalInfo');

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
        await config.populate('employeeOfTheMonth.selectedEmployee', 'username email employeeId personalInfo');

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
