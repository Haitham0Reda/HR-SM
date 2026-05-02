/**
 * ID Card Model - PostgreSQL (Sequelize)
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
 * @module models/IDCard
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const IDCard = mainAppDb.define('IDCard', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the ID card (UUID)'
  },

  // Employee reference
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    comment: 'Reference to User (employee)'
  },

  // Department and Position (denormalized for faster queries)
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id',
    comment: 'Reference to Department'
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'position_id',
    comment: 'Reference to Position'
  },

  // Card number (unique identifier)
  cardNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'card_number',
    comment: 'Unique card number'
  },

  // Card type
  cardType: {
    type: DataTypes.ENUM('employee', 'contractor', 'visitor', 'temporary'),
    allowNull: false,
    defaultValue: 'employee',
    field: 'card_type',
    comment: 'Type of card'
  },

  // Card status
  status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'lost', 'stolen', 'replaced', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Card status'
  },

  // Issue information - stored as JSONB
  issue: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      issuedDate: new Date(),
      issuedBy: null,
      issueReason: 'new-hire',
      issueNotes: null
    },
    comment: 'Issue information'
  },

  // Expiry information - stored as JSONB
  expiry: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      expiryDate: null,
      autoRenew: true,
      renewalNoticeSent: false,
      renewalNoticeDate: null
    },
    comment: 'Expiry information'
  },

  // Print history tracking - stored as JSONB
  printHistory: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'print_history',
    comment: 'Print history tracking'
  },

  // Card design/template - stored as JSONB
  template: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      templateId: null,
      templateName: null,
      orientation: 'portrait',
      includePhoto: true,
      includeQRCode: true,
      includeBarcode: false
    },
    comment: 'Card design template'
  },

  // QR Code data - stored as JSONB
  qrCode: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'qr_code',
    comment: 'QR code data for verification'
  },

  // Barcode - stored as JSONB
  barcode: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Barcode information'
  },

  // Access permissions - stored as JSONB
  accessPermissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'access_permissions',
    comment: 'Access control permissions'
  },

  // Previous card reference
  previousCardId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'previous_card_id',
    comment: 'Reference to previous card (for replacements)'
  },

  // Replacement information - stored as JSONB
  replacement: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Replacement information'
  },

  // Physical card status - stored as JSONB
  physical: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      received: false,
      receivedDate: null,
      receivedBy: null,
      signature: null
    },
    comment: 'Physical card status'
  },

  // Notifications - stored as JSONB
  notifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      issued: { sent: false, sentAt: null },
      renewal: { sent: false, sentAt: null },
      expired: { sent: false, sentAt: null }
    },
    comment: 'Notification tracking'
  },

  // Additional metadata - stored as JSONB
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata'
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes and remarks'
  },

  // Active flag
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the card is active'
  }
}, {
  tableName: 'id_cards',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_id_cards_card_number',
      fields: ['card_number'],
      unique: true
    },
    {
      name: 'idx_id_cards_employee_id',
      fields: ['employee_id']
    },
    {
      name: 'idx_id_cards_employee_id_status',
      fields: ['employee_id', 'status']
    },
    {
      name: 'idx_id_cards_employee_id_is_active',
      fields: ['employee_id', 'is_active']
    },
    {
      name: 'idx_id_cards_department_id_status',
      fields: ['department_id', 'status']
    },
    {
      name: 'idx_id_cards_department_id_is_active',
      fields: ['department_id', 'is_active']
    },
    {
      name: 'idx_id_cards_card_type_status',
      fields: ['card_type', 'status']
    },
    {
      name: 'idx_id_cards_status',
      fields: ['status']
    },
    {
      name: 'idx_id_cards_is_active',
      fields: ['is_active']
    }
  ]
});

// Virtual properties
IDCard.prototype.isExpired = function() {
  return new Date() > new Date(this.expiry.expiryDate);
};

IDCard.prototype.needsRenewal = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return new Date(this.expiry.expiryDate) <= thirtyDaysFromNow && !this.isExpired();
};

IDCard.prototype.getDaysUntilExpiry = function() {
  const today = new Date();
  const expiry = new Date(this.expiry.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

IDCard.prototype.getPrintCount = function() {
  return this.printHistory ? this.printHistory.length : 0;
};

// Instance Methods
IDCard.prototype.logPrint = async function(printedBy, printType = 'individual', reason = '', batchId = null) {
  const printHistory = [...(this.printHistory || [])];
  printHistory.push({
    printedAt: new Date(),
    printedBy,
    printType,
    printReason: reason,
    batchId,
    printStatus: 'success'
  });
  this.printHistory = printHistory;
  return await this.save();
};

IDCard.prototype.markExpired = async function() {
  this.status = 'expired';
  this.isActive = false;
  return await this.save();
};

IDCard.prototype.replaceCard = async function(issuedBy, reason) {
  // Mark current card as replaced
  this.status = 'replaced';
  this.isActive = false;

  // Generate card number
  const cardNumber = `CARD-${this.employeeId}-${new Date().getFullYear()}-${Date.now()}`;

  // Set expiry date (1 year from now)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  // Create new card
  const newCard = await IDCard.create({
    employeeId: this.employeeId,
    departmentId: this.departmentId,
    positionId: this.positionId,
    cardType: this.cardType,
    cardNumber: cardNumber,
    expiry: {
      expiryDate,
      autoRenew: true,
      renewalNoticeSent: false
    },
    issue: {
      issuedDate: new Date(),
      issuedBy,
      issueReason: 'replacement'
    },
    template: this.template,
    previousCardId: this.id,
    replacement: {
      originalCard: this.id,
      replacementReason: reason
    }
  });

  // Link replacement
  this.replacement = {
    replacedBy: newCard.id,
    replacementDate: new Date(),
    replacementReason: reason
  };

  await this.save();
  return newCard;
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
  this.isActive = true;

  const printHistory = [...(this.printHistory || [])];
  printHistory.push({
    printedAt: new Date(),
    printedBy: issuedBy,
    printType: 'individual',
    printReason: 'renewal',
    printStatus: 'success'
  });
  this.printHistory = printHistory;

  return await this.save();
};

// Static Methods
IDCard.getEmployeeCard = function(employeeId) {
  return this.findOne({
    where: {
      employeeId,
      status: 'active',
      isActive: true
    }
  });
};

IDCard.getCardsNeedingRenewal = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.findAll({
    where: {
      status: 'active',
      isActive: true,
      // Note: JSONB field querying would need raw SQL or Sequelize.literal
      // For now, fetch all active cards and filter in JavaScript
    },
    order: [['createdAt', 'ASC']]
  });
};

IDCard.getExpiredCards = function() {
  return this.findAll({
    where: {
      status: { [Op.ne]: 'expired' },
      isActive: true
      // Note: JSONB field querying for expiry date would need special handling
    }
  });
};

IDCard.getDepartmentCards = function(departmentId, filters = {}) {
  return this.findAll({
    where: {
      departmentId,
      ...filters
    },
    order: [['createdAt', 'DESC']]
  });
};

IDCard.getPrintStatistics = async function(startDate, endDate, departmentId = null) {
  const where = {};
  if (departmentId) {
    where.departmentId = departmentId;
  }

  const cards = await this.findAll({
    where,
    attributes: ['id', 'printHistory'],
    raw: true
  });

  // Process stats in JavaScript
  const stats = {};
  cards.forEach(card => {
    if (!card.printHistory) return;
    
    card.printHistory.forEach(print => {
      const printDate = new Date(print.printedAt);
      if (printDate >= startDate && printDate <= endDate) {
        const type = print.printType;
        const status = print.printStatus;
        
        if (!stats[type]) {
          stats[type] = { totalPrints: 0, statuses: {} };
        }
        
        if (!stats[type].statuses[status]) {
          stats[type].statuses[status] = { count: 0 };
        }
        
        stats[type].totalPrints++;
        stats[type].statuses[status].count++;
      }
    });
  });

  return stats;
};

IDCard.getCardStatistics = async function(departmentId = null) {
  const where = departmentId ? { departmentId } : {};

  const totalCards = await this.count({ where });
  const activeCards = await this.count({ where: { ...where, status: 'active' } });
  const lostOrStolen = await this.count({
    where: { ...where, status: { [Op.in]: ['lost', 'stolen'] } }
  });

  // Get by type
  const byTypeResults = await this.findAll({
    where,
    attributes: [
      'cardType',
      [mainAppDb.fn('COUNT', mainAppDb.col('id')), 'count']
    ],
    group: ['cardType'],
    raw: true
  });

  const byType = byTypeResults.map(r => ({
    _id: r.cardType,
    count: parseInt(r.count)
  }));

  return {
    total: totalCards,
    active: activeCards,
    expired: 0, // Would need JSONB querying
    needingRenewal: 0, // Would need JSONB querying
    lostOrStolen,
    byType
  };
};

export default IDCard;







