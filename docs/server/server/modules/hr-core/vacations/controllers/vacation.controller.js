// Vacation Controller
import Vacation from '../models/vacation.model.js';
import Notification from '../../../notifications/models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../../../../services/email.service.js';
import User from '../../users/models/user.model.js';

/**
 * Get all vacations with optional filtering
 */
export const getAllVacations = async (req, res) => {
    try {
        const query = {};

        // Filter by user/employee if provided
        if (req.query.user) {
            query.employee = req.query.user;
        } else if (req.query.employee) {
            query.employee = req.query.employee;
        }

        // Filter by status if provided
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Filter by department if provided
        if (req.query.department) {
            query.department = req.query.department;
        }

        // Filter by vacation type if provided
        if (req.query.vacationType) {
            query.vacationType = req.query.vacationType;
        }

        const vacations = await Vacation.find(query)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
            .populate('vacationBalance')
            .sort({ createdAt: -1 });

        res.json(vacations);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new vacation
 */
export const createVacation = async (req, res) => {
    try {

        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Set employee from authenticated user if not provided
        if (!req.body.employee && req.user && req.user._id) {
            req.body.employee = req.user._id;
        }

        // Set department and position from user if available
        if (req.user) {
            if (!req.body.department && req.user.department) {
                req.body.department = req.user.department;
            }
            if (!req.body.position && req.user.position) {
                req.body.position = req.user.position;
            }
        }

        // Handle file uploads for attachments
        if (req.files && req.files.length > 0) {
            req.body.attachments = req.files.map(file => ({
                filename: file.originalname,
                url: file.path,
                uploadedAt: new Date()
            }));
        }

        // Check for overlapping vacations
        const hasOverlap = await Vacation.hasOverlappingVacation(
            req.body.employee,
            req.body.startDate,
            req.body.endDate
        );

        if (hasOverlap) {
            return res.status(400).json({
                error: 'You have an overlapping vacation request for this date range'
            });
        }

        const vacation = new Vacation(req.body);
        const savedVacation = await vacation.save();

        // Create notification for supervisor/manager
        await createVacationNotification(savedVacation, 'submitted');

        // Send email notification to manager
        await sendVacationRequestNotification(savedVacation);

        res.status(201).json(savedVacation);
    } catch (err) {


        res.status(400).json({
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

/**
 * Get vacation by ID
 */
export const getVacationById = async (req, res) => {
    try {
        const vacation = await Vacation.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
            .populate('vacationBalance');

        if (!vacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        res.json(vacation);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Update vacation
 */
export const updateVacation = async (req, res) => {
    try {
        const oldVacation = await Vacation.findById(req.params.id);
        if (!oldVacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        // Prevent updating if already approved or rejected
        if (oldVacation.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update vacation with status: ${oldVacation.status}`
            });
        }

        // Check for overlapping vacations if dates are being updated
        if (req.body.startDate || req.body.endDate) {
            const startDate = req.body.startDate || oldVacation.startDate;
            const endDate = req.body.endDate || oldVacation.endDate;

            const hasOverlap = await Vacation.hasOverlappingVacation(
                oldVacation.employee,
                startDate,
                endDate,
                req.params.id
            );

            if (hasOverlap) {
                return res.status(400).json({
                    error: 'You have an overlapping vacation request for this date range'
                });
            }
        }

        const vacation = await Vacation.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(vacation);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete vacation
 */
export const deleteVacation = async (req, res) => {
    try {
        const vacation = await Vacation.findById(req.params.id);
        if (!vacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        // Only allow deletion of pending vacations
        if (vacation.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete vacation with status: ${vacation.status}`
            });
        }

        await Vacation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vacation deleted successfully' });
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve vacation
 */
export const approveVacation = async (req, res) => {
    try {
        const vacation = await Vacation.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!vacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        // Check if vacation is already processed
        if (vacation.status !== 'pending') {
            return res.status(400).json({
                error: `Vacation is already ${vacation.status}`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve vacations'
            });
        }

        // Approve the vacation
        await vacation.approve(userId, notes);

        // Create notification for employee
        await createVacationNotification(vacation, 'approved');

        // Send email notification to employee
        await sendVacationStatusUpdateNotification(vacation);

        res.json(vacation);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject vacation
 */
export const rejectVacation = async (req, res) => {
    try {
        const vacation = await Vacation.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!vacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        // Check if vacation is already processed
        if (vacation.status !== 'pending') {
            return res.status(400).json({
                error: `Vacation is already ${vacation.status}`
            });
        }


        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject vacations'
            });
        }

        // Validate reason
        if (!reason || typeof reason !== 'string') {

            return res.status(400).json({
                error: 'Rejection reason is required and must be a string'
            });
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {

            return res.status(400).json({
                error: 'Rejection reason is required and cannot be empty'
            });
        }

        if (trimmedReason.length < 10) {

            return res.status(400).json({
                error: 'Rejection reason must be at least 10 characters long'
            });
        }

        // Reject the vacation
        await vacation.reject(userId, trimmedReason);

        // Create notification for employee
        await createVacationNotification(vacation, 'rejected');

        // Send email notification to employee
        await sendVacationStatusUpdateNotification(vacation);

        res.json(vacation);
    } catch (err) {


        res.status(400).json({ error: err.message });
    }
};

/**
 * Cancel vacation
 */
export const cancelVacation = async (req, res) => {
    try {
        const vacation = await Vacation.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!vacation) {
            return res.status(404).json({ error: 'Vacation not found' });
        }

        // Check if vacation can be cancelled
        if (vacation.status === 'cancelled') {
            return res.status(400).json({
                error: 'Vacation is already cancelled'
            });
        }

        if (vacation.status === 'rejected') {
            return res.status(400).json({
                error: 'Cannot cancel a rejected vacation'
            });
        }

        const { reason } = req.body;
        const userId = req.user._id;

        // Validate reason
        if (!reason || typeof reason !== 'string') {
            return res.status(400).json({
                error: 'Cancellation reason is required and must be a string'
            });
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return res.status(400).json({
                error: 'Cancellation reason is required and cannot be empty'
            });
        }

        if (trimmedReason.length < 10) {
            return res.status(400).json({
                error: 'Cancellation reason must be at least 10 characters long'
            });
        }

        // Cancel the vacation
        await vacation.cancel(userId, trimmedReason);

        // Create notification for employee and manager
        await createVacationNotification(vacation, 'cancelled');

        res.json(vacation);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for vacation status change
 */
async function createVacationNotification(vacation, type) {
    try {
        let recipient, message;

        if (type === 'submitted') {
            // Notify manager/supervisor
            const employee = await User.findById(vacation.employee).populate('department');
            if (!employee) return;

            const manager = await getEmployeeManager(employee);
            if (!manager) return;

            recipient = manager._id;
            message = `New vacation request from ${employee.username || employee.email}`;
        } else if (type === 'approved' || type === 'rejected' || type === 'cancelled') {
            // Notify employee
            recipient = vacation.employee;
            message = `Your vacation request has been ${type}`;
        }

        if (recipient) {
            const notification = new Notification({
                recipient,
                type: 'vacation',
                message,
                relatedModel: 'Vacation',
                relatedId: vacation._id,
                read: false
            });

            await notification.save();

            // Mark notification as sent in vacation
            if (!vacation.notifications) {
                vacation.notifications = {};
            }
            if (!vacation.notifications[type]) {
                vacation.notifications[type] = {};
            }
            vacation.notifications[type].sent = true;
            vacation.notifications[type].sentAt = new Date();
            await vacation.save();
        }
    } catch (error) {

    }
}

/**
 * Send vacation request notification to manager
 */
async function sendVacationRequestNotification(vacation) {
    try {
        // Get employee details
        const employee = await User.findById(vacation.employee).select('username email personalInfo');
        if (!employee) {

            return { success: false, error: 'Employee not found' };
        }

        // Get manager
        const manager = await getEmployeeManager(employee);
        if (!manager || !manager.email) {

            return { success: false, error: 'Manager not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        const managerName = manager.personalInfo?.firstName && manager.personalInfo?.lastName
            ? `${manager.personalInfo.firstName} ${manager.personalInfo.lastName}`
            : manager.username || 'Manager';

        // Format dates
        const startDate = new Date(vacation.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(vacation.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const vacationTypeLabel = {
            'annual': 'Annual Leave',
            'casual': 'Casual Leave',
            'sick': 'Sick Leave',
            'unpaid': 'Unpaid Leave'
        }[vacation.vacationType] || vacation.vacationType;

        const subject = `New Vacation Request - ${employeeName}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .info-row { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #2563eb; }
                    .label { font-weight: bold; color: #1f2937; }
                    .value { color: #4b5563; margin-left: 10px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 0 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Vacation Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new vacation request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Vacation Type:</span>
                            <span class="value">${vacationTypeLabel}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Start Date:</span>
                            <span class="value">${startDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">End Date:</span>
                            <span class="value">${endDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${vacation.duration} day(s)</span>
                        </div>
                        
                        ${vacation.reason ? `
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${vacation.reason}</span>
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/vacations" class="button">Review Request</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from HR Management System</p>
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
New Vacation Request

Dear ${managerName},

A new vacation request has been submitted and requires your approval.

Employee: ${employeeName}
Vacation Type: ${vacationTypeLabel}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${vacation.duration} day(s)
${vacation.reason ? `Reason: ${vacation.reason}` : ''}

Please review and approve or reject this request in the HR Management System.

---
This is an automated notification from HR Management System
        `;

        return await sendEmail({
            to: manager.email,
            subject,
            html,
            text
        });

    } catch (error) {

        return { success: false, error: error.message };
    }
}

/**
 * Send vacation status update notification to employee
 */
async function sendVacationStatusUpdateNotification(vacation) {
    try {
        // Get employee details
        const employee = await User.findById(vacation.employee).select('username email personalInfo');
        if (!employee || !employee.email) {

            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        // Format dates
        const startDate = new Date(vacation.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(vacation.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const vacationTypeLabel = {
            'annual': 'Annual Leave',
            'casual': 'Casual Leave',
            'sick': 'Sick Leave',
            'unpaid': 'Unpaid Leave'
        }[vacation.vacationType] || vacation.vacationType;

        const statusColor = vacation.status === 'approved' ? '#10b981' : vacation.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = vacation.status === 'approved' ? '✅' : vacation.status === 'rejected' ? '❌' : '⏳';

        const subject = `Vacation Request ${vacation.status.charAt(0).toUpperCase() + vacation.status.slice(1)}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .status-badge { display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                    .info-row { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid ${statusColor}; }
                    .label { font-weight: bold; color: #1f2937; }
                    .value { color: #4b5563; margin-left: 10px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 0 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                    .message-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>${statusIcon} Vacation Request ${vacation.status.charAt(0).toUpperCase() + vacation.status.slice(1)}</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>Your vacation request has been <strong>${vacation.status}</strong>.</p>
                        
                        <div style="text-align: center;">
                            <span class="status-badge">${vacation.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Vacation Type:</span>
                            <span class="value">${vacationTypeLabel}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Start Date:</span>
                            <span class="value">${startDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">End Date:</span>
                            <span class="value">${endDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${vacation.duration} day(s)</span>
                        </div>
                        
                        ${vacation.status === 'rejected' && vacation.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${vacation.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${vacation.status === 'approved' && vacation.approverNotes ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${vacation.approverNotes}
                        </div>
                        ` : ''}
                        
                        ${vacation.status === 'approved' ? `
                        <p style="margin-top: 30px; color: #10b981; font-weight: bold;">
                            Your vacation has been approved. Enjoy your time off!
                        </p>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/vacations" class="button">View My Vacations</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from HR Management System</p>
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Vacation Request ${vacation.status.charAt(0).toUpperCase() + vacation.status.slice(1)}

Dear ${employeeName},

Your vacation request has been ${vacation.status}.

Status: ${vacation.status.toUpperCase()}
Vacation Type: ${vacationTypeLabel}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${vacation.duration} day(s)

${vacation.status === 'rejected' && vacation.rejectionReason ? `Rejection Reason: ${vacation.rejectionReason}` : ''}
${vacation.status === 'approved' && vacation.approverNotes ? `Approver Notes: ${vacation.approverNotes}` : ''}

${vacation.status === 'approved' ? 'Your vacation has been approved. Enjoy your time off!' : ''}

---
This is an automated notification from HR Management System
        `;

        return await sendEmail({
            to: employee.email,
            subject,
            html,
            text
        });

    } catch (error) {

        return { success: false, error: error.message };
    }
}
