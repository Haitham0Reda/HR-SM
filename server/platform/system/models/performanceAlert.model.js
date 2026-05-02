/**
 * Performance Alert Model - PostgreSQL (Sequelize)
 * Stores performance-related alerts
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const PerformanceAlert = mainAppDb.define('PerformanceAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  type: {
    type: DataTypes.STRING,
    allowNull: false
  },

  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    allowNull: false
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  value: {
    type: DataTypes.JSONB,
    allowNull: true
  },

  threshold: {
    type: DataTypes.JSONB,
    allowNull: true
  },

  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },

  resolvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'resolved_by'
  }
}, {
  tableName: 'performance_alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['timestamp'] },
    { fields: ['type', 'severity'] },
    { fields: ['resolved'] }
  ]
});

export default PerformanceAlert;
