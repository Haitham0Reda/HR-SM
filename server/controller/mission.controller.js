// Mission Controller
import Mission from '../models/mission.model.js';
import Notification from '../models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../services/email.service.js';
import User from '../models/user.model.js';

/**
 * Get all missions with optional filtering
 */
export const getAllMissions = async (req, res) => {
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

        const missions = await Mission.find(query)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('relatedDepartment', 'name code')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
            .sort({ createdAt: -1 });

        res.json(missions);
    } catch (err) {
        console.error('Get missions error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new mission
 */
export const createMission = async (req, res) => {
    try {
        console.log('=== CREATE MISSION REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Handle file uploads for attachments
        if (req.files && req.files.length > 0) {
            req.body.attachments = req.files.map(file => ({
                filename: file.originalname,
                url: file.path,
                uploadedAt: new Date()
            }));
        }

        const mission = new Mission(req.body);
        const savedMission = await mission.save();

        console.log('Mission saved successfully:', savedMission._id);

        // Create notification for supervisor/manager
        await createMissionNotification(savedMission, 'submitted');

        // Send email notification to manager
        await sendMissionRequestNotification(savedMission);

        res.status(201).json(savedMission);
    } catch (err) {
        console.error('Create mission error:', err);
        console.error('Error stack:', err.stack);
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
 * Get mission by ID
 */
export const getMissionById = async (req, res) => {
    try {
        const mission = await Mission.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('relatedDepartment', 'name code')
            .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo');

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        res.json(mission);
    } catch (err) {
        console.error('Get mission by ID error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update mission
 */
export const updateMission = async (req, res) => {
    try {
        const oldMission = await Mission.findById(req.params.id);
        if (!oldMission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        // Prevent updating if already approved or rejected
        if (oldMission.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update mission with status: ${oldMission.status}`
            });
        }

        const mission = await Mission.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(mission);
    } catch (err) {
        console.error('Update mission error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete mission
 */
export const deleteMission = async (req, res) => {
    try {
        const mission = await Mission.findById(req.params.id);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        // Only allow deletion of pending missions
        if (mission.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete mission with status: ${mission.status}`
            });
        }

        await Mission.findByIdAndDelete(req.params.id);
        res.json({ message: 'Mission deleted successfully' });
    } catch (err) {
        console.error('Delete mission error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve mission
 */
export const approveMission = async (req, res) => {
    try {
        const mission = await Mission.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        // Check if mission is already processed
        if (mission.status !== 'pending') {
            return res.status(400).json({
                error: `Mission is already ${mission.status}`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve missions'
            });
        }

        // Approve the mission
        await mission.approve(userId, notes);

        // Create notification for employee
        await createMissionNotification(mission, 'approved');

        // Send email notification to employee
        await sendMissionStatusUpdateNotification(mission);

        res.json(mission);
    } catch (err) {
        console.error('Approve mission error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject mission
 */
export const rejectMission = async (req, res) => {
    try {
        const mission = await Mission.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        // Check if mission is already processed
        if (mission.status !== 'pending') {
            return res.status(400).json({
                error: `Mission is already ${mission.status}`
            });
        }

        console.log('=== REJECT MISSION ===');
        console.log('Mission ID:', req.params.id);
        console.log('User role:', req.user.role);
        console.log('Request body:', req.body);

        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject missions'
            });
        }

        // Validate reason
        if (!reason || typeof reason !== 'string') {
            console.error('Rejection reason validation failed: not a string or missing');
            return res.status(400).json({
                error: 'Rejection reason is required and must be a string'
            });
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            console.error('Rejection reason validation failed: empty after trim');
            return res.status(400).json({
                error: 'Rejection reason is required and cannot be empty'
            });
        }

        if (trimmedReason.length < 10) {
            console.error('Rejection reason validation failed: too short', trimmedReason.length);
            return res.status(400).json({
                error: 'Rejection reason must be at least 10 characters long'
            });
        }

        console.log('Calling reject with reason:', trimmedReason);

        // Reject the mission
        await mission.reject(userId, trimmedReason);

        console.log('Mission rejected successfully');

        // Create notification for employee
        await createMissionNotification(mission, 'rejected');

        // Send email notification to employee
        await sendMissionStatusUpdateNotification(mission);

        res.json(mission);
    } catch (err) {
        console.error('Reject mission error:', err);
        console.error('Error stack:', err.stack);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for mission status change
 */
async function createMissionNotification(mission, type) {
    try {
        let recipient, message;

        if (type === 'submitted') {
            // Notify manager/supervisor
            const employee = await User.findById(mission.employee).populate('department');
            if (!employee) return;

            const manager = await getEmployeeManager(employee);
            if (!manager) return;

            recipient = manager._id;
            message = `New mission request from ${employee.username || employee.email}`;
        } else if (type === 'approved' || type === 'rejected') {
            // Notify employee
            recipient = mission.employee;
            message = `Your mission request has been ${type}`;
        }

        if (recipient) {
            const notification = new Notification({
                recipient,
                type: 'mission',
                message,
                relatedModel: 'Mission',
                relatedId: mission._id,
                read: false
            });

            await notification.save();

            // Mark notification as sent in mission
            if (!mission.notifications) {
                mission.notifications = {};
            }
            if (!mission.notifications[type]) {
                mission.notifications[type] = {};
            }
            mission.notifications[type].sent = true;
            mission.notifications[type].sentAt = new Date();
            await mission.save();
        }
    } catch (error) {
        console.error('Error creating mission notification:', error);
    }
}

/**
 * Send mission request notification to manager
 */
async function sendMissionRequestNotification(mission) {
    try {
        // Get employee details
        const employee = await User.findById(mission.employee).select('username email personalInfo');
        if (!employee) {
            console.error('Employee not found for mission request');
            return { success: false, error: 'Employee not found' };
        }

        // Get manager
        const manager = await getEmployeeManager(employee);
        if (!manager || !manager.email) {
            console.log('⚠️  No manager found or manager has no email');
            return { success: false, error: 'Manager not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        const managerName = manager.personalInfo?.firstName && manager.personalInfo?.lastName
            ? `${manager.personalInfo.firstName} ${manager.personalInfo.lastName}`
            : manager.username || 'Manager';

        // Format dates
        const startDate = new Date(mission.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(mission.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const subject = `New Mission Request - ${employeeName}`;

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
                        <h2>New Mission Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new mission request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Location:</span>
                            <span class="value">${mission.location}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Purpose:</span>
                            <span class="value">${mission.purpose}</span>
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
                            <span class="value">${mission.duration} day(s)</span>
                        </div>
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/missions" class="button">Review Request</a>
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
New Mission Request

Dear ${managerName},

A new mission request has been submitted and requires your approval.

Employee: ${employeeName}
Location: ${mission.location}
Purpose: ${mission.purpose}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${mission.duration} day(s)

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
        console.error('Error sending mission request notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send mission status update notification to employee
 */
async function sendMissionStatusUpdateNotification(mission) {
    try {
        // Get employee details
        const employee = await User.findById(mission.employee).select('username email personalInfo');
        if (!employee || !employee.email) {
            console.error('Employee not found or has no email');
            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        // Format dates
        const startDate = new Date(mission.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(mission.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const statusColor = mission.status === 'approved' ? '#10b981' : mission.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = mission.status === 'approved' ? '✅' : mission.status === 'rejected' ? '❌' : '⏳';

        const subject = `Mission Request ${mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}`;

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
                        <h2>${statusIcon} Mission Request ${mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>Your mission request has been <strong>${mission.status}</strong>.</p>
                        
                        <div style="text-align: center;">
                            <span class="status-badge">${mission.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Location:</span>
                            <span class="value">${mission.location}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Purpose:</span>
                            <span class="value">${mission.purpose}</span>
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
                            <span class="value">${mission.duration} day(s)</span>
                        </div>
                        
                        ${mission.status === 'rejected' && mission.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${mission.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${mission.status === 'approved' && mission.approverNotes ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${mission.approverNotes}
                        </div>
                        ` : ''}
                        
                        ${mission.status === 'approved' ? `
                        <p style="margin-top: 30px; color: #10b981; font-weight: bold;">
                            Your mission has been approved. Safe travels!
                        </p>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/missions" class="button">View My Missions</a>
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
Mission Request ${mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}

Dear ${employeeName},

Your mission request has been ${mission.status}.

Status: ${mission.status.toUpperCase()}
Location: ${mission.location}
Purpose: ${mission.purpose}
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${mission.duration} day(s)

${mission.status === 'rejected' && mission.rejectionReason ? `Rejection Reason: ${mission.rejectionReason}` : ''}
${mission.status === 'approved' && mission.approverNotes ? `Approver Notes: ${mission.approverNotes}` : ''}

${mission.status === 'approved' ? 'Your mission has been approved. Safe travels!' : ''}

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
        console.error('Error sending mission status update notification:', error);
        return { success: false, error: error.message };
    }
}
