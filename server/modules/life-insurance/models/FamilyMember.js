/**
 * Family Member Model (Sequelize)
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const FamilyMember = mainAppDb.define('FamilyMember', {
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
    insuranceNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'insurance_number'
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
    policyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'insurance_policies',
            key: 'id'
        },
        field: 'policy_id'
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
        type: DataTypes.ENUM('spouse', 'child', 'parent'),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    email: {
        type: DataTypes.STRING(255)
    },
    // Address - stored as JSONB
    address: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    coverageStartDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'coverage_start_date'
    },
    coverageEndDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'coverage_end_date'
    },
    coverageAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
        field: 'coverage_amount'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'removed'),
        defaultValue: 'active'
    },
    notes: {
        type: DataTypes.TEXT
    },
    // Emergency contact - stored as JSONB
    emergencyContact: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'emergency_contact'
    }
}, {
    tableName: 'family_members',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee_id'] },
        { fields: ['policy_id'] },
        { fields: ['insurance_number'], unique: true },
        { fields: ['relationship'] },
        { fields: ['status'] },
        { fields: ['date_of_birth'] },
        { fields: ['tenant_id', 'employee_id'] },
        { fields: ['tenant_id', 'policy_id'] },
        { fields: ['tenant_id', 'relationship', 'status'] }
    ],
    hooks: {
        beforeCreate: async (familyMember) => {
            // Auto-generate insurance number
            if (!familyMember.insuranceNumber && familyMember.policyId) {
                const InsurancePolicy = mainAppDb.models.InsurancePolicy;
                const policy = await InsurancePolicy.findByPk(familyMember.policyId);
                
                if (!policy) {
                    throw new Error('Associated policy not found');
                }
                
                // Count existing family members for this policy
                const existingCount = await FamilyMember.count({
                    where: { policyId: familyMember.policyId }
                });
                
                familyMember.insuranceNumber = `${policy.policyNumber}-${existingCount + 1}`;
            }
        },
        beforeSave: (familyMember) => {
            // Validate coverage dates
            if (familyMember.coverageStartDate >= familyMember.coverageEndDate) {
                throw new Error('Coverage end date must be after start date');
            }
            
            // Validate age restrictions for children
            if (familyMember.relationship === 'child') {
                const age = familyMember.getAge();
                if (age !== null && age >= 25) {
                    throw new Error('Children must be under 25 years old for coverage');
                }
            }
        }
    }
});

/**
 * Define associations
 */
FamilyMember.associate = (models) => {
    FamilyMember.belongsTo(models.User, {
        foreignKey: 'employeeId',
        as: 'employee'
    });
    FamilyMember.belongsTo(models.InsurancePolicy, {
        foreignKey: 'policyId',
        as: 'policy'
    });
};

/**
 * Instance method: Get full name
 */
FamilyMember.prototype.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
};

/**
 * Instance method: Calculate age
 */
FamilyMember.prototype.getAge = function () {
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
 * Instance method: Check if coverage is active
 */
FamilyMember.prototype.getIsCoverageActive = function () {
    const now = new Date();
    return this.status === 'active' && 
           this.coverageStartDate <= now && 
           this.coverageEndDate >= now;
};

/**
 * Instance method: Update coverage
 */
FamilyMember.prototype.updateCoverage = async function (startDate, endDate, coverageAmount) {
    this.coverageStartDate = startDate;
    this.coverageEndDate = endDate;
    if (coverageAmount !== undefined) {
        this.coverageAmount = coverageAmount;
    }
    return await this.save();
};

/**
 * Static method: Find family members by tenant
 */
FamilyMember.findByTenant = function (tenantId, filters = {}) {
    return this.findAll({ where: { tenantId, ...filters } });
};

/**
 * Static method: Find family members by relationship
 */
FamilyMember.findByRelationship = function (tenantId, relationship, employeeId = null) {
    const where = {
        tenantId,
        relationship,
        status: 'active'
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Find children under age limit
 */
FamilyMember.findChildrenUnderAge = function (tenantId, maxAge = 25, employeeId = null) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAge);
    
    const where = {
        tenantId,
        relationship: 'child',
        status: 'active',
        dateOfBirth: { [Op.gte]: cutoffDate }
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Get family member statistics
 */
FamilyMember.getStatisticsByTenant = async function (tenantId, employeeId = null) {
    const where = { tenantId };
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    const members = await this.findAll({ where });
    
    const stats = members.reduce((acc, member) => {
        const key = `${member.relationship}-${member.status}`;
        if (!acc[key]) {
            acc[key] = {
                relationship: member.relationship,
                status: member.status,
                count: 0,
                totalCoverage: 0
            };
        }
        acc[key].count += 1;
        acc[key].totalCoverage += parseFloat(member.coverageAmount || 0);
        return acc;
    }, {});
    
    return Object.values(stats).map(data => ({
        _id: { relationship: data.relationship, status: data.status },
        count: data.count,
        totalCoverage: data.totalCoverage
    }));
};

export default FamilyMember;
