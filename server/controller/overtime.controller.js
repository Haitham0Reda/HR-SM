// Overtime Controller
import Overtime from '../models/overtime.model.js';
import Notification from '../models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../services/email.service.js';
import User from '../models/user.model.js';

/**
 * Get all overtime records with optional filtering
 */
export const getAllOvertime = async (req, res) => {
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

        // Filter by compensation type if provided
        if (req.query.compensationType) {
            query.compensationType = req.query.compensationType;
        }

        const overtime = await Overtime.find(query)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy', 'username employeeId personalInfo')
            .sort({ createdAt: -1 });

        res.json(overtime);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new overtime record
 */
export const createOvertime = async (req, res) => {
    try {

        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const overtime = new Overtime(req.body);
        const savedOvertime = await overtime.save();

        // Create notification for supervisor/manager
        await createOvertimeNotification(savedOvertime, 'submitted');

        // Send email notification to manager
        await sendOvertimeRequestNotification(savedOvertime);

        res.status(201).json(savedOvertime);
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
 * Get overtime by ID
 */
export const getOvertimeById = async (req, res) => {
    try {
        const overtime = await Overtime.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy', 'username employeeId personalInfo');

        if (!overtime) {
            return res.status(404).json({ error: 'Overtime not found' });
        }

        res.json(overtime);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Update overtime
 */
export const updateOvertime = async (req, res) => {
    try {
        const oldOvertime = await Overtime.findById(req.params.id);
        if (!oldOvertime) {
            return res.status(404).json({ error: 'Overtime not found' });
        }

        // Prevent updating if already approved or rejected
        if (oldOvertime.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update overtime with status: ${oldOvertime.status}`
            });
        }

        const overtime = await Overtime.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(overtime);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete overtime
 */
export const deleteOvertime = async (req, res) => {
    try {
        const overtime = await Overtime.findById(req.params.id);
        if (!overtime) {
            return res.status(404).json({ error: 'Overtime not found' });
        }

        // Only allow deletion of pending overtime
        if (overtime.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete overtime with status: ${overtime.status}`
            });
        }

        await Overtime.findByIdAndDelete(req.params.id);
        res.json({ message: 'Overtime deleted successfully' });
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve overtime
 */
export const approveOvertime = async (req, res) => {
    try {
        const overtime = await Overtime.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!overtime) {
            return res.status(404).json({ error: 'Overtime not found' });
        }

        // Check if overtime is already processed
        if (overtime.status !== 'pending') {
            return res.status(400).json({
                error: `Overtime is already ${overtime.status}`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve overtime'
            });
        }

        // Approve the overtime
        await overtime.approve(userId, notes);

        // Create notification for employee
        await createOvertimeNotification(overtime, 'approved');

        // Send email notification to employee
        await sendOvertimeStatusUpdateNotification(overtime);

        res.json(overtime);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject overtime
 */
export const rejectOvertime = async (req, res) => {
    try {
        const overtime = await Overtime.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!overtime) {
            return res.status(404).json({ error: 'Overtime not found' });
        }

        // Check if overtime is already processed
        if (overtime.status !== 'pending') {
            return res.status(400).json({
                error: `Overtime is already ${overtime.status}`
            });
        }


        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject overtime'
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

        // Reject the overtime
        await overtime.reject(userId, trimmedReason);

        // Create notification for employee
        await createOvertimeNotification(overtime, 'rejected');

        // Send email notification to employee
        await sendOvertimeStatusUpdateNotification(overtime);

        res.json(overtime);
    } catch (err) {


        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for overtime status change
 */
async function createOvertimeNotification(overtime, type) {
    try {
        let recipient, message;

        if (type === 'submitted') {
            // Notify manager/supervisor
            const employee = await User.findById(overtime.employee).populate('department');
            if (!employee) return;

            const manager = await getEmployeeManager(employee);
            if (!manager) return;

            recipient = manager._id;
            message = `New overtime request from ${employee.username || employee.email}`;
        } else if (type === 'approved' || type === 'rejected') {
            // Notify employee
            recipient = overtime.employee;
            message = `Your overtime request has been ${type}`;
        }

        if (recipient) {
            const notification = new Notification({
                recipient,
                type: 'overtime',
                message,
                relatedModel: 'Overtime',
                relatedId: overtime._id,
                read: false
            });

            await notification.save();

            // Mark notification as sent in overtime
            if (!overtime.notifications) {
                overtime.notifications = {};
            }
            if (!overtime.notifications[type]) {
                overtime.notifications[type] = {};
            }
            overtime.notifications[type].sent = true;
            overtime.notifications[type].sentAt = new Date();
            await overtime.save();
        }
    } catch (error) {

    }
}

/**
 * Send overtime request notification to manager
 */
async function sendOvertimeRequestNotification(overtime) {
    try {
        // Get employee details
        const employee = await User.findById(overtime.employee).select('username email personalInfo');
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

        // Format date
        const overtimeDate = new Date(overtime.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const compensationTypeLabel = overtime.compensationType === 'paid' ? 'Paid' : 
                                      overtime.compensationType === 'time-off' ? 'Time Off' : 'None';

        const subject = `New Overtime Request - ${employeeName}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .info-row { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #7c3aed; }
                    .label { font-weight: bold; color: #1f2937; }
                    .value { color: #4b5563; margin-left: 10px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 0 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Overtime Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new overtime request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${overtimeDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Time:</span>
                            <span class="value">${overtime.startTime} - ${overtime.endTime}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${overtime.duration} hour(s)</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Compensation Type:</span>
                            <span class="value">${compensationTypeLabel}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${overtime.reason}</span>
                        </div>
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/overtime" class="button">Review Request</a>
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
New Overtime Request

Dear ${managerName},

A new overtime request has been submitted and requires your approval.

Employee: ${employeeName}
Date: ${overtimeDate}
Time: ${overtime.startTime} - ${overtime.endTime}
Duration: ${overtime.duration} hour(s)
Compensation Type: ${compensationTypeLabel}
Reason: ${overtime.reason}

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
 * Send overtime status update notification to employee
 */
async function sendOvertimeStatusUpdateNotification(overtime) {
    try {
        // Get employee details
        const employee = await User.findById(overtime.employee).select('username email personalInfo');
        if (!employee || !employee.email) {

            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        // Format date
        const overtimeDate = new Date(overtime.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const compensationTypeLabel = overtime.compensationType === 'paid' ? 'Paid' : 
                                      overtime.compensationType === 'time-off' ? 'Time Off' : 'None';

        const statusColor = overtime.status === 'approved' ? '#10b981' : overtime.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = overtime.status === 'approved' ? '✅' : overtime.status === 'rejected' ? '❌' : '⏳';

        const subject = `Overtime Request ${overtime.status.charAt(0).toUpperCase() + overtime.status.slice(1)}`;

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
                        <h2>${statusIcon} Overtime Request ${overtime.status.charAt(0).toUpperCase() + overtime.status.slice(1)}</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>Your overtime request has been <strong>${overtime.status}</strong>.</p>
                        
                        <div style="text-align: center;">
                            <span class="status-badge">${overtime.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${overtimeDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Time:</span>
                            <span class="value">${overtime.startTime} - ${overtime.endTime}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${overtime.duration} hour(s)</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Compensation Type:</span>
                            <span class="value">${compensationTypeLabel}</span>
                        </div>
                        
                        ${overtime.status === 'rejected' && overtime.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${overtime.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${overtime.status === 'approved' && overtime.approverNotes ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${overtime.approverNotes}
                        </div>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/overtime" class="button">View My Overtime</a>
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
Overtime Request ${overtime.status.charAt(0).toUpperCase() + overtime.status.slice(1)}

Dear ${employeeName},

Your overtime request has been ${overtime.status}.

Status: ${overtime.status.toUpperCase()}
Date: ${overtimeDate}
Time: ${overtime.startTime} - ${overtime.endTime}
Duration: ${overtime.duration} hour(s)
Compensation Type: ${compensationTypeLabel}

${overtime.status === 'rejected' && overtime.rejectionReason ? `Rejection Reason: ${overtime.rejectionReason}` : ''}
${overtime.status === 'approved' && overtime.approverNotes ? `Approver Notes: ${overtime.approverNotes}` : ''}

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
