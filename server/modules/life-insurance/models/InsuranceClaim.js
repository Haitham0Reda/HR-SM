/**
 * Insurance Claim Model (Sequelize)
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const InsuranceClaim = mainAppDb.define('InsuranceClaim', {
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
    claimNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'claim_number'
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
    claimantType: {
        type: DataTypes.ENUM('employee', 'family_member'),
        allowNull: false,
        field: 'claimant_type'
    },
    claimantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'claimant_id'
    },
    claimantModel: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'claimant_model'
    },
    claimType: {
        type: DataTypes.ENUM('death', 'disability', 'medical', 'accident', 'other'),
        allowNull: false,
        field: 'claim_type'
    },
    incidentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'incident_date'
    },
    claimAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
        field: 'claim_amount'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'),
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
    },
    reviewedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'reviewed_by'
    },
    reviewedAt: {
        type: DataTypes.DATE,
        field: 'reviewed_at'
    },
    reviewNotes: {
        type: DataTypes.TEXT,
        field: 'review_notes'
    },
    approvedAmount: {
        type: DataTypes.DECIMAL(15, 2),
        validate: { min: 0 },
        field: 'approved_amount'
    },
    paymentDate: {
        type: DataTypes.DATE,
        field: 'payment_date'
    },
    paymentMethod: {
        type: DataTypes.ENUM('bank_transfer', 'check', 'cash', 'other'),
        field: 'payment_method'
    },
    paymentReference: {
        type: DataTypes.STRING(100),
        field: 'payment_reference'
    },
    // Documents - stored as JSONB array
    documents: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Workflow history - stored as JSONB array
    workflow: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT
    },
    tags: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    submissionDeadline: {
        type: DataTypes.DATE,
        field: 'submission_deadline'
    },
    reviewDeadline: {
        type: DataTypes.DATE,
        field: 'review_deadline'
    },
    paymentDeadline: {
        type: DataTypes.DATE,
        field: 'payment_deadline'
    }
}, {
    tableName: 'insurance_claims',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee_id'] },
        { fields: ['policy_id'] },
        { fields: ['claim_number'], unique: true },
        { fields: ['claim_type'] },
        { fields: ['status'] },
        { fields: ['priority'] },
        { fields: ['incident_date'] },
        { fields: ['tenant_id', 'employee_id', 'status'] },
        { fields: ['tenant_id', 'policy_id', 'status'] },
        { fields: ['tenant_id', 'claim_type', 'status'] },
        { fields: ['tenant_id', 'status', 'priority'] }
    ],
    hooks: {
        beforeCreate: (claim) => {
            // Auto-generate claim number
            if (!claim.claimNumber) {
                const year = new Date().getFullYear();
                const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                claim.claimNumber = `CLM-${year}-${randomNum}`;
            }
            
            // Set claimant model based on type
            if (claim.claimantType === 'employee') {
                claim.claimantModel = 'User';
            } else if (claim.claimantType === 'family_member') {
                claim.claimantModel = 'FamilyMember';
            }
        },
        beforeSave: (claim) => {
            // Validate incident date
            if (claim.incidentDate > new Date()) {
                throw new Error('Incident date cannot be in the future');
            }
        }
    }
});

/**
 * Define associations
 */
InsuranceClaim.associate = (models) => {
    InsuranceClaim.belongsTo(models.InsurancePolicy, {
        foreignKey: 'policyId',
        as: 'policy'
    });
    InsuranceClaim.belongsTo(models.User, {
        foreignKey: 'employeeId',
        as: 'employee'
    });
    InsuranceClaim.belongsTo(models.User, {
        foreignKey: 'reviewedBy',
        as: 'reviewer'
    });
};

/**
 * Instance method: Check if claim is overdue
 */
InsuranceClaim.prototype.getIsOverdue = function () {
    const now = new Date();
    
    if (this.status === 'pending' && this.submissionDeadline && now > this.submissionDeadline) {
        return true;
    }
    
    if (this.status === 'under_review' && this.reviewDeadline && now > this.reviewDeadline) {
        return true;
    }
    
    if (this.status === 'approved' && this.paymentDeadline && now > this.paymentDeadline) {
        return true;
    }
    
    return false;
};

/**
 * Instance method: Get days since submission
 */
InsuranceClaim.prototype.getDaysSinceSubmission = function () {
    const diffTime = new Date() - this.createdAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Instance method: Get processing days
 */
InsuranceClaim.prototype.getProcessingDays = function () {
    if (!this.reviewedAt) return null;
    
    const diffTime = this.reviewedAt - this.createdAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Instance method: Add document
 */
InsuranceClaim.prototype.addDocument = async function (documentData) {
    const documents = [...(this.documents || [])];
    documents.push({
        ...documentData,
        uploadedAt: new Date()
    });
    this.documents = documents;
    return await this.save();
};

/**
 * Instance method: Update status with workflow tracking
 */
InsuranceClaim.prototype.updateStatus = async function (newStatus, performedBy, notes = '') {
    const previousStatus = this.status;
    this.status = newStatus;
    
    if (performedBy) {
        this.reviewedBy = performedBy;
    }
    
    // Add workflow entry
    const workflow = [...(this.workflow || [])];
    workflow.push({
        status: newStatus,
        performedBy,
        timestamp: new Date(),
        notes,
        previousStatus
    });
    this.workflow = workflow;
    
    // Set review timestamp if status changed to reviewed states
    if (['approved', 'rejected'].includes(newStatus) && !this.reviewedAt) {
        this.reviewedAt = new Date();
    }
    
    return await this.save();
};

/**
 * Instance method: Approve claim
 */
InsuranceClaim.prototype.approve = async function (approvedAmount, performedBy, notes = '') {
    const previousStatus = this.status;
    this.status = 'approved';
    this.approvedAmount = approvedAmount;
    this.reviewedBy = performedBy;
    this.reviewedAt = new Date();
    this.reviewNotes = notes;
    
    // Add workflow entry
    const workflow = [...(this.workflow || [])];
    workflow.push({
        status: 'approved',
        performedBy,
        timestamp: new Date(),
        notes: `Approved for amount: ${approvedAmount}. ${notes}`,
        previousStatus
    });
    this.workflow = workflow;
    
    return await this.save();
};

/**
 * Instance method: Reject claim
 */
InsuranceClaim.prototype.reject = async function (performedBy, reason) {
    const previousStatus = this.status;
    this.status = 'rejected';
    this.reviewedBy = performedBy;
    this.reviewedAt = new Date();
    this.reviewNotes = reason;
    
    // Add workflow entry
    const workflow = [...(this.workflow || [])];
    workflow.push({
        status: 'rejected',
        performedBy,
        timestamp: new Date(),
        notes: `Rejected: ${reason}`,
        previousStatus
    });
    this.workflow = workflow;
    
    return await this.save();
};

/**
 * Static method: Find claims by tenant
 */
InsuranceClaim.findByTenant = function (tenantId, filters = {}) {
    return this.findAll({ where: { tenantId, ...filters } });
};

/**
 * Static method: Find claims by status
 */
InsuranceClaim.findByStatus = function (tenantId, status, employeeId = null) {
    const where = { tenantId, status };
    if (employeeId) {
        where.employeeId = employeeId;
    }
    return this.findAll({ where, order: [['createdAt', 'DESC']] });
};

/**
 * Static method: Find overdue claims
 */
InsuranceClaim.findOverdueClaims = function (tenantId, employeeId = null) {
    const now = new Date();
    
    const where = {
        tenantId,
        [Op.or]: [
            {
                status: 'pending',
                submissionDeadline: { [Op.lt]: now }
            },
            {
                status: 'under_review',
                reviewDeadline: { [Op.lt]: now }
            },
            {
                status: 'approved',
                paymentDeadline: { [Op.lt]: now }
            }
        ]
    };
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    return this.findAll({ where });
};

/**
 * Static method: Get claims statistics
 */
InsuranceClaim.getStatistics = async function (tenantId, dateRange = null, employeeId = null) {
    const where = { tenantId };
    
    if (dateRange) {
        where.createdAt = {
            [Op.gte]: dateRange.startDate,
            [Op.lte]: dateRange.endDate
        };
    }
    
    if (employeeId) {
        where.employeeId = employeeId;
    }
    
    const claims = await this.findAll({ where });
    
    const stats = claims.reduce((acc, claim) => {
        const status = claim.status;
        if (!acc[status]) {
            acc[status] = {
                count: 0,
                totalAmount: 0,
                approvedAmount: 0
            };
        }
        acc[status].count += 1;
        acc[status].totalAmount += parseFloat(claim.claimAmount || 0);
        acc[status].approvedAmount += parseFloat(claim.approvedAmount || 0);
        return acc;
    }, {});
    
    return Object.entries(stats).map(([status, data]) => ({
        _id: status,
        ...data
    }));
};

export default InsuranceClaim;
