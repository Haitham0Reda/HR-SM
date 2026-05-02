/**
 * Department Model - PostgreSQL (Sequelize)
 * 
 * This model represents the departments table in the Main Application Database (hrsm_platform).
 * It stores department information with hierarchical structure support.
 * 
 * @module models/Department
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

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
    comment: 'Tenant/Company identifier'
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

  // Hierarchical Structure
  parentDepartmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_department_id',
    comment: 'Reference to parent department for hierarchy'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Department status'
  }
}, {
  tableName: 'departments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_departments_tenant_id_code',
      fields: ['tenant_id', 'code'],
      unique: true
    },
    {
      name: 'idx_departments_tenant_id_name',
      fields: ['tenant_id', 'name']
    },
    {
      name: 'idx_departments_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_departments_parent_department_id',
      fields: ['parent_department_id']
    },
    {
      name: 'idx_departments_manager_id',
      fields: ['manager_id']
    }
  ],

  // Named scopes
  scopes: {
    active: {
      where: { status: 'active' }
    },
    byParent: (parentId) => {
      return {
        where: { parentDepartmentId: parentId }
      };
    },
    topLevel: {
      where: { parentDepartmentId: null }
    }
  }
});

// Self-referential association for department hierarchy
Department.belongsTo(Department, {
  as: 'parentDepartment',
  foreignKey: 'parentDepartmentId'
});

Department.hasMany(Department, {
  as: 'childDepartments',
  foreignKey: 'parentDepartmentId'
});

// Instance Methods
Department.prototype.isActive = function() {
  return this.status === 'active';
};

Department.prototype.isTopLevel = function() {
  return this.parentDepartmentId === null;
};

// Static Methods
Department.findByCode = async function(tenantId, code) {
  return this.findOne({
    where: { tenantId, code }
  });
};

Department.findActive = async function(tenantId) {
  return this.findAll({
    where: { tenantId, status: 'active' },
    order: [['name', 'ASC']]
  });
};

Department.findHierarchy = async function(tenantId, parentId = null) {
  return this.findAll({
    where: { 
      tenantId, 
      parentDepartmentId: parentId,
      status: 'active'
    },
    include: [{
      model: Department,
      as: 'childDepartments',
      where: { status: 'active' },
      required: false
    }],
    order: [['name', 'ASC']]
  });
};

export default Department;







