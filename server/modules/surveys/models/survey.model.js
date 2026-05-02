/**
 * Survey Model - PostgreSQL (Sequelize)
 * 
 * This model represents the surveys table in the Main Application Database (hrsm_platform).
 * It manages employee surveys with questions, responses, and analytics.
 * 
 * @module models/Survey
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const Survey = mainAppDb.define('Survey', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the survey (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Survey Information
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Survey title'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Survey description'
  },

  // Survey Type
  surveyType: {
    type: DataTypes.ENUM('satisfaction', 'training', 'performance', 'policy', '360-feedback', 'exit-interview', 'custom'),
    allowNull: false,
    defaultValue: 'custom',
    field: 'survey_type',
    comment: 'Type of survey'
  },

  // Questions - stored as JSONB array
  questions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of survey questions with configuration (JSONB)'
  },

  // Settings - stored as JSONB
  settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      isMandatory: false,
      allowAnonymous: false,
      allowMultipleSubmissions: false,
      startDate: null,
      endDate: null,
      emailNotifications: {
        enabled: true,
        sendOnAssignment: true,
        sendReminders: true,
        reminderFrequency: 3
      }
    },
    comment: 'Survey settings and configuration (JSONB)'
  },

  // Assignment - stored as JSONB
  assignedTo: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      allEmployees: false,
      departments: [],
      roles: [],
      specificEmployees: []
    },
    field: 'assigned_to',
    comment: 'Target assignment configuration (JSONB)'
  },

  // Responses - stored as JSONB array
  responses: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of survey responses (JSONB)'
  },

  // Statistics - stored as JSONB
  stats: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      totalAssigned: 0,
      totalResponses: 0,
      completionRate: 0,
      lastResponseAt: null
    },
    comment: 'Survey statistics and metrics (JSONB)'
  },

  // Status
  status: {
    type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Survey status'
  },

  // Metadata
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_id',
    comment: 'User who created the survey'
  },
  lastModifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'last_modified_by_id',
    comment: 'User who last modified the survey'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'published_at',
    comment: 'Publication timestamp'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at',
    comment: 'Closure timestamp'
  }
}, {
  tableName: 'surveys',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_surveys_tenant_id_status_end_date',
      fields: ['tenant_id', 'status', { name: 'settings', using: 'gin', opclass: 'jsonb_path_ops' }]
    },
    {
      name: 'idx_surveys_tenant_id_created_by_id',
      fields: ['tenant_id', 'created_by_id']
    },
    {
      name: 'idx_surveys_tenant_id_survey_type',
      fields: ['tenant_id', 'survey_type']
    }
  ],

  // Named scopes
  scopes: {
    active: {
      where: { status: 'active' }
    },
    draft: {
      where: { status: 'draft' }
    },
    byType: (type) => {
      return {
        where: { surveyType: type }
      };
    }
  }
});

// Instance Methods
Survey.prototype.hasUserResponded = function(userId) {
  return this.responses.some(r => r.respondent === userId);
};

Survey.prototype.getUserResponse = function(userId) {
  return this.responses.find(r => r.respondent === userId);
};

Survey.prototype.calculateCompletionRate = function() {
  if (this.stats.totalAssigned === 0) {
    this.stats.completionRate = 0;
    return 0;
  }
  
  this.stats.completionRate = (this.stats.totalResponses / this.stats.totalAssigned) * 100;
  return this.stats.completionRate;
};

// Static Methods
Survey.findActiveSurveysForUser = async function(tenantId, userId) {
  const now = new Date();
  
  return this.findAll({
    where: {
      tenantId,
      status: 'active'
    },
    order: [['createdAt', 'DESC']]
  });
};

export default Survey;




