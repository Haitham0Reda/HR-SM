/**
 * Insurance Policy Model (Sequelize)
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const InsurancePolicy = mainAppDb.define('InsurancePolicy', {
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
    policyNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'policy_number'
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
    employeeNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'employee_number'
    },
    policyType: {
        type: DataTypes.ENUM('CAT_A', 'CAT_B', 'CAT_C'),
        allowNull: false,
        field: 'policy_type'
    },
    coverageAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
        field: 'coverage_amount'
    },
    premium: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 }
    },
    deductible: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        validate: { min: 0 }
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'expired', 'cancelled'),
        defaultValue: 'active'
    },
    // Family members - stored as JSONB array of UUIDs
    familyMembers: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'family_members'
    },
    // Beneficiaries - stored as JSONB array of UUIDs
    beneficiaries: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Claims - stored as JSONB array of UUIDs
    claims: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // History - stored as JSONB array
    history: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT
    },
    tags: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'insurance_policies',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee_id'] },
        { fields: ['policy_number'], unique: true },
        { fields: ['policy_type'] },
        { fields: ['status'] },
        { fields: ['start_date'] },
        { fields: ['end_date'] },
        { fields: ['tenant_id', 'employee_id'] },
        { fields: ['tenant_id', 'policy_type', 'status'] },
        { fields: ['tenant_id', 'start_date', 'end_date'] },
        { fields: ['tenant_id', 'status', 'end_date'] }
    ],
    hooks: {
        beforeCreate: (policy) => {
            // Auto-generate policy number
            if (!policy.policyNumber) {
                const year = new Date().getFullYear();
                const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                policy.policyNumber = `INS-${year}-${randomNum}`;
            }
        },
        beforeSave: (policy) => {
            // Validate dates
            if (policy.startDate >= policy.endDate) {
                throw new Error('End date must be after start date');
            }
            
            // Update status based on dates
            const now = new Date();
            if (policy.status === 'active') {
                if (now > policy.endDate) {
                    policy.status = 'expired';
                } else if (now < policy.startDate) {
                    policy.status = 'inactive';
                }
            }
        }
    }
});

/**
 * Define associations
 */
InsurancePolicy.associate = (models) => {
    InsurancePolicy.belongsTo(models.User, {
        foreignKey: 'employeeId',
        as: 'employee'
    });
};

/**
 * Instance method: Check if policy is active
 */
InsurancePolicy.prototype.getIsActive = function () {
    const now = new Date();
    return this.status === 'active' && 
           this.startDate <= now && 
           this.endDate >= now;
};

/**
 * Instance method: Check if policy is expired
 */
InsurancePolicy.prototype.getIsExpired = function () {
    return new Date() > this.endDate;
};

/**
 * Instance method: Get days until expiry
 */
InsurancePolicy.prototype.getDaysUntilExpiry = function () {
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Instance method: Add family member
 */
InsurancePolicy.prototype.addFamilyMember = async function (familyMemberId) {
    const members = [...(this.familyMembers || [])];
    if (!members.includes(familyMemberId)) {
        members.push(familyMemberId);
        this.familyMembers = members;
    }
    return await this.save();
};

/**
 * Instance method: Remove family member
 */
InsurancePolicy.prototype.removeFamilyMember = async function (familyMemberId) {
    const members = [...(this.familyMembers || [])];
    this.familyMembers = members.filter(id => id !== familyMemberId);
    return await this.save();
};

/**
 * Instance method: Add beneficiary
 */
InsurancePolicy.prototype.addBeneficiary = async function (beneficiaryId) {
    const beneficiaries = [...(this.beneficiaries || [])];
    if (!beneficiaries.includes(beneficiaryId)) {
        beneficiaries.push(beneficiaryId);
        this.beneficiaries = beneficiaries;
    }
    return await this.save();
};

/**
 * Instance method: Add history entry
 */
InsurancePolicy.prototype.addHistoryEntry = async function (action, performedBy, notes = '', previousValues = null) {
    const history = [...(this.history || [])];
    history.push({
        action,
        performedBy,
        timestamp: new Date(),
        notes,
        previousValues
    });
    this.history = history;
    return await this.save();
};

/**
 * Static method: Find policies by tenant
 */
InsurancePolicy.findByTenant = function (tenantId, filters = {}) {
    return this.findAll({ where: { tenantId, ...filters } });
};

/**
 * Static method: Find active policies
 */
InsurancePolicy.findActivePolicies = function (tenantId, employeeId = null) {
    const where = {
        tenantId,
        status: 'active',
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Find expiring policies
 */
InsurancePolicy.findExpiringPolicies = function (tenantId, daysAhead = 30, employeeId = null) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    const where = {
        tenantId,
        status: 'active',
        endDate: {
            [Op.gte]: now,
            [Op.lte]: futureDate
        }
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Get policy statistics
 */
InsurancePolicy.getStatisticsByTenant = async function (tenantId, employeeId = null) {
    const where = { tenantId };
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    const policies = await this.findAll({ where });
    
    const stats = policies.reduce((acc, policy) => {
        const status = policy.status;
        if (!acc[status]) {
            acc[status] = {
                count: 0,
                totalCoverage: 0,
                totalPremium: 0
            };
        }
        acc[status].count += 1;
        acc[status].totalCoverage += parseFloat(policy.coverageAmount || 0);
        acc[status].totalPremium += parseFloat(policy.premium || 0);
        return acc;
    }, {});
    
    return Object.entries(stats).map(([status, data]) => ({
        _id: status,
        ...data
    }));
};

export default InsurancePolicy;
