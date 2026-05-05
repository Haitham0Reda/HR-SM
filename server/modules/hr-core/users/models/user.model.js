/**
 * User Model - PostgreSQL (Sequelize)
 * 
 * This model represents the users table in the Main Application Database (hrsm_platform).
 * It stores all user/employee information including personal details, employment info, and permissions.
 * 
 * @module models/User
 */

import { DataTypes, Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { mainAppDb } from '../../../../config/database.js';
import Department from './department.model.js';

const User = mainAppDb.define('User', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the user (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Employee Identification
  employeeId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'employee_id',
    comment: 'Employee identification number'
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique username for login'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    },
    comment: 'User email address'
  },
   password: {
     type: DataTypes.STRING(512),
     allowNull: false,
     comment: 'Hashed password'
   },

  // Role and Permissions
  role: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'employee',
    comment: 'User role (system or custom)'
  },
  addedPermissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    field: 'added_permissions',
    comment: 'Additional permissions granted to user'
  },
  removedPermissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    field: 'removed_permissions',
    comment: 'Permissions removed from user role'
  },
  permissionNotes: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'permission_notes',
    comment: 'Notes about permission modifications'
  },
  permissionLastModified: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'permission_last_modified',
    comment: 'Last time permissions were modified'
  },
  permissionModifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'permission_modified_by',
    comment: 'User who last modified permissions'
  },

  // Personal Information - stored as JSONB
  personalInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'personal_info',
    comment: 'Personal information including name, DOB, gender, nationality, etc. (JSONB)'
  },

  // Department and Position
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Reference to department'
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    comment: 'Reference to position'
  },

  // Employment Information - stored as JSONB
  employment: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Employment details including hire date, contract type, status (JSONB)'
  },

  // Status Flags
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the user account is active'
  },
  status: {
    type: DataTypes.ENUM('active', 'vacation', 'resigned', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Current user status'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login',
    comment: 'Last login timestamp'
  },

  // Password Reset
  resetPasswordToken: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'reset_password_token',
    comment: 'Token for password reset'
  },
  resetPasswordExpire: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expire',
    comment: 'Expiration time for password reset token'
  },

  // Vacation Balance - stored as JSONB
  vacationBalance: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      annualTotal: 0,
      annualUsed: 0,
      casualTotal: 7,
      casualUsed: 0,
      flexibleTotal: 0,
      flexibleUsed: 0
    },
    field: 'vacation_balance',
    comment: 'Vacation balance tracking (JSONB)'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_users_tenant_id_email',
      fields: ['tenant_id', 'email'],
      unique: true
    },
    {
      name: 'idx_users_tenant_id_username',
      fields: ['tenant_id', 'username'],
      unique: true
    },
    {
      name: 'idx_users_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id'],
      unique: true,
      where: { employee_id: { [Op.ne]: null } }
    },
    {
      name: 'idx_users_tenant_id_role',
      fields: ['tenant_id', 'role']
    },
    {
      name: 'idx_users_tenant_id_department_id',
      fields: ['tenant_id', 'department_id']
    },
    {
      name: 'idx_users_tenant_id_status',
      fields: ['tenant_id', 'status']
    }
  ],

  // Default scope to exclude sensitive fields
  defaultScope: {
    attributes: { exclude: ['password', 'reset_password_token'] }
  },

  // Named scopes
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    },
    active: {
      where: { isActive: true, status: 'active' }
    },
    byRole: (role) => {
      return {
        where: { role }
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
User.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department'
});

Department.hasMany(User, {
  foreignKey: 'departmentId',
  as: 'users'
});

// Hooks
User.beforeCreate(async (user) => {
  // Hash password if provided
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

User.beforeUpdate(async (user) => {
  // Hash password if modified
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

// Instance Methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getEffectivePermissions = async function() {
  // This would need to be implemented with Role model integration
  // For now, return basic implementation
  const added = this.addedPermissions || [];
  const removed = this.removedPermissions || [];
  
  // Start with role-based permissions (would need to fetch from Role model)
  const effectivePerms = new Set();
  
  // Add custom permissions
  added.forEach(p => effectivePerms.add(p));
  
  // Remove denied permissions
  removed.forEach(p => effectivePerms.delete(p));
  
  return Array.from(effectivePerms);
};

User.prototype.hasPermission = async function(permission) {
  const effectivePermissions = await this.getEffectivePermissions();
  return effectivePermissions.includes(permission);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.plainPassword;
  delete values.resetPasswordToken;
  return values;
};

// Static Methods
User.findByEmail = async function(tenantId, email) {
  return this.findOne({
    where: { tenantId, email }
  });
};

User.findByUsername = async function(tenantId, username) {
  return this.findOne({
    where: { tenantId, username }
  });
};

User.findByEmployeeId = async function(tenantId, employeeId) {
  return this.findOne({
    where: { tenantId, employeeId }
  });
};

User.findActive = async function(tenantId) {
  return this.findAll({
    where: { 
      tenantId, 
      isActive: true, 
      status: 'active' 
    }
  });
};

export default User;







