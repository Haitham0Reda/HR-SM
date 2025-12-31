// Permission Request Controller
import Permission from '../models/permission.model.js';
import Notification from '../../../notifications/models/notification.model.js';
import { sendEmail, getEmployeeManager } from '../../../email-service/services/email.service.js';
import User from '../../users/models/user.model.js';
import mongoose from 'mongoose';

/**
 * Get all permission requests with optional filtering
 */
export const getAllPermissionRequests = async (req, res) => {
    try {
        // Use tenantId directly as string
        if (!req.tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }
        
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

        // Filter by permission type if provided
        if (req.query.permissionType) {
            query.permissionType = req.query.permissionType;
        }

        // Filter by date range if provided
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const permissions = await Permission.find(query)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('approval.reviewedBy', 'username employeeId personalInfo')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: permissions
        });
    } catch (err) {
        console.error('Get permission requests error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Create a new permission request
 */
export const createPermissionRequest = async (req, res) => {
    try {
        console.log('Creating permission request for user:', req.user?.id);

        // Handle different field name formats from frontend
        const permissionData = {
            tenantId: req.tenantId,
            employee: req.body.employee || req.body.user || req.user?.id || req.user?._id,
            permissionType: req.body.permissionType || req.body.type,
            date: req.body.date,
            reason: req.body.reason,
            status: req.body.status || 'pending'
        };

        // Ensure employee is set - use JWT user if not provided
        if (!permissionData.employee) {
            if (req.user && (req.user.id || req.user._id)) {
                permissionData.employee = req.user.id || req.user._id;
                // Employee ID set from JWT token
            } else {
                console.error('No employee ID provided and no user in JWT token');
                console.error('req.user:', req.user);
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required and user not found in token'
                });
            }
        }

        // Handle time fields - support multiple formats
        if (req.body.time && typeof req.body.time === 'object') {
            // If time object is provided directly (API format)
            permissionData.time = {
                scheduled: req.body.time.scheduled || '09:00',
                requested: req.body.time.requested || '17:00',
                duration: req.body.time.duration || 0
            };
        } else if (req.body.time && typeof req.body.time === 'string') {
            // If single time string is provided (frontend form format)
            // Make reasonable assumptions based on permission type
            const requestedTime = req.body.time;
            let scheduledTime = '09:00'; // Default work start time
            
            if (permissionData.permissionType === 'late-arrival') {
                scheduledTime = '09:00'; // Normal start time
                // requested time is when they want to arrive (later)
            } else if (permissionData.permissionType === 'early-departure') {
                scheduledTime = '17:00'; // Normal end time
                // requested time is when they want to leave (earlier)
            } else if (permissionData.permissionType === 'overtime') {
                scheduledTime = '17:00'; // Normal end time
                // requested time is when they want to finish (later)
            }
            
            permissionData.time = {
                scheduled: scheduledTime,
                requested: requestedTime,
                duration: req.body.duration || 0
            };
        } else {
            // If time fields are provided separately (alternative format)
            permissionData.time = {
                scheduled: req.body.startTime || req.body.scheduledTime || '09:00',
                requested: req.body.endTime || req.body.requestedTime || req.body.time || '17:00',
                duration: req.body.duration || 0
            };
        }

        const permission = new Permission(permissionData);
        
        const savedPermission = await permission.save();

        // Create notification for supervisor/manager
        await createPermissionNotification(savedPermission, 'submitted');

        // Send email notification to manager
        await sendPermissionRequestNotification(savedPermission);

        res.status(201).json({
            success: true,
            data: savedPermission
        });
    } catch (err) {
        console.error('Create permission request error:', err);
        res.status(400).json({
            success: false,
            message: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

/**
 * Get permission request by ID
 */
export const getPermissionRequestById = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('approval.reviewedBy', 'username employeeId personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission request not found' });
        }

        res.json(permission);
    } catch (err) {
        console.error('Get permission request by ID error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update permission request
 */
export const updatePermissionRequest = async (req, res) => {
    try {
        const oldPermission = await Permission.findById(req.params.id);
        if (!oldPermission) {
            return res.status(404).json({ 
                success: false,
                message: 'Permission request not found' 
            });
        }

        // Prevent updating if already approved or rejected
        if (oldPermission.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot update permission request with status: ${oldPermission.status}`
            });
        }

        // Process the update data similar to create function
        const updateData = {
            tenantId: req.tenantId,
            employee: req.body.employee || req.body.user || req.user?.id || req.user?._id,
            permissionType: req.body.permissionType || req.body.type,
            date: req.body.date,
            reason: req.body.reason,
            status: req.body.status || 'pending'
        };

        // Handle time fields - support multiple formats (same as create)
        if (req.body.time && typeof req.body.time === 'object') {
            // If time object is provided directly (API format)
            updateData.time = {
                scheduled: req.body.time.scheduled || oldPermission.time?.scheduled || '09:00',
                requested: req.body.time.requested || oldPermission.time?.requested || '17:00',
                duration: req.body.time.duration || req.body.duration || 0
            };
        } else if (req.body.time && typeof req.body.time === 'string') {
            // If single time string is provided (frontend form format)
            const requestedTime = req.body.time;
            let scheduledTime = oldPermission.time?.scheduled || '09:00';
            
            // Use existing scheduled time or make assumptions based on permission type
            if (!oldPermission.time?.scheduled) {
                if (updateData.permissionType === 'late-arrival') {
                    scheduledTime = '09:00';
                } else if (updateData.permissionType === 'early-departure') {
                    scheduledTime = '17:00';
                } else if (updateData.permissionType === 'overtime') {
                    scheduledTime = '17:00';
                }
            }
            
            updateData.time = {
                scheduled: scheduledTime,
                requested: requestedTime,
                duration: req.body.duration || oldPermission.time?.duration || 0
            };
        } else if (req.body.startTime || req.body.endTime) {
            // If time fields are provided separately (alternative format)
            updateData.time = {
                scheduled: req.body.startTime || req.body.scheduledTime || oldPermission.time?.scheduled || '09:00',
                requested: req.body.endTime || req.body.requestedTime || oldPermission.time?.requested || '17:00',
                duration: req.body.duration || oldPermission.time?.duration || 0
            };
        }

        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const permission = await Permission.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            data: permission
        });
    } catch (err) {
        console.error('Update permission request error:', err);
        res.status(400).json({ 
            success: false,
            message: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

/**
 * Delete permission request
 */
export const deletePermissionRequest = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission request not found' });
        }

        // Only allow deletion of pending permission requests
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot delete permission request with status: ${permission.status}`
            });
        }

        await Permission.findByIdAndDelete(req.params.id);
        res.json({ message: 'Permission request deleted successfully' });
    } catch (err) {
        console.error('Delete permission request error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve permission request
 */
export const approvePermissionRequest = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission request not found' });
        }

        // Check if permission request is already processed
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Permission request is already ${permission.status}`
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (supervisor, HR, admin)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({
                error: 'You do not have permission to approve permission requests'
            });
        }

        // Approve the permission request
        await permission.approve(userId, notes);

        // Create notification for employee
        await createPermissionNotification(permission, 'approved');

        // Send email notification to employee
        await sendPermissionStatusUpdateNotification(permission);

        res.json(permission);
    } catch (err) {
        console.error('Approve permission request error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject permission request
 */
export const rejectPermissionRequest = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('employee', 'username email personalInfo');

        if (!permission) {
            return res.status(404).json({ error: 'Permission request not found' });
        }

        // Check if permission request is already processed
        if (permission.status !== 'pending') {
            return res.status(400).json({
                error: `Permission request is already ${permission.status}`
            });
        }

        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (supervisor, HR, admin)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({
                error: 'You do not have permission to reject permission requests'
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

        // Reject the permission request
        await permission.reject(userId, trimmedReason);

        // Create notification for employee
        await createPermissionNotification(permission, 'rejected');

        // Send email notification to employee
        await sendPermissionStatusUpdateNotification(permission);

        res.json(permission);
    } catch (err) {
        console.error('Reject permission request error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Create notification for permission request status change
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
                relatedModel: 'Permission',
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
        console.error('Create permission notification error:', error);
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
            console.log('Employee not found for permission request notification');
            return { success: false, error: 'Employee not found' };
        }

        // Get manager
        const manager = await getEmployeeManager(employee);
        if (!manager || !manager.email) {
            console.log('Manager not found or has no email for permission request notification');
            return { success: false, error: 'Manager not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        const managerName = manager.personalInfo?.firstName && manager.personalInfo?.lastName
            ? `${manager.personalInfo.firstName} ${manager.personalInfo.lastName}`
            : manager.username || 'Manager';

        // Format date
        const requestDate = new Date(permission.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const permissionTypeName = permission.permissionType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        const subject = `New Permission Request - ${employeeName}`;

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
                            <span class="value">${permissionTypeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${requestDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Scheduled Time:</span>
                            <span class="value">${permission.time.scheduled}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Requested Time:</span>
                            <span class="value">${permission.time.requested}</span>
                        </div>
                        
                        ${permission.reason ? `
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${permission.reason}</span>
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/requests" class="button">Review Request</a>
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
Permission Type: ${permissionTypeName}
Date: ${requestDate}
Scheduled Time: ${permission.time.scheduled}
Requested Time: ${permission.time.requested}
${permission.reason ? `Reason: ${permission.reason}` : ''}

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
        console.error('Send permission request notification error:', error);
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
            console.log('Employee not found or has no email for permission status notification');
            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.personalInfo?.firstName && employee.personalInfo?.lastName
            ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
            : employee.username || employee.email;

        // Format date
        const requestDate = new Date(permission.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const permissionTypeName = permission.permissionType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
                            <span class="value">${permissionTypeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${requestDate}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Scheduled Time:</span>
                            <span class="value">${permission.time.scheduled}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Requested Time:</span>
                            <span class="value">${permission.time.requested}</span>
                        </div>
                        
                        ${permission.status === 'rejected' && permission.rejection?.reason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${permission.rejection.reason}
                        </div>
                        ` : ''}
                        
                        ${permission.status === 'approved' && permission.approval?.comments ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${permission.approval.comments}
                        </div>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/requests" class="button">View My Requests</a>
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

Permission Type: ${permissionTypeName}
Date: ${requestDate}
Scheduled Time: ${permission.time.scheduled}
Requested Time: ${permission.time.requested}

${permission.status === 'rejected' && permission.rejection?.reason ? `Rejection Reason: ${permission.rejection.reason}` : ''}
${permission.status === 'approved' && permission.approval?.comments ? `Approver Notes: ${permission.approval.comments}` : ''}

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
        console.error('Send permission status update notification error:', error);
        return { success: false, error: error.message };
    }
}