// Request Controller
import Request from '../models/request.model.js';
import User from '../../users/models/user.model.js';
import Notification from '../../../notifications/models/notification.model.js';
import { createPermissionNotification } from '../../../../middleware/index.js';
import { sendEmail, getEmployeeManager, getHREmployee, getDoctor } from '../../../email-service/services/email.service.js';
import {
    newRequestNotificationTemplate,
    sickLeaveRequestToDoctorTemplate,
    requestApprovalNotificationTemplate,
    reminderNotificationTemplate,
    sickLeaveApprovalNotificationTemplate
} from '../utils/requestEmailTemplates.js';

export const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find().populate('requestedBy', 'username email profile department');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createRequest = async (req, res) => {
    try {
        const request = new Request(req.body);
        const savedRequest = await request.save();
        
        // Populate employee details for notifications
        await savedRequest.populate('requestedBy', 'username email profile department');
        
        // Send email notifications based on request type
        await sendRequestNotifications(savedRequest, 'created');

        // Handle post-save notification if it's a permission request
        if (savedRequest.requestType === 'permission') {
            await createPermissionNotification(savedRequest, null);
        }

        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id).populate('requestedBy', 'username email profile department');
        if (!request) return res.status(404).json({ error: 'Request not found' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const oldRequest = await Request.findById(req.params.id).populate('requestedBy', 'username email profile department');
        if (!oldRequest) return res.status(404).json({ error: 'Request not found' });

        const previousStatus = oldRequest.status;
        const request = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('requestedBy', 'username email profile department');

        // Handle notification if status changed and it's a permission request
        if (previousStatus !== request.status && request.requestType === 'permission') {
            await createPermissionNotification(request, previousStatus);
        }
        
        // Send email notifications when status changes
        if (previousStatus !== request.status) {
            await sendRequestNotifications(request, 'updated', previousStatus);
        }

        res.json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteRequest = async (req, res) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        res.json({ message: 'Request deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Send email notifications for requests based on type and status
 */
async function sendRequestNotifications(request, action, previousStatus = null) {
    try {
        const employee = request.requestedBy;
        
        // Skip if employee is not populated
        if (!employee) return;
        
        switch (request.requestType) {
            case 'sick-leave':
                await handleSickLeaveNotifications(request, employee, action, previousStatus);
                break;
                
            case 'day-swap':
                await handleDaySwapNotifications(request, employee, action, previousStatus);
                break;
                
            default:
                // For permission, overtime, mission requests
                await handleGeneralRequestNotifications(request, employee, action, previousStatus);
        }
        
        // Send reminder for pending requests (could be scheduled separately in a real implementation)
        if (request.status === 'pending' && action === 'created') {
            // In a real implementation, this would be scheduled to run periodically
            // For demo purposes, we'll send it immediately
            await sendPendingRequestReminder(request, employee);
        }
    } catch (error) {

    }
}

/**
 * Handle notifications for sick leave requests
 */
async function handleSickLeaveNotifications(request, employee, action, previousStatus) {
    switch (action) {
        case 'created':
            // Send to doctor for medical review
            const doctor = await getDoctor();
            if (doctor && doctor.email) {
                const emailTemplate = sickLeaveRequestToDoctorTemplate(request, employee);
                await sendEmail({
                    to: doctor.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
            }
            break;
            
        case 'updated':
            // If doctor approved, notify manager and HR
            if (previousStatus === 'pending' && request.status === 'approved') {
                const doctor = await getDoctor();
                // Notify manager
                const manager = await getEmployeeManager(employee);
                if (manager && manager.email) {
                    const emailTemplate = sickLeaveApprovalNotificationTemplate(request, employee, doctor);
                    await sendEmail({
                        to: manager.email,
                        subject: emailTemplate.subject,
                        html: emailTemplate.html,
                        text: emailTemplate.text
                    });
                }
                
                // Notify HR
                const hrEmployee = await getHREmployee();
                if (hrEmployee && hrEmployee.email) {
                    const emailTemplate = sickLeaveApprovalNotificationTemplate(request, employee, doctor);
                    await sendEmail({
                        to: hrEmployee.email,
                        subject: emailTemplate.subject,
                        html: emailTemplate.html,
                        text: emailTemplate.text
                    });
                }
            }
            
            // Notify employee of final decision
            if (['approved', 'rejected'].includes(request.status) && previousStatus !== request.status) {
                const emailTemplate = requestApprovalNotificationTemplate(request, employee);
                await sendEmail({
                    to: employee.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
                
                // Create in-app notification
                await createRequestStatusNotification(request, employee);
            }
            break;
    }
}

/**
 * Handle notifications for day swap requests
 */
async function handleDaySwapNotifications(request, employee, action, previousStatus) {
    switch (action) {
        case 'created':
            // Notify manager
            const manager = await getEmployeeManager(employee);
            if (manager && manager.email) {
                const emailTemplate = newRequestNotificationTemplate(request, employee);
                await sendEmail({
                    to: manager.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
            }
            
            // Notify HR
            const hrEmployee = await getHREmployee();
            if (hrEmployee && hrEmployee.email) {
                const emailTemplate = newRequestNotificationTemplate(request, employee);
                await sendEmail({
                    to: hrEmployee.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
            }
            break;
            
        case 'updated':
            // Notify employee of decision
            if (['approved', 'rejected'].includes(request.status) && previousStatus !== request.status) {
                const emailTemplate = requestApprovalNotificationTemplate(request, employee);
                await sendEmail({
                    to: employee.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
                
                // Create in-app notification
                await createRequestStatusNotification(request, employee);
            }
            break;
    }
}

/**
 * Handle notifications for general requests (permission, overtime, mission)
 */
async function handleGeneralRequestNotifications(request, employee, action, previousStatus) {
    switch (action) {
        case 'created':
            // Notify manager
            const manager = await getEmployeeManager(employee);
            if (manager && manager.email) {
                const emailTemplate = newRequestNotificationTemplate(request, employee);
                await sendEmail({
                    to: manager.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
            }
            break;
            
        case 'updated':
            // Notify employee of decision
            if (['approved', 'rejected'].includes(request.status) && previousStatus !== request.status) {
                const emailTemplate = requestApprovalNotificationTemplate(request, employee);
                await sendEmail({
                    to: employee.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text
                });
                
                // Create in-app notification
                await createRequestStatusNotification(request, employee);
            }
            break;
    }
}

/**
 * Create in-app notification for request status change
 */
async function createRequestStatusNotification(request, employee) {
    try {
        // Only create notification for final statuses (approved/rejected)
        if (!['approved', 'rejected'].includes(request.status)) {
            return;
        }
        
        const statusText = request.status === 'approved' ? 'approved' : 'rejected';
        const title = `Your ${request.requestType} request has been ${statusText}`;
        let message = `Your ${request.requestType} request submitted on ${new Date(request.createdAt).toLocaleDateString()} has been ${statusText}.`;
        
        // Add reason/comments if available
        if (request.comments) {
            message += ` Reason: ${request.comments}`;
        }
        
        const notification = new Notification({
            recipient: employee._id,
            type: 'request',
            title,
            message,
            status: request.status,
            relatedModel: 'Request',
            relatedId: request._id
        });
        
        await notification.save();
    } catch (error) {

    }
}

/**
 * Send reminder for pending requests
 */
async function sendPendingRequestReminder(request, employee) {
    // Notify manager
    const manager = await getEmployeeManager(employee);
    if (manager && manager.email) {
        const emailTemplate = reminderNotificationTemplate(request, manager, 'Manager');
        await sendEmail({
            to: manager.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        });
    }
    
    // For sick leave requests, also remind the doctor
    if (request.requestType === 'sick-leave') {
        const doctor = await getDoctor();
        if (doctor && doctor.email) {
            const emailTemplate = reminderNotificationTemplate(request, doctor, 'Doctor');
            await sendEmail({
                to: doctor.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            });
        }
    }
    
    // For day swap requests, also remind HR
    if (request.requestType === 'day-swap') {
        const hrEmployee = await getHREmployee();
        if (hrEmployee && hrEmployee.email) {
            const emailTemplate = reminderNotificationTemplate(request, hrEmployee, 'HR');
            await sendEmail({
                to: hrEmployee.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            });
        }
    }
}