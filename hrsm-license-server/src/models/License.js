import { DataTypes, Model, Op } from 'sequelize';
import crypto from 'crypto';
import { licenseServerDb as sequelize } from '../../config/database.js';

/**
 * Master License Model - License Server Database (Sequelize)
 * This is the authoritative source for all license information
 */
class License extends Model {
  // Instance Methods
  generateSignature() {
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
  }

  verifySignature() {
    return this.signature === this.generateSignature();
  }

  isValid() {
    return (
      this.status === 'active' &&
      this.expiresAt > new Date() &&
      this.verifySignature()
    );
  }

  isExpired() {
    return this.expiresAt <= new Date();
  }

  daysUntilExpiry() {
    const now = new Date();
    const diffTime = this.expiresAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  generateEncryptedPayload() {
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
  }

  async updateUsage(usageData) {
    this.currentUsage = {
      ...this.currentUsage,
      ...usageData,
      lastUpdated: new Date()
    };
    this.validationCount += 1;
    this.lastValidated = new Date();
    this.changed('currentUsage', true);
    await this.save();
  }

  checkLimits() {
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
  }

  // Static Methods
  static async findByCompany(companyId) {
    return this.findOne({ 
      where: { companyId, status: 'active' } 
    });
  }

  static async findExpiring(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.findAll({
      where: {
        status: 'active',
        expiresAt: { 
          [Op.lte]: futureDate, 
          [Op.gt]: new Date() 
        }
      }
    });
  }

  static async findExpired() {
    return this.findAll({
      where: {
        status: 'active',
        expiresAt: { [Op.lte]: new Date() }
      }
    });
  }
}

// Helper function to generate license numbers
function generateLicenseNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HRSM-${part1}-${part2}`;
}

License.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // License Identification
  licenseId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^HRSM-[A-Z0-9]{6}-[A-Z0-9]{6}$/
    }
  },
  
  // Company Information
  companyId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  companyDomain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // License Details
  licenseType: {
    type: DataTypes.ENUM('trial', 'starter', 'professional', 'enterprise', 'unlimited'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'revoked', 'pending'),
    defaultValue: 'active'
  },
  
  // Validity Period
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  // License Limits
  limits: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      maxUsers: 1,
      maxStorage: 0,
      maxApiCallsPerMonth: 0,
      maxDatabases: 1
    },
    validate: {
      isValidLimits(value) {
        if (!value.maxUsers || value.maxUsers < 1) {
          throw new Error('maxUsers must be at least 1');
        }
        if (value.maxStorage < 0) {
          throw new Error('maxStorage cannot be negative');
        }
        if (value.maxApiCallsPerMonth < 0) {
          throw new Error('maxApiCallsPerMonth cannot be negative');
        }
        if (!value.maxDatabases || value.maxDatabases < 1) {
          throw new Error('maxDatabases must be at least 1');
        }
      }
    }
  },
  
  // Enabled Modules
  modules: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Security & Encryption
  encryptionKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  signature: {
    type: DataTypes.STRING,
    allowNull: false
  },
  machineFingerprint: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  
  // Usage Tracking
  currentUsage: {
    type: DataTypes.JSONB,
    defaultValue: {
      users: 0,
      storage: 0,
      apiCallsThisMonth: 0,
      lastUpdated: new Date()
    }
  },
  
  // Validation & Sync
  lastValidated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  validationCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastSyncedToCompany: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncFailures: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Audit Trail
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Additional Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      issuerInfo: {},
      deploymentInfo: {
        environment: 'production'
      },
      billingInfo: {
        billingCycle: 'monthly'
      }
    }
  }
}, {
  sequelize,
  modelName: 'License',
  tableName: 'licenses',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['license_id'], unique: true },
    { fields: ['license_number'], unique: true },
    { fields: ['company_id'] },
    { fields: ['company_id', 'status'] },
    { fields: ['expires_at', 'status'] },
    { fields: ['license_type', 'status'] },
    { fields: ['status'] },
    { fields: ['last_validated'] }
  ],
  hooks: {
    beforeValidate: (license) => {
      // Generate license number if not provided
      if (!license.licenseNumber && license.isNewRecord) {
        license.licenseNumber = generateLicenseNumber();
      }
      
      // Generate encryption key if not provided
      if (!license.encryptionKey && license.isNewRecord) {
        license.encryptionKey = crypto.randomBytes(32).toString('hex');
      }
    },
    beforeSave: (license) => {
      // Update signature
      license.signature = license.generateSignature();
    }
  }
});

export default License;
