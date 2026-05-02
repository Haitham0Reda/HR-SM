import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const TaskReport = mainAppDb.define('TaskReport', {
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
    taskId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'task_id',
        references: {
            model: 'tasks',
            key: 'id'
        }
    },
    reportText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'report_text'
    },
    timeSpent: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'time_spent',
        comment: 'Time spent in minutes',
        validate: {
            min: 0
        }
    },
    files: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of file metadata objects'
    },
    status: {
        type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
        defaultValue: 'draft',
        allowNull: false
    },
    reviewComments: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'review_comments'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at'
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'reviewed_at'
    },
    reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'reviewed_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'task_reports',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id']
        },
        {
            fields: ['task_id']
        },
        {
            fields: ['tenant_id', 'status']
        },
        {
            fields: ['submitted_at']
        }
    ]
});

// Define associations
TaskReport.associate = (models) => {
    TaskReport.belongsTo(models.Task, {
        foreignKey: 'taskId',
        as: 'task'
    });
    TaskReport.belongsTo(models.User, {
        foreignKey: 'reviewedBy',
        as: 'reviewer'
    });
};

export default TaskReport;



