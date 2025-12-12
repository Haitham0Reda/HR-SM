// Permissions Controller
import Permissions from '../models/permissions.model.js';
import Notification from '../../../modules/notifications/models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../../../modules/email-service/services/email.service.js';
import User from '../../../modules/hr-core/users/models/user.model.js';

/**
 * Get all permissions with optional filtering
 */
export const getAllPermissions = async (req, res) => {
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

        // Filter by permission type if provided
        if (req.query.permissionType) {
            query.permissionType = req.query.permissionType;
        }

        const permissions = await Permissions.find(query)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy', 'username employeeId personalInfo')
            .sort({ createdAt: -1 });

        res.json(permissions);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new permission
 */
export const createPermission = async (req, res) => {
    try {

        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const permission = new Permissions(req.body);
        const savedPermission = await permission.save();

        // Create notification for supervisor/manager
        await createPermissionNotification(savedPermission, 'submitted');

        // Send email notification to manager
        await sendPermissionRequestNotification(savedPermission);

        res.status(201).json(savedPermission);
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
 * Get permission by ID
 */
export const getPermissionById = async (req, res) => {
    try {
        const permission = await Permissions.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo department position')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('approvedBy rejectedBy', 'username employeeId personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        res.json(permission);
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Update permission
 */
export const updatePermission = async (req, res) => {
    try {
        const oldPermission = await Permissions.findById(req.params.id);
        if (!oldPermission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        // Prevent updating if already approved or rejected
        if (oldPermission.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update permission with status: ${oldPermission.status}`
            });
        }

        const permission = await Permissions.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json(permission);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete permission
 */
export const deletePermission = async (req, res) => {
    try {
        const permission = await Permissions.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        // Only allow deletion of pending permissions
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete permission with status: ${permission.status}`
            });
        }

        await Permissions.findByIdAndDelete(req.params.id);
        res.json({ message: 'Permission deleted successfully' });
    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve permission
 */
export const approvePermission = async (req, res) => {
    try {
        const permission = await Permissions.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        // Check if permission is already processed
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Permission is already ${permission.status}`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve permissions'
            });
        }

        // Approve the permission
        await permission.approve(userId, notes);

        // Create notification for employee
        await createPermissionNotification(permission, 'approved');

        // Send email notification to employee
        await sendPermissionStatusUpdateNotification(permission);

        res.json(permission);
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject permission
 */
export const rejectPermission = async (req, res) => {
    try {
        const permission = await Permissions.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        // Check if permission is already processed
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Permission is already ${permission.status}`
            });
        }


        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject permissions'
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

        // Reject the permission
        await permission.reject(userId, trimmedReason);

        // Create notification for employee
        await createPermissionNotification(permission, 'rejected');

        // Send email notification to employee
        await sendPermissionStatusUpdateNotification(permission);

        res.json(permission);
    } catch (err) {


        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for permission status change
 */
async function createPermissionNotification(permission, type) {
    try {
        let recipient, message;

        if (type === 'submitted') {
            // Notify manager/supervisor
            const employee = await User.findById(permission.employee).populate('department');
            if (!employee) return;

            const manager = await getEmployeeManager(employee);
            if (!manager) return;

            recipient = manager._id;
            message = `New permission request from ${employee.username || employee.email}`;
        } else if (type === 'approved' || type === 'rejected') {
            // Notify employee
            recipient = permission.employee;
            message = `Your permission request has been ${type}`;
        }

        if (recipient) {
            const notification = new Notification({
                recipient,
                type: 'permission',
                message,
                relatedModel: 'Permissions',
                relatedId: permission._id,
                read: false
            });

            await notification.save();

            // Mark notification as sent in permission
            if (!permission.notifications) {
                permission.notifications = {};
            }
            if (!permission.notifications[type]) {
                permission.notifications[type] = {};
            }
            permission.notifications[type].sent = true;
            permission.notifications[type].sentAt = new Date();
            await permission.save();
        }
    } catch (error) {

    }
}

/**
 * Send permission request notification to manager
 */
async function sendPermissionRequestNotification(permission) {
    try {
        // Get employee details
        const employee = await User.findById(permission.employee).select('username email personalInfo');
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
        const permissionDate = new Date(permission.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const permissionTypeLabel = permission.permissionType === 'late-arrival' ? 'Late Arrival' : 'Early Departure';

        const subject = `New Permission Request - ${employeeName}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .info-row { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #f59e0b; }
                    .label { font-weight: bold; color: #1f2937; }
                    .value { color: #4b5563; margin-left: 10px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 10px 0 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Permission Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new permission request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Permission Type:</span>
                            <span class="value">${permissionTypeLabel}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${permissionDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Time:</span>
                            <span class="value">${permission.time}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${permission.duration} hour(s)</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${permission.reason}</span>
                        </div>
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/permissions" class="button">Review Request</a>
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
New Permission Request

Dear ${managerName},

A new permission request has been submitted and requires your approval.

Employee: ${employeeName}
Permission Type: ${permissionTypeLabel}
Date: ${permissionDate}
Time: ${permission.time}
Duration: ${permission.duration} hour(s)
Reason: ${permission.reason}

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
 * Send permission status update notification to employee
 */
async function sendPermissionStatusUpdateNotification(permission) {
    try {
        // Get employee details
        const employee = await User.findById(permission.employee).select('username email personalInfo');
        if (!employee || !employee.email) {

            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        // Format date
        const permissionDate = new Date(permission.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const permissionTypeLabel = permission.permissionType === 'late-arrival' ? 'Late Arrival' : 'Early Departure';

        const statusColor = permission.status === 'approved' ? '#10b981' : permission.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = permission.status === 'approved' ? '✅' : permission.status === 'rejected' ? '❌' : '⏳';

        const subject = `Permission Request ${permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}`;

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
                        <h2>${statusIcon} Permission Request ${permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>Your permission request has been <strong>${permission.status}</strong>.</p>
                        
                        <div style="text-align: center;">
                            <span class="status-badge">${permission.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Permission Type:</span>
                            <span class="value">${permissionTypeLabel}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${permissionDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Time:</span>
                            <span class="value">${permission.time}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Duration:</span>
                            <span class="value">${permission.duration} hour(s)</span>
                        </div>
                        
                        ${permission.status === 'rejected' && permission.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${permission.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${permission.status === 'approved' && permission.approverNotes ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${permission.approverNotes}
                        </div>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/permissions" class="button">View My Permissions</a>
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
Permission Request ${permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}

Dear ${employeeName},

Your permission request has been ${permission.status}.

Status: ${permission.status.toUpperCase()}
Permission Type: ${permissionTypeLabel}
Date: ${permissionDate}
Time: ${permission.time}
Duration: ${permission.duration} hour(s)

${permission.status === 'rejected' && permission.rejectionReason ? `Rejection Reason: ${permission.rejectionReason}` : ''}
${permission.status === 'approved' && permission.approverNotes ? `Approver Notes: ${permission.approverNotes}` : ''}

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
