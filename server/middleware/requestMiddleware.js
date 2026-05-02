/**
 * Request Middleware
 * 
 * General validation and business logic for requests
 * Note: Permission requests have their own dedicated middleware (permissionMiddleware.js)
 */
import User from '../modules/hr-core/users/models/user.model.js';
import Notification from '../modules/notifications/models/notification.model.js';

/**
 * Validate request type
 */
export const validateRequestType = (req, res, next) => {
    const validTypes = ['permission', 'overtime', 'sick-leave', 'mission', 'day-swap'];

    if (req.body.type && !validTypes.includes(req.body.type)) {
        return res.status(400).json({
            success: false,
            message: `Request type must be one of: ${validTypes.join(', ')}`
        });
    }
    next();
};

/**
 * Validate employee exists and is active
 */
export const validateRequestEmployee = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const employee = await User.findByPk(req.body.employee);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            if (!employee.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee is not active'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Auto-set employee from authenticated user if not provided
 */
export const setRequestEmployee = (req, res, next) => {
    if (req.user && !req.body.employee) {
        req.body.employee = req.user.id;
    }
    next();
};

/**
 * Validate reviewer has appropriate role
 */
export const validateReviewer = async (req, res, next) => {
    try {
        if (req.body.reviewer) {
            const reviewer = await User.findByPk(req.body.reviewer);

            if (!reviewer) {
                return res.status(404).json({
                    success: false,
                    message: 'Reviewer not found'
                });
            }

            if (!['manager', 'hr', 'admin'].includes(reviewer.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Reviewer must have manager, HR or admin role'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Auto-set reviewer and reviewed date on status change
 */
export const setReviewMetadata = (req, res, next) => {
    if (req.body.status && req.body.status !== 'pending') {
        if (req.user && !req.body.reviewer) {
            req.body.reviewer = req.user.id;
        }
        if (!req.body.reviewedAt) {
            req.body.reviewedAt = new Date();
        }
    }
    next();
};

/**
 * Create notification on request status change (post-save)
 */
export const createRequestNotification = async (request, previousStatus) => {
    try {
        // Skip if status hasn't changed
        if (request.status === previousStatus) {
            return;
        }

        let notificationData = {
            recipientId: request.employee,
            tenantId: request.tenantId || request.tenant_id,
            relatedModel: 'Request',
            relatedId: request.id
        };

        switch (request.status) {
            case 'approved':
                notificationData.type = 'request';
                notificationData.title = `${request.type.replace('-', ' ').toUpperCase()} Request Approved`;
                notificationData.message = `Your ${request.type} request has been approved.`;
                break;

            case 'rejected':
                notificationData.type = 'request';
                notificationData.title = `${request.type.replace('-', ' ').toUpperCase()} Request Rejected`;
                notificationData.message = `Your ${request.type} request has been rejected. ${request.comments ? 'Reason: ' + request.comments : ''}`;
                break;
        }

        if (notificationData.title) {
            await Notification.create(notificationData);
        }
    } catch (error) {

    }
};

export default {
    validateRequestType,
    validateRequestEmployee,
    setRequestEmployee,
    validateReviewer,
    setReviewMetadata,
    createRequestNotification
};
