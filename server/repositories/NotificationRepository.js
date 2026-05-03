const BaseRepository = require('./BaseRepository');
const { Notification } = require('../models');

/**
 * Repository for Notification data access operations
 */
class NotificationRepository extends BaseRepository {
  constructor(companyId) {
    super(Notification, companyId);
  }

  /**
   * Find unread notifications for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Unread notifications
   */
  async findUnread(userId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        user_id: userId,
        is_read: false
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Mark notifications as read
   * @param {Array<number>} ids - Notification IDs
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAsRead(ids, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for marking notifications as read');
    }

    const [affectedCount] = await this.model.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          company_id: this.companyId,
          id: ids
        },
        transaction
      }
    );

    return affectedCount;
  }

  /**
   * Bulk create notifications
   * @param {Array<Object>} notifications - Notification data
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<Array>} Created notifications
   */
  async bulkCreate(notifications, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for bulk creating notifications');
    }

    const notificationsWithCompany = notifications.map(notif => ({
      ...notif,
      company_id: this.companyId
    }));

    return this.model.bulkCreate(notificationsWithCompany, { transaction });
  }
}

module.exports = NotificationRepository;
