// models/Vacation.js
import mongoose from 'mongoose';

const vacationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vacationType: {
    type: String,
    enum: ['annual', 'casual', 'sick', 'unpaid'],
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
    type: Number, // in days (calculated automatically, excluding weekends)
    required: false
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
  attachments: [{
    filename: {
      type: String,
      trim: true
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  }
}, {
  timestamps: true
});

// Static method to calculate working days excluding weekends (Friday and Saturday)
vacationSchema.statics.calculateWorkingDays = function (startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Reset time to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 5 = Friday, 6 = Saturday (weekend in Egypt)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
};

// Pre-validate hook to automatically calculate duration excluding weekends
// This runs before validation, so duration will be set before the required check
vacationSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate) {
    this.duration = this.constructor.calculateWorkingDays(this.startDate, this.endDate);
  }
  next();
});

// Virtual to check if vacation is active
vacationSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'approved' &&
    this.startDate <= now &&
    this.endDate >= now;
});

// Virtual to check if vacation is upcoming
vacationSchema.virtual('isUpcoming').get(function () {
  return this.status === 'approved' && this.startDate > new Date();
});

// Instance method to approve vacation
vacationSchema.methods.approve = async function (approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
  return await this.save();
};

// Instance method to reject vacation
vacationSchema.methods.reject = async function (rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validateBeforeSave: false });
};

// Instance method to cancel vacation
vacationSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save();
};

// Static method to get employee vacations with full details
vacationSchema.statics.getVacationsByEmployee = function (employeeId, filters = {}) {
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
    .populate('department', 'name code')
    .populate('position', 'title')
    .populate('vacationBalance')
    .sort({ startDate: -1 });
};

// Static method to get pending vacations for approval
vacationSchema.statics.getPendingVacations = function (departmentId = null) {
  const query = {
    status: 'pending'
  };

  // Filter by department if provided
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
    .populate('vacationBalance')
    .sort({ createdAt: 1 });
};

// Static method to get active vacations (currently ongoing)
vacationSchema.statics.getActiveVacations = function (departmentId = null) {
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

// Static method to get vacations by department
vacationSchema.statics.getVacationsByDepartment = function (departmentId, filters = {}) {
  const query = { department: departmentId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile position employeeId email',
      populate: { path: 'position', select: 'title code' }
    })
    .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
    .populate('vacationBalance')
    .sort({ startDate: -1 });
};

// Static method to check for overlapping vacations
vacationSchema.statics.hasOverlappingVacation = async function (employeeId, startDate, endDate, excludeVacationId = null) {
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

  if (excludeVacationId) {
    query._id = { $ne: excludeVacationId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};

// Static method to get vacation statistics for a department
vacationSchema.statics.getVacationStats = async function (departmentId, year = new Date().getFullYear()) {
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
          vacationType: '$vacationType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalDays: { $sum: '$duration' }
      }
    }
  ]);

  return stats;
};

// Compound indexes for better performance
vacationSchema.index({ employee: 1, status: 1 });
vacationSchema.index({ employee: 1, vacationType: 1 });
vacationSchema.index({ department: 1, status: 1 });
vacationSchema.index({ startDate: 1, endDate: 1 });
vacationSchema.index({ vacationType: 1, status: 1 });
vacationSchema.index({ vacationBalance: 1 });

export default mongoose.model('Vacation', vacationSchema);
