/**
 * Leave Middleware
 * 
 * Business logic and validation for leave requests
 * Extracted from leave.model.js to follow middleware organization pattern
 */
import mongoose from 'mongoose';

/**
 * Populate department and position from employee before save
 */
export const populateDepartmentPosition = async (req, res, next) => {
    try {
        if (req.body.employee || req.leave?.isModified('employee')) {
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee || req.leave.employee)
                .select('department position');

            if (employee) {
                if (req.body) {
                    req.body.department = employee.department;
                    req.body.position = employee.position;
                }
                if (req.leave) {
                    req.leave.department = employee.department;
                    req.leave.position = employee.position;
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error populating department/position:', error);
        next();
    }
};

/**
 * Calculate leave duration from start and end dates
 * Excludes Fridays (5) and Saturdays (6) as they are official holidays
 */
export const calculateDuration = (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
        const start = new Date(req.body.startDate);
        const end = new Date(req.body.endDate);

        let workingDays = 0;
        const current = new Date(start);

        // Loop through each day and count only working days (Sunday-Thursday)
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 1 = Monday, ..., 4 = Thursday (working days)
            // 5 = Friday, 6 = Saturday (official holidays - excluded)
            if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        req.body.duration = workingDays;
    }
    next();
};

/**
 * Set medical documentation requirement for sick leave
 */
export const setMedicalDocRequirement = (req, res, next) => {
    if (req.body.leaveType === 'sick' && req.body.duration > 1) {
        if (!req.body.medicalDocumentation) {
            req.body.medicalDocumentation = {};
        }
        req.body.medicalDocumentation.required = true;
    }
    next();
};

/**
 * Reserve vacation balance for pending leave requests
 */
export const reserveVacationBalance = async (req, res, next) => {
    try {
        if (req.body.employee && ['annual', 'casual', 'sick'].includes(req.body.leaveType)) {
            const VacationBalance = mongoose.model('VacationBalance');
            const year = new Date(req.body.startDate).getFullYear();

            // Find or create vacation balance for employee
            let balance = await VacationBalance.findOne({
                employee: req.body.employee,
                year
            });

            if (!balance) {
                balance = await VacationBalance.initializeForEmployee(req.body.employee);
            }

            // Link vacation balance
            req.body.vacationBalance = balance._id;

            // For sick leave, reserve from annual balance instead
            const balanceType = req.body.leaveType === 'sick' ? 'annual' : req.body.leaveType;

            // Reserve balance if status is pending
            if (!req.body.status || req.body.status === 'pending') {
                await balance.reserveBalance(balanceType, req.body.duration);
            }
        }
        next();
    } catch (error) {
        console.error('Error reserving vacation balance:', error);
        // Don't block save if balance reservation fails
        next();
    }
};

/**
 * Initialize workflow based on leave type
 */
export const initializeWorkflow = (req, res, next) => {
    if (!req.body.workflow) {
        req.body.workflow = {};
    }

    if (req.body.leaveType === 'sick') {
        req.body.workflow.currentStep = 'supervisor-review';
        req.body.workflow.doctorApprovalStatus = 'pending';
    } else if (req.body.leaveType === 'mission') {
        req.body.workflow.currentStep = 'supervisor-review';
        req.body.workflow.doctorApprovalStatus = 'not-required';
    } else {
        req.body.workflow.doctorApprovalStatus = 'not-required';
    }

    next();
};

/**
 * Handle vacation balance updates on status change (post-save)
 */
export const handleVacationBalanceUpdate = async (leave) => {
    try {
        const VacationBalance = mongoose.model('VacationBalance');
        const year = new Date(leave.startDate).getFullYear();
        const balance = await VacationBalance.findOne({
            employee: leave.employee,
            year
        });

        if (balance) {
            // Determine balance type (sick leave uses annual balance)
            const balanceType = leave.leaveType === 'sick' ? 'annual' : leave.leaveType;

            if (leave.status === 'approved' && ['annual', 'casual', 'sick'].includes(leave.leaveType)) {
                // Confirm usage - move from pending to used
                await balance.confirmUsage(balanceType, leave.duration);
            } else if (['rejected', 'cancelled'].includes(leave.status)) {
                // Release reserved balance back to available
                await balance.releaseBalance(balanceType, leave.duration);
            }
        }
    } catch (error) {
        console.error('Error in leave vacation balance update:', error);
    }
};

/**
 * Create notifications on workflow/status changes (post-save)
 */
export const createLeaveNotifications = async (leave, previousValues) => {
    try {
        const Notification = mongoose.model('Notification');
        const User = mongoose.model('User');

        console.log('createLeaveNotifications called:', {
            status: leave.status,
            previousValues,
            shouldCreateNotification: leave.status === 'pending' && !previousValues
        });

        // If this is a new request (status is pending and no previous values), notify HR/Admin and employee
        if (leave.status === 'pending' && !previousValues) {
            // Get all HR and Admin users
            const hrAdminUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
            console.log('Found HR/Admin users:', hrAdminUsers.length);

            // Get employee details
            const employee = await User.findById(leave.employee);
            const employeeName = employee?.name || 'An employee';

            // Create notifications for each HR/Admin
            const hrNotifications = hrAdminUsers.map(user => ({
                recipient: user._id,
                type: 'leave',
                title: 'New Leave Request',
                message: `${employeeName} has submitted a ${leave.leaveType} leave request from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()}.`,
                status: leave.status,
                relatedModel: 'Leave',
                relatedId: leave._id
            }));

            // Create notification for the employee (confirmation)
            const employeeNotification = {
                recipient: leave.employee,
                type: 'leave',
                title: 'Leave Request Submitted',
                message: `Your ${leave.leaveType} leave request from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been submitted and is pending approval.`,
                status: leave.status,
                relatedModel: 'Leave',
                relatedId: leave._id
            };

            const allNotifications = [...hrNotifications, employeeNotification];

            if (allNotifications.length > 0) {
                console.log('Creating notifications:', allNotifications.length);
                await Notification.insertMany(allNotifications);
                console.log('Notifications created successfully');
            } else {
                console.log('No users found to notify');
            }
        }

        // Notify employee about status changes
        let notificationData = {
            recipient: leave.employee,
            relatedModel: 'Leave',
            relatedId: leave._id,
            status: leave.status
        };

        switch (leave.workflow.currentStep) {
            case 'doctor-review':
                notificationData.type = 'leave';
                notificationData.title = 'Sick Leave - Pending Doctor Review';
                notificationData.message = `Your sick leave request has been approved by your supervisor and is now pending doctor review.`;
                break;

            case 'completed':
                if (leave.status === 'approved') {
                    notificationData.type = 'leave';
                    notificationData.title = `${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave Approved`;
                    notificationData.message = `Your ${leave.leaveType} leave request from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been approved.`;
                }
                break;

            case 'rejected':
                notificationData.type = 'leave';
                notificationData.title = `${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave Rejected`;
                notificationData.message = `Your ${leave.leaveType} leave request has been rejected. Reason: ${leave.rejectionReason}`;
                notificationData.status = 'rejected';
                break;
        }

        if (notificationData.title) {
            await Notification.create(notificationData);
        }

        // Handle additional documentation request notification
        if (leave.medicalDocumentation?.additionalDocRequested) {
            await Notification.create({
                recipient: leave.employee,
                type: 'leave',
                title: 'Additional Medical Documentation Required',
                message: `The doctor has requested additional medical documentation for your sick leave request. ${leave.medicalDocumentation.requestNotes || ''}`,
                status: leave.status,
                relatedModel: 'Leave',
                relatedId: leave._id
            });
        }
    } catch (error) {
        console.error('Error creating leave notification:', error);
    }
};

export default {
    populateDepartmentPosition,
    calculateDuration,
    setMedicalDocRequirement,
    reserveVacationBalance,
    initializeWorkflow,
    handleVacationBalanceUpdate,
    createLeaveNotifications
};
