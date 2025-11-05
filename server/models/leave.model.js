// models/Leave.js
import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'casual', 'sick', 'unpaid', 'emergency', 'maternity', 'paternity', 'mission'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        // Start date should not be before hire date
        return !v || v >= new Date();
      },
      message: 'Start date cannot be in the past'
    }
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return !v || v >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  duration: {
    type: Number, // in days
    required: true
  },
  reason: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
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
  rejectionReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancellationReason: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Medical documentation for sick leave
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
      filename: String,
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
    doctorNotes: String,
    additionalDocRequested: {
      type: Boolean,
      default: false
    },
    requestNotes: String
  },
  // Mission-specific fields
  mission: {
    location: {
      type: String,
      required: function () { return this.leaveType === 'mission'; }
    },
    purpose: {
      type: String,
      required: function () { return this.leaveType === 'mission'; },
      maxlength: 500
    },
    relatedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    // Mission-specific approvals
    supervisorApproved: {
      type: Boolean,
      default: false
    },
    supervisorApprovedAt: Date
  },
  // Workflow status for sick leave (supervisor -> doctor)
  workflow: {
    supervisorApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    doctorApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not-required'],
      default: function () { return this.leaveType === 'sick' ? 'pending' : 'not-required'; }
    },
    currentStep: {
      type: String,
      enum: ['supervisor-review', 'doctor-review', 'completed', 'rejected'],
      default: 'supervisor-review'
    }
  },
  // Linked vacation balance record (for tracking balance deductions)
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
    approved: {
      sent: Boolean,
      sentAt: Date
    },
    rejected: {
      sent: Boolean,
      sentAt: Date
    },
    reminder: {
      sent: Boolean,
      sentAt: Date
    }
  },
  // Notes from approver
  approverNotes: String
}, {
  timestamps: true
});

// Virtual to check if leave is active
leaveSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'approved' &&
    this.startDate <= now &&
    this.endDate >= now;
});

// Virtual to check if leave is upcoming
leaveSchema.virtual('isUpcoming').get(function () {
  return this.status === 'approved' && this.startDate > new Date();
});

// Instance method for supervisor approval
leaveSchema.methods.approveBySupervisor = async function (supervisorId, notes) {
  this.workflow.supervisorApprovalStatus = 'approved';

  if (this.leaveType === 'sick') {
    // For sick leave, move to doctor review step
    this.workflow.currentStep = 'doctor-review';
    if (notes) this.approverNotes = notes;
  } else if (this.leaveType === 'mission') {
    // For mission, supervisor approval is final
    this.status = 'approved';
    this.approvedBy = supervisorId;
    this.approvedAt = new Date();
    this.mission.supervisorApproved = true;
    this.mission.supervisorApprovedAt = new Date();
    this.workflow.currentStep = 'completed';
    if (notes) this.approverNotes = notes;
  } else {
    // For other leave types, supervisor approval is final
    this.status = 'approved';
    this.approvedBy = supervisorId;
    this.approvedAt = new Date();
    this.workflow.currentStep = 'completed';
    if (notes) this.approverNotes = notes;
  }

  return await this.save();
};

// Instance method for doctor approval (sick leave only)
leaveSchema.methods.approveByDoctor = async function (doctorId, notes) {
  if (this.leaveType !== 'sick') {
    throw new Error('Doctor approval is only required for sick leave');
  }

  if (this.workflow.supervisorApprovalStatus !== 'approved') {
    throw new Error('Supervisor must approve before doctor review');
  }

  this.workflow.doctorApprovalStatus = 'approved';
  this.status = 'approved';
  this.approvedBy = doctorId;
  this.approvedAt = new Date();
  this.medicalDocumentation.reviewedByDoctor = true;
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();
  if (notes) this.medicalDocumentation.doctorNotes = notes;
  this.workflow.currentStep = 'completed';

  return await this.save();
};

// Instance method for doctor to request additional medical documentation
leaveSchema.methods.requestAdditionalDocs = async function (doctorId, requestNotes) {
  if (this.leaveType !== 'sick') {
    throw new Error('Additional documentation is only applicable for sick leave');
  }

  this.medicalDocumentation.additionalDocRequested = true;
  this.medicalDocumentation.requestNotes = requestNotes;
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();

  return await this.save();
};

// Instance method to approve leave (legacy - for backward compatibility)
leaveSchema.methods.approve = async function (approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  this.workflow.currentStep = 'completed';
  if (notes) this.approverNotes = notes;
  return await this.save();
};

// Instance method for supervisor to reject leave
leaveSchema.methods.rejectBySupervisor = async function (supervisorId, reason) {
  this.workflow.supervisorApprovalStatus = 'rejected';
  this.status = 'rejected';
  this.rejectedBy = supervisorId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.workflow.currentStep = 'rejected';
  return await this.save();
};

// Instance method for doctor to reject sick leave
leaveSchema.methods.rejectByDoctor = async function (doctorId, reason) {
  if (this.leaveType !== 'sick') {
    throw new Error('Doctor rejection is only applicable for sick leave');
  }

  this.workflow.doctorApprovalStatus = 'rejected';
  this.status = 'rejected';
  this.rejectedBy = doctorId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.medicalDocumentation.reviewedByDoctor = true;
  this.medicalDocumentation.doctorReviewedBy = doctorId;
  this.medicalDocumentation.doctorReviewedAt = new Date();
  this.workflow.currentStep = 'rejected';
  return await this.save();
};

// Instance method to reject leave (legacy - for backward compatibility)
leaveSchema.methods.reject = async function (rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.workflow.currentStep = 'rejected';
  return await this.save();
};

// Instance method to cancel leave
leaveSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return await this.save();
};

// Static method to get employee leave history with full details
leaveSchema.statics.getEmployeeLeaves = function (employeeId, filters = {}) {
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
    .populate('approvedBy rejectedBy cancelledBy', 'profile.firstName profile.lastName employeeId')
    .populate('medicalDocumentation.doctorReviewedBy', 'profile.firstName profile.lastName employeeId role')
    .populate('medicalDocumentation.documents.uploadedBy', 'profile.firstName profile.lastName')
    .populate('mission.relatedDepartment', 'name code')
    .populate('department', 'name code')
    .populate('position', 'title')
    .populate('vacationBalance')
    .sort({ startDate: -1 });
};

// Static method to get pending leaves for supervisor approval
leaveSchema.statics.getPendingLeaves = function (departmentId = null, supervisorId = null) {
  const query = {
    status: 'pending',
    'workflow.currentStep': 'supervisor-review'
  };

  // Filter by department if provided
  if (departmentId) {
    query.department = departmentId;
  }

  let findQuery = this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('mission.relatedDepartment', 'name code')
    .populate('department', 'name code')
    .populate('vacationBalance');

  return findQuery.sort({ createdAt: 1 });
};

// Static method to get sick leaves pending doctor review
leaveSchema.statics.getPendingDoctorReview = function (departmentId = null) {
  const query = {
    leaveType: 'sick',
    'workflow.currentStep': 'doctor-review',
    'workflow.supervisorApprovalStatus': 'approved'
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
    .populate('approvedBy', 'profile.firstName profile.lastName employeeId role')
    .populate('medicalDocumentation.documents.uploadedBy', 'profile.firstName profile.lastName')
    .populate('department', 'name code')
    .populate('vacationBalance')
    .sort({ createdAt: 1 });
};

// Static method to get mission requests
leaveSchema.statics.getMissionRequests = function (departmentId = null, status = null) {
  const query = { leaveType: 'mission' };
  if (status) query.status = status;
  if (departmentId) query.department = departmentId;

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('approvedBy rejectedBy', 'profile.firstName profile.lastName employeeId')
    .populate('mission.relatedDepartment', 'name code manager')
    .populate('department', 'name code')
    .sort({ startDate: -1 });
};

// Static method to get sick leave requests
leaveSchema.statics.getSickLeaveRequests = function (departmentId = null, status = null) {
  const query = { leaveType: 'sick' };
  if (status) query.status = status;
  if (departmentId) query.department = departmentId;

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId email',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title code' }
      ]
    })
    .populate('approvedBy rejectedBy', 'profile.firstName profile.lastName employeeId role')
    .populate('medicalDocumentation.doctorReviewedBy', 'profile.firstName profile.lastName employeeId role')
    .populate('medicalDocumentation.documents.uploadedBy', 'profile.firstName profile.lastName')
    .populate('department', 'name code')
    .populate('vacationBalance')
    .sort({ createdAt: -1 });
};

/**
 * Static method to get leaves by department
 * Useful for department managers to view all leaves in their department
 * 
 * @param {ObjectId} departmentId - Department ID
 * @param {Object} filters - Optional filters (status, leaveType, dateRange)
 * @returns {Promise<Leave[]>} List of leaves
 */
leaveSchema.statics.getLeavesByDepartment = function (departmentId, filters = {}) {
  const query = { department: departmentId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile position employeeId email',
      populate: { path: 'position', select: 'title code' }
    })
    .populate('approvedBy rejectedBy cancelledBy', 'profile.firstName profile.lastName')
    .populate('medicalDocumentation.doctorReviewedBy', 'profile.firstName profile.lastName role')
    .populate('mission.relatedDepartment', 'name code')
    .populate('vacationBalance')
    .sort({ startDate: -1 });
};

/**
 * Static method to get active leaves (currently ongoing)
 * Useful for attendance tracking and workforce planning
 * 
 * @param {ObjectId} departmentId - Optional department filter
 * @returns {Promise<Leave[]>} List of active leaves
 */
leaveSchema.statics.getActiveLeaves = function (departmentId = null) {
  const now = new Date();
  const query = {
    status: 'approved',
    startDate: { $lte: now },
    endDate: { $gte: now }
  };

  if (departmentId) {
    query.department = departmentId;
  }

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    })
    .sort({ endDate: 1 });
};

/**
 * Static method to get leave statistics for a department
 * 
 * @param {ObjectId} departmentId - Department ID
 * @param {Number} year - Year for statistics (default: current year)
 * @returns {Promise<Object>} Statistics object
 */
leaveSchema.statics.getDepartmentStats = async function (departmentId, year = new Date().getFullYear()) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const stats = await this.aggregate([
    {
      $match: {
        department: new mongoose.Types.ObjectId(departmentId),
        startDate: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: {
          type: '$leaveType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalDays: { $sum: '$duration' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalDays: '$totalDays'
          }
        },
        totalRequests: { $sum: '$count' },
        totalDays: { $sum: '$totalDays' }
      }
    }
  ]);

  return stats;
};

/**
 * Static method to check for overlapping leaves
 * Prevents employees from submitting overlapping leave requests
 * 
 * @param {ObjectId} employeeId - Employee ID
 * @param {Date} startDate - Start date of new leave
 * @param {Date} endDate - End date of new leave
 * @param {ObjectId} excludeLeaveId - Leave ID to exclude (for updates)
 * @returns {Promise<Boolean>} True if overlap exists
 */
leaveSchema.statics.hasOverlappingLeave = async function (employeeId, startDate, endDate, excludeLeaveId = null) {
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

  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};



// Note: Middleware hooks moved to leaveMiddleware.js
// Use middleware functions in routes for better separation of concerns

// Compound indexes for better performance
leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ employee: 1, leaveType: 1 });
leaveSchema.index({ department: 1, status: 1 });
leaveSchema.index({ department: 1, startDate: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, createdAt: 1 });
leaveSchema.index({ leaveType: 1, status: 1 });
leaveSchema.index({ 'workflow.currentStep': 1 });
leaveSchema.index({ 'workflow.supervisorApprovalStatus': 1 });
leaveSchema.index({ 'workflow.doctorApprovalStatus': 1 });
leaveSchema.index({ vacationBalance: 1 });
leaveSchema.index({ position: 1 });

export default mongoose.model('Leave', leaveSchema);