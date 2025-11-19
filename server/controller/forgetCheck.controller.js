// ForgetCheck Controller
import ForgetCheck from '../models/forgetCheck.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { sendEmail, getEmployeeManager, getHREmployee } from '../utils/emailService.js';
import { 
    newForgetCheckNotificationTemplate, 
    forgetCheckApprovalNotificationTemplate 
} from '../utils/requestEmailTemplates.js';

export const getAllForgetChecks = async (req, res) => {
    try {
        console.log('Fetching all forget checks from database');
        console.log('User making request:', req.user);
        
        const forgetChecks = await ForgetCheck.find()
            .populate('employee', 'username email employeeId profile.firstName profile.lastName')
            .populate('department', 'name code')
            .populate('position', 'title')
            .sort({ createdAt: -1 });
            
        console.log('Found forget checks:', forgetChecks.length);
        console.log('Forget checks data:', JSON.stringify(forgetChecks, null, 2));
        
        // Ensure we always return an array
        const result = Array.isArray(forgetChecks) ? forgetChecks : [];
        res.json(result);
    } catch (err) {
        console.error('Error fetching forget checks:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: err.message });
    }
};

export const createForgetCheck = async (req, res) => {
    try {
        console.log('Creating forget check with data:', req.body);
        
        // Validate required fields
        const { employee, date, requestType, requestedTime } = req.body;
        
        if (!employee) {
            return res.status(400).json({ 
                error: 'Employee is required',
                required: ['employee', 'date', 'requestType', 'requestedTime'],
                provided: Object.keys(req.body)
            });
        }
        
        if (!date) {
            return res.status(400).json({ 
                error: 'Date is required',
                required: ['employee', 'date', 'requestType', 'requestedTime'],
                provided: Object.keys(req.body)
            });
        }
        
        if (!requestType) {
            return res.status(400).json({ 
                error: 'Request type is required',
                required: ['employee', 'date', 'requestType', 'requestedTime'],
                provided: Object.keys(req.body)
            });
        }
        
        if (!requestedTime) {
            return res.status(400).json({ 
                error: 'Requested time is required',
                required: ['employee', 'date', 'requestType', 'requestedTime'],
                provided: Object.keys(req.body)
            });
        }
        
        // Validate date format
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ 
                error: 'Invalid date format',
                provided: date
            });
        }
        
        // Validate requestedTime format
        const parsedRequestedTime = new Date(requestedTime);
        if (isNaN(parsedRequestedTime.getTime())) {
            return res.status(400).json({ 
                error: 'Invalid requested time format',
                provided: requestedTime
            });
        }
        
        // Validate requestType
        const validRequestTypes = ['forget-check-in', 'forget-check-out'];
        if (!validRequestTypes.includes(requestType)) {
            return res.status(400).json({ 
                error: 'Invalid request type',
                validTypes: validRequestTypes,
                provided: requestType
            });
        }
        
        const forgetCheckData = {
            employee,
            date: parsedDate,
            requestType,
            requestedTime: parsedRequestedTime
        };
        
        // Add optional fields if provided
        if (req.body.reason) {
            forgetCheckData.reason = req.body.reason;
        }
        
        if (req.body.department) {
            forgetCheckData.department = req.body.department;
        }
        
        if (req.body.position) {
            forgetCheckData.position = req.body.position;
        }
        
        console.log('Creating forget check with validated data:', forgetCheckData);
        const forgetCheck = new ForgetCheck(forgetCheckData);
        const savedForgetCheck = await forgetCheck.save();
        
        console.log('Forget check saved:', savedForgetCheck);
        
        // Populate employee details for notifications
        await savedForgetCheck.populate('employee', 'username email profile department');
        console.log('Populated forget check:', savedForgetCheck);
        
        // Send email notifications
        try {
            await sendForgetCheckNotifications(savedForgetCheck, 'created');
        } catch (notificationError) {
            console.error('Error sending notifications:', notificationError);
            // Don't fail the request if notifications fail
        }

        res.status(201).json(savedForgetCheck);
    } catch (err) {
        console.error('Error creating forget check:', err);
        console.error('Error stack:', err.stack);
        
        // Provide more detailed error information
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors,
                message: err.message 
            });
        }
        
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Invalid data format', 
                message: err.message 
            });
        }
        
        res.status(400).json({ 
            error: 'Failed to create forget check record',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

export const getForgetCheckById = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findById(req.params.id)
            .populate('employee', 'username email employeeId profile.firstName profile.lastName')
            .populate('department', 'name code')
            .populate('position', 'title');
        if (!forgetCheck) return res.status(404).json({ error: 'ForgetCheck not found' });
        res.json(forgetCheck);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateForgetCheck = async (req, res) => {
    try {
        const oldForgetCheck = await ForgetCheck.findById(req.params.id).populate('employee', 'username email profile department');
        if (!oldForgetCheck) return res.status(404).json({ error: 'ForgetCheck not found' });

        const previousStatus = oldForgetCheck.status;
        const forgetCheck = await ForgetCheck.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('employee', 'username email employeeId profile.firstName profile.lastName')
            .populate('department', 'name code')
            .populate('position', 'title');

        // Send email notifications when status changes
        if (previousStatus !== forgetCheck.status) {
            await sendForgetCheckNotifications(forgetCheck, 'updated', previousStatus);
        }

        res.json(forgetCheck);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByIdAndDelete(req.params.id);
        if (!forgetCheck) return res.status(404).json({ error: 'ForgetCheck not found' });
        res.json({ message: 'ForgetCheck deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Send email notifications for forget check requests based on status
 */
async function sendForgetCheckNotifications(forgetCheck, action, previousStatus = null) {
    try {
        console.log('Sending forget check notifications:', { forgetCheck, action, previousStatus });
        
        const employee = forgetCheck.employee;
        
        // Skip if employee is not populated
        if (!employee) {
            console.log('Skipping notifications: employee not populated');
            return;
        }
        
        switch (action) {
            case 'created':
                // Notify manager
                try {
                    const manager = await getEmployeeManager(employee);
                    console.log('Manager found:', manager);
                    if (manager && manager.email) {
                        const emailTemplate = newForgetCheckNotificationTemplate(forgetCheck, employee);
                        await sendEmail({
                            to: manager.email,
                            subject: emailTemplate.subject,
                            html: emailTemplate.html,
                            text: emailTemplate.text
                        });
                    }
                } catch (managerError) {
                    console.error('Error notifying manager:', managerError);
                }
                
                // Notify HR
                try {
                    const hrEmployee = await getHREmployee();
                    console.log('HR employee found:', hrEmployee);
                    if (hrEmployee && hrEmployee.email) {
                        const emailTemplate = newForgetCheckNotificationTemplate(forgetCheck, employee);
                        await sendEmail({
                            to: hrEmployee.email,
                            subject: emailTemplate.subject,
                            html: emailTemplate.html,
                            text: emailTemplate.text
                        });
                    }
                } catch (hrError) {
                    console.error('Error notifying HR:', hrError);
                }
                break;
                
            case 'updated':
                // Notify employee of decision
                try {
                    if (['approved', 'rejected'].includes(forgetCheck.status) && previousStatus !== forgetCheck.status) {
                        const emailTemplate = forgetCheckApprovalNotificationTemplate(forgetCheck, employee);
                        await sendEmail({
                            to: employee.email,
                            subject: emailTemplate.subject,
                            html: emailTemplate.html,
                            text: emailTemplate.text
                        });
                        
                        // Create in-app notification
                        await createForgetCheckStatusNotification(forgetCheck, employee);
                    }
                } catch (updateError) {
                    console.error('Error notifying employee of update:', updateError);
                }
                break;
        }
    } catch (error) {
        console.error('Error sending forget check notifications:', error);
        // Don't throw error to prevent failing the main request
    }
}

/**
 * Create in-app notification for forget check status change
 */
async function createForgetCheckStatusNotification(forgetCheck, employee) {
    try {
        // Only create notification for final statuses (approved/rejected)
        if (!['approved', 'rejected'].includes(forgetCheck.status)) {
            return;
        }
        
        const statusText = forgetCheck.status === 'approved' ? 'approved' : 'rejected';
        const title = `Your forget check ${forgetCheck.requestType} request has been ${statusText}`;
        let message = `Your forget check ${forgetCheck.requestType} request submitted on ${new Date(forgetCheck.createdAt).toLocaleDateString()} has been ${statusText}.`;
        
        // Add reason/comments if available
        if (forgetCheck.rejectionReason) {
            message += ` Reason: ${forgetCheck.rejectionReason}`;
        }
        
        const notification = new Notification({
            recipient: employee._id,
            type: 'forget-check',
            title,
            message,
            status: forgetCheck.status,
            relatedModel: 'ForgetCheck',
            relatedId: forgetCheck._id
        });
        
        await notification.save();
    } catch (error) {
        console.error('Error creating forget check status notification:', error);
    }
}