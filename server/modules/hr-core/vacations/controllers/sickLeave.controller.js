// SickLeave Controller
import SickLeave from '../models/sickLeave.model.js';
import Notification from '../../../notifications/models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../../../email-service/services/email.service.js';
import User from '../../users/models/user.model.js';

/**
 * Get all sick leaves with optional filtering
 */
export const getAllSickLeaves = async (req, res) => {
    try {
        const query = { tenantId: req.tenantId };

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

        // Filter by workflow step if provided
        if (req.query.workflowStep) {
            query['workflow.currentStep'] = req.query.workflowStep;
        }

        const sickLeaves = await SickLeave.find(query)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
            .populate('medicalDocumentation.doctorReviewedBy', 'username employeeId personalInfo')
            .populate('vacationBalance')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: sickLeaves
        });
    } catch (err) {
        console.error('Get sick leaves error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Get sick leaves pending doctor review (doctor role only)
 */
export const getPendingDoctorReview = async (req, res) => {
    try {
        // Check if user has doctor role
        if (req.user.role !== 'doctor') {
            return res.status(403).json({
                error: 'Only doctors can access pending doctor reviews'
            });
        }

        const sickLeaves = await SickLeave.getPendingDoctorReview();

        res.json(sickLeaves);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new sick leave
 */
export const createSickLeave = async (req, res) => {
    try {

        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Handle file uploads for medical documents
        if (req.files && req.files.length > 0) {
            if (!req.body.medicalDocumentation) {
                req.body.medicalDocumentation = {};
            }
            req.body.medicalDocumentation.documents = req.files.map(file => ({
                filename: file.originalname,
                url: file.path,
                uploadedAt: new Date(),
                uploadedBy: req.user._id
            }));
            req.body.medicalDocumentation.provided = true;
        }

        const sickLeave = new SickLeave(req.body);
        const savedSickLeave = await sickLeave.save();

        // Create notification for supervisor
        await createSickLeaveNotification(savedSickLeave, 'submitted');

        // Send email notification to supervisor
        await sendSickLeaveRequestNotification(savedSickLeave);

        res.status(201).json(savedSickLeave);
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
 * Get sick leave by ID
 */
export const getSickLeaveById = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
            .populate('medicalDocumentation.doctorReviewedBy', 'username employeeId personalInfo')
            .populate('vacationBalance');

        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        res.json(sickLeave);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Update sick leave
 */
export const updateSickLeave = async (req, res) => {
    try {
        const oldSickLeave = await SickLeave.findById(req.params.id);
        if (!oldSickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Prevent updating if already approved or rejected
        if (oldSickLeave.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update sick leave with status: ${oldSickLeave.status}`
            });
        }

        const sickLeave = await SickLeave.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(sickLeave);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete sick leave
 */
export const deleteSickLeave = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id);
        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Only allow deletion of pending sick leaves
        if (sickLeave.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete sick leave with status: ${sickLeave.status}`
            });
        }

        await SickLeave.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sick leave deleted successfully' });
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve sick leave by supervisor
 */
export const approveBySupervisor = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Check if sick leave is in correct workflow state
        if (sickLeave.workflow.currentStep !== 'supervisor-review') {
            return res.status(400).json({
                error: `Sick leave is not in supervisor review stage. Current step: ${sickLeave.workflow.currentStep}`
            });
        }

        // Check if already processed by supervisor
        if (sickLeave.workflow.supervisorApprovalStatus !== 'pending') {
            return res.status(400).json({
                error: `Supervisor has already ${sickLeave.workflow.supervisorApprovalStatus} this sick leave`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve sick leaves'
            });
        }

        // Approve by supervisor
        await sickLeave.approveBySupervisor(userId, notes);

        // Create notification
        const notificationType = sickLeave.workflow.currentStep === 'doctor-review' 
            ? 'pending-doctor-review' 
            : 'supervisorApproved';
        await createSickLeaveNotification(sickLeave, notificationType);

        // Send email notification
        await sendSickLeaveStatusUpdateNotification(sickLeave, 'supervisor-approved');

        res.json(sickLeave);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Approve sick leave by doctor
 */
export const approveByDoctor = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Check if sick leave is in correct workflow state
        if (sickLeave.workflow.currentStep !== 'doctor-review') {
            return res.status(400).json({
                error: `Sick leave is not in doctor review stage. Current step: ${sickLeave.workflow.currentStep}`
            });
        }

        // Check if already processed by doctor
        if (sickLeave.workflow.doctorApprovalStatus !== 'pending') {
            return res.status(400).json({
                error: `Doctor has already ${sickLeave.workflow.doctorApprovalStatus} this sick leave`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has doctor role
        if (req.user.role !== 'doctor') {
            return res.status(403).json({
                error: 'Only doctors can approve sick leaves at this stage'
            });
        }

        // Approve by doctor
        await sickLeave.approveByDoctor(userId, notes);

        // Create notification for employee
        await createSickLeaveNotification(sickLeave, 'doctorApproved');

        // Send email notification to employee
        await sendSickLeaveStatusUpdateNotification(sickLeave, 'doctor-approved');

        res.json(sickLeave);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject sick leave by supervisor
 */
export const rejectBySupervisor = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Check if sick leave is in correct workflow state
        if (sickLeave.workflow.currentStep !== 'supervisor-review') {
            return res.status(400).json({
                error: `Sick leave is not in supervisor review stage. Current step: ${sickLeave.workflow.currentStep}`
            });
        }

        // Check if already processed by supervisor
        if (sickLeave.workflow.supervisorApprovalStatus !== 'pending') {
            return res.status(400).json({
                error: `Supervisor has already ${sickLeave.workflow.supervisorApprovalStatus} this sick leave`
            });
        }

        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject sick leaves'
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

        // Reject by supervisor
        await sickLeave.rejectBySupervisor(userId, trimmedReason);

        // Create notification for employee
        await createSickLeaveNotification(sickLeave, 'rejected');

        // Send email notification to employee
        await sendSickLeaveStatusUpdateNotification(sickLeave, 'rejected');

        res.json(sickLeave);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject sick leave by doctor
 */
export const rejectByDoctor = async (req, res) => {
    try {
        const sickLeave = await SickLeave.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!sickLeave) {
            return res.status(404).json({ error: 'Sick leave not found' });
        }

        // Check if sick leave is in correct workflow state
        if (sickLeave.workflow.currentStep !== 'doctor-review') {
            return res.status(400).json({
                error: `Sick leave is not in doctor review stage. Current step: ${sickLeave.workflow.currentStep}`
            });
        }

        // Check if already processed by doctor
        if (sickLeave.workflow.doctorApprovalStatus !== 'pending') {
            return res.status(400).json({
                error: `Doctor has already ${sickLeave.workflow.doctorApprovalStatus} this sick leave`
            });
        }

        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has doctor role
        if (req.user.role !== 'doctor') {
            return res.status(403).json({
                error: 'Only doctors can reject sick leaves at this stage'
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

        // Reject by doctor
        await sickLeave.rejectByDoctor(userId, trimmedReason);

        // Create notification for employee
        await createSickLeaveNotification(sickLeave, 'rejected');

        // Send email notification to employee
        await sendSickLeaveStatusUpdateNotification(sickLeave, 'rejected');

        res.json(sickLeave);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for sick leave status change
 */
async function createSickLeaveNotification(sickLeave, type) {
    try {
        let recipient, message;

        if (type === 'submitted') {
            // Notify supervisor
            const employee = await User.findById(sickLeave.employee).populate('department');
            if (!employee) return;

            const manager = await getEmployeeManager(employee);
            if (!manager) return;

            recipient = manager._id;
            message = `New sick leave request from ${employee.username || employee.email}`;
        } else if (type === 'pending-doctor-review') {
            // Notify doctors - find users with doctor role
            const doctors = await User.find({ role: 'doctor', isActive: true });
            if (doctors.length === 0) return;

            // Create notification for each doctor
            for (const doctor of doctors) {
                const notification = new Notification({
                    recipient: doctor._id,
                    type: 'sick-leave',
                    message: 'New sick leave pending doctor review',
                    relatedModel: 'SickLeave',
                    relatedId: sickLeave._id,
                    read: false
                });
                await notification.save();
            }
            return; // Exit early since we handled multiple notifications
        } else if (type === 'supervisorApproved' || type === 'doctorApproved' || type === 'rejected') {
            // Notify employee
            recipient = sickLeave.employee;
            if (type === 'supervisorApproved') {
                message = 'Your sick leave has been approved by supervisor and is pending doctor review';
            } else if (type === 'doctorApproved') {
                message = 'Your sick leave has been fully approved';
            } else {
                message = 'Your sick leave request has been rejected';
            }
        }

        if (recipient) {
            const notification = new Notification({
                recipient,
                type: 'sick-leave',
                message,
                relatedModel: 'SickLeave',
                relatedId: sickLeave._id,
                read: false
            });

            await notification.save();

            // Mark notification as sent in sick leave
            if (!sickLeave.notifications) {
                sickLeave.notifications = {};
            }
            if (!sickLeave.notifications[type]) {
                sickLeave.notifications[type] = {};
            }
            sickLeave.notifications[type].sent = true;
            sickLeave.notifications[type].sentAt = new Date();
            await sickLeave.save();
        }
    } catch (error) {

    }
}

/**
 * Send sick leave request notification to supervisor
 */
async function sendSickLeaveRequestNotification(sickLeave) {
    try {
        const employee = await User.findById(sickLeave.employee).select('username email personalInfo');
        if (!employee) {

            return { success: false, error: 'Employee not found' };
        }

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

        const startDate = new Date(sickLeave.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(sickLeave.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const subject = `New Sick Leave Request - ${employeeName}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .info-row { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #dc2626; }
                    .label { font-weight: bold; color: #1f2937; }
                    .value { color: #4b5563; margin-left: 10px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 0 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Sick Leave Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new sick leave request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
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
                            <span class="value">${sickLeave.duration} day(s)</span>
                        </div>
                        
                        ${sickLeave.reason ? `
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${sickLeave.reason}</span>
                        </div>
                        ` : ''}
                        
                        ${sickLeave.medicalDocumentation?.required ? `
                        <div class="warning">
                            <strong>⚠️ Medical Documentation Required</strong><br>
                            This sick leave exceeds 3 days and requires doctor approval after your review.
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/sick-leaves" class="button">Review Request</a>
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
New Sick Leave Request

Dear ${managerName},

A new sick leave request has been submitted and requires your approval.

Employee: ${employeeName}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${sickLeave.duration} day(s)
${sickLeave.reason ? `Reason: ${sickLeave.reason}` : ''}

${sickLeave.medicalDocumentation?.required ? 'Medical Documentation Required: This sick leave exceeds 3 days and requires doctor approval after your review.' : ''}

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
 * Send sick leave status update notification
 */
async function sendSickLeaveStatusUpdateNotification(sickLeave, statusType) {
    try {
        const employee = await User.findById(sickLeave.employee).select('username email personalInfo');
        if (!employee || !employee.email) {

            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        const startDate = new Date(sickLeave.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(sickLeave.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let subject, statusColor, statusIcon, statusMessage;

        if (statusType === 'supervisor-approved') {
            subject = 'Sick Leave Approved by Supervisor - Pending Doctor Review';
            statusColor = '#f59e0b';
            statusIcon = '⏳';
            statusMessage = 'Your sick leave has been approved by your supervisor and is now pending doctor review.';
        } else if (statusType === 'doctor-approved') {
            subject = 'Sick Leave Fully Approved';
            statusColor = '#10b981';
            statusIcon = '✅';
            statusMessage = 'Your sick leave has been fully approved by the doctor.';
        } else if (statusType === 'rejected') {
            subject = 'Sick Leave Request Rejected';
            statusColor = '#ef4444';
            statusIcon = '❌';
            statusMessage = 'Your sick leave request has been rejected.';
        }

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
                        <h2>${statusIcon} Sick Leave Update</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>${statusMessage}</p>
                        
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
                            <span class="value">${sickLeave.duration} day(s)</span>
                        </div>
                        
                        ${statusType === 'rejected' && sickLeave.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${sickLeave.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${(statusType === 'supervisor-approved' || statusType === 'doctor-approved') && sickLeave.approverNotes ? `
                        <div class="message-box">
                            <strong>Notes:</strong><br>
                            ${sickLeave.approverNotes}
                        </div>
                        ` : ''}
                        
                        ${statusType === 'doctor-approved' && sickLeave.medicalDocumentation?.doctorNotes ? `
                        <div class="message-box">
                            <strong>Doctor Notes:</strong><br>
                            ${sickLeave.medicalDocumentation.doctorNotes}
                        </div>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/sick-leaves" class="button">View My Sick Leaves</a>
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
Sick Leave Update

Dear ${employeeName},

${statusMessage}

Start Date: ${startDate}
End Date: ${endDate}
Duration: ${sickLeave.duration} day(s)

${statusType === 'rejected' && sickLeave.rejectionReason ? `Rejection Reason: ${sickLeave.rejectionReason}` : ''}
${(statusType === 'supervisor-approved' || statusType === 'doctor-approved') && sickLeave.approverNotes ? `Notes: ${sickLeave.approverNotes}` : ''}
${statusType === 'doctor-approved' && sickLeave.medicalDocumentation?.doctorNotes ? `Doctor Notes: ${sickLeave.medicalDocumentation.doctorNotes}` : ''}

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
