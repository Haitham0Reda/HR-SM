/**
 * Role Model - PostgreSQL (Sequelize)
 * 
 * This model represents the roles table in the Main Application Database (hrsm_platform).
 * It manages both system-defined and custom roles with permission assignments.
 * Supports multi-tenancy where custom roles are tenant-specific.
 * 
 * @module models/Role
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Role = mainAppDb.define('Role', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the role (UUID)'
  },

  // Tenant ID for multi-tenancy (optional for system roles)
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tenant_id',
    comment: 'Tenant identifier (null for system roles)'
  },

  // Role Identification
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    lowercase: true,
    comment: 'System identifier for the role (e.g., custom-manager)'
  },
  displayName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'display_name',
    comment: 'Human-readable role name (e.g., Custom Manager)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Role description'
  },

  // Permissions
  permissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Array of permission keys assigned to this role'
  },

  // Role Type
  isSystemRole: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_system_role',
    comment: 'True for predefined system roles, false for custom tenant roles'
  },

  // Audit Trail
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id',
    comment: 'User who created this role'
  },
  updatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by_id',
    comment: 'User who last updated this role'
  }
}, {
  tableName: 'roles',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_roles_name_system',
      fields: ['name'],
      unique: true,
      where: { isSystemRole: true }
    },
    {
      name: 'idx_roles_tenant_id_name_custom',
      fields: ['tenant_id', 'name'],
      unique: true,
      where: { isSystemRole: false }
    },
    {
      name: 'idx_roles_tenant_id_is_system_role',
      fields: ['tenant_id', 'is_system_role']
    }
  ],

  // Named scopes
  scopes: {
    system: {
      where: { isSystemRole: true }
    },
    custom: {
      where: { isSystemRole: false }
    },
    byTenant: (tenantId) => {
      return {
        where: {
          [require('sequelize').Op.or]: [
            { isSystemRole: true },
            { tenantId }
          ]
        }
      };
    }
  }
});

// Instance Methods
Role.prototype.getPermissionCount = function() {
  return this.permissions ? this.permissions.length : 0;
};

Role.prototype.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

Role.prototype.addPermissions = async function(permissions) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  
  perms.forEach(permission => {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  });
  
  await this.save();
  return this;
};

Role.prototype.removePermissions = async function(permissions) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  
  this.permissions = this.permissions.filter(p => !perms.includes(p));
  await this.save();
  return this;
};

// Static Methods
Role.findByName = async function(name, tenantId = null) {
  if (tenantId) {
    // For tenant-specific search, look for both system roles and tenant roles
    return this.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { name: name.toLowerCase(), isSystemRole: true },
          { name: name.toLowerCase(), tenantId, isSystemRole: false }
        ]
      }
    });
  } else {
    // For global search
    return this.findOne({
      where: { name: name.toLowerCase() }
    });
  }
};

Role.getSystemRoles = async function() {
  return this.findAll({
    where: { isSystemRole: true },
    order: [['name', 'ASC']]
  });
};

Role.getCustomRoles = async function(tenantId) {
  return this.findAll({
    where: { 
      isSystemRole: false,
      tenantId 
    },
    order: [['displayName', 'ASC']]
  });
};

export default Role;
