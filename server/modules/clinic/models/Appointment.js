/**
 * Appointment Model (Sequelize)
 * 
 * Manages scheduled medical appointments
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Appointment = mainAppDb.define('Appointment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    patientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'patient_id'
    },
    medicalProfileId: {
        type: DataTypes.UUID,
        references: {
            model: 'medical_profiles',
            key: 'id'
        },
        field: 'medical_profile_id'
    },
    appointmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'appointment_date'
    },
    appointmentTime: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'appointment_time'
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    appointmentType: {
        type: DataTypes.ENUM('routine', 'follow-up', 'consultation', 'vaccination', 'screening', 'emergency'),
        allowNull: false,
        field: 'appointment_type'
    },
    // Doctor - stored as JSONB
    doctor: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'),
        defaultValue: 'scheduled'
    },
    // Cancellation - stored as JSONB
    cancellation: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    // Rescheduling - stored as JSONB
    rescheduling: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    // Reminders - stored as JSONB
    reminders: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            sent: [],
            reminderHours: 24
        }
    },
    visitId: {
        type: DataTypes.UUID,
        references: {
            model: 'visits',
            key: 'id'
        },
        field: 'visit_id'
    },
    // Check-in - stored as JSONB
    checkIn: {
        type: DataTypes.JSONB,
        defaultValue: {
            checkedIn: false
        },
        field: 'check_in'
    },
    priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
    },
    createdBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'created_by'
    },
    updatedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'updated_by'
    }
}, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['patient_id'] },
        { fields: ['status'] },
        { fields: ['appointment_date'] },
        { fields: ['tenant_id', 'patient_id', 'appointment_date'] },
        { fields: ['tenant_id', 'appointment_date', 'appointment_time'] },
        { fields: ['tenant_id', 'status'] }
    ]
});

/**
 * Define associations
 */
Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, {
        foreignKey: 'patientId',
        as: 'patient'
    });
    Appointment.belongsTo(models.MedicalProfile, {
        foreignKey: 'medicalProfileId',
        as: 'medicalProfile'
    });
    Appointment.belongsTo(models.Visit, {
        foreignKey: 'visitId',
        as: 'visit'
    });
};

/**
 * Instance method: Check if appointment is upcoming
 */
Appointment.prototype.isUpcoming = function () {
    const appointmentDateTime = new Date(this.appointmentDate);
    return appointmentDateTime > new Date() && 
           ['scheduled', 'confirmed'].includes(this.status);
};

/**
 * Instance method: Check if appointment is past
 */
Appointment.prototype.isPast = function () {
    const appointmentDateTime = new Date(this.appointmentDate);
    return appointmentDateTime < new Date();
};

/**
 * Instance method: Check if reminder should be sent
 */
Appointment.prototype.shouldSendReminder = function () {
    if (!this.reminders?.enabled || this.status !== 'scheduled') {
        return false;
    }
    
    const appointmentDateTime = new Date(this.appointmentDate);
    const reminderTime = new Date(appointmentDateTime.getTime() - ((this.reminders.reminderHours || 24) * 60 * 60 * 1000));
    const now = new Date();
    
    const sent = this.reminders.sent || [];
    return now >= reminderTime && 
           now < appointmentDateTime &&
           !sent.some(r => r.status === 'sent');
};

/**
 * Instance method: Cancel appointment
 */
Appointment.prototype.cancel = async function (userId, reason) {
    this.status = 'cancelled';
    this.cancellation = {
        cancelledAt: new Date(),
        cancelledBy: userId,
        reason
    };
    return await this.save();
};

/**
 * Instance method: Reschedule appointment
 */
Appointment.prototype.reschedule = async function (newDate, newTime, userId, reason) {
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
    return await this.save();
};

/**
 * Instance method: Check in patient
 */
Appointment.prototype.checkInPatient = async function (userId) {
    this.checkIn = {
        checkedIn: true,
        checkInTime: new Date(),
        checkInBy: userId
    };
    this.status = 'in-progress';
    return await this.save();
};

/**
 * Static method: Find appointments by patient and tenant
 */
Appointment.findByPatientAndTenant = async function (patientId, tenantId, options = {}) {
    const { page = 1, limit = 50, sort = [['appointmentDate', 'DESC']] } = options;
    const offset = (page - 1) * limit;
    
    return await this.findAll({
        where: { patientId, tenantId },
        order: sort,
        offset,
        limit,
        include: [{
            model: mainAppDb.models.User,
            as: 'patient',
            attributes: ['firstName', 'lastName', 'email']
        }]
    });
};

/**
 * Static method: Find upcoming appointments for a tenant
 */
Appointment.findUpcoming = async function (tenantId, options = {}) {
    const { days = 7 } = options;
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return await this.findAll({
        where: {
            tenantId,
            appointmentDate: {
                [Op.gte]: now,
                [Op.lte]: futureDate
            },
            status: { [Op.in]: ['scheduled', 'confirmed'] }
        },
        order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']],
        include: [{
            model: mainAppDb.models.User,
            as: 'patient',
            attributes: ['firstName', 'lastName', 'email']
        }]
    });
};

/**
 * Static method: Find appointments that need reminders
 */
Appointment.findNeedingReminders = async function (tenantId) {
    const now = new Date();
    
    return await this.findAll({
        where: {
            tenantId,
            status: 'scheduled',
            'reminders.enabled': true,
            appointmentDate: { [Op.gt]: now }
        }
    });
};

/**
 * Static method: Get appointment statistics
 */
Appointment.getStatistics = async function (tenantId, startDate, endDate) {
    const appointments = await this.findAll({
        where: {
            tenantId,
            appointmentDate: {
                [Op.gte]: new Date(startDate),
                [Op.lte]: new Date(endDate)
            }
        }
    });
    
    const stats = appointments.reduce((acc, appt) => {
        const status = appt.status;
        if (!acc[status]) {
            acc[status] = { count: 0 };
        }
        acc[status].count += 1;
        return acc;
    }, {});
    
    return Object.entries(stats).map(([status, data]) => ({
        _id: status,
        ...data
    }));
};

export default Appointment;
