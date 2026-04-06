/**
 * Department Model - Sequelize (PostgreSQL)
 * 
 * Represents organizational departments.
 * Stored in the Main Application Database with tenant isolation.
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Department = mainAppDb.define('Department', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the department (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant identifier for data isolation'
  },

  // Department Information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Department name'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Department code'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Department description'
  },

  // Manager Reference
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'manager_id',
    comment: 'Reference to department manager (User)'
  },

  // Parent Department Reference (for hierarchical structure)
  parentDepartmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_department_id',
    comment: 'Reference to parent department'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Department status'
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
  tableName: 'departments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_departments_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_departments_code_tenant_id',
      fields: ['code', 'tenant_id'],
      unique: true
    },
    {
      name: 'idx_departments_manager_id',
      fields: ['manager_id']
    },
    {
      name: 'idx_departments_parent_department_id',
      fields: ['parent_department_id']
    },
    {
      name: 'idx_departments_status',
      fields: ['status']
    }
  ]
});

// Associations will be defined in a separate associations file
Department.associate = (models) => {
  if (models.User) {
    Department.belongsTo(models.User, {
      foreignKey: 'managerId',
      as: 'manager'
    });
    Department.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    Department.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }
  
  // Self-referential association for parent department
  Department.belongsTo(Department, {
    foreignKey: 'parentDepartmentId',
    as: 'parentDepartment'
  });
  
  Department.hasMany(Department, {
    foreignKey: 'parentDepartmentId',
    as: 'subDepartments'
  });
};

export default Department;
