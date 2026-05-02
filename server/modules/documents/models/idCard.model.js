import { DataTypes, Op, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * ID Card Model
 * 
 * Manages employee ID card printing, tracking, and administration.
 * Supports individual and bulk printing operations with comprehensive logging.
 * 
 * Features:
 * - Individual and bulk ID card printing
 * - Print activity logging and audit trail
 * - ID Card Admin role support
 * - Print statistics and monitoring
 * - Card status tracking (active, expired, lost, replaced)
 * - QR code generation for verification
 * - Integration with employee data
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const IDCard = sequelize.define('IDCard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Employee reference
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id'
  },
  
  // Department reference (denormalized for faster queries)
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id'
  },
  
  // Position reference (denormalized)
  position_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id'
  },
  
  // Card number (unique identifier)
  card_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'card_number'
  },
  
  // Card type
  card_type: {
    type: DataTypes.ENUM('employee', 'contractor', 'visitor', 'temporary'),
    allowNull: false,
    defaultValue: 'employee',
    field: 'card_type'
  },
  
  // Card status
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'lost', 'stolen', 'replaced', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  // Issue information (JSONB)
  issue: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { issuedDate, issuedBy, issueReason, issueNotes }
  },
  
  // Expiry information (JSONB)
  expiry: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { expiryDate, autoRenew, renewalNoticeSent, renewalNoticeDate }
  },
  
  // Print history tracking (JSONB array)
  print_history: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'print_history'
    // Structure: [{ printedAt, printedBy, printType, batchId, printReason, printStatus, printerName, errorMessage }]
  },
  
  // Card design/template (JSONB)
  template: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { templateId, templateName, orientation, includePhoto, includeQRCode, includeBarcode }
  },
  
  // QR Code data for verification (JSONB)
  qr_code: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    field: 'qr_code'
    // Structure: { data, generatedAt, url }
  },
  
  // Barcode (JSONB)
  barcode: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { data, format }
  },
  
  // Access permissions (JSONB)
  access_permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'access_permissions'
    // Structure: { buildings: [], floors: [], rooms: [], timeRestrictions: { startTime, endTime } }
  },
  
  // Previous card reference
  previous_card_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'previous_card_id'
  },
  
  // Replacement information (JSONB)
  replacement: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { replacedBy, originalCard, replacementDate, replacementReason }
  },
  
  // Physical card status (JSONB)
  physical: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { received, receivedDate, receivedBy, signature }
  },
  
  // Notifications sent (JSONB)
  notifications: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { issued: { sent, sentAt }, renewal: { sent, sentAt }, expired: { sent, sentAt } }
  },
  
  // Additional metadata (JSONB)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { bloodType, emergencyContact: { name, phone }, customFields }
  },
  
  // Notes and remarks
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Active flag
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'id_cards',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'employee_id']
    },
    {
      fields: ['tenant_id', 'employee_id', 'status']
    },
    {
      fields: ['tenant_id', 'employee_id', 'is_active']
    },
    {
      fields: ['tenant_id', 'department_id', 'status']
    },
    {
      fields: ['tenant_id', 'department_id', 'is_active']
    },
    {
      fields: ['tenant_id', 'card_type', 'status']
    },
    {
      unique: true,
      fields: ['card_number']
    },
    {
      fields: ['employee_id']
    },
    {
      fields: ['department_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['card_type']
    },
    {
      fields: ['is_active']
    }
  ],
  hooks: {
    beforeCreate: async (idCard) => {
      // Auto-generate card number if not provided
      if (!idCard.card_number) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        idCard.card_number = `CARD-${timestamp}-${random}`;
      }
      
      // Set default issue date if not provided
      if (!idCard.issue || !idCard.issue.issuedDate) {
        idCard.issue = {
          ...idCard.issue,
          issuedDate: new Date()
        };
      }
      
      // Set default expiry date if not provided (1 year from now)
      if (!idCard.expiry || !idCard.expiry.expiryDate) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        idCard.expiry = {
          ...idCard.expiry,
          expiryDate,
          autoRenew: true,
          renewalNoticeSent: false
        };
      }
    }
  }
});

// Instance methods
IDCard.prototype.isExpired = function() {
  if (!this.expiry || !this.expiry.expiryDate) {
    return false;
  }
  return new Date() > new Date(this.expiry.expiryDate);
};

IDCard.prototype.needsRenewal = function(daysThreshold = 30) {
  if (!this.expiry || !this.expiry.expiryDate) {
    return false;
  }
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return new Date(this.expiry.expiryDate) <= thresholdDate && !this.isExpired();
};

IDCard.prototype.getDaysUntilExpiry = function() {
  if (!this.expiry || !this.expiry.expiryDate) {
    return null;
  }
  const today = new Date();
  const expiry = new Date(this.expiry.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

IDCard.prototype.getPrintCount = function() {
  return this.print_history ? this.print_history.length : 0;
};

IDCard.prototype.logPrint = async function(printedBy, printType = 'individual', reason = '', batchId = null) {
  const printHistory = this.print_history || [];
  printHistory.push({
    printedAt: new Date(),
    printedBy,
    printType,
    printReason: reason,
    batchId,
    printStatus: 'success'
  });
  
  this.print_history = printHistory;
  return this.save();
};

IDCard.prototype.markExpired = async function() {
  this.status = 'expired';
  this.is_active = false;
  return this.save();
};

IDCard.prototype.renewCard = async function(issuedBy) {
  const newExpiryDate = new Date();
  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
  
  this.expiry = {
    ...this.expiry,
    expiryDate: newExpiryDate,
    renewalNoticeSent: false
  };
  this.status = 'active';
  this.is_active = true;
  
  const printHistory = this.print_history || [];
  printHistory.push({
    printedBy: issuedBy,
    printType: 'individual',
    printReason: 'renewal',
    printStatus: 'success',
    printedAt: new Date()
  });
  this.print_history = printHistory;
  
  return this.save();
};

// Static methods
IDCard.getEmployeeCard = async function(employeeId, tenantId) {
  return this.findOne({
    where: {
      employee_id: employeeId,
      tenant_id: tenantId,
      status: 'active',
      is_active: true
    }
  });
};

IDCard.getCardsNeedingRenewal = async function(tenantId, daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: 'active',
      is_active: true,
      'expiry.expiryDate': {
        [Op.lte]: thresholdDate,
        [Op.gte]: new Date()
      },
      'expiry.renewalNoticeSent': false
    },
    order: [
      [sequelize.literal("(expiry->>'expiryDate')::timestamp"), 'ASC']
    ]
  });
};

IDCard.getExpiredCards = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: { [Op.ne]: 'expired' },
      is_active: true,
      'expiry.expiryDate': {
        [Op.lt]: new Date()
      }
    }
  });
};

IDCard.getDepartmentCards = async function(departmentId, tenantId, filters = {}) {
  const where = {
    department_id: departmentId,
    tenant_id: tenantId,
    ...filters
  };
  
  return this.findAll({
    where,
    order: [
      [sequelize.literal("(issue->>'issuedDate')::timestamp"), 'DESC']
    ]
  });
};

IDCard.getCardStatistics = async function(tenantId, departmentId = null) {
  
  const departmentFilter = departmentId ? `AND department_id = '${departmentId}'` : '';
  
  const results = await sequelize.query(
    `SELECT 
      status,
      card_type,
      COUNT(*) as count
    FROM id_cards
    WHERE tenant_id = :tenantId ${departmentFilter}
    GROUP BY status, card_type`,
    {
      replacements: { tenantId },
      type: QueryTypes.SELECT
    }
  );
  
  const totalCards = results.reduce((sum, row) => sum + parseInt(row.count), 0);
  const activeCards = results
    .filter(row => row.status === 'active')
    .reduce((sum, row) => sum + parseInt(row.count), 0);
  
  return {
    total: totalCards,
    active: activeCards,
    byStatus: results
  };
};

export default IDCard;




