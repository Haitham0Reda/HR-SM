/**
 * Survey Notification Controller
 * 
 * Handles sending notifications and reminders for surveys
 */
import SurveyNotification from '../models/surveyNotification.model.js';
import Survey from '../models/survey.model.js';
import User from '../models/user.model.js';
import { getAssignedUsers } from '../utils/surveyHelpers.js';

/**
 * Send survey assignment notifications
 */
export const sendSurveyAssignmentNotifications = async (surveyId) => {
    try {
        const survey = await Survey.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Get all assigned users
        const assignedUsers = await getAssignedUsers(survey);

        if (assignedUsers.length === 0) {
            return { success: false, message: 'No users assigned to this survey' };
        }

        // Create notification
        const notification = await SurveyNotification.createAssignmentNotification(
            survey,
            assignedUsers.map(u => u._id)
        );

        // Send notifications (email, in-app, etc.)
        await sendNotifications(notification, assignedUsers);

        return {
            success: true,
            message: `Survey assignment notifications sent to ${assignedUsers.length} users`,
            notification
        };
    } catch (error) {

        throw error;
    }
};

/**
 * Send reminder notifications
 */
export const sendSurveyReminders = async (surveyId) => {
    try {
        const survey = await Survey.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Get users who haven't responded yet
        const assignedUsers = await getAssignedUsers(survey);
        const respondedUserIds = new Set(
            survey.responses
                .filter(r => r.isComplete)
                .map(r => r.respondent?.toString())
                .filter(id => id)
        );

        const pendingUsers = assignedUsers.filter(
            u => !respondedUserIds.has(u._id.toString())
        );

        if (pendingUsers.length === 0) {
            return { success: false, message: 'All users have responded' };
        }

        // Create reminder notification
        const notification = await SurveyNotification.createReminderNotification(
            survey,
            pendingUsers.map(u => u._id)
        );

        // Send notifications
        await sendNotifications(notification, pendingUsers);

        return {
            success: true,
            message: `Reminders sent to ${pendingUsers.length} users`,
            notification
        };
    } catch (error) {

        throw error;
    }
};

/**
 * Send notifications to users
 */
async function sendNotifications(notification, users) {
    notification.status = 'sending';
    await notification.save();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    for (const recipient of notification.recipients) {
        const user = userMap.get(recipient.user.toString());

        if (!user) continue;

        try {
            // Send in-app notification (mark as sent)
            recipient.sent = true;
            recipient.sentAt = new Date();

            // Send email if enabled
            if (notification.survey && user.email) {
                try {
                    // Email sending logic would go here
                    // For now, just mark as sent
                    recipient.emailSent = true;
                    recipient.emailSentAt = new Date();
                } catch (emailError) {

                    recipient.error = emailError.message;
                }
            }
        } catch (error) {

            recipient.error = error.message;
        }
    }

    notification.markAsSent();
    await notification.save();

    return notification;
}

/**
 * Get user's survey notifications
 */
export const getUserNotifications = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;

        const query = {
            'recipients.user': req.user._id
        };

        if (status) query.status = status;
        if (type) query.notificationType = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const notifications = await SurveyNotification.find(query)
            .populate('survey', 'title description surveyType settings')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        // Filter to include only user's recipient info
        const userNotifications = notifications.map(notif => {
            const notifObj = notif.toObject();
            const userRecipient = notif.recipients.find(
                r => r.user.toString() === req.user._id.toString()
            );

            return {
                _id: notifObj._id,
                survey: notifObj.survey,
                notificationType: notifObj.notificationType,
                message: notifObj.message,
                createdAt: notifObj.createdAt,
                status: userRecipient?.sent ? 'sent' : 'pending',
                read: userRecipient?.read || false,
                readAt: userRecipient?.readAt
            };
        });

        const total = await SurveyNotification.countDocuments(query);

        res.json({
            success: true,
            notifications: userNotifications,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await SurveyNotification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        notification.markAsRead(req.user._id);
        await notification.save();

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Automated reminder scheduler (would be called by cron job)
 */
export const sendScheduledReminders = async () => {
    try {
        const now = new Date();

        // Find active surveys with reminders enabled
        const surveys = await Survey.find({
            status: 'active',
            'settings.emailNotifications.enabled': true,
            'settings.emailNotifications.sendReminders': true,
            'settings.endDate': { $gt: now }
        });

        for (const survey of surveys) {
            const lastReminder = await SurveyNotification.findOne({
                survey: survey._id,
                notificationType: 'survey-reminder'
            }).sort({ createdAt: -1 });

            const reminderFrequency = survey.settings.emailNotifications.reminderFrequency || 3;
            const shouldSendReminder = !lastReminder ||
                (now - lastReminder.createdAt) / (1000 * 60 * 60 * 24) >= reminderFrequency;

            if (shouldSendReminder) {
                await sendSurveyReminders(survey._id);

            }
        }

        return { success: true, message: 'Scheduled reminders sent' };
    } catch (error) {

        throw error;
    }
};

export default {
    sendSurveyAssignmentNotifications,
    sendSurveyReminders,
    getUserNotifications,
    markNotificationAsRead,
    sendScheduledReminders
};
