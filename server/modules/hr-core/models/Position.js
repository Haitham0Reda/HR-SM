/**
 * Position Model - Sequelize (PostgreSQL)
 * 
 * Represents job positions within the organization.
 * Stored in the Main Application Database with tenant isolation.
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Position = mainAppDb.define('Position', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the position (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant identifier for data isolation'
  },

  // Position Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Position title'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Position code'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Position description'
  },

  // Department Reference
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Reference to department'
  },

  // Position Level
  level: {
    type: DataTypes.ENUM('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'),
    allowNull: false,
    defaultValue: 'entry',
    comment: 'Position level'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Position status'
  },

  // Audit Fields
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    comment: 'User who created this record'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by',
    comment: 'User who last updated this record'
  }
}, {
  tableName: 'positions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_positions_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_positions_code_tenant_id',
      fields: ['code', 'tenant_id'],
      unique: true
    },
    {
      name: 'idx_positions_department_id',
      fields: ['department_id']
    },
    {
      name: 'idx_positions_status',
      fields: ['status']
    }
  ]
});

// Associations will be defined in a separate associations file
Position.associate = (models) => {
  if (models.Department) {
    Position.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
  }
  if (models.User) {
    Position.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    Position.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }
};

export default Position;
