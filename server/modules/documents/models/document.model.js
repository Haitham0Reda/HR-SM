import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Document Model
 * 
 * Manages employee documents including:
 * - Contracts and agreements
 * - Identification documents
 * - Certificates and credentials
 * - Offer letters
 * - Other employee-related documents
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Document title
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Arabic title (for bilingual support)
  arabic_title: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'arabic_title'
  },
  
  // Document type
  type: {
    type: DataTypes.ENUM('contract', 'national-id', 'certificate', 'offer-letter', 'birth-certificate', 'other'),
    allowNull: false
  },
  
  // Employee reference
  employee_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'employee_id'
  },
  
  // Department reference
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'department_id'
  },
  
  // File information
  file_url: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url'
  },
  
  file_name: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'file_name'
  },
  
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size'
  },
  
  // Upload tracking
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'uploaded_by'
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  },
  
  // Expiry tracking
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date'
  },
  
  // Confidentiality flag
  is_confidential: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_confidential'
  },
  
  // Metadata
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'employee_id']
    },
    {
      fields: ['tenant_id', 'type']
    },
    {
      fields: ['tenant_id', 'uploaded_by']
    },
    {
      fields: ['tenant_id', 'expiry_date']
    },
    {
      fields: ['employee_id']
    },
    {
      fields: ['department_id']
    }
  ]
});

// Instance methods
Document.prototype.isExpired = function() {
  if (!this.expiry_date) {
    return false;
  }
  return new Date() > this.expiry_date;
};

Document.prototype.getDaysUntilExpiry = function() {
  if (!this.expiry_date) {
    return null;
  }
  const today = new Date();
  const expiry = new Date(this.expiry_date);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods
Document.findByEmployeeAndTenant = async function(employeeId, tenantId, options = {}) {
  const { page = 1, limit = 50, type = null } = options;
  const offset = (page - 1) * limit;
  
  const where = {
    employee_id: employeeId,
    tenant_id: tenantId
  };
  
  if (type) {
    where.type = type;
  }
  
  return this.findAll({
    where,
    order: [['created_at', 'DESC']],
    offset,
    limit
  });
};

Document.findExpiringDocuments = async function(tenantId, daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.findAll({
    where: {
      tenant_id: tenantId,
      expiry_date: {
        [sequelize.Sequelize.Op.gte]: new Date(),
        [sequelize.Sequelize.Op.lte]: thresholdDate
      }
    },
    order: [['expiry_date', 'ASC']]
  });
};

export default Document;



