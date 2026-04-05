/**
 * Company License Model - PostgreSQL (Sequelize)
 * 
 * This model represents the company_licenses table in the Main Application Database (hrsm_platform).
 * It stores an encrypted cache of license information for local validation and performance.
 * This is a tenant-specific cache that syncs with the License Server.
 * 
 * @module models/CompanyLicense
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const CompanyLicense = mainAppDb.define('CompanyLicense', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the company license record (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    unique: true,
    comment: 'Tenant/Company identifier (one license per tenant)'
  },

  // License Identification
  licenseId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'license_id',
    unique: true,
    comment: 'License identifier from license server'
  },
  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'license_number',
    unique: true,
    comment: 'Formatted license number (HRSM-XXXXXX-XXXXXX)'
  },

  // Company Information
  companyId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'company_id',
    comment: 'Company identifier'
  },

  // Encrypted License Data
  encryptedLicenseData: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'encrypted_license_data',
    comment: 'Encrypted license data from license server'
  },

  // Cache Information - stored as JSONB
  cacheInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      lastSyncedFromServer: new Date(),
      syncVersion: 1,
      encryptionVersion: 'v1',
      checksumHash: ''
    },
    field: 'cache_info',
    comment: 'Cache synchronization metadata (JSONB)'
  },

  // Quick Access Fields - stored as JSONB for performance
  quickAccess: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      licenseType: 'trial',
      status: 'active',
      expiresAt: null,
      maxUsers: 0,
      enabledModules: []
    },
    field: 'quick_access',
    comment: 'Non-sensitive fields for quick access without decryption (JSONB)'
  },

  // Validation Status - stored as JSONB
  validationStatus: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      lastValidated: new Date(),
      validationCount: 0,
      lastValidationResult: 'valid'
    },
    field: 'validation_status',
    comment: 'License validation tracking (JSONB)'
  },

  // Sync Status
  syncStatus: {
    type: DataTypes.ENUM('synced', 'pending', 'failed', 'outdated'),
    allowNull: false,
    defaultValue: 'synced',
    field: 'sync_status',
    comment: 'Synchronization status with license server'
  },
  lastSyncAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_attempt',
    comment: 'Last sync attempt timestamp'
  },
  syncFailures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sync_failures',
    comment: 'Number of consecutive sync failures'
  },
  lastSyncError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_sync_error',
    comment: 'Last sync error message'
  }
}, {
  tableName: 'company_licenses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_company_licenses_tenant_id',
      fields: ['tenant_id'],
      unique: true
    },
    {
      name: 'idx_company_licenses_license_id',
      fields: ['license_id']
    },
    {
      name: 'idx_company_licenses_quick_access_status',
      fields: [{ name: 'quick_access', using: 'gin', opclass: 'jsonb_path_ops' }]
    },
    {
      name: 'idx_company_licenses_sync_status',
      fields: ['sync_status']
    }
  ],

  // Default scope to exclude sensitive encrypted data
  defaultScope: {
    attributes: { exclude: ['encrypted_license_data'] }
  },

  // Named scopes
  scopes: {
    withEncryptedData: {
      attributes: { include: ['encrypted_license_data'] }
    },
    active: {
      where: {
        'quick_access.status': 'active'
      }
    },
    needsSync: {
      where: {
        syncStatus: {
          [require('sequelize').Op.in]: ['pending', 'outdated', 'failed']
        }
      }
    },
    expiring: (days = 30) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          'quick_access.status': 'active',
          'quick_access.expiresAt': {
            [require('sequelize').Op.lte]: futureDate,
            [require('sequelize').Op.gt]: new Date()
          }
        }
      };
    }
  }
});

// Instance Methods
CompanyLicense.prototype.isValid = function() {
  return (
    this.quickAccess.status === 'active' &&
    new Date(this.quickAccess.expiresAt) > new Date()
  );
};

CompanyLicense.prototype.isExpired = function() {
  return new Date(this.quickAccess.expiresAt) <= new Date();
};

CompanyLicense.prototype.daysUntilExpiry = function() {
  const now = new Date();
  const expiryDate = new Date(this.quickAccess.expiresAt);
  const diffTime = expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

CompanyLicense.prototype.hasModule = function(moduleId) {
  return this.quickAccess.enabledModules.includes(moduleId);
};

CompanyLicense.prototype.isUserLimitReached = function(currentUsers) {
  return currentUsers >= this.quickAccess.maxUsers;
};

CompanyLicense.prototype.updateValidationStatus = async function(result) {
  this.validationStatus = {
    ...this.validationStatus,
    lastValidated: new Date(),
    validationCount: this.validationStatus.validationCount + 1,
    lastValidationResult: result
  };
  await this.save();
};

CompanyLicense.prototype.markSyncFailed = async function(error) {
  this.syncStatus = 'failed';
  this.syncFailures += 1;
  this.lastSyncAttempt = new Date();
  this.lastSyncError = error?.message || String(error);
  await this.save();
};

CompanyLicense.prototype.markSynced = async function() {
  this.syncStatus = 'synced';
  this.syncFailures = 0;
  this.lastSyncAttempt = new Date();
  this.cacheInfo = {
    ...this.cacheInfo,
    lastSyncedFromServer: new Date(),
    syncVersion: this.cacheInfo.syncVersion + 1
  };
  await this.save();
};

// Static Methods
CompanyLicense.findByTenant = async function(tenantId) {
  return this.findOne({
    where: { tenantId }
  });
};

CompanyLicense.findActive = async function() {
  return this.findAll({
    where: {
      'quick_access.status': 'active'
    }
  });
};

CompanyLicense.findNeedsSync = async function() {
  return this.findAll({
    where: {
      syncStatus: {
        [require('sequelize').Op.in]: ['pending', 'outdated', 'failed']
      }
    }
  });
};

export default CompanyLicense;
