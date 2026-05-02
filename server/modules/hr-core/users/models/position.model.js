/**
 * Position Model - PostgreSQL (Sequelize)
 * 
 * This model represents the positions table in the Main Application Database (hrsm_platform).
 * It stores job position information with hierarchical levels and department associations.
 * 
 * @module models/Position
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';
import Department from './department.model.js';

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
    comment: 'Tenant/Company identifier'
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

  // Level/Hierarchy
  level: {
    type: DataTypes.ENUM('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'),
    allowNull: false,
    defaultValue: 'entry',
    comment: 'Position level in hierarchy'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Position status'
  }
}, {
  tableName: 'positions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_positions_tenant_id_code',
      fields: ['tenant_id', 'code'],
      unique: true
    },
    {
      name: 'idx_positions_tenant_id_title',
      fields: ['tenant_id', 'title']
    },
    {
      name: 'idx_positions_tenant_id_department_id',
      fields: ['tenant_id', 'department_id']
    },
    {
      name: 'idx_positions_tenant_id_level',
      fields: ['tenant_id', 'level']
    },
    {
      name: 'idx_positions_tenant_id_status',
      fields: ['tenant_id', 'status']
    }
  ],

  // Named scopes
  scopes: {
    active: {
      where: { status: 'active' }
    },
    byLevel: (level) => {
      return {
        where: { level }
      };
    },
    byDepartment: (departmentId) => {
      return {
        where: { departmentId }
      };
    }
  }
});

// Define associations
Position.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department'
});

Department.hasMany(Position, {
  foreignKey: 'departmentId',
  as: 'positions'
});

// Instance Methods
Position.prototype.isActive = function() {
  return this.status === 'active';
};

// Static Methods
Position.findByCode = async function(tenantId, code) {
  return this.findOne({
    where: { tenantId, code }
  });
};

Position.findActive = async function(tenantId) {
  return this.findAll({
    where: { tenantId, status: 'active' },
    order: [['title', 'ASC']]
  });
};

Position.findByDepartment = async function(tenantId, departmentId) {
  return this.findAll({
    where: { tenantId, departmentId, status: 'active' },
    order: [['level', 'ASC'], ['title', 'ASC']]
  });
};

export default Position;







