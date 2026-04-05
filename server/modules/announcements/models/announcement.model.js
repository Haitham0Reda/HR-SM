import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';

const Announcement = mainAppDb.define('Announcement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.STRING(100), allowNull: false, field: 'tenant_id' },
  title: { type: DataTypes.STRING, allowNull: false },
  arabicTitle: { type: DataTypes.STRING, allowNull: true, field: 'arabic_title' },
  content: { type: DataTypes.TEXT, allowNull: false },
  arabicContent: { type: DataTypes.TEXT, allowNull: true, field: 'arabic_content' },
  type: { type: DataTypes.ENUM('general', 'urgent', 'policy', 'event', 'maintenance'), allowNull: true },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
  targetAudience: { type: DataTypes.ENUM('all', 'department', 'specific'), allowNull: false, defaultValue: 'all', field: 'target_audience' },
  departments: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  employees: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  publishDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'publish_date' },
  expiryDate: { type: DataTypes.DATE, allowNull: true, field: 'expiry_date' },
  startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date', defaultValue: null },
  endDate: { type: DataTypes.DATE, allowNull: true, field: 'end_date', defaultValue: null },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  createdById: { type: DataTypes.UUID, allowNull: false, field: 'created_by_id', references: { model: User, key: 'id' } },
  attachments: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] }
}, {
  tableName: 'announcements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Announcement.associate = function(models) {
  Announcement.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', onDelete: 'CASCADE' });
};

export default Announcement;
