// models/Permissions.js
import mongoose from 'mongoose';

const permissionsSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  permissionType: {
    type: String,
    enum: ['late-arrival', 'early-departure'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  time: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Validate HH:MM format (24-hour)
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Time must be in HH:MM format (24-hour)'
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

// Instance method to approve permission
permissionsSchema.methods.approve = async function (approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
  return await this.save();
};

// Instance method to reject permission
permissionsSchema.methods.reject = async function (rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validateBeforeSave: false });
};

// Static method to get employee permissions with full details
permissionsSchema.statics.getPermissionsByEmployee = function (employeeId, filters = {}) {
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

// Static method to get pending permissions for approval
permissionsSchema.statics.getPendingPermissions = function (departmentId = null) {
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

// Static method to get permissions by department
permissionsSchema.statics.getPermissionsByDepartment = function (departmentId, filters = {}) {
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

// Static method to get permissions by date range
permissionsSchema.statics.getPermissionsByDateRange = function (employeeId, startDate, endDate) {
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
permissionsSchema.statics.getMonthlyStats = async function (employeeId, year, month) {
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
          permissionType: '$permissionType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalHours: { $sum: '$duration' }
      }
    }
  ]);

  return stats;
};

// Compound indexes for better performance
permissionsSchema.index({ employee: 1, date: 1 });
permissionsSchema.index({ employee: 1, status: 1 });
permissionsSchema.index({ department: 1, status: 1 });
permissionsSchema.index({ date: 1, status: 1 });
permissionsSchema.index({ permissionType: 1, status: 1 });

export default mongoose.model('Permissions', permissionsSchema);
