/**
 * Resigned Employee Model - PostgreSQL (Sequelize)
 * 
 * This model tracks employees who have resigned or been terminated.
 * Includes exit interview, handover, clearance, and final settlement information.
 * 
 * @module models/ResignedEmployee
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const ResignedEmployee = mainAppDb.define('ResignedEmployee', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the resigned employee record (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Employee Reference
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    comment: 'Reference to User (employee)'
  },

  // Department and Position (denormalized for historical record)
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'department_id',
    comment: 'Reference to Department'
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'position_id',
    comment: 'Reference to Position'
  },

  // Resignation Dates
  resignationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'resignation_date',
    comment: 'Date when resignation was submitted'
  },
  lastWorkingDay: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'last_working_day',
    comment: 'Last day of work'
  },

  // Resignation Reason
  resignationReason: {
    type: DataTypes.ENUM(
      'better-opportunity',
      'personal-reasons',
      'relocation',
      'career-change',
      'health-issues',
      'family-reasons',
      'retirement',
      'termination',
      'other'
    ),
    allowNull: false,
    field: 'resignation_reason',
    comment: 'Reason for resignation'
  },

  // Resignation Letter - stored as JSONB
  resignationLetter: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'resignation_letter',
    comment: 'Resignation letter details (filename, url, uploadedAt)'
  },

  // Exit Interview - stored as JSONB
  exitInterview: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      conducted: false,
      conductedBy: null,
      conductedDate: null,
      feedback: null,
      rating: null
    },
    field: 'exit_interview',
    comment: 'Exit interview details'
  },

  // Handover - stored as JSONB
  handover: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      completed: false,
      handoverTo: null,
      handoverDate: null,
      notes: null
    },
    comment: 'Handover details'
  },

  // Clearance - stored as JSONB
  clearance: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      hr: { cleared: false, clearedBy: null, clearedDate: null, notes: null },
      finance: { cleared: false, clearedBy: null, clearedDate: null, notes: null },
      it: { cleared: false, clearedBy: null, clearedDate: null, notes: null }
    },
    comment: 'Clearance status from different departments'
  },

  // Final Settlement - stored as JSONB
  finalSettlement: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      amount: 0,
      currency: 'USD',
      paidDate: null,
      paidBy: null
    },
    field: 'final_settlement',
    comment: 'Final settlement payment details'
  },

  // Rehire Eligibility
  rehireEligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'rehire_eligible',
    comment: 'Whether employee is eligible for rehire'
  },

  // Notes
  notes: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Additional notes'
  },

  // Audit Trail
  processedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'processed_by_id',
    comment: 'User who processed the resignation'
  },
  updatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by_id',
    comment: 'User who last updated the record'
  }
}, {
  tableName: 'resigned_employees',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_resigned_employees_tenant_id_employee_id',
      fields: ['tenant_id', 'employee_id']
    },
    {
      name: 'idx_resigned_employees_tenant_id_resignation_date',
      fields: ['tenant_id', 'resignation_date']
    },
    {
      name: 'idx_resigned_employees_tenant_id_department_id',
      fields: ['tenant_id', 'department_id']
    },
    {
      name: 'idx_resigned_employees_tenant_id_resignation_reason',
      fields: ['tenant_id', 'resignation_reason']
    },
    {
      name: 'idx_resigned_employees_resignation_date',
      fields: ['resignation_date']
    }
  ]
});

// Instance Methods
ResignedEmployee.prototype.isClearanceComplete = function() {
  return this.clearance?.hr?.cleared && 
         this.clearance?.finance?.cleared && 
         this.clearance?.it?.cleared;
};

ResignedEmployee.prototype.isHandoverComplete = function() {
  return this.handover?.completed === true;
};

ResignedEmployee.prototype.isExitInterviewConducted = function() {
  return this.exitInterview?.conducted === true;
};

ResignedEmployee.prototype.isSettlementPaid = function() {
  return this.finalSettlement?.paidDate !== null;
};

// Static Methods
ResignedEmployee.findByEmployee = async function(tenantId, employeeId) {
  return this.findOne({
    where: { tenantId, employeeId }
  });
};

ResignedEmployee.findByDepartment = async function(tenantId, departmentId) {
  return this.findAll({
    where: { tenantId, departmentId },
    order: [['resignationDate', 'DESC']]
  });
};

ResignedEmployee.findByReason = async function(tenantId, reason) {
  return this.findAll({
    where: { tenantId, resignationReason: reason },
    order: [['resignationDate', 'DESC']]
  });
};

ResignedEmployee.findByDateRange = async function(tenantId, startDate, endDate) {
  return this.findAll({
    where: {
      tenantId,
      resignationDate: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    order: [['resignationDate', 'DESC']]
  });
};

ResignedEmployee.findRehireEligible = async function(tenantId) {
  return this.findAll({
    where: { tenantId, rehireEligible: true },
    order: [['resignationDate', 'DESC']]
  });
};

export default ResignedEmployee;







