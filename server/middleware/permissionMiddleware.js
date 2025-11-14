/**
 * Permission Middleware
 * 
 * Business logic and validation for permission requests
 * Extracted from permission.model.js to follow middleware organization pattern
 */

/**
 * Calculate duration in minutes between scheduled and requested times
 */
export const calculatePermissionDuration = (req, res, next) => {
    if (req.body.time?.scheduled && req.body.time?.requested) {
        const scheduled = req.body.time.scheduled.split(':');
        const requested = req.body.time.requested.split(':');

        const scheduledMinutes = parseInt(scheduled[0]) * 60 + parseInt(scheduled[1]);
        const requestedMinutes = parseInt(requested[0]) * 60 + parseInt(requested[1]);

        // Calculate absolute difference
        if (!req.body.time) req.body.time = {};
        req.body.time.duration = Math.abs(requestedMinutes - scheduledMinutes);
    }
    next();
};

/**
 * Create notification when permission status changes (post-save)
 */
export const createPermissionNotification = async (permission, previousStatus) => {
    try {
        const mongoose = await import('mongoose');
        const Notification = mongoose.default.model('Notification');

        // Only create notification if status changed
        if (permission.status === previousStatus) {
            return;
        }

        let notificationData = {
            recipient: permission.employee,
            relatedModel: 'Permission',
            relatedId: permission._id,
            status: permission.status
        };

        switch (permission.status) {
            case 'approved':
                notificationData.type = 'permission';
                notificationData.title = 'Permission Request Approved';
                notificationData.message = `Your ${permission.permissionType} request for ${permission.date.toLocaleDateString()} has been approved.`;
                break;

            case 'rejected':
                notificationData.type = 'permission';
                notificationData.title = 'Permission Request Rejected';
                notificationData.message = `Your ${permission.permissionType} request for ${permission.date.toLocaleDateString()} has been rejected. Reason: ${permission.rejection.reason}`;
                break;

            case 'cancelled':
                notificationData.type = 'permission';
                notificationData.title = 'Permission Request Cancelled';
                notificationData.message = `Your ${permission.permissionType} request for ${permission.date.toLocaleDateString()} has been cancelled.`;
                break;
        }

        if (notificationData.title) {
            await Notification.create(notificationData);
        }
    } catch (error) {
        console.error('Error creating permission notification:', error);
    }
};

export default {
    calculatePermissionDuration,
    createPermissionNotification
};
