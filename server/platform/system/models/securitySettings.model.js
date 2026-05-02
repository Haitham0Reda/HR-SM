/**
 * Security Settings Model - PostgreSQL (Sequelize)
 * Global security configuration for the system
 */

import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

const SecuritySettings = sequelize.define('SecuritySettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'tenant_id'
  },
  twoFactorAuth: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      enforced: false,
      backupCodesCount: 8
    },
    field: 'two_factor_auth'
  },
  passwordPolicy: {
    type: DataTypes.JSONB,
    defaultValue: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      expirationDays: 90,
      historyCount: 5,
      expirationWarningDays: 14
    },
    field: 'password_policy'
  },
  accountLockout: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 30,
      resetOnSuccess: true
    },
    field: 'account_lockout'
  },
  ipWhitelist: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      allowedIPs: [],
      blockUnauthorized: true
    },
    field: 'ip_whitelist'
  },
  sessionManagement: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxConcurrentSessions: 3,
      sessionTimeout: 480,
      idleTimeout: 60,
      rememberMeDuration: 30
    },
    field: 'session_management'
  },
  developmentMode: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      allowedUsers: [],
      maintenanceMessage: 'System is currently under maintenance. Please try again later.',
      enabledDate: null,
      enabledBy: null
    },
    field: 'development_mode'
  },
  auditSettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: true,
      logLoginAttempts: true,
      logDataChanges: true,
      logSecurityEvents: true,
      retentionDays: 365
    },
    field: 'audit_settings'
  },
  lastModified: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_modified'
  },
  lastModifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'last_modified_by'
  }
}, {
  tableName: 'security_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'], unique: true }
  ]
});

// Hook to handle boolean values for twoFactorAuth
SecuritySettings.beforeSave(async (instance) => {
  if (typeof instance.twoFactorAuth === 'boolean') {
    instance.twoFactorAuth = {
      enabled: instance.twoFactorAuth,
      enforced: instance.twoFactorAuth,
      backupCodesCount: 8
    };
  }
});

// Static method to get current settings for a tenant
SecuritySettings.getSettings = async function(tenantId) {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  let settings = await this.findOne({ where: { tenantId } });

  if (!settings) {
    settings = await this.create({ tenantId });
  }

  return settings;
};

// Static method to update settings for a tenant
SecuritySettings.updateSettings = async function(tenantId, updates, userId) {
  let settings = await this.getSettings(tenantId);

  // Handle dot notation updates
  for (const [key, value] of Object.entries(updates)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      const topLevel = parts[0];
      const nested = { ...settings[topLevel] };
      
      let current = nested;
      for (let i = 1; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      settings[topLevel] = nested;
    } else {
      settings[key] = value;
    }
  }

  settings.lastModified = new Date();
  settings.lastModifiedBy = userId;

  return await settings.save();
};

// Method to check if IP is whitelisted
SecuritySettings.prototype.isIPWhitelisted = function(ip) {
  if (!this.ipWhitelist.enabled) return true;

  return this.ipWhitelist.allowedIPs.some(entry => entry.ip === ip);
};

// Method to validate password against policy
SecuritySettings.prototype.validatePassword = function(password) {
  const policy = this.passwordPolicy;
  const errors = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default SecuritySettings;
