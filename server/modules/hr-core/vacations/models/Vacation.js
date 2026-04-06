/**
 * Vacation Model (Sequelize) - Moved to HR-Core module
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Vacation = mainAppDb.define('Vacation', {
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
    department: {
        type: DataTypes.UUID,
        references: {
            model: 'departments',
            key: 'id'
        }
    },
    vacationType: {
        type: DataTypes.ENUM('annual', 'sick', 'casual', 'unpaid', 'other'),
        allowNull: false,
        field: 'vacation_type'
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
    days: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending'
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
    rejectionReason: {
        type: DataTypes.TEXT,
        field: 'rejection_reason'
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'vacations',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['employee'] },
        { fields: ['status'] },
        { fields: ['tenant_id', 'employee', 'status'] },
        { fields: ['tenant_id', 'start_date', 'end_date'] }
    ]
});

/**
 * Define associations
 */
Vacation.associate = (models) => {
    Vacation.belongsTo(models.User, {
        foreignKey: 'employee',
        as: 'employeeDetails'
    });
    Vacation.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
    });
    Vacation.belongsTo(models.Department, {
        foreignKey: 'department',
        as: 'departmentDetails'
    });
};

export default Vacation;
