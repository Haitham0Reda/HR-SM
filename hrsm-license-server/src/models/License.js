import mongoose from 'mongoose';
import crypto from 'crypto';

const licenseSchema = new mongoose.Schema({
  licenseNumber: { 
    type: String, 
    unique: true,
    sparse: true // Allow null/undefined values but enforce uniqueness when present
  },
  tenantId: { 
    type: String, 
    required: true
  },
  tenantName: { type: String, required: true },
  
  type: { 
    type: String, 
    enum: ['trial', 'basic', 'professional', 'enterprise', 'unlimited'],
    required: true 
  },
  
  // Mongoose subdocument for features
  features: {
    modules: [{ 
      type: String, 
      enum: ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'] 
    }],
    maxUsers: { type: Number, required: true },
    maxStorage: { type: Number, default: 10240 }, // MB
    maxAPICallsPerMonth: { type: Number, default: 100000 }
  },
  
  // Machine binding subdocument
  binding: {
    boundDomain: String,
    machineHash: String,
    ipWhitelist: [String]
  },
  
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'expired', 'revoked'], 
    default: 'active' 
  },
  
  // Array of activation subdocuments
  activations: [{
    machineId: String,
    activatedAt: { type: Date, default: Date.now },
    lastValidatedAt: Date,
    ipAddress: String
  }],
  
  maxActivations: { type: Number, default: 1 },
  
  // Usage tracking subdocument
  usage: {
    lastValidatedAt: Date,
    totalValidations: { type: Number, default: 0 },
    currentUsers: { type: Number, default: 0 },
    currentStorage: { type: Number, default: 0 }
  },
  
  createdBy: { type: String, default: 'Platform-Admin' },
  notes: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true }
});

// Mongoose virtual methods
licenseSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

licenseSchema.virtual('isValid').get(function() {
  return this.status === 'active' && !this.isExpired;
});

// Mongoose pre-save middleware for auto-generating license numbers (HRSM-YYYY-NNNNNN format)
licenseSchema.pre('save', function(next) {
  if (this.isNew && !this.licenseNumber) {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    this.licenseNumber = `HRSM-${year}-${timestamp}${random}`;
  }
  next();
});

// Instance methods
licenseSchema.methods.canActivate = function(machineId) {
  if (!this.isValid) return false;
  
  // Check if already activated on this machine
  const existingActivation = this.activations.find(a => a.machineId === machineId);
  if (existingActivation) return true;
  
  // Check if max activations reached
  return this.activations.length < this.maxActivations;
};

licenseSchema.methods.activate = function(machineId, ipAddress) {
  if (!this.canActivate(machineId)) {
    throw new Error('Cannot activate license on this machine');
  }
  
  // Check if already activated on this machine
  let activation = this.activations.find(a => a.machineId === machineId);
  
  if (activation) {
    // Update existing activation
    activation.lastValidatedAt = new Date();
    activation.ipAddress = ipAddress;
  } else {
    // Add new activation
    this.activations.push({
      machineId,
      activatedAt: new Date(),
      lastValidatedAt: new Date(),
      ipAddress
    });
  }
  
  // Update usage tracking
  this.usage.lastValidatedAt = new Date();
  this.usage.totalValidations = (this.usage.totalValidations || 0) + 1;
  
  return this.save();
};

licenseSchema.methods.updateUsage = function(currentUsers, currentStorage) {
  this.usage.currentUsers = currentUsers || this.usage.currentUsers;
  this.usage.currentStorage = currentStorage || this.usage.currentStorage;
  this.usage.lastValidatedAt = new Date();
  
  return this.save();
};

// Set up MongoDB indexes for license queries
licenseSchema.index({ tenantId: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ expiresAt: 1 });
licenseSchema.index({ 'activations.machineId': 1 });
licenseSchema.index({ type: 1 });
licenseSchema.index({ createdAt: -1 });

export default mongoose.model('License', licenseSchema, 'licenses');