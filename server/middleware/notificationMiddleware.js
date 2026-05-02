/**
 * Notification Middleware
 * 
 * Validates notification operations.
 */
import User from '../modules/hr-core/users/models/user.model.js';

/**
 * Validate notification recipient middleware
 * Ensures recipient exists
 */
export const validateNotificationRecipient = async (req, res, next) => {
    try {
        if (req.body.recipient) {
            const user = await User.findByPk(req.body.recipient, {
                attributes: ['id', 'is_active']
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification recipient not found'
                });
            }

            if (!user.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot send notification to inactive user'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Validate notification recipient error:', error);
        next();
    }
};

/**
 * Validate bulk notification middleware
 * Ensures bulk notification recipients are valid
 */
export const validateBulkNotification = async (req, res, next) => {
    try {
        if (req.body.recipients && Array.isArray(req.body.recipients)) {
            if (req.body.recipients.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one recipient is required'
                });
            }

            // Limit bulk notifications
            if (req.body.recipients.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot send to more than 1000 recipients at once'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Validate bulk notification error:', error);
        next();
    }
};

/**
 * Check notification permissions middleware
 * Ensures user can send notifications
 */
export const checkNotificationPermissions = (req, res, next) => {
    // Only Manager, HR and Admin can send custom notifications
    if (!['manager', 'hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions to send notifications'
        });
    }
    next();
};
