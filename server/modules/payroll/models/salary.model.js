/**
 * Salary Model
 * 
 * Manages employee salary information with history tracking and encryption
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import { encryptSalary, decryptSalary } from '../../../utils/encryption.js';

const Salary = mainAppDb.define('Salary', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id',
        comment: 'Tenant identifier for multi-tenancy'
    },
    employee: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    // Encrypted Salary Information
    baseSalaryEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'base_salary_encrypted'
    },
    // Encrypted Additional allowances stored as JSONB
    allowancesEncrypted: {
        type: DataTypes.JSONB,
        defaultValue: {
            housing: null,
            transportation: null,
            medical: null,
            food: null,
            other: null
        },
        field: 'allowances_encrypted'
    },
    // Encrypted Total gross salary (base + allowances)
    grossSalaryEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'gross_salary_encrypted'
    },
    // Currency
    currency: {
        type: DataTypes.ENUM('EGP', 'USD', 'EUR'),
        defaultValue: 'EGP',
        allowNull: false
    },
    // Effective date
    effectiveDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'effective_date'
    },
    // Status
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending'),
        defaultValue: 'active',
        allowNull: false
    },
    // Approval information
    approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at'
    },
    // Notes (not encrypted as they're not sensitive)
    notes: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    // Created by
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'salaries',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id']
        },
        {
            fields: ['tenant_id', 'employee', 'effective_date']
        },
        {
            fields: ['tenant_id', 'status']
        },
        {
            fields: ['tenant_id', 'created_at']
        }
    ],
    hooks: {
        beforeSave: async (salary, options) => {
            try {
                let baseSalary = 0;
                let totalAllowances = 0;
                
                // Handle direct salary data assignment (for new records)
                if (salary.get('baseSalary') !== undefined && !salary.baseSalaryEncrypted) {
                    baseSalary = salary.get('baseSalary') || 0;
                    salary.baseSalaryEncrypted = encryptSalary(baseSalary);
                    salary.unset('baseSalary');
                } else if (salary.baseSalaryEncrypted) {
                    baseSalary = decryptSalary(salary.baseSalaryEncrypted);
                }
                
                // Handle direct allowances assignment (for new records)
                if (salary.get('allowances') !== undefined) {
                    const allowances = salary.get('allowances') || {};
                    salary.allowancesEncrypted = {
                        housing: allowances.housing ? encryptSalary(allowances.housing) : null,
                        transportation: allowances.transportation ? encryptSalary(allowances.transportation) : null,
                        medical: allowances.medical ? encryptSalary(allowances.medical) : null,
                        food: allowances.food ? encryptSalary(allowances.food) : null,
                        other: allowances.other ? encryptSalary(allowances.other) : null
                    };
                    
                    totalAllowances = (allowances.housing || 0) + 
                                     (allowances.transportation || 0) + 
                                     (allowances.medical || 0) + 
                                     (allowances.food || 0) + 
                                     (allowances.other || 0);
                    
                    salary.unset('allowances');
                } else if (salary.allowancesEncrypted) {
                    const enc = salary.allowancesEncrypted;
                    totalAllowances = (enc.housing ? decryptSalary(enc.housing) : 0) +
                                     (enc.transportation ? decryptSalary(enc.transportation) : 0) +
                                     (enc.medical ? decryptSalary(enc.medical) : 0) +
                                     (enc.food ? decryptSalary(enc.food) : 0) +
                                     (enc.other ? decryptSalary(enc.other) : 0);
                }
                
                // Calculate and encrypt gross salary if not already encrypted
                if (!salary.grossSalaryEncrypted) {
                    const grossSalary = baseSalary + totalAllowances;
                    salary.grossSalaryEncrypted = encryptSalary(grossSalary);
                }
            } catch (error) {
                console.error('Error in salary pre-save hook:', error);
                throw error;
            }
        }
    }
});

// Instance methods for decrypted values
Salary.prototype.getBaseSalary = function() {
    try {
        return this.baseSalaryEncrypted ? decryptSalary(this.baseSalaryEncrypted) : 0;
    } catch (error) {
        console.error('Error decrypting base salary:', error);
        return 0;
    }
};

Salary.prototype.getAllowances = function() {
    try {
        const enc = this.allowancesEncrypted || {};
        return {
            housing: enc.housing ? decryptSalary(enc.housing) : 0,
            transportation: enc.transportation ? decryptSalary(enc.transportation) : 0,
            medical: enc.medical ? decryptSalary(enc.medical) : 0,
            food: enc.food ? decryptSalary(enc.food) : 0,
            other: enc.other ? decryptSalary(enc.other) : 0
        };
    } catch (error) {
        console.error('Error decrypting allowances:', error);
        return { housing: 0, transportation: 0, medical: 0, food: 0, other: 0 };
    }
};

Salary.prototype.getGrossSalary = function() {
    try {
        return this.grossSalaryEncrypted ? decryptSalary(this.grossSalaryEncrypted) : 0;
    } catch (error) {
        console.error('Error decrypting gross salary:', error);
        return 0;
    }
};

Salary.prototype.getTotalAllowances = function() {
    const allowances = this.getAllowances();
    return allowances.housing + allowances.transportation + allowances.medical + allowances.food + allowances.other;
};

// Static method to get current salary for employee
Salary.getCurrentSalary = async function(employeeId, tenantId) {
    return await this.findOne({
        where: {
            employee: employeeId,
            tenantId: tenantId,
            status: 'active'
        },
        order: [['effective_date', 'DESC']]
    });
};

// Static method to get salary history for employee
Salary.getSalaryHistory = async function(employeeId, tenantId) {
    return await this.findAll({
        where: {
            employee: employeeId,
            tenantId: tenantId
        },
        order: [['effective_date', 'DESC']]
    });
};

// Define associations
Salary.associate = (models) => {
    Salary.belongsTo(models.User, {
        foreignKey: 'employee',
        as: 'employeeUser'
    });
    Salary.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
    });
    Salary.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
    });
};

export default Salary;