/**
 * Announcement Middleware
 * 
 * Validation and business logic for announcements
 */
import User from '../modules/hr-core/users/models/user.model.js';
import Notification from '../modules/notifications/models/notification.model.js';
import { Op } from 'sequelize';

/**
 * Validate announcement dates
 */
export const validateAnnouncementDates = (req, res, next) => {
    if (req.body.expiryDate) {
        const publishDate = req.body.publishDate ? new Date(req.body.publishDate) : new Date();
        const expiryDate = new Date(req.body.expiryDate);

        if (expiryDate <= publishDate) {
            return res.status(400).json({
                success: false,
                message: 'Expiry date must be after publish date'
            });
        }
    }
    next();
};

/**
 * Validate target audience configuration
 */
export const validateTargetAudience = (req, res, next) => {
    const { targetAudience, departments, employees } = req.body;

    if (targetAudience === 'department' && (!departments || departments.length === 0)) {
        return res.status(400).json({
            success: false,
            message: 'Departments must be specified when target audience is department'
        });
    }

    if (targetAudience === 'specific' && (!employees || employees.length === 0)) {
        return res.status(400).json({
            success: false,
            message: 'Employees must be specified when target audience is specific'
        });
    }

    next();
};

/**
 * Auto-set created by from authenticated user
 */
export const setCreatedBy = (req, res, next) => {
    if (req.user && !req.body.createdBy) {
        req.body.createdBy = req.user.id;
    }
    next();
};

/**
 * Create notifications for announcement (post-save)
 */
export const createAnnouncementNotifications = async (announcement) => {
    try {
        let recipients = [];

        // Determine recipients based on target audience
        if (announcement.targetAudience === 'all' || announcement.target_audience === 'all') {
            const allUsers = await User.findAll({ 
                where: { is_active: true },
                attributes: ['id']
            });
            recipients = allUsers.map(u => u.id);
        } else if (announcement.targetAudience === 'department' || announcement.target_audience === 'department') {
            const deptUsers = await User.findAll({
                where: {
                    department: { [Op.in]: announcement.departments },
                    is_active: true
                },
                attributes: ['id']
            });
            recipients = deptUsers.map(u => u.id);
        } else if (announcement.targetAudience === 'specific' || announcement.target_audience === 'specific') {
            recipients = announcement.employees;
        }

        // Create notification for each recipient
        const notifications = recipients.map(recipientId => ({
            recipientId: recipientId,
            tenantId: announcement.tenantId || announcement.tenant_id,
            type: 'announcement',
            title: announcement.title,
            message: announcement.content.substring(0, 200), // First 200 chars
            relatedModel: 'Announcement',
            relatedId: announcement.id,
            priority: announcement.priority || 'normal'
        }));

        if (notifications.length > 0) {
            await Notification.bulkCreate(notifications);
        }
    } catch (error) {
        console.error('Error creating announcement notifications:', error);
    }
};

export default {
    validateAnnouncementDates,
    validateTargetAudience,
    setCreatedBy,
    createAnnouncementNotifications
};
