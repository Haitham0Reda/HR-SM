import mongoose from 'mongoose';

/**
 * Appointment Model
 * 
 * Manages scheduled medical appointments including:
 * - Appointment scheduling
 * - Patient and doctor information
 * - Appointment status tracking
 * - Reminder notifications
 * 
 * CRITICAL: All records must have tenantId for multi-tenancy isolation
 */

const appointmentSchema = new mongoose.Schema({
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
  
  // Appointment scheduling
  appointmentDate: {
    type: Date,
    required: true
  },
  
  appointmentTime: {
    type: String,
    required: true
  },
  
  duration: {
    type: Number,  // Duration in minutes
    default: 30
  },
  
  // Appointment type
  appointmentType: {
    type: String,
    enum: ['routine', 'follow-up', 'consultation', 'vaccination', 'screening', 'emergency'],
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
  
  // Reason for appointment
  reason: {
    type: String,
    required: true
  },
  
  // Additional notes
  notes: String,
  
  // Appointment status
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  
  // Cancellation details
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  
  // Rescheduling details
  rescheduling: {
    originalDate: Date,
    originalTime: String,
    rescheduledAt: Date,
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  
  // Reminder notifications
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    sent: [{
      sentAt: Date,
      method: {
        type: String,
        enum: ['email', 'sms', 'push'],
        default: 'email'
      },
      status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
      }
    }],
    reminderHours: {
      type: Number,
      default: 24  // Send reminder 24 hours before appointment
    }
  },
  
  // Visit reference (created after appointment is completed)
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  
  // Check-in details
  checkIn: {
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: Date,
    checkInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
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
appointmentSchema.index({ tenantId: 1, patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ tenantId: 1, appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ tenantId: 1, status: 1 });
appointmentSchema.index({ tenantId: 1, 'doctor.name': 1, appointmentDate: 1 });

// Pre-save middleware
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
appointmentSchema.methods = {
  /**
   * Check if appointment is upcoming
   */
  isUpcoming() {
    const appointmentDateTime = new Date(this.appointmentDate);
    return appointmentDateTime > new Date() && 
           ['scheduled', 'confirmed'].includes(this.status);
  },
  
  /**
   * Check if appointment is past
   */
  isPast() {
    const appointmentDateTime = new Date(this.appointmentDate);
    return appointmentDateTime < new Date();
  },
  
  /**
   * Check if reminder should be sent
   */
  shouldSendReminder() {
    if (!this.reminders.enabled || this.status !== 'scheduled') {
      return false;
    }
    
    const appointmentDateTime = new Date(this.appointmentDate);
    const reminderTime = new Date(appointmentDateTime.getTime() - (this.reminders.reminderHours * 60 * 60 * 1000));
    const now = new Date();
    
    // Check if it's time to send reminder and hasn't been sent yet
    return now >= reminderTime && 
           now < appointmentDateTime &&
           !this.reminders.sent.some(r => r.status === 'sent');
  },
  
  /**
   * Cancel appointment
   */
  async cancel(userId, reason) {
    this.status = 'cancelled';
    this.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: userId,
      reason
    };
    return this.save();
  },
  
  /**
   * Reschedule appointment
   */
  async reschedule(newDate, newTime, userId, reason) {
    this.rescheduling = {
      originalDate: this.appointmentDate,
      originalTime: this.appointmentTime,
      rescheduledAt: new Date(),
      rescheduledBy: userId,
      reason
    };
    this.appointmentDate = newDate;
    this.appointmentTime = newTime;
    this.status = 'rescheduled';
    return this.save();
  },
  
  /**
   * Check in patient
   */
  async checkInPatient(userId) {
    this.checkIn = {
      checkedIn: true,
      checkInTime: new Date(),
      checkInBy: userId
    };
    this.status = 'in-progress';
    return this.save();
  }
};

// Static methods
appointmentSchema.statics = {
  /**
   * Find appointments by patient and tenant
   */
  async findByPatientAndTenant(patientId, tenantId, options = {}) {
    const { page = 1, limit = 50, sort = { appointmentDate: -1 } } = options;
    const skip = (page - 1) * limit;
    
    return this.find({ patientId, tenantId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Find upcoming appointments for a tenant
   */
  async findUpcoming(tenantId, options = {}) {
    const { days = 7 } = options;
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return this.find({
      tenantId,
      appointmentDate: {
        $gte: now,
        $lte: futureDate
      },
      status: { $in: ['scheduled', 'confirmed'] }
    })
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .populate('patientId', 'firstName lastName email');
  },
  
  /**
   * Find appointments that need reminders
   */
  async findNeedingReminders(tenantId) {
    const now = new Date();
    
    return this.find({
      tenantId,
      status: 'scheduled',
      'reminders.enabled': true,
      appointmentDate: { $gt: now }
    });
  },
  
  /**
   * Get appointment statistics
   */
  async getStatistics(tenantId, startDate, endDate) {
    const match = {
      tenantId,
      appointmentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    return this.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
  }
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
