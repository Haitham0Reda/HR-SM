import mongoose from 'mongoose';

/**
 * Visit Model
 * 
 * Records medical visits including:
 * - Visit date and time
 * - Doctor/medical staff
 * - Diagnosis and treatment
 * - Follow-up requirements
 * 
 * CRITICAL: All records must have tenantId for multi-tenancy isolation
 */

const visitSchema = new mongoose.Schema({
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
  
  // Visit details
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  visitType: {
    type: String,
    enum: ['routine', 'emergency', 'follow-up', 'consultation', 'vaccination', 'screening'],
    required: true
  },
  
  // Medical staff
  doctor: {
    name: {
      type: String,
      required: true
    },
    specialization: String,
    licenseNumber: String
  },
  
  // Chief complaint
  chiefComplaint: {
    type: String,
    required: true
  },
  
  // Vital signs
  vitalSigns: {
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      }
    },
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'inches'],
        default: 'cm'
      }
    }
  },
  
  // Examination findings
  examination: {
    type: String
  },
  
  // Diagnosis
  diagnosis: {
    primary: {
      type: String,
      required: true
    },
    secondary: [String],
    icdCodes: [String]
  },
  
  // Treatment provided
  treatment: {
    description: String,
    procedures: [{
      name: String,
      code: String,
      notes: String
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      prescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
      }
    }]
  },
  
  // Lab tests ordered
  labTests: [{
    testName: String,
    testCode: String,
    status: {
      type: String,
      enum: ['ordered', 'pending', 'completed', 'cancelled'],
      default: 'ordered'
    },
    results: String,
    resultDate: Date
  }],
  
  // Follow-up
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    reason: String,
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    }
  },
  
  // Medical leave recommendation
  medicalLeave: {
    recommended: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    reason: String,
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'  // HR-Core Request model
    }
  },
  
  // Visit notes
  notes: {
    type: String
  },
  
  // Visit status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'completed'
  },
  
  // Billing information
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
visitSchema.index({ tenantId: 1, patientId: 1, visitDate: -1 });
visitSchema.index({ tenantId: 1, visitDate: -1 });
visitSchema.index({ tenantId: 1, status: 1 });
visitSchema.index({ tenantId: 1, visitType: 1 });

// Pre-save middleware
visitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
visitSchema.methods = {
  /**
   * Check if visit requires follow-up
   */
  requiresFollowUp() {
    return this.followUp && this.followUp.required;
  },
  
  /**
   * Check if medical leave was recommended
   */
  hasMedicalLeaveRecommendation() {
    return this.medicalLeave && this.medicalLeave.recommended;
  },
  
  /**
   * Calculate total visit duration (if needed)
   */
  getDuration() {
    // Could be enhanced to track actual visit duration
    return null;
  }
};

// Static methods
visitSchema.statics = {
  /**
   * Find visits by patient and tenant
   */
  async findByPatientAndTenant(patientId, tenantId, options = {}) {
    const { page = 1, limit = 50, sort = { visitDate: -1 } } = options;
    const skip = (page - 1) * limit;
    
    return this.find({ patientId, tenantId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Find visits by date range
   */
  async findByDateRange(tenantId, startDate, endDate, options = {}) {
    const query = {
      tenantId,
      visitDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    return this.find(query)
      .sort({ visitDate: -1 })
      .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Get visit statistics for a tenant
   */
  async getStatistics(tenantId, startDate, endDate) {
    const match = {
      tenantId,
      visitDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    return this.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$visitType',
          count: { $sum: 1 },
          avgCost: { $avg: '$billing.cost' }
        }
      }
    ]);
  }
};

const Visit = mongoose.model('Visit', visitSchema);

export default Visit;
