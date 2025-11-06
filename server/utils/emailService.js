/**
 * Email Service Utility
 * 
 * Handles sending emails for various notifications in the HR system
 * Currently uses console.log for demonstration - can be extended to use nodemailer or other email services
 */

import User from '../models/user.model.js';
import Department from '../models/department.model.js';

/**
 * Send email function
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email address
 * @param {String} options.subject - Email subject
 * @param {String} options.html - HTML email content
 * @param {String} options.text - Plain text email content
 */
export async function sendEmail(options) {
    try {
        // In a real implementation, this would use nodemailer or similar service
        // For now, we'll log to console for demonstration
        console.log('📧 EMAIL SENT:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('---');
        
        // In a real implementation, you would do something like:
        /*
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
        });
        */
        
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get manager for an employee
 * @param {Object} employee - Employee document
 * @returns {Object|null} - Manager user document or null
 */
export async function getEmployeeManager(employee) {
    try {
        // Get employee's department with manager populated
        const department = await Department.findById(employee.department)
            .populate('manager', 'username email profile');
            
        return department?.manager || null;
    } catch (error) {
        console.error('Error getting employee manager:', error);
        return null;
    }
}

/**
 * Get HR employee
 * @returns {Object|null} - HR user document or null
 */
export async function getHREmployee() {
    try {
        // Get first HR user
        const hrUser = await User.findOne({ role: 'hr', isActive: true })
            .select('username email profile');
            
        return hrUser || null;
    } catch (error) {
        console.error('Error getting HR employee:', error);
        return null;
    }
}

/**
 * Get doctor user (for sick leave requests)
 * @returns {Object|null} - Doctor user document or null
 */
export async function getDoctor() {
    try {
        // Get first user with role that might handle medical approvals
        // In a real system, you might have a specific "doctor" role
        const doctor = await User.findOne({ 
            $or: [
                { role: 'hr' },
                { role: 'admin' },
                { role: 'manager' }
            ],
            isActive: true 
        }).select('username email profile');
            
        return doctor || null;
    } catch (error) {
        console.error('Error getting doctor:', error);
        return null;
    }
}

export default {
    sendEmail,
    getEmployeeManager,
    getHREmployee,
    getDoctor
};