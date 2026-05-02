/**
 * Request Model - PostgreSQL (Sequelize)
 * 
 * Generic request management system for various HR request types.
 * Supports approval chains and multi-level approval workflows.
 * 
 * @module models/Request
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

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

  // Request Type
  requestType: {
    type: DataTypes.ENUM('overtime', 'vacation', 'mission', 'forget-check', 'permission', 'sick-leave', 'day-swap'),
    allowNull: false,
    field: 'request_type',
    comment: 'Type of request'
  },

  // Requested By
  requestedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'requested_by_id',
    comment: 'User who made the request'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Request status'
  },

  // Request Data - stored as JSONB
  requestData: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'request_data',
    comment: 'Request-specific data'
  },

  // Approval Chain - stored as JSONB
  approvalChain: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'approval_chain',
    comment: 'Approval chain with approvers and their decisions'
  },

  // Final Reviewer (for backward compatibility)
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewer_id',
    comment: 'Final reviewer'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at',
    comment: 'Review timestamp'
  },

  // Comments
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comments or notes'
  }
}, {
  tableName: 'requests',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_requests_tenant_id_requested_by_id',
      fields: ['tenant_id', 'requested_by_id']
    },
    {
      name: 'idx_requests_tenant_id_status',
      fields: ['tenant_id', 'status']
    },
    {
      name: 'idx_requests_tenant_id_requested_by_id_status',
      fields: ['tenant_id', 'requested_by_id', 'status']
    },
    {
      name: 'idx_requests_tenant_id_request_type_status',
      fields: ['tenant_id', 'request_type', 'status']
    },
    {
      name: 'idx_requests_tenant_id_created_at',
      fields: ['tenant_id', 'created_at']
    }
  ]
});

// Instance Methods
Request.prototype.approve = async function(approverId, comments = '') {
  // Validate status transition
  if (this.status !== 'pending') {
    throw new Error(`Cannot approve request with status: ${this.status}`);
  }

  this.status = 'approved';
  this.reviewerId = approverId;
  this.reviewedAt = new Date();
  this.comments = comments;

  // Add to approval chain
  const approvalChain = [...this.approvalChain];
  approvalChain.push({
    approver: approverId,
    status: 'approved',
    comments,
    timestamp: new Date()
  });
  this.approvalChain = approvalChain;

  return await this.save();
};

Request.prototype.reject = async function(approverId, comments = '') {
  // Validate status transition
  if (this.status !== 'pending') {
    throw new Error(`Cannot reject request with status: ${this.status}`);
  }

  this.status = 'rejected';
  this.reviewerId = approverId;
  this.reviewedAt = new Date();
  this.comments = comments;

  // Add to approval chain
  const approvalChain = [...this.approvalChain];
  approvalChain.push({
    approver: approverId,
    status: 'rejected',
    comments,
    timestamp: new Date()
  });
  this.approvalChain = approvalChain;

  return await this.save();
};

Request.prototype.cancel = async function(userId, comments = '') {
  // Validate status transition
  if (this.status !== 'pending') {
    throw new Error(`Cannot cancel request with status: ${this.status}`);
  }

  // Only the requester can cancel
  if (this.requestedById !== userId) {
    throw new Error('Only the requester can cancel the request');
  }

  this.status = 'cancelled';
  this.comments = comments;

  return await this.save();
};

// Static Methods
Request.getByTenantAndStatus = function(tenantId, status) {
  return this.findAll({
    where: { tenantId, status },
    order: [['createdAt', 'DESC']]
  });
};

Request.getByType = function(tenantId, requestType) {
  return this.findAll({
    where: { tenantId, requestType },
    order: [['createdAt', 'DESC']]
  });
};

Request.getPendingRequests = function(tenantId) {
  return this.findAll({
    where: { tenantId, status: 'pending' },
    order: [['createdAt', 'ASC']]
  });
};

Request.getUserRequests = function(tenantId, userId, filters = {}) {
  return this.findAll({
    where: {
      tenantId,
      requestedById: userId,
      ...filters
    },
    order: [['createdAt', 'DESC']]
  });
};

Request.getRequestsByDateRange = function(tenantId, startDate, endDate, filters = {}) {
  return this.findAll({
    where: {
      tenantId,
      createdAt: {
        [Op.between]: [startDate, endDate]
      },
      ...filters
    },
    order: [['createdAt', 'DESC']]
  });
};

export default Request;
