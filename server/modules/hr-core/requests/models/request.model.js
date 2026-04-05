/**
 * Request Model - PostgreSQL (Sequelize)
 * 
 * This model represents the requests table in the Main Application Database (hrsm_platform).
 * It provides a generic request system supporting multiple request types with approval workflows.
 * Supports multi-tenancy and flexible approval chains.
 * 
 * @module models/Request
 */

import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../users/models/user.model.js';

const Request = mainAppDb.define('Request', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the request (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Request type
  requestType: {
    type: DataTypes.ENUM('overtime', 'vacation', 'mission', 'forget-check', 'permission'),
    allowNull: false,
    field: 'request_type',
    comment: 'Type of request'
  },

  // Requested by user
  requestedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'requested_by_id',
    comment: 'User who made the request',
    references: {
      model: User,
      key: 'id'
    }
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current status of the request'
  },

  // Request-specific data (stored as JSONB for flexibility)
  requestData: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'request_data',
    comment: 'Request-specific data structure'
  },

  // Legacy fields for backward compatibility
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewer_id',
    comment: 'Legacy reviewer reference',
    references: {
      model: User,
      key: 'id'
    }
  },

  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at',
    comment: 'When the request was reviewed (legacy)'
  },

  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'General comments on the request'
  },

  // Modern approval chain structure (stored as JSONB)
  approvalChain: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'approval_chain',
    defaultValue: [],
    comment: 'Array of approval chain entries with approver, status, comments, timestamp'
  }
}, {
  tableName: 'requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: 'Generic request system with approval workflows',

  // Named scopes for common queries
  scopes: {
    pending: {
      where: { status: 'pending' }
    },
    approved: {
      where: { status: 'approved' }
    },
    rejected: {
      where: { status: 'rejected' }
    },
    cancelled: {
      where: { status: 'cancelled' }
    },
    byType: function(type) {
      return {
        where: { requestType: type }
      };
    }
  }
});

// Associations
Request.associate = function(models) {
  Request.belongsTo(User, { 
    foreignKey: 'requestedById', 
    as: 'requestedBy',
    onDelete: 'CASCADE'
  });
  Request.belongsTo(User, { 
    foreignKey: 'reviewerId', 
    as: 'reviewer',
    onDelete: 'SET NULL'
  });
};

export default Request;
