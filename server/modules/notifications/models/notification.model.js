import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../users/models/user.model.js';

const Notification = mainAppDb.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.STRING(100), allowNull: false, field: 'tenant_id' },
  recipientId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_id', references: { model: User, key: 'id' } },
  type: { type: DataTypes.ENUM('request', 'announcement', 'payroll', 'attendance', 'permission', 'leave', 'request-control', 'custom', 'info', 'warning', 'error', 'success', 'task', 'system'), allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), allowNull: false, defaultValue: 'normal' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  dismissed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  dismissedAt: { type: DataTypes.DATE, allowNull: true, field: 'dismissed_at' },
  snoozed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  snoozeUntil: { type: DataTypes.DATE, allowNull: true, field: 'snooze_until' },
  sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  scheduledFor: { type: DataTypes.DATE, allowNull: true, field: 'scheduled_for' },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
  metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
  relatedModel: { type: DataTypes.STRING, allowNull: true, field: 'related_model' },
  relatedId: { type: DataTypes.UUID, allowNull: true, field: 'related_id' },
  actionUrl: { type: DataTypes.STRING, allowNull: true, field: 'action_url' },
  icon: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  scopes: {
    unread: { where: { isRead: false } },
    read: { where: { isRead: true } }
  }
});

Notification.associate = function(models) {
  Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient', onDelete: 'CASCADE' });
};

export default Notification;
