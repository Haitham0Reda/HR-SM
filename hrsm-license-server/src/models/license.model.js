/**
 * License Model - PostgreSQL (Sequelize)
 * 
 * This model represents the licenses table in the License Server Database (hrsm-licenses).
 * It stores all license information for tenant companies including limits, modules, and usage tracking.
 * 
 * @module models/License
 */

import { DataTypes } from 'sequelize';
import crypto from 'crypto';
import { licenseServerDb } from '../../config/database.js';

const License = licenseServerDb.define('License', {
  // Primary Key - UUID instead of MongoDB ObjectId
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the license (UUID)'
  },

  // License Identification
  licenseId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'license_id',
    comment: 'Human-readable license identifier'
  },
  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      is: /^HRSM-[A-Z0-9]{6}-[A-Z0-9]{6}$/i
    },
    field: 'license_number',
    comment: 'Formatted license number (HRSM-XXXXXX-XXXXXX)'
  },
  
  // Company Information
  companyId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'company_id',
    comment: 'Reference to the company/tenant'
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'company_name',
    comment: 'Name of the company'
  },
  companyDomain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'company_domain',
    comment: 'Company domain for identification'
  },
  
  // License Details
  licenseType: {
    type: DataTypes.ENUM('trial', 'starter', 'professional', 'enterprise', 'unlimited'),
    allowNull: false,
    field: 'license_type',
    comment: 'Type/tier of the license'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'revoked', 'pending'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Current status of the license'
  },
  
  // Validity Period
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'issued_at',
    comment: 'Date when the license was issued'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'Date when the license expires'
  },
  
  // License Limits - stored as JSONB for flexibility
  limits: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      maxUsers: 1,
      maxStorage: 0,
      maxApiCallsPerMonth: 0,
      maxDatabases: 1
    },
    comment: 'License limits configuration (JSONB)'
  },
  
  // Enabled Modules - stored as JSONB array
  modules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of enabled modules with their configurations (JSONB)'
  },
  
  // Security & Encryption
  encryptionKey: {
    type: DataTypes.STRING(512),
    allowNull: false,
    field: 'encryption_key',
    comment: 'Encryption key for secure data (not returned in queries by default)'
  },
  signature: {
    type: DataTypes.STRING(512),
    allowNull: false,
    comment: 'Digital signature for license verification'
  },
  machineFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    field: 'machine_fingerprint',
    comment: 'Hardware fingerprint for on-premise installations'
  },
  
  // Usage Tracking - stored as JSONB
  currentUsage: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      users: 0,
      storage: 0,
      apiCallsThisMonth: 0,
      lastUpdated: new Date()
    },
    field: 'current_usage',
    comment: 'Current usage statistics (JSONB)'
  },
  
  // Validation & Sync
  lastValidated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'last_validated',
    comment: 'Last validation timestamp'
  },
  validationCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'validation_count',
    comment: 'Total number of validations performed'
  },
  lastSyncedToCompany: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_synced_to_company',
    comment: 'Last successful sync to company database'
  },
  syncFailures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sync_failures',
    comment: 'Number of failed sync attempts'
  },
  
  // Audit Trail
  createdBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'created_by',
    comment: 'User or system that created the license'
  },
  updatedBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'updated_by',
    comment: 'User or system that last updated the license'
  },
  
  // Additional Metadata - stored as JSONB
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata including issuer, deployment, and billing info (JSONB)'
  }
}, {
  tableName: 'licenses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_licenses_company_id_status',
      fields: ['company_id', 'status']
    },
    {
      name: 'idx_licenses_expires_at_status',
      fields: ['expires_at', 'status']
    },
    {
      name: 'idx_licenses_license_type_status',
      fields: ['license_type', 'status']
    },
    {
      name: 'idx_licenses_last_validated',
      fields: ['last_validated']
    },
    {
      name: 'idx_licenses_current_usage_last_updated',
      fields: [{ name: 'current_usage', using: 'gin', opclass: 'jsonb_path_ops' }]
    }
  ],
  
  // Default scope to exclude sensitive fields
  defaultScope: {
    attributes: { exclude: ['encryption_key'] }
  },
  
  // Named scopes
  scopes: {
    withEncryptionKey: {
      attributes: { include: ['encryption_key'] }
    },
    active: {
      where: { status: 'active' }
    },
    expiring: (days = 30) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return {
        where: {
          status: 'active',
          expiresAt: {
            [require('sequelize').Op.lte]: futureDate,
            [require('sequelize').Op.gt]: new Date()
          }
        }
      };
    },
    expired: {
      where: {
        status: 'active',
        expiresAt: {
          [require('sequelize').Op.lte]: new Date()
        }
      }
    }
  }
});

// Instance Methods
License.prototype.generateSignature = function() {
  const data = {
    licenseId: this.licenseId,
    companyId: this.companyId,
    licenseType: this.licenseType,
    expiresAt: this.expiresAt,
    limits: this.limits,
    modules: this.modules
  };
  
  const secret = process.env.LICENSE_SIGNING_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
};

License.prototype.verifySignature = function() {
  return this.signature === this.generateSignature();
};

License.prototype.isValid = function() {
  return (
    this.status === 'active' &&
    this.expiresAt > new Date() &&
    this.verifySignature()
  );
};

License.prototype.isExpired = function() {
  return this.expiresAt <= new Date();
};

License.prototype.daysUntilExpiry = function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

License.prototype.generateEncryptedPayload = function() {
  const payload = {
    licenseId: this.licenseId,
    licenseNumber: this.licenseNumber,
    companyId: this.companyId,
    licenseType: this.licenseType,
    status: this.status,
    expiresAt: this.expiresAt,
    limits: this.limits,
    modules: this.modules,
    signature: this.signature,
    generatedAt: new Date()
  };
  
  const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
};

License.prototype.updateUsage = async function(usageData) {
  this.currentUsage = {
    ...this.currentUsage,
    ...usageData,
    lastUpdated: new Date()
  };
  this.validationCount += 1;
  this.lastValidated = new Date();
  
  await this.save();
};

License.prototype.checkLimits = function() {
  const violations = [];
  
  if (this.currentUsage.users > this.limits.maxUsers) {
    violations.push({
      type: 'users',
      current: this.currentUsage.users,
      limit: this.limits.maxUsers
    });
  }
  
  if (this.currentUsage.storage > this.limits.maxStorage) {
    violations.push({
      type: 'storage',
      current: this.currentUsage.storage,
      limit: this.limits.maxStorage
    });
  }
  
  if (this.currentUsage.apiCallsThisMonth > this.limits.maxApiCallsPerMonth) {
    violations.push({
      type: 'apiCalls',
      current: this.currentUsage.apiCallsThisMonth,
      limit: this.limits.maxApiCallsPerMonth
    });
  }
  
  return {
    withinLimits: violations.length === 0,
    violations
  };
};

// Hook to generate license number and signature before save
License.beforeCreate(async (license) => {
  // Generate license number if not provided
  if (!license.licenseNumber) {
    license.licenseNumber = generateLicenseNumber();
  }
  
  // Generate encryption key if not provided
  if (!license.encryptionKey) {
    license.encryptionKey = crypto.randomBytes(32).toString('hex');
  }
  
  // Update signature
  license.signature = license.generateSignature();
});

License.beforeUpdate(async (license) => {
  // Update signature on changes
  if (license.changed()) {
    license.signature = license.generateSignature();
  }
});

// Static Methods
License.findByCompany = async function(companyId) {
  return this.findOne({
    where: { 
      companyId, 
      status: 'active' 
    }
  });
};

License.findExpiring = async function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.findAll({
    where: {
      status: 'active',
      expiresAt: {
        [require('sequelize').Op.lte]: futureDate,
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });
};

License.findExpired = async function() {
  return this.findAll({
    where: {
      status: 'active',
      expiresAt: {
        [require('sequelize').Op.lte]: new Date()
      }
    }
  });
};

// Helper function to generate license numbers
function generateLicenseNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HRSM-${part1}-${part2}`;
}

export default License;
