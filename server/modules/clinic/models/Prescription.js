import { DataTypes, Op } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Prescription Model
 * 
 * Manages medication prescriptions including:
 * - Medication details
 * - Dosage and frequency
 * - Duration and refills
 * - Prescription status
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const Prescription = sequelize.define('Prescription', {
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
  
  // Patient reference (links to HR-Core User model)
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id'
  },
  
  // Medical profile reference
  medical_profile_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'medical_profile_id'
  },
  
  // Visit reference (if prescribed during a visit)
  visit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'visit_id'
  },
  
  // Prescription number (unique identifier)
  prescription_number: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'prescription_number'
  },
  
  // Prescribing doctor (JSONB)
  prescribed_by: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'prescribed_by',
    defaultValue: {}
    // Structure: { name, specialization, licenseNumber, signature }
  },
  
  // Prescription date
  prescription_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'prescription_date'
  },
  
  // Medication details (JSONB)
  medication: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { name, genericName, brandName, strength, form, drugCode }
  },
  
  // Dosage instructions (JSONB)
  dosage: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { amount, frequency, route, timing, specialInstructions }
  },
  
  // Duration (JSONB)
  duration: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { value, unit }
  },
  
  // Quantity (JSONB)
  quantity: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
    // Structure: { prescribed, dispensed, unit }
  },
  
  // Refills (JSONB with history array)
  refills: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { authorized: 0, remaining: 0, history: [] }
    // Structure: { authorized, remaining, history: [{ date, quantity, dispensedBy }] }
  },
  
  // Indication (reason for prescription)
  indication: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Start and end dates
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'start_date'
  },
  
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'completed', 'discontinued', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  // Discontinuation details (JSONB)
  discontinuation: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { date, reason, discontinuedBy }
  },
  
  // Warnings and interactions (JSONB)
  warnings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { allergies: [], interactions: [], contraindications: [], sideEffects: [] }
    // Structure: { allergies: [], interactions: [], contraindications: [], sideEffects: [] }
  },
  
  // Pharmacy information (JSONB)
  pharmacy: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
    // Structure: { name, address, phone, dispensedDate }
  },
  
  // Insurance and billing (JSONB)
  billing: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { paymentStatus: 'pending' }
    // Structure: { cost, insuranceCovered, patientResponsibility, paymentStatus }
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Metadata
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'prescriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'patient_id', 'prescription_date']
    },
    {
      unique: true,
      fields: ['tenant_id', 'prescription_number']
    },
    {
      fields: ['tenant_id', 'status']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['medical_profile_id']
    },
    {
      fields: ['visit_id']
    }
  ],
  hooks: {
    beforeCreate: async (prescription) => {
      // Auto-generate prescription number if not provided
      if (!prescription.prescription_number) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        prescription.prescription_number = `RX-${timestamp}-${random}`;
      }
      
      // Set end date based on duration if not provided
      if (!prescription.end_date && prescription.start_date && prescription.duration) {
        const start = new Date(prescription.start_date);
        let daysToAdd = 0;
        
        switch (prescription.duration.unit) {
          case 'days':
            daysToAdd = prescription.duration.value;
            break;
          case 'weeks':
            daysToAdd = prescription.duration.value * 7;
            break;
          case 'months':
            daysToAdd = prescription.duration.value * 30;
            break;
          case 'ongoing':
            // No end date for ongoing prescriptions
            break;
        }
        
        if (daysToAdd > 0) {
          prescription.end_date = new Date(start.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        }
      }
      
      // Initialize remaining refills
      if (prescription.refills && prescription.refills.remaining === undefined) {
        prescription.refills = {
          ...prescription.refills,
          remaining: prescription.refills.authorized || 0
        };
      }
    }
  }
});

// Instance methods
Prescription.prototype.isActive = function() {
  if (this.status !== 'active') {
    return false;
  }
  
  const now = new Date();
  if (this.end_date && now > this.end_date) {
    return false;
  }
  
  return true;
};

Prescription.prototype.isExpired = function() {
  if (!this.end_date) {
    return false;
  }
  return new Date() > this.end_date;
};

Prescription.prototype.hasRefillsAvailable = function() {
  return this.refills && this.refills.remaining > 0;
};

Prescription.prototype.processRefill = async function(quantity, dispensedBy) {
  if (!this.hasRefillsAvailable()) {
    throw new Error('No refills remaining');
  }
  
  const updatedRefills = {
    ...this.refills,
    remaining: this.refills.remaining - 1,
    history: [
      ...(this.refills.history || []),
      {
        date: new Date(),
        quantity,
        dispensedBy
      }
    ]
  };
  
  this.refills = updatedRefills;
  return this.save();
};

Prescription.prototype.discontinue = async function(userId, reason) {
  this.status = 'discontinued';
  this.discontinuation = {
    date: new Date(),
    reason,
    discontinuedBy: userId
  };
  return this.save();
};

// Static methods
Prescription.findByPatientAndTenant = async function(patientId, tenantId, options = {}) {
  const { page = 1, limit = 50, sort = [['prescription_date', 'DESC']] } = options;
  const offset = (page - 1) * limit;
  
  return this.findAll({
    where: {
      patient_id: patientId,
      tenant_id: tenantId
    },
    order: sort,
    offset,
    limit,
    include: [
      {
        association: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

Prescription.findActiveByPatient = async function(patientId, tenantId) {
  return this.findAll({
    where: {
      patient_id: patientId,
      tenant_id: tenantId,
      status: 'active',
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: new Date() } }
      ]
    },
    order: [['prescription_date', 'DESC']],
    include: [
      {
        association: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ]
  });
};

Prescription.findNeedingRefillReminders = async function(tenantId, daysBeforeExpiry = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);
  
  return this.findAll({
    where: {
      tenant_id: tenantId,
      status: 'active',
      end_date: {
        [Op.gte]: new Date(),
        [Op.lte]: futureDate
      },
      refills: {
        remaining: { [Op.gt]: 0 }
      }
    }
  });
};

Prescription.getStatistics = async function(tenantId, startDate, endDate) {
  const { QueryTypes } = require('sequelize');
  
  const results = await sequelize.query(
    `SELECT 
      status,
      COUNT(*) as count,
      SUM(CAST(billing->>'cost' AS DECIMAL)) as total_cost
    FROM prescriptions
    WHERE tenant_id = :tenantId
      AND prescription_date >= :startDate
      AND prescription_date <= :endDate
    GROUP BY status`,
    {
      replacements: { tenantId, startDate, endDate },
      type: QueryTypes.SELECT
    }
  );
  
  return results.map(row => ({
    _id: row.status,
    count: parseInt(row.count),
    totalCost: parseFloat(row.total_cost) || 0
  }));
};

export default Prescription;
