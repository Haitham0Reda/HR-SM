/**
 * Request Control Middleware
 * 
 * Validates if request types are enabled before allowing creation.
 * Used in leave, permission, and other request routes.
 */
import RequestControl from '../modules/hr-core/requests/models/requestControl.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

/**
 * Validate vacation request middleware
 * Checks if vacation requests (annual/casual) are enabled
 */
export const validateVacationRequest = async (req, res, next) => {
    try {
        const { employee, leaveType } = req.body;

        if (!['annual', 'casual'].includes(leaveType)) {
            return next(); // Not a vacation type, skip validation
        }

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed('vacation', leaveType);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType: 'vacation',
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Validate permission request middleware
 * Checks if permission requests are enabled
 */
export const validatePermissionRequest = async (req, res, next) => {
    try {
        const { employee, permissionType } = req.body;

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Map permission type to control format
        const typeMap = {
            'late-arrival': 'lateArrival',
            'early-departure': 'earlyDeparture',
            'overtime': 'overtime'
        };

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed('permission', typeMap[permissionType]);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType: 'permission',
                permissionType,
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Validate sick leave request middleware
 * Checks if sick leave requests are enabled
 */
export const validateSickLeaveRequest = async (req, res, next) => {
    try {
        const { employee, leaveType } = req.body;

        if (leaveType !== 'sick') {
            return next(); // Not a sick leave, skip validation
        }

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed('sick-leave');

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType: 'sick-leave',
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Validate mission request middleware
 * Checks if mission requests are enabled
 */
export const validateMissionRequest = async (req, res, next) => {
    try {
        const { employee, leaveType } = req.body;

        if (leaveType !== 'mission') {
            return next(); // Not a mission, skip validation
        }

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed('mission');

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType: 'mission',
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Validate forgot check request middleware
 * Checks if forgot check-in/out requests are enabled
 */
export const validateForgotCheckRequest = async (req, res, next) => {
    try {
        const { employee } = req.body;

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed('forgot-check');

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType: 'forgot-check',
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Generic validate leave request middleware
 * Checks if any leave type is enabled
 */
export const validateLeaveRequest = async (req, res, next) => {
    try {
        const { employee, leaveType } = req.body;

        const user = await User.findById(employee);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Map leave type to request control type
        let requestType = leaveType;
        if (['annual', 'casual'].includes(leaveType)) {
            requestType = 'vacation';
        } else if (leaveType === 'sick') {
            requestType = 'sick-leave';
        } else if (leaveType === 'mission') {
            requestType = 'mission';
        }

        const control = await RequestControl.getControl('default', null);
        const { allowed, message } = control.isRequestAllowed(requestType, leaveType);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message,
                requestType,
                leaveType,
                disabled: true
            });
        }

        next();
    } catch (error) {

        // On error, allow the request to prevent blocking
        next();
    }
};

/**
 * Check request control status (for GET requests)
 * Returns control status without blocking
 */
export const checkRequestControlStatus = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return next();
        }

        const control = await RequestControl.getControl('default', null);

        // Attach control info to request for use in response
        req.requestControl = {
            systemWideEnabled: control.systemWide.enabled,
            vacationEnabled: control.vacationRequests.enabled,
            permissionEnabled: control.permissionRequests.enabled,
            sickLeaveEnabled: control.sickLeave.enabled,
            missionEnabled: control.missionRequests.enabled,
            forgotCheckEnabled: control.forgotCheck.enabled,
            disabledRequests: control.getDisabledRequests()
        };

        next();
    } catch (error) {

        next();
    }
};

/**
 * Request Control Middleware
 * 
 * Business logic for request control notifications
 * Extracted from requestControl.model.js to follow middleware organization pattern
 */
import mongoose from 'mongoose';

/**
 * Send notifications when requests are disabled/enabled (post-save)
 * Notifies affected users about control changes
 */
export const sendRequestControlNotifications = async (doc, previousChangeCount) => {
    try {
        const Notification = mongoose.model('Notification');
        const User = mongoose.model('User');

        // Get the most recent change from history
        if (doc.changeHistory.length > 0 && doc.changeHistory.length !== previousChangeCount) {
            const latestChange = doc.changeHistory[doc.changeHistory.length - 1];

            // Only send notification for disable actions
            if (latestChange.action === 'disabled') {
                // Get all active employees in the organization/organization
                const query = {
                    isActive: true,
                    'employment.employmentStatus': 'active'
                };

                if (doc.organization) {
                    query.organization = doc.organization;
                }

                const employees = await User.find(query).select('_id');

                // Create notification for each employee
                const notifications = employees.map(employee => ({
                    recipient: employee._id,
                    type: 'request-control',
                    title: latestChange.requestType === 'system-wide'
                        ? 'All Requests Disabled'
                        : `${latestChange.requestType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Requests Disabled`,
                    message: latestChange.message || doc.systemWide.disabledMessage,
                    relatedModel: 'RequestControl',
                    relatedId: doc._id
                }));

                // Bulk insert notifications (limit to prevent overload)
                if (notifications.length > 0 && notifications.length <= 1000) {
                    await Notification.insertMany(notifications);
                }
            }
        }
    } catch (error) {

    }
};

export default {
    sendRequestControlNotifications
};

