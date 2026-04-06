import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * DocumentTemplate Model
 * 
 * Manages document templates for generating standardized documents.
 * Templates can be used for contracts, letters, certificates, etc.
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const DocumentTemplate = sequelize.define('DocumentTemplate', {
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
  
  // Template name
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Template description
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // File information
  file_url: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url'
  },
  
  file_type: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_type'
  },
  
  // Active status
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  
  // Metadata
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'document_templates',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'name']
    },
    {
      fields: ['tenant_id', 'is_active']
    },
    {
      fields: ['tenant_id', 'created_by']
    }
  ]
});

// Static methods
DocumentTemplate.findActiveByTenant = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      is_active: true
    },
    order: [['name', 'ASC']]
  });
};

DocumentTemplate.findByNameAndTenant = async function(name, tenantId) {
  return this.findOne({
    where: {
      tenant_id: tenantId,
      name
    }
  });
};

export default DocumentTemplate;
