/**
 * Beneficiary Model (Sequelize)
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Beneficiary = mainAppDb.define('Beneficiary', {
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
    policyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'insurance_policies',
            key: 'id'
        },
        field: 'policy_id'
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'employee_id'
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'first_name'
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'last_name'
    },
    dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'date_of_birth'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
    },
    relationship: {
        type: DataTypes.ENUM('spouse', 'child', 'parent', 'sibling', 'other'),
        allowNull: false
    },
    relationshipDescription: {
        type: DataTypes.STRING(255),
        field: 'relationship_description'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255)
    },
    // Address - stored as JSONB
    address: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    benefitPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: { min: 0, max: 100 },
        field: 'benefit_percentage'
    },
    benefitAmount: {
        type: DataTypes.DECIMAL(15, 2),
        validate: { min: 0 },
        field: 'benefit_amount'
    },
    beneficiaryType: {
        type: DataTypes.ENUM('primary', 'contingent'),
        allowNull: false,
        defaultValue: 'primary',
        field: 'beneficiary_type'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: { min: 1 }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'removed'),
        defaultValue: 'active'
    },
    notes: {
        type: DataTypes.TEXT
    },
    // Guardian - stored as JSONB
    guardian: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    // Identification document - stored as JSONB
    identificationDocument: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'identification_document'
    }
}, {
    tableName: 'beneficiaries',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['policy_id'] },
        { fields: ['employee_id'] },
        { fields: ['relationship'] },
        { fields: ['beneficiary_type'] },
        { fields: ['status'] },
        { fields: ['benefit_percentage'] },
        { fields: ['tenant_id', 'policy_id', 'status'] },
        { fields: ['tenant_id', 'employee_id'] },
        { fields: ['tenant_id', 'beneficiary_type', 'priority'] }
    ],
    hooks: {
        beforeSave: async (beneficiary) => {
            // Validate relationship description for 'other'
            if (beneficiary.relationship === 'other' && !beneficiary.relationshipDescription) {
                throw new Error('Relationship description is required when relationship is "other"');
            }
            
            // Require guardian for minors
            const age = beneficiary.getAge();
            if (age !== null && age < 18 && (!beneficiary.guardian || !beneficiary.guardian.name)) {
                throw new Error('Guardian information is required for minor beneficiaries');
            }
            
            // Validate percentage totals
            if (beneficiary.isNewRecord || beneficiary.changed('benefitPercentage')) {
                const where = {
                    policyId: beneficiary.policyId,
                    beneficiaryType: beneficiary.beneficiaryType,
                    status: 'active'
                };
                
                if (!beneficiary.isNewRecord && beneficiary.id) {
                    where.id = { [Op.ne]: beneficiary.id };
                }
                
                const otherBeneficiaries = await Beneficiary.findAll({ where });
                
                const otherPercentageTotal = otherBeneficiaries.reduce(
                    (sum, b) => sum + parseFloat(b.benefitPercentage || 0), 
                    0
                );
                const totalPercentage = otherPercentageTotal + parseFloat(beneficiary.benefitPercentage || 0);
                
                if (totalPercentage > 100) {
                    throw new Error(
                        `Total benefit percentage for ${beneficiary.beneficiaryType} beneficiaries cannot exceed 100%. ` +
                        `Current total would be ${totalPercentage}%`
                    );
                }
            }
            
            // Calculate benefit amount based on policy coverage
            if (beneficiary.changed('benefitPercentage') || beneficiary.isNewRecord) {
                const InsurancePolicy = mainAppDb.models.InsurancePolicy;
                const policy = await InsurancePolicy.findByPk(beneficiary.policyId);
                
                if (policy) {
                    beneficiary.benefitAmount = (parseFloat(policy.coverageAmount) * parseFloat(beneficiary.benefitPercentage)) / 100;
                }
            }
        }
    }
});

/**
 * Define associations
 */
Beneficiary.associate = (models) => {
    Beneficiary.belongsTo(models.InsurancePolicy, {
        foreignKey: 'policyId',
        as: 'policy'
    });
    Beneficiary.belongsTo(models.User, {
        foreignKey: 'employeeId',
        as: 'employee'
    });
};

/**
 * Instance method: Get full name
 */
Beneficiary.prototype.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
};

/**
 * Instance method: Calculate age
 */
Beneficiary.prototype.getAge = function () {
    if (!this.dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

/**
 * Instance method: Check if beneficiary is a minor
 */
Beneficiary.prototype.getIsMinor = function () {
    const age = this.getAge();
    return age !== null && age < 18;
};

/**
 * Instance method: Get full address
 */
Beneficiary.prototype.getFullAddress = function () {
    if (!this.address) return '';
    
    const { street, city, state, zipCode, country } = this.address;
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
};

/**
 * Instance method: Verify identification
 */
Beneficiary.prototype.verifyIdentification = async function (verifiedBy, documentType, documentNumber) {
    this.identificationDocument = {
        type: documentType,
        number: documentNumber,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy
    };
    return await this.save();
};

/**
 * Instance method: Update priority
 */
Beneficiary.prototype.updatePriority = async function (newPriority) {
    this.priority = newPriority;
    return await this.save();
};

/**
 * Static method: Find beneficiaries by tenant
 */
Beneficiary.findByTenant = function (tenantId, filters = {}) {
    return this.findAll({ where: { tenantId, ...filters } });
};

/**
 * Static method: Validate total percentages for a policy
 */
Beneficiary.validateTotalPercentages = async function (policyId, beneficiaryType = 'primary', tenantId = null) {
    const where = {
        policyId,
        beneficiaryType,
        status: 'active'
    };
    
    if (tenantId) {
        where.tenantId = tenantId;
    }
    
    const beneficiaries = await this.findAll({ where });
    
    const totalPercentage = beneficiaries.reduce(
        (sum, beneficiary) => sum + parseFloat(beneficiary.benefitPercentage || 0), 
        0
    );
    
    return {
        isValid: totalPercentage === 100,
        totalPercentage,
        beneficiaries: beneficiaries.length,
        message: totalPercentage === 100 ? 
            'Percentages are valid' : 
            `Total percentage is ${totalPercentage}%, should be 100%`
    };
};

/**
 * Static method: Find beneficiaries by type
 */
Beneficiary.findByType = function (tenantId, policyId, beneficiaryType = 'primary', employeeId = null) {
    const where = {
        tenantId,
        policyId,
        beneficiaryType,
        status: 'active'
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where, order: [['priority', 'ASC']] });
};

/**
 * Static method: Find minor beneficiaries
 */
Beneficiary.findMinors = function (tenantId, policyId = null, employeeId = null) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 18);
    
    const where = {
        tenantId,
        status: 'active',
        dateOfBirth: { [Op.gt]: cutoffDate }
    };
    
    if (policyId) {
        where.policyId = policyId;
    }
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Get beneficiary statistics
 */
Beneficiary.getStatisticsByTenant = async function (tenantId, employeeId = null) {
    const where = { tenantId };
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    const beneficiaries = await this.findAll({ where });
    
    const stats = beneficiaries.reduce((acc, beneficiary) => {
        const key = `${beneficiary.beneficiaryType}-${beneficiary.relationship}`;
        if (!acc[key]) {
            acc[key] = {
                beneficiaryType: beneficiary.beneficiaryType,
                relationship: beneficiary.relationship,
                count: 0,
                totalBenefitAmount: 0,
                totalPercentage: 0
            };
        }
        acc[key].count += 1;
        acc[key].totalBenefitAmount += parseFloat(beneficiary.benefitAmount || 0);
        acc[key].totalPercentage += parseFloat(beneficiary.benefitPercentage || 0);
        return acc;
    }, {});
    
    return Object.values(stats).map(data => ({
        _id: { beneficiaryType: data.beneficiaryType, relationship: data.relationship },
        count: data.count,
        totalBenefitAmount: data.totalBenefitAmount,
        averagePercentage: data.totalPercentage / data.count
    }));
};

export default Beneficiary;
