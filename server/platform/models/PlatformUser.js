import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../config/database.js';
import bcrypt from 'bcryptjs';

/**
 * Platform User Model (Sequelize)
 * Represents system administrators who manage the platform
 * Separate from tenant users
 */
const PlatformUser = mainAppDb.define('PlatformUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Please provide a valid email address'
      }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [8, 255],
        msg: 'Password must be at least 8 characters long'
      }
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
    set(value) {
      this.setDataValue('firstName', value.trim());
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
    set(value) {
      this.setDataValue('lastName', value.trim());
    }
  },
  role: {
    type: DataTypes.ENUM('super-admin', 'support', 'operations'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['super-admin', 'support', 'operations']],
        msg: 'Invalid role'
      }
    }
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'locked'),
    defaultValue: 'active'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'platform_users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role', 'status'] }
  ],
  hooks: {
    beforeSave: async (user) => {
      // Only hash the password if it has been modified (or is new)
      if (user.changed('password')) {
        try {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        } catch (error) {
          throw new Error('Password hashing failed');
        }
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  }
});

// Instance methods

/**
 * Compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if password matches
 */
PlatformUser.prototype.comparePassword = async function(candidatePassword) {
  try {
    // Need to get the password field explicitly since it's excluded by default
    const userWithPassword = await PlatformUser.scope('withPassword').findByPk(this.id);
    return await bcrypt.compare(candidatePassword, userWithPassword.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Get full name
 * @returns {string} Full name
 */
PlatformUser.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
PlatformUser.prototype.hasPermission = function(permission) {
  // Super-admin has all permissions
  if (this.role === 'super-admin') {
    return true;
  }
  
  const permissions = this.permissions || [];
  return permissions.includes(permission);
};

/**
 * Sanitize user object (remove sensitive data)
 * @returns {Object} Sanitized user object
 */
PlatformUser.prototype.toSafeObject = function() {
  const obj = this.toJSON();
  delete obj.password;
  return obj;
};

// Static methods

/**
 * Find active users by role
 * @param {string} role - Role to filter by
 * @returns {Promise<Array>} Array of users
 */
PlatformUser.findActiveByRole = function(role) {
  return this.findAll({
    where: { role, status: 'active' }
  });
};

/**
 * Find user by email with password
 * @param {string} email - Email address
 * @returns {Promise<PlatformUser>} User with password
 */
PlatformUser.findByEmailWithPassword = function(email) {
  return this.scope('withPassword').findOne({
    where: { email: email.toLowerCase().trim() }
  });
};

export default PlatformUser;
