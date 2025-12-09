import mongoose from 'mongoose';

/**
 * Medical Profile Model
 * 
 * Stores medical information for employees including:
 * - Patient information (blood type, allergies, medical conditions)
 * - Emergency contacts
 * - Medical history
 * - Insurance information
 * 
 * CRITICAL: All records must have tenantId for multi-tenancy isolation
 */

const medicalProfileSchema = new mongoose.Schema({
  // Tenant isolation - REQUIRED
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // User reference (links to HR-Core User model)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Basic medical information
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    default: 'Unknown'
  },
  
  // Allergies
  allergies: [{
    allergen: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life-threatening'],
      default: 'moderate'
    },
    reaction: String,
    diagnosedDate: Date
  }],
  
  // Chronic conditions
  chronicConditions: [{
    condition: {
      type: String,
      required: true
    },
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'managed', 'resolved'],
      default: 'active'
    },
    notes: String
  }],
  
  // Current medications
  currentMedications: [{
    medication: {
      type: String,
      required: true
    },
    dosage: String,
    frequency: String,
    startDate: Date,
    prescribedBy: String
  }],
  
  // Emergency contacts
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    alternatePhone: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Insurance information
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    effectiveDate: Date,
    expirationDate: Date,
    coverageType: {
      type: String,
      enum: ['individual', 'family', 'employee-only', 'employee-spouse', 'employee-children']
    }
  },
  
  // Medical history notes
  medicalHistory: {
    surgeries: [{
      procedure: String,
      date: Date,
      hospital: String,
      notes: String
    }],
    familyHistory: [{
      condition: String,
      relationship: String,
      notes: String
    }],
    immunizations: [{
      vaccine: String,
      date: Date,
      nextDueDate: Date
    }]
  },
  
  // Privacy and consent
  consentToTreat: {
    type: Boolean,
    default: false
  },
  consentDate: Date,
  
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
medicalProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
medicalProfileSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save middleware to update timestamps
medicalProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
medicalProfileSchema.methods = {
  /**
   * Check if profile has critical allergies
   */
  hasCriticalAllergies() {
    return this.allergies.some(allergy => 
      allergy.severity === 'severe' || allergy.severity === 'life-threatening'
    );
  },
  
  /**
   * Get primary emergency contact
   */
  getPrimaryEmergencyContact() {
    return this.emergencyContacts.find(contact => contact.isPrimary) || 
           this.emergencyContacts[0];
  },
  
  /**
   * Check if insurance is active
   */
  hasActiveInsurance() {
    if (!this.insurance || !this.insurance.expirationDate) {
      return false;
    }
    return new Date(this.insurance.expirationDate) > new Date();
  }
};

// Static methods
medicalProfileSchema.statics = {
  /**
   * Find medical profile by user ID and tenant ID
   */
  async findByUserAndTenant(userId, tenantId) {
    return this.findOne({ userId, tenantId });
  },
  
  /**
   * Get all profiles for a tenant
   */
  async findByTenant(tenantId, options = {}) {
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;
    
    return this.find({ tenantId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email');
  }
};

const MedicalProfile = mongoose.model('MedicalProfile', medicalProfileSchema);

export default MedicalProfile;
