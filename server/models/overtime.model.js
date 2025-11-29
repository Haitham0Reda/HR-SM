// models/Overtime.js
import mongoose from 'mongoose';

const overtimeSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Validate HH:MM format (24-hour)
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Validate HH:MM format (24-hour)
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  compensationType: {
    type: String,
    enum: ['paid', 'time-off', 'none'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
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
  approverNotes: {
    type: String,
    trim: true
  },
  compensated: {
    type: Boolean,
    default: false
  },
  compensatedAt: Date,
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
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to validate time range
overtimeSchema.pre('save', function (next) {
  if (this.isModified('startTime') || this.isModified('endTime')) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Instance method to approve overtime
overtimeSchema.methods.approve = async function (approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
  return await this.save();
};

// Instance method to reject overtime
overtimeSchema.methods.reject = async function (rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validateBeforeSave: false });
};

// Instance method to mark overtime as compensated
overtimeSchema.methods.markCompensated = async function () {
  this.compensated = true;
  this.compensatedAt = new Date();
  return await this.save();
};

// Static method to get employee overtime with full details
overtimeSchema.statics.getOvertimeByEmployee = function (employeeId, filters = {}) {
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
    .populate('approvedBy rejectedBy', 'username employeeId personalInfo')
    .populate('department', 'name code')
    .populate('position', 'title')
    .sort({ date: -1 });
};

// Static method to get pending overtime for approval
overtimeSchema.statics.getPendingOvertime = function (departmentId = null) {
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
    .sort({ createdAt: 1 });
};

// Static method to get overtime by department
overtimeSchema.statics.getOvertimeByDepartment = function (departmentId, filters = {}) {
  const query = { department: departmentId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile position employeeId email',
      populate: { path: 'position', select: 'title code' }
    })
    .populate('approvedBy rejectedBy', 'username employeeId personalInfo')
    .sort({ date: -1 });
};

// Static method to get overtime by date range
overtimeSchema.statics.getOvertimeByDateRange = function (employeeId, startDate, endDate) {
  const query = {
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.find(query)
    .populate('approvedBy rejectedBy', 'username employeeId personalInfo')
    .sort({ date: 1 });
};

// Static method to get monthly statistics
overtimeSchema.statics.getMonthlyStats = async function (employeeId, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const stats = await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: monthStart, $lte: monthEnd }
      }
    },
    {
      $group: {
        _id: {
          compensationType: '$compensationType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalHours: { $sum: '$duration' }
      }
    }
  ]);

  return stats;
};

// Static method to get total uncompensated hours
overtimeSchema.statics.getTotalUncompensatedHours = async function (employeeId) {
  const result = await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        status: 'approved',
        compensated: false
      }
    },
    {
      $group: {
        _id: '$compensationType',
        totalHours: { $sum: '$duration' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result;
};

// Compound indexes for better performance
overtimeSchema.index({ employee: 1, date: 1 });
overtimeSchema.index({ employee: 1, status: 1 });
overtimeSchema.index({ department: 1, status: 1 });
overtimeSchema.index({ date: 1, status: 1 });
overtimeSchema.index({ compensationType: 1, compensated: 1 });

export default mongoose.model('Overtime', overtimeSchema);
