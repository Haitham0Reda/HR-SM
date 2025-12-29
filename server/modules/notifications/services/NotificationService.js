import NotificationRepository from '../../../repositories/modules/NotificationRepository.js';

/**
 * Notification Service - Business logic layer for notification operations
 * Uses NotificationRepository for data access
 */
class NotificationService {
    constructor() {
        this.notificationRepository = new NotificationRepository();
    }

    /**
     * Get all notifications for user
     */
    async getAllNotifications(recipientId, tenantId, options = {}) {
        const queryOptions = {
            sort: { createdAt: -1 },
            limit: 50,
            ...options
        };

        return await this.notificationRepository.findByRecipient(recipientId, tenantId, queryOptions);
    }

    /**
     * Get recent notifications for user
     */
    async getRecentNotifications(recipientId, tenantId, limit = 50, options = {}) {
        return await this.notificationRepository.findRecent(recipientId, tenantId, limit, options);
    }

    /**
     * Get unread notifications for user
     */
    async getUnreadNotifications(recipientId, tenantId, options = {}) {
        const queryOptions = {
            sort: { createdAt: -1 },
            ...options
        };

        return await this.notificationRepository.findUnread(recipientId, tenantId, queryOptions);
    }

    /**
     * Create notification
     */
    async createNotification(notificationData, tenantId) {
        const dataToCreate = {
            ...notificationData,
            tenantId
        };

        const notification = await this.notificationRepository.create(dataToCreate);
        return notification;
    }

    /**
     * Get notification by ID
     */
    async getNotificationById(id, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return notification;
    }

    /**
     * Update notification
     */
    async updateNotification(id, updateData, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await this.notificationRepository.update(id, updateData);
    }

    /**
     * Delete notification
     */
    async deleteNotification(id, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        await this.notificationRepository.delete(id);
        return { message: 'Notification deleted' };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await this.notificationRepository.markAsRead(id);
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(recipientId, tenantId) {
        return await this.notificationRepository.markAllAsReadForUser(recipientId, tenantId);
    }

    /**
     * Get notifications by type
     */
    async getNotificationsByType(type, tenantId, options = {}) {
        const queryOptions = {
            sort: { createdAt: -1 },
            ...options
        };

        return await this.notificationRepository.findByType(type, tenantId, queryOptions);
    }

    /**
     * Get notifications by priority
     */
    async getNotificationsByPriority(priority, tenantId, options = {}) {
        const queryOptions = {
            sort: { createdAt: -1 },
            ...options
        };

        return await this.notificationRepository.findByPriority(priority, tenantId, queryOptions);
    }

    /**
     * Get notifications by date range
     */
    async getNotificationsByDateRange(startDate, endDate, tenantId, options = {}) {
        const queryOptions = {
            sort: { createdAt: -1 },
            ...options
        };

        return await this.notificationRepository.findByDateRange(startDate, endDate, tenantId, queryOptions);
    }

    /**
     * Create bulk notifications
     */
    async createBulkNotifications(notificationsData, tenantId) {
        return await this.notificationRepository.createBulk(notificationsData, tenantId);
    }

    /**
     * Get notification statistics for user
     */
    async getNotificationStatisticsForUser(recipientId, tenantId) {
        return await this.notificationRepository.getStatisticsForUser(recipientId, tenantId);
    }

    /**
     * Get system-wide notification statistics
     */
    async getSystemNotificationStatistics(tenantId) {
        return await this.notificationRepository.getSystemStatistics(tenantId);
    }

    /**
     * Delete old notifications
     */
    async deleteOldNotifications(tenantId, daysOld = 30) {
        return await this.notificationRepository.deleteOldNotifications(daysOld, tenantId);
    }

    /**
     * Send notification to user
     */
    async sendNotification(recipientId, title, message, type = 'info', priority = 'normal', tenantId, metadata = {}) {
        const notificationData = {
            recipient: recipientId,
            title,
            message,
            type,
            priority,
            metadata,
            sent: true,
            sentAt: new Date()
        };

        return await this.createNotification(notificationData, tenantId);
    }

    /**
     * Send notification to multiple users
     */
    async sendBulkNotification(recipientIds, title, message, type = 'info', priority = 'normal', tenantId, metadata = {}) {
        const notificationsData = recipientIds.map(recipientId => ({
            recipient: recipientId,
            title,
            message,
            type,
            priority,
            metadata,
            sent: true,
            sentAt: new Date()
        }));

        return await this.createBulkNotifications(notificationsData, tenantId);
    }

    /**
     * Schedule notification
     */
    async scheduleNotification(recipientId, title, message, scheduledFor, type = 'info', priority = 'normal', tenantId, metadata = {}) {
        const notificationData = {
            recipient: recipientId,
            title,
            message,
            type,
            priority,
            scheduledFor,
            metadata,
            sent: false
        };

        return await this.createNotification(notificationData, tenantId);
    }

    /**
     * Process scheduled notifications
     */
    async processScheduledNotifications(tenantId) {
        const pendingNotifications = await this.notificationRepository.findPendingScheduled(tenantId);

        const results = [];
        for (const notification of pendingNotifications) {
            try {
                await this.notificationRepository.markAsSent(notification._id);
                results.push({ success: true, id: notification._id });
            } catch (error) {
                results.push({ success: false, id: notification._id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Create system notification
     */
    async createSystemNotification(title, message, type = 'system', priority = 'high', tenantId, metadata = {}) {
        const notificationData = {
            title,
            message,
            type,
            priority,
            isSystem: true,
            metadata,
            sent: true,
            sentAt: new Date()
        };

        return await this.createNotification(notificationData, tenantId);
    }

    /**
     * Create announcement notification
     */
    async createAnnouncementNotification(recipientId, announcementTitle, announcementId, tenantId) {
        const title = 'New Announcement';
        const message = `A new announcement "${announcementTitle}" has been published.`;
        const metadata = {
            announcementId,
            source: 'announcement'
        };

        return await this.sendNotification(
            recipientId,
            title,
            message,
            'announcement',
            'normal',
            tenantId,
            metadata
        );
    }

    /**
     * Create task notification
     */
    async createTaskNotification(recipientId, taskTitle, taskId, action, tenantId) {
        const actionMessages = {
            assigned: `You have been assigned a new task: "${taskTitle}"`,
            completed: `Task "${taskTitle}" has been completed`,
            overdue: `Task "${taskTitle}" is overdue`,
            reminder: `Reminder: Task "${taskTitle}" is due soon`
        };

        const title = `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        const message = actionMessages[action] || `Task "${taskTitle}" has been updated`;
        const metadata = {
            taskId,
            action,
            source: 'task'
        };

        return await this.sendNotification(
            recipientId,
            title,
            message,
            'task',
            action === 'overdue' ? 'high' : 'normal',
            tenantId,
            metadata
        );
    }

    /**
     * Create leave request notification
     */
    async createLeaveRequestNotification(recipientId, employeeName, leaveType, action, leaveId, tenantId) {
        const actionMessages = {
            submitted: `${employeeName} has submitted a ${leaveType} request`,
            approved: `Your ${leaveType} request has been approved`,
            rejected: `Your ${leaveType} request has been rejected`,
            cancelled: `${employeeName} has cancelled their ${leaveType} request`
        };

        const title = `Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        const message = actionMessages[action] || `Leave request has been ${action}`;
        const metadata = {
            leaveId,
            leaveType,
            action,
            source: 'leave'
        };

        return await this.sendNotification(
            recipientId,
            title,
            message,
            'leave',
            'normal',
            tenantId,
            metadata
        );
    }

    /**
     * Get notifications requiring action
     */
    async getNotificationsRequiringAction(recipientId, tenantId) {
        const actionTypes = ['task', 'leave', 'approval'];
        const notifications = await this.notificationRepository.findByRecipient(recipientId, tenantId, {
            filter: {
                type: { $in: actionTypes },
                isRead: false
            },
            sort: { createdAt: -1 }
        });

        return notifications;
    }

    /**
     * Dismiss notification
     */
    async dismissNotification(id, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        const updateData = {
            dismissed: true,
            dismissedAt: new Date()
        };

        return await this.notificationRepository.update(id, updateData);
    }

    /**
     * Snooze notification
     */
    async snoozeNotification(id, snoozeUntil, tenantId) {
        const notification = await this.notificationRepository.findOne({ _id: id, tenantId });

        if (!notification) {
            throw new Error('Notification not found');
        }

        const updateData = {
            snoozed: true,
            snoozeUntil
        };

        return await this.notificationRepository.update(id, updateData);
    }

    /**
     * Get snoozed notifications that should be reactivated
     */
    async getReactivatableNotifications(tenantId) {
        const now = new Date();
        const filter = {
            tenantId,
            snoozed: true,
            snoozeUntil: { $lte: now }
        };

        return await this.notificationRepository.find(filter);
    }

    /**
     * Reactivate snoozed notifications
     */
    async reactivateSnoozedNotifications(tenantId) {
        const notifications = await this.getReactivatableNotifications(tenantId);

        const results = [];
        for (const notification of notifications) {
            try {
                await this.notificationRepository.update(notification._id, {
                    snoozed: false,
                    snoozeUntil: null
                });
                results.push({ success: true, id: notification._id });
            } catch (error) {
                results.push({ success: false, id: notification._id, error: error.message });
            }
        }

        return results;
    }
}

export default NotificationService;