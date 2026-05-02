/**
 * Event Middleware
 * 
 * Validation and business logic for events
 */
import User from '../modules/hr-core/users/models/user.model.js';
import Notification from '../modules/notifications/models/notification.model.js';
import { Op } from 'sequelize';

/**
 * Validate event dates
 */
export const validateEventDates = (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
        const start = new Date(req.body.startDate);
        const end = new Date(req.body.endDate);

        if (end < start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Warn if event is too long (more than 30 days)
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {

        }
    }
    next();
};

/**
 * Auto-set created by from authenticated user
 */
export const setEventCreatedBy = (req, res, next) => {
    if (req.user && !req.body.createdBy) {
        req.body.createdBy = req.user.id;
    }
    next();
};

/**
 * Validate attendees exist
 */
export const validateAttendees = async (req, res, next) => {
    try {
        if (req.body.attendees && req.body.attendees.length > 0) {
            const users = await User.findAll({ 
                where: { 
                    id: { [Op.in]: req.body.attendees },
                    is_active: true 
                } 
            });

            if (users.length !== req.body.attendees.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some attendees were not found or are inactive'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Create notifications for event attendees (post-save)
 */
export const createEventNotifications = async (event) => {
    try {
        if (event.attendees && event.attendees.length > 0) {
            const notifications = event.attendees.map(attendeeId => ({
                recipientId: attendeeId,
                tenantId: event.tenantId || event.tenant_id,
                type: 'event',
                title: `Event: ${event.title}`,
                message: `You have been invited to an event on ${new Date(event.startDate).toLocaleDateString()}. Location: ${event.location || 'TBD'}`,
                relatedModel: 'Event',
                relatedId: event.id
            }));

            await Notification.bulkCreate(notifications);
        }
    } catch (error) {
        console.error('Error creating event notifications:', error);
    }
};

/**
 * Validate event start date not in past
 */
export const validateEventNotPast = (req, res, next) => {
    if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        const now = new Date();

        if (startDate < now) {
            return res.status(400).json({
                success: false,
                message: 'Event start date cannot be in the past'
            });
        }
    }
    next();
};

export default {
    validateEventDates,
    setEventCreatedBy,
    validateAttendees,
    createEventNotifications,
    validateEventNotPast
};
