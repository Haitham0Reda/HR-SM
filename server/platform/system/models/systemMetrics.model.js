/**
 * System Metrics Model - PostgreSQL (Sequelize)
 * Stores system performance metrics
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const SystemMetrics = mainAppDb.define('SystemMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },

  cpu: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  memory: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  process: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },

  database: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'system_metrics',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['timestamp'] }
  ]
});

export default SystemMetrics;
