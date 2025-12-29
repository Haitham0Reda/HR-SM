import BaseRepository from '../BaseRepository.js';
import Notification from '../../modules/notifications/models/notification.model.js';

/**
 * Notification Repository - Data access layer for notification operations
 * Extends BaseRepository with notification-specific query methods
 */
class NotificationRepository extends BaseRepository {
    constructor() {
        super(Notification);
    }

    /**
     * Find notifications by recipient
     */
    async findByRecipient(recipientId, tenantId, options = {}) {
        const filter = { recipient: recipientId, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find notifications by read status
     */
    async findByReadStatus(isRead, recipientId, tenantId, options = {}) {
        const filter = { isRead, recipient: recipientId, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find unread notifications for user
     */
    async findUnread(recipientId, tenantId, options = {}) {
        return await this.findByReadStatus(false, recipientId, tenantId, options);
    }

    /**
     * Find notifications by type
     */
    async findByType(type, tenantId, options = {}) {
        const filter = { type, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find notifications by priority
     */
    async findByPriority(priority, tenantId, options = {}) {
        const filter = { priority, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find notifications by date range
     */
    async findByDateRange(startDate, endDate, tenantId, options = {}) {
        const filter = {
            tenantId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find recent notifications for user
     */
    async findRecent(recipientId, tenantId, limit = 50, options = {}) {
        const filter = { recipient: recipientId, tenantId };
        const queryOptions = {
            sort: { createdAt: -1 },
            limit,
            ...options
        };
        return await this.find(filter, queryOptions);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id) {
        return await this.update(id, { isRead: true, readAt: new Date() });
    }

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(notificationIds) {
        const updateData = { isRead: true, readAt: new Date() };
        const results = [];

        for (const id of notificationIds) {
            try {
                const notification = await this.update(id, updateData);
                results.push({ success: true, id, data: notification });
            } catch (error) {
                results.push({ success: false, id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsReadForUser(recipientId, tenantId) {
        const unreadNotifications = await this.findUnread(recipientId, tenantId);
        const notificationIds = unreadNotifications.map(n => n._id);

        if (notificationIds.length === 0) {
            return { modifiedCount: 0 };
        }

        return await this.markMultipleAsRead(notificationIds);
    }

    /**
     * Delete old notifications
     */
    async deleteOldNotifications(daysOld = 30, tenantId) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const oldNotifications = await this.find({
            tenantId,
            createdAt: { $lt: cutoffDate },
            isRead: true
        });

        const results = [];
        for (const notification of oldNotifications) {
            try {
                await this.delete(notification._id);
                results.push({ success: true, id: notification._id });
            } catch (error) {
                results.push({ success: false, id: notification._id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get notification statistics for user
     */
    async getStatisticsForUser(recipientId, tenantId) {
        const notifications = await this.findByRecipient(recipientId, tenantId);

        const statistics = {
            total: notifications.length,
            unread: 0,
            read: 0,
            byType: {},
            byPriority: {},
            recentCount: 0 // Last 7 days
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        notifications.forEach(notification => {
            // Read status counts
            if (notification.isRead) {
                statistics.read++;
            } else {
                statistics.unread++;
            }

            // By type
            if (notification.type) {
                statistics.byType[notification.type] =
                    (statistics.byType[notification.type] || 0) + 1;
            }

            // By priority
            if (notification.priority) {
                statistics.byPriority[notification.priority] =
                    (statistics.byPriority[notification.priority] || 0) + 1;
            }

            // Recent count
            if (notification.createdAt && notification.createdAt > sevenDaysAgo) {
                statistics.recentCount++;
            }
        });

        return statistics;
    }

    /**
     * Get system-wide notification statistics
     */
    async getSystemStatistics(tenantId) {
        const notifications = await this.find({ tenantId });

        const statistics = {
            total: notifications.length,
            unread: 0,
            read: 0,
            byType: {},
            byPriority: {},
            byRecipient: {},
            dailyCount: {} // Last 30 days
        };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        notifications.forEach(notification => {
            // Read status counts
            if (notification.isRead) {
                statistics.read++;
            } else {
                statistics.unread++;
            }

            // By type
            if (notification.type) {
                statistics.byType[notification.type] =
                    (statistics.byType[notification.type] || 0) + 1;
            }

            // By priority
            if (notification.priority) {
                statistics.byPriority[notification.priority] =
                    (statistics.byPriority[notification.priority] || 0) + 1;
            }

            // By recipient
            const recipientId = notification.recipient?.toString();
            if (recipientId) {
                statistics.byRecipient[recipientId] =
                    (statistics.byRecipient[recipientId] || 0) + 1;
            }

            // Daily count for last 30 days
            if (notification.createdAt && notification.createdAt > thirtyDaysAgo) {
                const dateKey = notification.createdAt.toISOString().split('T')[0];
                statistics.dailyCount[dateKey] = (statistics.dailyCount[dateKey] || 0) + 1;
            }
        });

        return statistics;
    }

    /**
     * Find notifications that need to be sent (for scheduled notifications)
     */
    async findPendingScheduled(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            scheduledFor: { $lte: now },
            sent: false
        };
        return await this.find(filter, options);
    }

    /**
     * Mark notification as sent
     */
    async markAsSent(id) {
        return await this.update(id, { sent: true, sentAt: new Date() });
    }

    /**
     * Create bulk notifications
     */
    async createBulk(notificationsData, tenantId) {
        const results = [];

        for (const notificationData of notificationsData) {
            try {
                const dataToCreate = { ...notificationData, tenantId };
                const notification = await this.create(dataToCreate);
                results.push({ success: true, data: notification });
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    data: notificationData
                });
            }
        }

        return results;
    }
}

export default NotificationRepository;