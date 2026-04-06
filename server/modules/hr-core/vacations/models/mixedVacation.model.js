/**
 * Mixed Vacation Model (Sequelize)
 * 
 * Manages vacation policies that combine official holidays with personal leave days
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const MixedVacation = mainAppDb.define('MixedVacation', {
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
    // Policy Information
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    // Date Range
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
    // Total Days
    totalDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
        field: 'total_days'
    },
    // Official Holidays - stored as JSONB array
    officialHolidays: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'official_holidays'
    },
    officialHolidayCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'official_holiday_count'
    },
    // Personal Days Required
    personalDaysRequired: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0 },
        field: 'personal_days_required'
    },
    // Deduction Strategy
    deductionStrategy: {
        type: DataTypes.ENUM('annual-first', 'casual-first', 'proportional', 'auto'),
        defaultValue: 'auto',
        field: 'deduction_strategy'
    },
    // Applicable To - stored as JSONB
    applicableTo: {
        type: DataTypes.JSONB,
        defaultValue: {
            departments: [],
            allEmployees: false
        },
        field: 'applicable_to'
    },
    // Employee Applications - stored as JSONB array
    applications: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Policy Status
    status: {
        type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
        defaultValue: 'draft'
    },
    // Auto-apply - stored as JSONB
    autoApply: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: false,
            appliedAt: null,
            appliedBy: null,
            appliedCount: 0
        },
        field: 'auto_apply'
    },
    // Statistics - stored as JSONB
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            totalApplicants: 0,
            approvedCount: 0,
            rejectedCount: 0,
            totalAnnualDeducted: 0,
            totalCasualDeducted: 0
        }
    },
    // Metadata
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'created_by'
    },
    lastModifiedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'last_modified_by'
    }
}, {
    tableName: 'mixed_vacations',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['tenant_id', 'start_date', 'end_date'] },
        { fields: ['tenant_id', 'status'] },
        { fields: ['start_date', 'end_date'] },
        { fields: ['status'] }
    ]
});

/**
 * Define associations
 */
MixedVacation.associate = (models) => {
    MixedVacation.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
    });
    MixedVacation.belongsTo(models.User, {
        foreignKey: 'lastModifiedBy',
        as: 'lastModifier'
    });
};

/**
 * Instance method: Get duration in days
 */
MixedVacation.prototype.getDurationDays = function () {
    const diffTime = this.endDate - this.startDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Instance method: Calculate personal days required
 */
MixedVacation.prototype.calculatePersonalDays = function () {
    this.personalDaysRequired = this.totalDays - this.officialHolidayCount;
    return this.personalDaysRequired;
};

/**
 * Instance method: Detect official holidays in date range
 */
MixedVacation.prototype.detectOfficialHolidays = async function (locationId) {
    const Holiday = mainAppDb.models.Holiday;

    const holidaySettings = await Holiday.getOrCreateForTenant(locationId);

    const holidays = (holidaySettings.officialHolidays || []).filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate >= this.startDate && holidayDate <= this.endDate;
    });

    this.officialHolidays = holidays.map(h => ({
        date: h.date,
        name: h.name,
        dayOfWeek: h.dayOfWeek
    }));

    this.officialHolidayCount = holidays.length;
    this.calculatePersonalDays();

    return this;
};

/**
 * Instance method: Calculate deduction for employee
 */
MixedVacation.prototype.calculateDeduction = async function (employeeId) {
    const VacationBalance = mainAppDb.models.VacationBalance;

    const balance = await VacationBalance.findOne({ 
        where: { 
            employee: employeeId,
            tenantId: this.tenantId
        } 
    });

    if (!balance) {
        throw new Error('Employee vacation balance not found');
    }

    const personalDays = this.personalDaysRequired;
    let annualDeduct = 0;
    let casualDeduct = 0;

    switch (this.deductionStrategy) {
        case 'annual-first':
        case 'auto':
            // Try to deduct from annual first
            annualDeduct = Math.min(personalDays, balance.annual?.available || 0);
            casualDeduct = personalDays - annualDeduct;
            break;

        case 'casual-first':
            // Try to deduct from casual first
            casualDeduct = Math.min(personalDays, balance.casual?.available || 0);
            annualDeduct = personalDays - casualDeduct;
            break;

        case 'proportional':
            // Distribute proportionally
            const totalAvailable = (balance.annual?.available || 0) + (balance.casual?.available || 0);
            if (totalAvailable >= personalDays) {
                const annualRatio = (balance.annual?.available || 0) / totalAvailable;
                annualDeduct = Math.floor(personalDays * annualRatio);
                casualDeduct = personalDays - annualDeduct;
            } else {
                annualDeduct = balance.annual?.available || 0;
                casualDeduct = balance.casual?.available || 0;
            }
            break;
    }

    // Check if sufficient balance
    const totalDeduct = annualDeduct + casualDeduct;
    const totalAvailable = (balance.annual?.available || 0) + (balance.casual?.available || 0);

    if (totalDeduct > totalAvailable) {
        throw new Error(`Insufficient leave balance. Required: ${personalDays} days, Available: ${totalAvailable} days`);
    }

    return {
        annualDays: annualDeduct,
        casualDays: casualDeduct,
        totalDeducted: totalDeduct,
        balanceBefore: {
            annual: balance.annual?.available || 0,
            casual: balance.casual?.available || 0
        },
        balanceAfter: {
            annual: (balance.annual?.available || 0) - annualDeduct,
            casual: (balance.casual?.available || 0) - casualDeduct
        },
        sufficient: totalDeduct <= totalAvailable
    };
};

/**
 * Instance method: Test policy on employee
 */
MixedVacation.prototype.testOnEmployee = async function (employeeId) {
    try {
        const deduction = await this.calculateDeduction(employeeId);

        return {
            success: true,
            employee: employeeId,
            policy: {
                name: this.name,
                totalDays: this.totalDays,
                officialHolidays: this.officialHolidayCount,
                personalDaysRequired: this.personalDaysRequired
            },
            deduction,
            canApply: deduction.sufficient
        };
    } catch (error) {
        return {
            success: false,
            employee: employeeId,
            error: error.message
        };
    }
};

/**
 * Instance method: Apply to employee
 */
MixedVacation.prototype.applyToEmployee = async function (employeeId, approvedBy = null) {
    const VacationBalance = mainAppDb.models.VacationBalance;

    // Check if already applied
    const applications = this.applications || [];
    const existing = applications.find(
        app => app.employee === employeeId
    );

    if (existing) {
        throw new Error('Policy already applied to this employee');
    }

    // Calculate deduction
    const deduction = await this.calculateDeduction(employeeId);

    if (!deduction.sufficient) {
        throw new Error('Insufficient leave balance');
    }

    // Deduct from balance
    const balance = await VacationBalance.findOne({ 
        where: { 
            employee: employeeId,
            tenantId: this.tenantId
        } 
    });

    const annual = { ...balance.annual };
    annual.used = (annual.used || 0) + deduction.annualDays;
    if ((annual.pending || 0) >= deduction.annualDays) {
        annual.pending = (annual.pending || 0) - deduction.annualDays;
    }
    balance.annual = annual;

    const casual = { ...balance.casual };
    casual.used = (casual.used || 0) + deduction.casualDays;
    if ((casual.pending || 0) >= deduction.casualDays) {
        casual.pending = (casual.pending || 0) - deduction.casualDays;
    }
    balance.casual = casual;

    await balance.save();

    // Add application
    const newApplications = [...applications];
    newApplications.push({
        employee: employeeId,
        appliedAt: new Date(),
        status: approvedBy ? 'approved' : 'applied',
        deduction: {
            annualDays: deduction.annualDays,
            casualDays: deduction.casualDays,
            totalDeducted: deduction.totalDeducted
        },
        balanceBefore: deduction.balanceBefore,
        balanceAfter: deduction.balanceAfter,
        approvedBy,
        approvedAt: approvedBy ? new Date() : null
    });
    this.applications = newApplications;

    // Update statistics
    const stats = { ...this.stats };
    stats.totalApplicants = (stats.totalApplicants || 0) + 1;
    if (approvedBy) {
        stats.approvedCount = (stats.approvedCount || 0) + 1;
    }
    stats.totalAnnualDeducted = (stats.totalAnnualDeducted || 0) + deduction.annualDays;
    stats.totalCasualDeducted = (stats.totalCasualDeducted || 0) + deduction.casualDays;
    this.stats = stats;

    await this.save();

    return this;
};

/**
 * Instance method: Apply to all eligible employees
 */
MixedVacation.prototype.applyToAll = async function (approvedBy) {
    const User = mainAppDb.models.User;

    let where = { 
        isActive: true,
        tenantId: this.tenantId
    };

    // Filter by location/department if specified
    if (!this.applicableTo?.allEmployees) {
        const filters = [];

        if (this.applicableTo?.departments?.length > 0) {
            filters.push({ department: { [Op.in]: this.applicableTo.departments } });
        }

        if (filters.length > 0) {
            where[Op.or] = filters;
        }
    }

    const employees = await User.findAll({
        where,
        attributes: ['id']
    });

    const results = {
        total: employees.length,
        success: 0,
        failed: 0,
        errors: []
    };

    for (const employee of employees) {
        try {
            await this.applyToEmployee(employee.id, approvedBy);
            results.success += 1;
        } catch (error) {
            results.failed += 1;
            results.errors.push({
                employee: employee.id,
                error: error.message
            });
        }
    }

    // Update auto-apply info
    const autoApply = { ...this.autoApply };
    autoApply.appliedAt = new Date();
    autoApply.appliedBy = approvedBy;
    autoApply.appliedCount = results.success;
    this.autoApply = autoApply;

    await this.save();

    return results;
};

/**
 * Static method: Find active policies
 */
MixedVacation.findActivePolicies = async function (tenantId) {
    const now = new Date();

    return await this.findAll({
        where: {
            tenantId,
            status: 'active',
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
        },
        include: [{
            model: mainAppDb.models.User,
            as: 'creator',
            attributes: ['username', 'email']
        }]
    });
};

/**
 * Static method: Find upcoming policies
 */
MixedVacation.findUpcomingPolicies = async function (tenantId, days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await this.findAll({
        where: {
            tenantId,
            status: 'active',
            startDate: { 
                [Op.gte]: now, 
                [Op.lte]: future 
            }
        },
        include: [{
            model: mainAppDb.models.User,
            as: 'creator',
            attributes: ['username', 'email']
        }]
    });
};

export default MixedVacation;
