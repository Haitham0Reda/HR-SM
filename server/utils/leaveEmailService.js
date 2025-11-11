/**
 * Leave Email Notification Service
 * 
 * Handles sending email notifications for leave requests
 */

import nodemailer from 'nodemailer';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

/**
 * Get employee's manager
 */
async function getEmployeeManager(employeeId) {
    try {
        const employee = await User.findById(employeeId).populate('department');
        if (!employee || !employee.department) {
            return null;
        }

        const department = await Department.findById(employee.department).populate('manager');
        return department?.manager || null;
    } catch (error) {
        console.error('Error getting employee manager:', error);
        return null;
    }
}

/**
 * Send leave request notification to manager
 */
export async function sendLeaveRequestNotification(leave) {
    try {
        // Get employee details
        const employee = await User.findById(leave.employee).select('name email profile');
        if (!employee) {
            console.error('Employee not found for leave request');
            return { success: false, error: 'Employee not found' };
        }

        // Get manager
        const manager = await getEmployeeManager(leave.employee);
        if (!manager || !manager.email) {
            console.log('⚠️  No manager found or manager has no email');
            return { success: false, error: 'Manager not found or has no email' };
        }

        const employeeName = employee.profile?.firstName && employee.profile?.lastName
            ? `${employee.profile.firstName} ${employee.profile.lastName}`
            : employee.name || employee.email;

        const managerName = manager.profile?.firstName && manager.profile?.lastName
            ? `${manager.profile.firstName} ${manager.profile.lastName}`
            : manager.name || 'Manager';

        // Format dates
        const startDate = new Date(leave.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(leave.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Email subject
        const subject = `New ${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave Request - ${employeeName}`;

        // Email HTML content
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
                        <h2>New Leave Request</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${managerName},</p>
                        <p>A new leave request has been submitted and requires your approval.</p>
                        
                        <div class="info-row">
                            <span class="label">Employee:</span>
                            <span class="value">${employeeName}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Leave Type:</span>
                            <span class="value">${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave</span>
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
                            <span class="value">${leave.duration} day(s)</span>
                        </div>
                        
                        ${leave.reason ? `
                        <div class="info-row">
                            <span class="label">Reason:</span>
                            <span class="value">${leave.reason}</span>
                        </div>
                        ` : ''}
                        
                        ${leave.leaveType === 'sick' && leave.medicalDocumentation?.provided ? `
                        <div class="info-row">
                            <span class="label">Medical Document:</span>
                            <span class="value">✓ Attached</span>
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 30px;">Please review and approve or reject this request in the HR Management System.</p>
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/leaves" class="button">Review Request</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from HR Management System</p>
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Plain text version
        const text = `
New Leave Request

Dear ${managerName},

A new leave request has been submitted and requires your approval.

Employee: ${employeeName}
Leave Type: ${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${leave.duration} day(s)
${leave.reason ? `Reason: ${leave.reason}` : ''}
${leave.leaveType === 'sick' && leave.medicalDocumentation?.provided ? 'Medical Document: Attached' : ''}

Please review and approve or reject this request in the HR Management System.

---
This is an automated notification from HR Management System
        `;

        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('📧 EMAIL NOTIFICATION (Email not configured - showing preview):');
            console.log('To:', manager.email);
            console.log('Subject:', subject);
            console.log('---');
            console.log(text);
            console.log('---');
            return { success: true, preview: true };
        }

        // Send email
        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"HR Management System" <${process.env.EMAIL_USER}>`,
            to: manager.email,
            subject: subject,
            html: html,
            text: text
        });

        console.log(`✅ Leave request notification sent to ${manager.email}`);
        return { success: true };

    } catch (error) {
        console.error('Error sending leave request notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send leave status update notification to employee
 */
export async function sendLeaveStatusUpdateNotification(leave, previousStatus) {
    try {
        // Get employee details
        const employee = await User.findById(leave.employee).select('name email profile');
        if (!employee || !employee.email) {
            console.error('Employee not found or has no email');
            return { success: false, error: 'Employee not found or has no email' };
        }

        const employeeName = employee.profile?.firstName && employee.profile?.lastName
            ? `${employee.profile.firstName} ${employee.profile.lastName}`
            : employee.name || employee.email;

        // Format dates
        const startDate = new Date(leave.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(leave.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const leaveTypeName = leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1);
        const statusColor = leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = leave.status === 'approved' ? '✅' : leave.status === 'rejected' ? '❌' : '⏳';

        // Email subject
        const subject = `Leave Request ${leave.status.charAt(0).toUpperCase() + leave.status.slice(1)} - ${leaveTypeName} Leave`;

        // Email HTML content
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
                        <h2>${statusIcon} Leave Request ${leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}</h2>
                    </div>
                    <div class="content">
                        <p>Dear ${employeeName},</p>
                        <p>Your leave request has been <strong>${leave.status}</strong>.</p>
                        
                        <div style="text-align: center;">
                            <span class="status-badge">${leave.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Leave Type:</span>
                            <span class="value">${leaveTypeName} Leave</span>
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
                            <span class="value">${leave.duration} day(s)</span>
                        </div>
                        
                        ${leave.status === 'rejected' && leave.rejectionReason ? `
                        <div class="message-box">
                            <strong>Rejection Reason:</strong><br>
                            ${leave.rejectionReason}
                        </div>
                        ` : ''}
                        
                        ${leave.status === 'approved' && leave.approverNotes ? `
                        <div class="message-box">
                            <strong>Approver Notes:</strong><br>
                            ${leave.approverNotes}
                        </div>
                        ` : ''}
                        
                        ${leave.status === 'approved' ? `
                        <p style="margin-top: 30px; color: #10b981; font-weight: bold;">
                            Your leave has been approved. Enjoy your time off!
                        </p>
                        ` : ''}
                        
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/vacation-request" class="button">View My Requests</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from HR Management System</p>
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Plain text version
        const text = `
Leave Request ${leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}

Dear ${employeeName},

Your leave request has been ${leave.status}.

Status: ${leave.status.toUpperCase()}
Leave Type: ${leaveTypeName} Leave
Start Date: ${startDate}
End Date: ${endDate}
Duration: ${leave.duration} day(s)

${leave.status === 'rejected' && leave.rejectionReason ? `Rejection Reason: ${leave.rejectionReason}` : ''}
${leave.status === 'approved' && leave.approverNotes ? `Approver Notes: ${leave.approverNotes}` : ''}

${leave.status === 'approved' ? 'Your leave has been approved. Enjoy your time off!' : ''}

---
This is an automated notification from HR Management System
        `;

        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('📧 STATUS UPDATE EMAIL (Email not configured - showing preview):');
            console.log('To:', employee.email);
            console.log('Subject:', subject);
            console.log('---');
            console.log(text);
            console.log('---');
            return { success: true, preview: true };
        }

        // Send email
        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"HR Management System" <${process.env.EMAIL_USER}>`,
            to: employee.email,
            subject: subject,
            html: html,
            text: text
        });

        console.log(`✅ Leave status update notification sent to ${employee.email}`);
        return { success: true };

    } catch (error) {
        console.error('Error sending leave status update notification:', error);
        return { success: false, error: error.message };
    }
}

export default {
    sendLeaveRequestNotification,
    sendLeaveStatusUpdateNotification
};
