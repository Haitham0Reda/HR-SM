/**
 * Permission Model
 * 
 * Manages employee permission requests for schedule deviations.
 * Handles late arrival, early departure, and overtime requests.
 * 
 * Features:
 * - Three permission types: late arrival, early departure, overtime
 * - Supervisor approval workflow
 * - Automatic attendance record adjustment on approval
 * - Email notification tracking
 * - Time duration calculation
 */
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  // Reference to the employee requesting permission
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Type of permission request
  permissionType: {
    type: String,
    enum: ['late-arrival', 'early-departure', 'overtime'],
    required: true
  },
  // Date for which permission is requested
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Time-related fields
  time: {
    // Scheduled time (e.g., normal start/end time)
    scheduled: {
      type: String,  // Format: "HH:MM" (e.g., "09:00")
      required: true
    },
    // Requested time (e.g., late arrival time, early departure time, overtime end time)
    requested: {
      type: String,  // Format: "HH:MM" (e.g., "10:30")
      required: true
    },
    // Duration in minutes (calculated automatically)
    duration: {
      type: Number,
      min: 0
    }
  },
  // Reason for the permission request
  reason: {
    type: String,
    required: false,
    maxlength: 500
  },
  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Approval information
  approval: {
    // Supervisor who approved/rejected the request
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Date and time of approval/rejection
    reviewedAt: Date,
    // Approver's comments or notes
    comments: String
  },
  // Rejection information
  rejection: {
    // Reason for rejection
    reason: String,
    // Date and time of rejection
    rejectedAt: Date
  },
  // Cancellation information
  cancellation: {
    // Who cancelled (employee or supervisor)
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Reason for cancellation
    reason: String,
    // Date and time of cancellation
    cancelledAt: Date
  },
  // Attendance record reference (populated after approval)
  attendanceRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  },
  // Flag indicating if attendance has been adjusted
  attendanceAdjusted: {
    type: Boolean,
    default: false
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
  },
  // Supporting documents or attachments
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual to check if permission is for today
permissionSchema.virtual('isToday').get(function () {
  const today = new Date();
  const requestDate = new Date(this.date);
  return today.toDateString() === requestDate.toDateString();
});

// Virtual to check if permission is in the past
permissionSchema.virtual('isPast').get(function () {
  return new Date(this.date) < new Date();
});

// Virtual to check if permission is active (approved and for today/future)
permissionSchema.virtual('isActive').get(function () {
  return this.status === 'approved' && !this.isPast;
});

// Note: Middleware hooks moved to permissionMiddleware.js
// Use middleware functions in routes for better separation of concerns

/**
 * Instance method to approve permission request
 * Updates status and records approval details
 * 
 * @param {ObjectId} supervisorId - ID of the supervisor approving the request
 * @param {String} comments - Optional comments from supervisor
 * @returns {Promise<Permission>} Updated permission document
 */
permissionSchema.methods.approve = async function (supervisorId, comments = '') {
  this.status = 'approved';
  this.approval.reviewedBy = supervisorId;
  this.approval.reviewedAt = new Date();
  if (comments) this.approval.comments = comments;
  return await this.save();
};

/**
 * Instance method to reject permission request
 * Updates status and records rejection details
 * 
 * @param {ObjectId} supervisorId - ID of the supervisor rejecting the request
 * @param {String} reason - Reason for rejection (required)
 * @returns {Promise<Permission>} Updated permission document
 */
permissionSchema.methods.reject = async function (supervisorId, reason) {
  if (!reason) {
    throw new Error('Rejection reason is required');
  }

  this.status = 'rejected';
  this.approval.reviewedBy = supervisorId;
  this.approval.reviewedAt = new Date();
  this.rejection.reason = reason;
  this.rejection.rejectedAt = new Date();
  return await this.save();
};

/**
 * Instance method to cancel permission request
 * Can be cancelled by employee (if pending) or supervisor
 * 
 * @param {ObjectId} userId - ID of the user cancelling the request
 * @param {String} reason - Reason for cancellation
 * @returns {Promise<Permission>} Updated permission document
 */
permissionSchema.methods.cancel = async function (userId, reason) {
  this.status = 'cancelled';
  this.cancellation.cancelledBy = userId;
  this.cancellation.reason = reason;
  this.cancellation.cancelledAt = new Date();
  return await this.save();
};

/**
 * Instance method to link permission to attendance record after approval
 * Marks attendance as adjusted
 * 
 * @param {ObjectId} attendanceId - ID of the attendance record
 * @returns {Promise<Permission>} Updated permission document
 */
permissionSchema.methods.linkToAttendance = async function (attendanceId) {
  this.attendanceRecord = attendanceId;
  this.attendanceAdjusted = true;
  return await this.save();
};

/**
 * Static method to get employee's permission history
 * 
 * @param {ObjectId} employeeId - Employee's user ID
 * @param {Object} filters - Optional filters (status, permissionType, dateRange)
 * @returns {Promise<Permission[]>} List of permission requests
 */
permissionSchema.statics.getEmployeePermissions = function (employeeId, filters = {}) {
  const query = { employee: employeeId, ...filters };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    })
    .populate('approval.reviewedBy', 'username employeeId personalInfo')
    .populate('cancellation.cancelledBy', 'username employeeId personalInfo')
    .populate('attendanceRecord')
    .sort({ date: -1, createdAt: -1 });
};

/**
 * Static method to get pending permissions for supervisor review
 * 
 * @param {ObjectId} departmentId - Department ID (optional)
 * @returns {Promise<Permission[]>} List of pending permission requests
 */
permissionSchema.statics.getPendingPermissions = function (departmentId = null) {
  const query = { status: 'pending' };

  let findQuery = this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId',
      populate: [
        { path: 'department', select: 'name code manager' },
        { path: 'position', select: 'title level' }
      ]
    });

  if (departmentId) {
    // Filter by department after populating
    return findQuery.then(permissions =>
      permissions.filter(p =>
        p.employee && p.employee.department &&
        p.employee.department._id.toString() === departmentId.toString()
      )
    );
  }

  return findQuery.sort({ date: 1, createdAt: 1 }); // Oldest first
};

/**
 * Static method to get permissions for a specific date
 * Useful for attendance processing
 * 
 * @param {Date} date - Date to query
 * @param {String} status - Optional status filter
 * @returns {Promise<Permission[]>} List of permissions for the date
 */
permissionSchema.statics.getPermissionsByDate = function (date, status = 'approved') {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status
  }).populate({
    path: 'employee',
    select: 'profile department position employeeId',
    populate: [
      { path: 'department', select: 'name code' },
      { path: 'position', select: 'title' }
    ]
  }).populate('attendanceRecord');
};

/**
 * Static method to get permission statistics for an employee
 * 
 * @param {ObjectId} employeeId - Employee's user ID
 * @param {Number} year - Year for statistics (default: current year)
 * @returns {Promise<Object>} Statistics object
 */
permissionSchema.statics.getEmployeeStats = async function (employeeId, year = new Date().getFullYear()) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const stats = await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: {
          type: '$permissionType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalDuration: { $sum: '$time.duration' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalDuration: '$totalDuration'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);

  return stats;
};

/**
 * Static method to get permissions by department
 * 
 * @param {ObjectId} departmentId - Department ID
 * @param {Object} filters - Optional filters (status, permissionType, dateRange)
 * @returns {Promise<Permission[]>} List of permissions for the department
 */
permissionSchema.statics.getPermissionsByDepartment = async function (departmentId, filters = {}) {
  const User = mongoose.model('User');

  // Get all employees in the department
  const employees = await User.find({ department: departmentId }, '_id');
  const employeeIds = employees.map(e => e._id);

  const query = {
    employee: { $in: employeeIds },
    ...filters
  };

  return this.find(query)
    .populate({
      path: 'employee',
      select: 'profile department position employeeId',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    })
    .populate('approval.reviewedBy', 'username employeeId personalInfo')
    .populate('attendanceRecord')
    .sort({ date: -1, createdAt: -1 });
};

/**
 * Static method to get all permissions requiring attendance adjustment
 * Finds approved permissions that haven't been linked to attendance records yet
 * 
 * @returns {Promise<Permission[]>} List of permissions needing attendance adjustment
 */
permissionSchema.statics.getPendingAttendanceAdjustments = function () {
  return this.find({
    status: 'approved',
    attendanceAdjusted: false
  })
    .populate({
      path: 'employee',
      select: 'profile department position employeeId',
      populate: { path: 'department', select: 'name code' }
    })
    .sort({ date: 1 });
};

// Note: Notification logic moved to permissionMiddleware.js
// Call createPermissionNotification function after save in controllers

// Compound indexes for better query performance
permissionSchema.index({ employee: 1, status: 1 });
permissionSchema.index({ employee: 1, date: 1 });
permissionSchema.index({ date: 1, status: 1 });
permissionSchema.index({ permissionType: 1, status: 1 });
permissionSchema.index({ status: 1, createdAt: 1 });
permissionSchema.index({ attendanceAdjusted: 1, status: 1 });
permissionSchema.index({ 'approval.reviewedBy': 1 });

export default mongoose.model('Permission', permissionSchema);
