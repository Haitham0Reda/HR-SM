import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Task = mainAppDb.define('Task', {
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
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false
    },
    assignee: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    assigner: {
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
    dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'due_date'
    },
    status: {
        type: DataTypes.ENUM('assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'),
        defaultValue: 'assigned',
        allowNull: false
    }
}, {
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id']
        },
        {
            fields: ['assignee', 'status']
        },
        {
            fields: ['assigner', 'status']
        },
        {
            fields: ['tenant_id', 'status']
        },
        {
            fields: ['due_date']
        }
    ]
});

// Define associations
Task.associate = (models) => {
    Task.belongsTo(models.User, {
        foreignKey: 'assignee',
        as: 'assignedUser'
    });
    Task.belongsTo(models.User, {
        foreignKey: 'assigner',
        as: 'assigningUser'
    });
};

export default Task;