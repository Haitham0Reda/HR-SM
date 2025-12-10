// models/Mission.js
import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
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
  startTime: {
    type: String,
    required: false
  },
  endTime: {
    type: String,
    required: false
  },
  duration: {
    type: Number, // in days
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  relatedDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
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
    }
  }
}, {
  timestamps: true
});

// Virtual to check if mission is active
missionSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'approved' &&
    this.startDate <= now &&
    this.endDate >= now;
});

// Virtual to check if mission is upcoming
missionSchema.virtual('isUpcoming').get(function () {
  return this.status === 'approved' && this.startDate > new Date();
});

// Instance method to approve mission
missionSchema.methods.approve = async function (approverId, notes) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
  return await this.save();
};

// Instance method to reject mission
missionSchema.methods.reject = async function (rejecterId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejecterId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save({ validateBeforeSave: false });
};

// Instance method to cancel mission
missionSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason && typeof reason === 'string' ? reason.trim() : '';
  return await this.save();
};

// Static method to get employee missions with full details
missionSchema.statics.getMissionsByEmployee = function (employeeId, filters = {}) {
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
    .populate('relatedDepartment', 'name code manager')
    .populate('department', 'name code')
    .populate('position', 'title')
    .sort({ startDate: -1 });
};

// Static method to get pending missions for supervisor approval
missionSchema.statics.getPendingMissions = function (departmentId = null) {
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
    .populate('relatedDepartment', 'name code manager')
    .populate('department', 'name code')
    .sort({ createdAt: 1 });
};

// Static method to get active missions (currently ongoing)
missionSchema.statics.getActiveMissions = function (departmentId = null) {
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
    .populate('relatedDepartment', 'name code')
    .sort({ endDate: 1 });
};

// Static method to get missions by department
missionSchema.statics.getMissionsByDepartment = function (departmentId, filters = {}) {
  const query = { department: departmentId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile position employeeId email',
      populate: { path: 'position', select: 'title code' }
    })
    .populate('approvedBy rejectedBy cancelledBy', 'username employeeId personalInfo')
    .populate('relatedDepartment', 'name code manager')
    .sort({ startDate: -1 });
};

// Static method to check for overlapping missions
missionSchema.statics.hasOverlappingMission = async function (employeeId, startDate, endDate, excludeMissionId = null) {
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

  if (excludeMissionId) {
    query._id = { $ne: excludeMissionId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};

// Static method to get mission statistics for a department
missionSchema.statics.getDepartmentStats = async function (departmentId, year = new Date().getFullYear()) {
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
        _id: '$status',
        count: { $sum: 1 },
        totalDays: { $sum: '$duration' }
      }
    }
  ]);

  return stats;
};

// Compound indexes for better performance
missionSchema.index({ employee: 1, status: 1 });
missionSchema.index({ department: 1, status: 1 });
missionSchema.index({ department: 1, startDate: 1 });
missionSchema.index({ startDate: 1, endDate: 1 });
missionSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Mission', missionSchema);
