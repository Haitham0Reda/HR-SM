/**
 * Pending Request Reminder
 * 
 * Scheduled task to send reminders for pending requests
 * This would typically run daily or at configured intervals
 */

import Request from '../models/request.model.js';
import User from '../models/user.model.js';
import { sendEmail, getEmployeeManager, getHREmployee, getDoctor } from '../services/email.service.js';
import { reminderNotificationTemplate } from './requestEmailTemplates.js';

/**
 * Send reminders for pending requests
 * This function should be scheduled to run periodically (e.g., daily)
 */
export async function sendPendingRequestReminders() {
    try {

        // Find pending requests older than 2 days
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        const pendingRequests = await Request.find({
            status: 'pending',
            requestedAt: { $lt: twoDaysAgo }
        }).populate('employee', 'username email profile department');

        let remindersSent = 0;
        
        for (const request of pendingRequests) {
            try {
                const employee = request.employee;
                
                // Skip if employee is not populated
                if (!employee) continue;
                
                // Send reminder based on request type
                switch (request.type) {
                    case 'sick-leave':
                        await sendSickLeaveReminders(request, employee);
                        break;
                        
                    case 'day-swap':
                        await sendDaySwapReminders(request, employee);
                        break;
                        
                    default:
                        // For permission, overtime, mission requests
                        await sendGeneralRequestReminders(request, employee);
                }
                
                remindersSent++;
            } catch (error) {

            }
        }

        return { success: true, remindersSent };
    } catch (error) {

        return { success: false, error: error.message };
    }
}

/**
 * Send reminders for sick leave requests
 */
async function sendSickLeaveReminders(request, employee) {
    // Remind manager
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
    
    // Remind doctor
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

/**
 * Send reminders for day swap requests
 */
async function sendDaySwapReminders(request, employee) {
    // Remind manager
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
    
    // Remind HR
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

/**
 * Send reminders for general requests (permission, overtime, mission)
 */
async function sendGeneralRequestReminders(request, employee) {
    // Remind manager
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
}

export default {
    sendPendingRequestReminders
};