import mongoose from 'mongoose';

/**
 * Prescription Model
 * 
 * Manages medication prescriptions including:
 * - Medication details
 * - Dosage and frequency
 * - Duration and refills
 * - Prescription status
 * 
 * CRITICAL: All records must have tenantId for multi-tenancy isolation
 */

const prescriptionSchema = new mongoose.Schema({
  // Tenant isolation - REQUIRED
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Patient reference (links to HR-Core User model)
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Medical profile reference
  medicalProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalProfile'
  },
  
  // Visit reference (if prescribed during a visit)
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  
  // Prescription number (unique identifier)
  prescriptionNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Prescribing doctor
  prescribedBy: {
    name: {
      type: String,
      required: true
    },
    specialization: String,
    licenseNumber: String,
    signature: String  // Digital signature or reference
  },
  
  // Prescription date
  prescriptionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Medication details
  medication: {
    name: {
      type: String,
      required: true
    },
    genericName: String,
    brandName: String,
    strength: {
      type: String,
      required: true
    },
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'drops', 'patch', 'other'],
      required: true
    },
    drugCode: String  // NDC or other drug identification code
  },
  
  // Dosage instructions
  dosage: {
    amount: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    route: {
      type: String,
      enum: ['oral', 'topical', 'injection', 'inhalation', 'sublingual', 'rectal', 'other'],
      default: 'oral'
    },
    timing: String,  // e.g., "with food", "before bed"
    specialInstructions: String
  },
  
  // Duration
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'ongoing'],
      required: true
    }
  },
  
  // Quantity
  quantity: {
    prescribed: {
      type: Number,
      required: true
    },
    dispensed: Number,
    unit: {
      type: String,
      default: 'units'
    }
  },
  
  // Refills
  refills: {
    authorized: {
      type: Number,
      default: 0
    },
    remaining: {
      type: Number,
      default: 0
    },
    history: [{
      date: Date,
      quantity: Number,
      dispensedBy: String
    }]
  },
  
  // Indication (reason for prescription)
  indication: {
    type: String,
    required: true
  },
  
  // Start and end dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'discontinued', 'expired', 'cancelled'],
    default: 'active'
  },
  
  // Discontinuation details
  discontinuation: {
    date: Date,
    reason: String,
    discontinuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Warnings and interactions
  warnings: {
    allergies: [String],
    interactions: [String],
    contraindications: [String],
    sideEffects: [String]
  },
  
  // Pharmacy information
  pharmacy: {
    name: String,
    address: String,
    phone: String,
    dispensedDate: Date
  },
  
  // Insurance and billing
  billing: {
    cost: Number,
    insuranceCovered: Number,
    patientResponsibility: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially-paid', 'waived'],
      default: 'pending'
    }
  },
  
  // Notes
  notes: String,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
prescriptionSchema.index({ tenantId: 1, patientId: 1, prescriptionDate: -1 });
prescriptionSchema.index({ tenantId: 1, prescriptionNumber: 1 }, { unique: true });
prescriptionSchema.index({ tenantId: 1, status: 1 });
prescriptionSchema.index({ tenantId: 1, 'medication.name': 1 });

// Pre-save middleware
prescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-generate prescription number if not provided
  if (!this.prescriptionNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.prescriptionNumber = `RX-${timestamp}-${random}`;
  }
  
  // Set end date based on duration if not provided
  if (!this.endDate && this.startDate && this.duration) {
    const start = new Date(this.startDate);
    let daysToAdd = 0;
    
    switch (this.duration.unit) {
      case 'days':
        daysToAdd = this.duration.value;
        break;
      case 'weeks':
        daysToAdd = this.duration.value * 7;
        break;
      case 'months':
        daysToAdd = this.duration.value * 30;
        break;
      case 'ongoing':
        // No end date for ongoing prescriptions
        break;
    }
    
    if (daysToAdd > 0) {
      this.endDate = new Date(start.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    }
  }
  
  // Initialize remaining refills
  if (this.isNew && this.refills.remaining === undefined) {
    this.refills.remaining = this.refills.authorized;
  }
  
  next();
});

// Instance methods
prescriptionSchema.methods = {
  /**
   * Check if prescription is active
   */
  isActive() {
    if (this.status !== 'active') {
      return false;
    }
    
    const now = new Date();
    if (this.endDate && now > this.endDate) {
      return false;
    }
    
    return true;
  },
  
  /**
   * Check if prescription is expired
   */
  isExpired() {
    if (!this.endDate) {
      return false;
    }
    return new Date() > this.endDate;
  },
  
  /**
   * Check if refills are available
   */
  hasRefillsAvailable() {
    return this.refills.remaining > 0;
  },
  
  /**
   * Process a refill
   */
  async processRefill(quantity, dispensedBy) {
    if (!this.hasRefillsAvailable()) {
      throw new Error('No refills remaining');
    }
    
    this.refills.remaining -= 1;
    this.refills.history.push({
      date: new Date(),
      quantity,
      dispensedBy
    });
    
    return this.save();
  },
  
  /**
   * Discontinue prescription
   */
  async discontinue(userId, reason) {
    this.status = 'discontinued';
    this.discontinuation = {
      date: new Date(),
      reason,
      discontinuedBy: userId
    };
    return this.save();
  }
};

// Static methods
prescriptionSchema.statics = {
  /**
   * Find prescriptions by patient and tenant
   */
  async findByPatientAndTenant(patientId, tenantId, options = {}) {
    const { page = 1, limit = 50, sort = { prescriptionDate: -1 } } = options;
    const skip = (page - 1) * limit;
    
    return this.find({ patientId, tenantId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Find active prescriptions for a patient
   */
  async findActiveByPatient(patientId, tenantId) {
    return this.find({
      patientId,
      tenantId,
      status: 'active',
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } }
      ]
    })
    .sort({ prescriptionDate: -1 })
    .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Find prescriptions needing refill reminders
   */
  async findNeedingRefillReminders(tenantId, daysBeforeExpiry = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);
    
    return this.find({
      tenantId,
      status: 'active',
      'refills.remaining': { $gt: 0 },
      endDate: {
        $gte: new Date(),
        $lte: futureDate
      }
    });
  },
  
  /**
   * Get prescription statistics
   */
  async getStatistics(tenantId, startDate, endDate) {
    const match = {
      tenantId,
      prescriptionDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    return this.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$billing.cost' }
        }
      }
    ]);
  }
};

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
