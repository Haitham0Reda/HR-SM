/**
 * SickLeave Model (Sequelize)
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const SickLeave = mainAppDb.define('SickLeave', {
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
    employee: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
        validate: {
            isAfterStart(value) {
                if (value && value < this.startDate) {
                    throw new Error('End date must be after or equal to start date');
                }
            }
        }
    },
    duration: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING(500)
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending'
    },
    // Medical Documentation - stored as JSONB
    medicalDocumentation: {
        type: DataTypes.JSONB,
        defaultValue: {
            required: false,
            provided: false,
            documents: [],
            reviewedByDoctor: false,
            doctorReviewedBy: null,
            doctorReviewedAt: null,
            doctorNotes: null,
            additionalDocRequested: false,
            requestNotes: null
        },
        field: 'medical_documentation'
    },
    // Workflow - stored as JSONB
    workflow: {
        type: DataTypes.JSONB,
        defaultValue: {
            supervisorApprovalStatus: 'pending',
            doctorApprovalStatus: 'pending',
            currentStep: 'supervisor-review'
        }
    },
    approvedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'approved_by'
    },
    approvedAt: {
        type: DataTypes.DATE,
        field: 'approved_at'
    },
    rejectedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'rejected_by'
    },
    rejectedAt: {
        type: DataTypes.DATE,
        field: 'rejected_at'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        field: 'rejection_reason'
    },
    cancelledBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'cancelled_by'
    },
    cancelledAt: {
        type: DataTypes.DATE,
        field: 'cancelled_at'
    },
    cancellationReason: {
        type: DataTypes.TEXT,
        field: 'cancellation_reason'
    },
    approverNotes: {
        type: DataTypes.TEXT,
        field: 'approver_notes'
    },
    vacationBalance: {
        type: DataTypes.UUID,
        references: {
            model: 'vacation_balances',
            key: 'id'
        },
        field: 'vacation_balance'
    },
    department: {
        type: DataTypes.UUID,
        references: {
            model: 'departments',
            key: 'id'
        }
    },
    position: {
        type: DataTypes.UUID,
        references: {
            model: 'positions',
            key: 'id'
        }
    },
    // Notifications - stored as JSONB
    notifications: {
        type: DataTypes.JSONB,
        defaultValue: {
            submitted: { sent: false, sentAt: null },
            supervisorApproved: { sent: false, sentAt: null },
            doctorApproved: { sent: false, sentAt: null },
            rejected: { sent: false, sentAt: null }
        }
    }
}, {
    tableName: 'sick_leaves',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee'] },
        { fields: ['status'] },
        { fields: ['department'] },
        { fields: ['tenant_id', 'employee', 'status'] },
        { fields: ['tenant_id', 'department', 'status'] },
        { fields: ['tenant_id', 'start_date', 'end_date'] }
    ],
    hooks: {
        beforeSave: async (sickLeave) => {
            // Set medical documentation requirement based on duration
            if (sickLeave.changed('duration') || sickLeave.isNewRecord) {
                const medDoc = { ...sickLeave.medicalDocumentation };
                medDoc.required = sickLeave.duration > 3;
                sickLeave.medicalDocumentation = medDoc;
            }
        }
    }
});

/**
 * Define associations
 */
SickLeave.associate = (models) => {
    SickLeave.belongsTo(models.User, {
        foreignKey: 'employee',
        as: 'employeeDetails'
    });
    SickLeave.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
    });
    SickLeave.belongsTo(models.User, {
        foreignKey: 'rejectedBy',
        as: 'rejecter'
    });
    SickLeave.belongsTo(models.User, {
        foreignKey: 'cancelledBy',
        as: 'canceller'
    });
    SickLeave.belongsTo(models.Department, {
        foreignKey: 'department',
        as: 'departmentDetails'
    });
    SickLeave.belongsTo(models.Position, {
        foreignKey: 'position',
        as: 'positionDetails'
    });
    SickLeave.belongsTo(models.VacationBalance, {
        foreignKey: 'vacationBalance',
        as: 'balance'
    });
};

/**
 * Instance method: Check if sick leave is active
 */
SickLeave.prototype.getIsActive = function () {
    const now = new Date();
    return this.status === 'approved' &&
        this.startDate <= now &&
        this.endDate >= now;
};

/**
 * Instance method: Approve by supervisor
 */
SickLeave.prototype.approveBySupervisor = async function (supervisorId, notes) {
    const workflow = { ...this.workflow };
    workflow.supervisorApprovalStatus = 'approved';

    // If medical documentation is required and not reviewed by doctor yet, move to doctor review
    if (this.medicalDocumentation?.required && !this.medicalDocumentation?.reviewedByDoctor) {
        workflow.currentStep = 'doctor-review';
        workflow.doctorApprovalStatus = 'pending';
    } else {
        // If no doctor review needed, complete the approval
        workflow.currentStep = 'completed';
        workflow.doctorApprovalStatus = 'not-required';
        this.status = 'approved';
        this.approvedBy = supervisorId;
        this.approvedAt = new Date();
    }

    this.workflow = workflow;
    if (notes && typeof notes === 'string') this.approverNotes = notes.trim();
    return await this.save();
};

/**
 * Instance method: Approve by doctor
 */
SickLeave.prototype.approveByDoctor = async function (doctorId, notes) {
    // Validate that supervisor has already approved
    if (this.workflow?.supervisorApprovalStatus !== 'approved') {
        throw new Error('Supervisor must approve before doctor can approve');
    }

    const workflow = { ...this.workflow };
    workflow.doctorApprovalStatus = 'approved';
    workflow.currentStep = 'completed';
    this.workflow = workflow;

    this.status = 'approved';
    this.approvedBy = doctorId;
    this.approvedAt = new Date();

    const medDoc = { ...this.medicalDocumentation };
    medDoc.reviewedByDoctor = true;
    medDoc.doctorReviewedBy = doctorId;
    medDoc.doctorReviewedAt = new Date();
    if (notes && typeof notes === 'string') {
        medDoc.doctorNotes = notes.trim();
    }
    this.medicalDocumentation = medDoc;

    return await this.save();
};

/**
 * Instance method: Reject by supervisor
 */
SickLeave.prototype.rejectBySupervisor = async function (supervisorId, reason) {
    const workflow = { ...this.workflow };
    workflow.supervisorApprovalStatus = 'rejected';
    workflow.currentStep = 'rejected';
    this.workflow = workflow;

    this.status = 'rejected';
    this.rejectedBy = supervisorId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';
    return await this.save({ validate: false });
};

/**
 * Instance method: Reject by doctor
 */
SickLeave.prototype.rejectByDoctor = async function (doctorId, reason) {
    // Validate that supervisor has already approved
    if (this.workflow?.supervisorApprovalStatus !== 'approved') {
        throw new Error('Supervisor must approve before doctor can reject');
    }

    const workflow = { ...this.workflow };
    workflow.doctorApprovalStatus = 'rejected';
    workflow.currentStep = 'rejected';
    this.workflow = workflow;

    this.status = 'rejected';
    this.rejectedBy = doctorId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason && typeof reason === 'string' ? reason.trim() : '';

    const medDoc = { ...this.medicalDocumentation };
    medDoc.reviewedByDoctor = true;
    medDoc.doctorReviewedBy = doctorId;
    medDoc.doctorReviewedAt = new Date();
    this.medicalDocumentation = medDoc;

    return await this.save({ validate: false });
};

/**
 * Instance method: Request additional documentation
 */
SickLeave.prototype.requestAdditionalDocs = async function (doctorId, requestNotes) {
    const medDoc = { ...this.medicalDocumentation };
    medDoc.additionalDocRequested = true;
    medDoc.requestNotes = requestNotes && typeof requestNotes === 'string' ? requestNotes.trim() : '';
    medDoc.doctorReviewedBy = doctorId;
    medDoc.doctorReviewedAt = new Date();
    this.medicalDocumentation = medDoc;

    return await this.save();
};

/**
 * Instance method: Cancel sick leave
 */
SickLeave.prototype.cancel = async function (userId, reason) {
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = new Date();
    this.cancellationReason = reason && typeof reason === 'string' ? reason.trim() : '';
    return await this.save();
};

/**
 * Static method: Get employee sick leaves with full details
 */
SickLeave.getSickLeavesByEmployee = function (employeeId, filters = {}) {
    return this.findAll({
        where: { employee: employeeId, ...filters },
        include: [
            {
                model: mainAppDb.models.User,
                as: 'employeeDetails',
                attributes: ['profile', 'employeeId', 'email'],
                include: [
                    {
                        model: mainAppDb.models.Department,
                        as: 'departmentDetails',
                        attributes: ['name', 'code', 'manager']
                    },
                    {
                        model: mainAppDb.models.Position,
                        as: 'positionDetails',
                        attributes: ['title', 'code']
                    }
                ]
            },
            {
                model: mainAppDb.models.User,
                as: 'approver',
                attributes: ['username', 'employeeId', 'personalInfo']
            },
            {
                model: mainAppDb.models.User,
                as: 'rejecter',
                attributes: ['username', 'employeeId', 'personalInfo']
            },
            {
                model: mainAppDb.models.User,
                as: 'canceller',
                attributes: ['username', 'employeeId', 'personalInfo']
            },
            {
                model: mainAppDb.models.Department,
                as: 'departmentDetails',
                attributes: ['name', 'code']
            },
            {
                model: mainAppDb.models.Position,
                as: 'positionDetails',
                attributes: ['title']
            },
            {
                model: mainAppDb.models.VacationBalance,
                as: 'balance'
            }
        ],
        order: [['startDate', 'DESC']]
    });
};

/**
 * Static method: Get sick leaves pending supervisor review
 */
SickLeave.getPendingSupervisorReview = function (departmentId = null) {
    const where = {
        'workflow.currentStep': 'supervisor-review',
        'workflow.supervisorApprovalStatus': 'pending'
    };

    if (departmentId) {
        where.department = departmentId;
    }

    return this.findAll({
        where,
        include: [
            {
                model: mainAppDb.models.User,
                as: 'employeeDetails',
                attributes: ['profile', 'department', 'position', 'employeeId', 'email'],
                include: [
                    {
                        model: mainAppDb.models.Department,
                        as: 'departmentDetails',
                        attributes: ['name', 'code', 'manager']
                    },
                    {
                        model: mainAppDb.models.Position,
                        as: 'positionDetails',
                        attributes: ['title', 'code']
                    }
                ]
            },
            {
                model: mainAppDb.models.Department,
                as: 'departmentDetails',
                attributes: ['name', 'code']
            }
        ],
        order: [['createdAt', 'ASC']]
    });
};

/**
 * Static method: Get sick leaves pending doctor review
 */
SickLeave.getPendingDoctorReview = function (departmentId = null) {
    const where = {
        'workflow.currentStep': 'doctor-review',
        'workflow.doctorApprovalStatus': 'pending'
    };

    if (departmentId) {
        where.department = departmentId;
    }

    return this.findAll({
        where,
        include: [
            {
                model: mainAppDb.models.User,
                as: 'employeeDetails',
                attributes: ['profile', 'department', 'position', 'employeeId', 'email'],
                include: [
                    {
                        model: mainAppDb.models.Department,
                        as: 'departmentDetails',
                        attributes: ['name', 'code', 'manager']
                    },
                    {
                        model: mainAppDb.models.Position,
                        as: 'positionDetails',
                        attributes: ['title', 'code']
                    }
                ]
            },
            {
                model: mainAppDb.models.Department,
                as: 'departmentDetails',
                attributes: ['name', 'code']
            }
        ],
        order: [['createdAt', 'ASC']]
    });
};

/**
 * Static method: Get sick leaves by department
 */
SickLeave.getSickLeavesByDepartment = function (departmentId, filters = {}) {
    return this.findAll({
        where: { department: departmentId, ...filters },
        include: [
            {
                model: mainAppDb.models.User,
                as: 'employeeDetails',
                attributes: ['profile', 'position', 'employeeId', 'email'],
                include: [{
                    model: mainAppDb.models.Position,
                    as: 'positionDetails',
                    attributes: ['title', 'code']
                }]
            },
            {
                model: mainAppDb.models.User,
                as: 'approver',
                attributes: ['username', 'employeeId', 'personalInfo']
            },
            {
                model: mainAppDb.models.User,
                as: 'rejecter',
                attributes: ['username', 'employeeId', 'personalInfo']
            },
            {
                model: mainAppDb.models.User,
                as: 'canceller',
                attributes: ['username', 'employeeId', 'personalInfo']
            }
        ],
        order: [['startDate', 'DESC']]
    });
};

/**
 * Static method: Check for overlapping sick leaves
 */
SickLeave.hasOverlappingSickLeave = async function (employeeId, startDate, endDate, excludeSickLeaveId = null) {
    const where = {
        employee: employeeId,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
            {
                startDate: { [Op.lte]: endDate },
                endDate: { [Op.gte]: startDate }
            }
        ]
    };

    if (excludeSickLeaveId) {
        where.id = { [Op.ne]: excludeSickLeaveId };
    }

    const overlapping = await this.findOne({ where });
    return !!overlapping;
};

/**
 * Static method: Tenant-aware queries
 */
SickLeave.withTenant = function (tenantId) {
    return this.findAll({ where: { tenantId } });
};

export default SickLeave;







