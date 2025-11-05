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
 */
export const calculateDuration = (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
        const start = new Date(req.body.startDate);
        const end = new Date(req.body.endDate);
        const diffTime = Math.abs(end - start);
        req.body.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

        let notificationData = {
            recipient: leave.employee,
            relatedModel: 'Leave',
            relatedId: leave._id
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
