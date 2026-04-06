/**
 * Medical Profile Model (Sequelize)
 * 
 * Stores medical information for employees
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const MedicalProfile = mainAppDb.define('MedicalProfile', {
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
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    bloodType: {
        type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'),
        defaultValue: 'Unknown',
        field: 'blood_type'
    },
    // Allergies - stored as JSONB array
    allergies: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Chronic conditions - stored as JSONB array
    chronicConditions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'chronic_conditions'
    },
    // Current medications - stored as JSONB array
    currentMedications: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'current_medications'
    },
    // Emergency contacts - stored as JSONB array
    emergencyContacts: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'emergency_contacts'
    },
    // Insurance information - stored as JSONB
    insurance: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    // Medical history - stored as JSONB
    medicalHistory: {
        type: DataTypes.JSONB,
        defaultValue: {
            surgeries: [],
            familyHistory: [],
            immunizations: []
        },
        field: 'medical_history'
    },
    consentToTreat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'consent_to_treat'
    },
    consentDate: {
        type: DataTypes.DATE,
        field: 'consent_date'
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
    tableName: 'medical_profiles',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['user_id'] },
        { fields: ['tenant_id', 'user_id'], unique: true },
        { fields: ['tenant_id', 'created_at'] }
    ]
});

/**
 * Define associations
 */
MedicalProfile.associate = (models) => {
    MedicalProfile.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    });
    MedicalProfile.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
    });
    MedicalProfile.belongsTo(models.User, {
        foreignKey: 'updatedBy',
        as: 'updater'
    });
};

/**
 * Instance method: Check if profile has critical allergies
 */
MedicalProfile.prototype.hasCriticalAllergies = function () {
    const allergies = this.allergies || [];
    return allergies.some(allergy => 
        allergy.severity === 'severe' || allergy.severity === 'life-threatening'
    );
};

/**
 * Instance method: Get primary emergency contact
 */
MedicalProfile.prototype.getPrimaryEmergencyContact = function () {
    const contacts = this.emergencyContacts || [];
    return contacts.find(contact => contact.isPrimary) || contacts[0];
};

/**
 * Instance method: Check if insurance is active
 */
MedicalProfile.prototype.hasActiveInsurance = function () {
    if (!this.insurance || !this.insurance.expirationDate) {
        return false;
    }
    return new Date(this.insurance.expirationDate) > new Date();
};

/**
 * Static method: Find medical profile by user ID and tenant ID
 */
MedicalProfile.findByUserAndTenant = async function (userId, tenantId) {
    return await this.findOne({ where: { userId, tenantId } });
};

/**
 * Static method: Get all profiles for a tenant
 */
MedicalProfile.findByTenant = async function (tenantId, options = {}) {
    const { page = 1, limit = 50, sort = [['createdAt', 'DESC']] } = options;
    const offset = (page - 1) * limit;
    
    return await this.findAll({
        where: { tenantId },
        order: sort,
        offset,
        limit,
        include: [{
            model: mainAppDb.models.User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
        }]
    });
};

export default MedicalProfile;
