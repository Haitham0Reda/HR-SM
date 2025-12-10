/**
 * Unified Email Service
 * Consolidates all email functionality with Gmail API and SMTP support
 */
import nodemailer from 'nodemailer';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';

class EmailService {
    constructor() {
        this.transporter = null;
        this.useGmailAPI = false;
        this.initialized = false;
    }

    /**
     * Initialize email transporter
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Try Gmail API first if credentials are available
            if (this.hasGmailAPICredentials()) {
                await this.initializeGmailAPI();
            } else {
                this.initializeSMTP();
            }
            this.initialized = true;
        } catch (error) {

            this.initializeSMTP();
            this.initialized = true;
        }
    }

    /**
     * Check if Gmail API credentials are available
     */
    hasGmailAPICredentials() {
        return !!(
            process.env.GMAIL_CLIENT_ID &&
            process.env.GMAIL_CLIENT_SECRET &&
            process.env.GMAIL_REFRESH_TOKEN
        );
    }

    /**
     * Initialize Gmail API with OAuth2
     */
    async initializeGmailAPI() {
        try {
            const { google } = await import('googleapis');

            const oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );

            oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });

            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN
                }
            });

            this.useGmailAPI = true;
        } catch (error) {
            throw error; // Will trigger fallback to SMTP
        }
    }

    /**
     * Initialize SMTP
     */
    initializeSMTP() {
        const emailUser = process.env.EMAIL_USER?.trim();
        const emailPassword = process.env.EMAIL_PASSWORD?.trim();
        
        if (!emailUser || !emailPassword) {

            this.transporter = null;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });

        this.useGmailAPI = false;

    }

    /**
     * Send email
     */
    async sendEmail(options) {
        try {
            // Ensure initialization
            if (!this.initialized) {
                await this.initialize();
            }
            
            if (!this.transporter) {
                return { success: true, preview: true };
            }

            const mailOptions = {
                from: options.from || `"HR Management System" <${process.env.GMAIL_USER || process.env.EMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                attachments: options.attachments
            };

            const info = await this.transporter.sendMail(mailOptions);

            return { success: true, messageId: info.messageId };
        } catch (error) {

            // Try SMTP fallback if Gmail API fails
            if (this.useGmailAPI) {

                this.initializeSMTP();
                return this.sendEmail(options);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Get employee's manager
     */
    async getEmployeeManager(employee) {
        try {
            const department = await Department.findById(employee.department)
                .populate('manager', 'username email profile');
            return department?.manager || null;
        } catch (error) {

            return null;
        }
    }

    /**
     * Get HR employee
     */
    async getHREmployee() {
        try {
            const hrUser = await User.findOne({ role: 'hr', isActive: true })
                .select('username email profile');
            return hrUser || null;
        } catch (error) {

            return null;
        }
    }

    /**
     * Get doctor user
     */
    async getDoctor() {
        try {
            const doctor = await User.findOne({ 
                $or: [{ role: 'hr' }, { role: 'admin' }, { role: 'manager' }],
                isActive: true 
            }).select('username email profile');
            return doctor || null;
        } catch (error) {

            return null;
        }
    }

    /**
     * Verify connection
     */
    async verify() {
        try {
            // Ensure initialization
            if (!this.initialized) {
                await this.initialize();
            }
            
            if (!this.transporter) return false;
            await this.transporter.verify();

            return true;
        } catch (error) {

            return false;
        }
    }

    /**
     * Get service info
     */
    getServiceInfo() {
        return {
            type: this.useGmailAPI ? 'Gmail API (OAuth2)' : 'SMTP',
            user: process.env.GMAIL_USER || process.env.EMAIL_USER,
            configured: !!this.transporter
        };
    }
}

// Export singleton instance
const emailService = new EmailService();

// Export both the instance and individual functions for backward compatibility
export const sendEmail = (options) => emailService.sendEmail(options);
export const getEmployeeManager = (employee) => emailService.getEmployeeManager(employee);
export const getHREmployee = () => emailService.getHREmployee();
export const getDoctor = () => emailService.getDoctor();

export default emailService;
