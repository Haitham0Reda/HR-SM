// models/SickLeave.js
import mongoose from 'mongoose';

const sickLeaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return !v || v >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  duration: {
    type: Number, // in days
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  medicalDocumentation: {
    required: {
      type: Boolean,
      default: false
    },
    provided: {
      type: Boolean,
      default: false
    },
    documents: [{
      filename: {
        type: String,
        trim: true
      },
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    reviewedByDoctor: {
      type: Boolean,
      default: false
    },
    doctorReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    doctorReviewedAt: Date,
    doctorNotes: {
      type: String,
      trim: true
    },
    additionalDocRequested: {
      type: Boolean,
      default: false
    },
    requestNotes: {
      type: String,
      trim: true
    }
  },
  workflow: {
    supervisorApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    doctorApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not-required'],
      default: 'pending'
    },
    currentStep: {
      type: String,
      enum: ['supervisor-review', 'doctor-review', 'completed', 'rejected'],
      default: 'supervisor-review'
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    trim: true
  },
  approverNotes: {
    type: String,
    trim: true
  },
  vacationBalance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VacationBalance'
  },
  // Employee's department (denormalized for faster queries)
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  },
  // Employee's position (denormalized for faster queries)
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position'
  },
  // Email notification tracking
  notifications: {
    submitted: {
      sent: Boolean,
      sentAt: Date
    },
    supervisorApproved: {
      sent: Boolean,
      sentAt: Date
    },
    doctorApproved: {
      sent: Boolean,
      sentAt: Date
    },
    rejected: {
      sent: Boolean,
      sentAt: Date
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to set medical documentation requirement based on duration
sickLeaveSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('duration')) {
    this.medicalDocumentation.required = this.duration > 3;
  }
  next();
});

// Virtual to check if sick leave is active
sickLeaveSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'approved' &&
    this.startDate <= now &&
    this.endDate >= now;
});

// Instance method to approve by supervisor
sickLeaveSchema.methods.approveBySupervisor = async function (supervisorId, notes) {
  this.workflow.supervisorApprovalStatus = 'approved';
  
  // If medical documentation is required and not reviewed by doctor yet, move to doctor review
  if (this.medicalDocumentation.required && !this.medicalDocumentation.reviewedByDoctor) {
    this.workflow.currentStep = 'doctor-review';
    this.workflow.doctorApprovalStatus = 'pending';
  } else {
    // If no doctor review needed, complete the approval
    this.workflow.currentStep = 'completed';
    this.workflow.doctorApprovalStatus = 'not-required';
    this.status = 'approved';
    this.approvedBy = supervisorId;
    this.approvedAt = new Date();
  }
  
  if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
  return await this.save();
};

// Instance method to approve by doctor
sickLeaveSchema.methods.approveByDoctor = async function (doctorId, notes) {
  // Validate that supervisor has already approved
  if (this.workflow.supervisorApprovalStatus !== 'approved') {
    throw new Error('Supervisor must approve before doctor can approve');
  }
  
  this.workflow.doctorApprovalStatus = 'approved';
  this.workflow.currentStep = 'completed';
  this.status = 'approved';
  this.approvedBy = doctorId;
  this.approvedAt = new Date();
  this.medicalDocumentation.reviewedByDoctor = true;
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();
  
  if (notes && typeof notes === 'string') {
    this.medicalDocumentation.doctorNotes = notes.trim();
  }
  
  return await this.save();
};

// Instance method to reject by supervisor
sickLeaveSchema.methods.rejectBySupervisor = async function (supervisorId, reason) {
  this.workflow.supervisorApprovalStatus = 'rejected';
  this.workflow.currentStep = 'rejected';
  this.status = 'rejected';
  this.rejectedBy = supervisorId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validateBeforeSave: false });
};

// Instance method to reject by doctor
sickLeaveSchema.methods.rejectByDoctor = async function (doctorId, reason) {
  // Validate that supervisor has already approved
  if (this.workflow.supervisorApprovalStatus !== 'approved') {
    throw new Error('Supervisor must approve before doctor can reject');
  }
  
  this.workflow.doctorApprovalStatus = 'rejected';
  this.workflow.currentStep = 'rejected';
  this.status = 'rejected';
  this.rejectedBy = doctorId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  this.medicalDocumentation.reviewedByDoctor = true;
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();
  
  return await this.save({ validateBeforeSave: false });
};

// Instance method to request additional documentation
sickLeaveSchema.methods.requestAdditionalDocs = async function (doctorId, requestNotes) {
  this.medicalDocumentation.additionalDocRequested = true;
  this.medicalDocumentation.requestNotes = requestNotes && typeof requestNotes === 'string' ? requestNotes.trim() : '';
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();
  
  return await this.save();
};

// Instance method to cancel sick leave
sickLeaveSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save();
};

// Static method to get employee sick leaves with full details
sickLeaveSchema.statics.getSickLeavesByEmployee = function (employeeId, filters = {}) {
  const query = { employee: employeeId, ...filters };
  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
    .populate('medicalDocumentation.doctorReviewedBy', 'username employeeId personalInfo')
    .populate('department', 'name code')
    .populate('position', 'title')
    .populate('vacationBalance')
    .sort({ startDate: -1 });
};

// Static method to get sick leaves pending supervisor review
sickLeaveSchema.statics.getPendingSupervisorReview = function (departmentId = null) {
  const query = {
    'workflow.currentStep': 'supervisor-review',
    'workflow.supervisorApprovalStatus': 'pending'
  };

  if (departmentId) {
    query.department = departmentId;
  }

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('department', 'name code')
    .sort({ createdAt: 1 });
};

// Static method to get sick leaves pending doctor review
sickLeaveSchema.statics.getPendingDoctorReview = function (departmentId = null) {
  const query = {
    'workflow.currentStep': 'doctor-review',
    'workflow.doctorApprovalStatus': 'pending'
  };

  if (departmentId) {
    query.department = departmentId;
  }

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('department', 'name code')
    .sort({ createdAt: 1 });
};

// Static method to get sick leaves by department
sickLeaveSchema.statics.getSickLeavesByDepartment = function (departmentId, filters = {}) {
  const query = { department: departmentId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile position employeeId email',
      populate: { path: 'position', select: 'title code' }
    })
    .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
    .populate('medicalDocumentation.doctorReviewedBy', 'username employeeId personalInfo')
    .sort({ startDate: -1 });
};

// Static method to check for overlapping sick leaves
sickLeaveSchema.statics.hasOverlappingSickLeave = async function (employeeId, startDate, endDate, excludeSickLeaveId = null) {
  const query = {
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  };

  if (excludeSickLeaveId) {
    query._id = { $ne: excludeSickLeaveId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};

// Compound indexes for better performance
sickLeaveSchema.index({ employee: 1, status: 1 });
sickLeaveSchema.index({ department: 1, status: 1 });
sickLeaveSchema.index({ 'workflow.currentStep': 1 });
sickLeaveSchema.index({ 'workflow.supervisorApprovalStatus': 1 });
sickLeaveSchema.index({ 'workflow.doctorApprovalStatus': 1 });
sickLeaveSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('SickLeave', sickLeaveSchema);
