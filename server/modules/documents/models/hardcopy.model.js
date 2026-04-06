import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Hardcopy Model
 * 
 * Manages physical document copies and scanned documents.
 * Tracks hardcopy documents with categorization and access control.
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const Hardcopy = sequelize.define('Hardcopy', {
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
  
  // Description
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Category
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general'
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
    validate: {
      min: 0
    },
    field: 'file_size'
  },
  
  // Access control
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public'
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
  tableName: 'hardcopies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['tenant_id', 'category']
    },
    {
      fields: ['tenant_id', 'is_public']
    },
    {
      fields: ['tenant_id', 'created_by']
    },
    {
      fields: ['tenant_id', 'created_at']
    }
  ]
});

// Static methods
Hardcopy.findByCategory = async function(tenantId, category, options = {}) {
  const { page = 1, limit = 50, isPublic = null } = options;
  const offset = (page - 1) * limit;
  
  const where = {
    tenant_id: tenantId,
    category
  };
  
  if (isPublic !== null) {
    where.is_public = isPublic;
  }
  
  return this.findAll({
    where,
    order: [['created_at', 'DESC']],
    offset,
    limit
  });
};

Hardcopy.findPublicDocuments = async function(tenantId) {
  return this.findAll({
    where: {
      tenant_id: tenantId,
      is_public: true
    },
    order: [['created_at', 'DESC']]
  });
};

export default Hardcopy;