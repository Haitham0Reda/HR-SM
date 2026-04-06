/**
 * Visit Model (Sequelize)
 * 
 * Records medical visits
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Visit = mainAppDb.define('Visit', {
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
    visitDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'visit_date'
    },
    visitType: {
        type: DataTypes.ENUM('routine', 'emergency', 'follow-up', 'consultation', 'vaccination', 'screening'),
        allowNull: false,
        field: 'visit_type'
    },
    // Doctor - stored as JSONB
    doctor: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    chiefComplaint: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'chief_complaint'
    },
    // Vital signs - stored as JSONB
    vitalSigns: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'vital_signs'
    },
    examination: {
        type: DataTypes.TEXT
    },
    // Diagnosis - stored as JSONB
    diagnosis: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    // Treatment - stored as JSONB
    treatment: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    // Lab tests - stored as JSONB array
    labTests: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'lab_tests'
    },
    // Follow-up - stored as JSONB
    followUp: {
        type: DataTypes.JSONB,
        defaultValue: {
            required: false
        },
        field: 'follow_up'
    },
    // Medical leave - stored as JSONB
    medicalLeave: {
        type: DataTypes.JSONB,
        defaultValue: {
            recommended: false
        },
        field: 'medical_leave'
    },
    notes: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'),
        defaultValue: 'completed'
    },
    // Billing - stored as JSONB
    billing: {
        type: DataTypes.JSONB,
        defaultValue: {}
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
    tableName: 'visits',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['patient_id'] },
        { fields: ['visit_date'] },
        { fields: ['status'] },
        { fields: ['visit_type'] },
        { fields: ['tenant_id', 'patient_id', 'visit_date'] },
        { fields: ['tenant_id', 'visit_date'] },
        { fields: ['tenant_id', 'status'] },
        { fields: ['tenant_id', 'visit_type'] }
    ]
});

/**
 * Define associations
 */
Visit.associate = (models) => {
    Visit.belongsTo(models.User, {
        foreignKey: 'patientId',
        as: 'patient'
    });
    Visit.belongsTo(models.MedicalProfile, {
        foreignKey: 'medicalProfileId',
        as: 'medicalProfile'
    });
};

/**
 * Instance method: Check if visit requires follow-up
 */
Visit.prototype.requiresFollowUp = function () {
    return this.followUp && this.followUp.required;
};

/**
 * Instance method: Check if medical leave was recommended
 */
Visit.prototype.hasMedicalLeaveRecommendation = function () {
    return this.medicalLeave && this.medicalLeave.recommended;
};

/**
 * Instance method: Calculate total visit duration
 */
Visit.prototype.getDuration = function () {
    return null;
};

/**
 * Static method: Find visits by patient and tenant
 */
Visit.findByPatientAndTenant = async function (patientId, tenantId, options = {}) {
    const { page = 1, limit = 50, sort = [['visitDate', 'DESC']] } = options;
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
 * Static method: Find visits by date range
 */
Visit.findByDateRange = async function (tenantId, startDate, endDate, options = {}) {
    return await this.findAll({
        where: {
            tenantId,
            visitDate: {
                [Op.gte]: new Date(startDate),
                [Op.lte]: new Date(endDate)
            }
        },
        order: [['visitDate', 'DESC']],
        include: [{
            model: mainAppDb.models.User,
            as: 'patient',
            attributes: ['firstName', 'lastName', 'email']
        }]
    });
};

/**
 * Static method: Get visit statistics for a tenant
 */
Visit.getStatistics = async function (tenantId, startDate, endDate) {
    const visits = await this.findAll({
        where: {
            tenantId,
            visitDate: {
                [Op.gte]: new Date(startDate),
                [Op.lte]: new Date(endDate)
            }
        }
    });
    
    const stats = visits.reduce((acc, visit) => {
        const type = visit.visitType;
        if (!acc[type]) {
            acc[type] = {
                count: 0,
                totalCost: 0
            };
        }
        acc[type].count += 1;
        acc[type].totalCost += parseFloat(visit.billing?.cost || 0);
        return acc;
    }, {});
    
    return Object.entries(stats).map(([type, data]) => ({
        _id: type,
        count: data.count,
        avgCost: data.count > 0 ? data.totalCost / data.count : 0
    }));
};

export default Visit;
