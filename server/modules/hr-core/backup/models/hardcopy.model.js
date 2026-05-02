/**
 * HardCopy Model - PostgreSQL (Sequelize)
 * 
 * Manages physical document tracking and digital copies.
 * Tracks uploaded files and their physical storage locations.
 * 
 * @module models/HardCopy
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const HardCopy = mainAppDb.define('HardCopy', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the hardcopy record (UUID)'
  },

  // Title
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Document title'
  },

  // Description
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Document description'
  },

  // Category
  category: {
    type: DataTypes.ENUM('general', 'contract', 'certificate', 'id-card', 'payroll', 'attendance', 'other'),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Document category'
  },

  // Physical Location
  location: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Physical location of the hard copy'
  },

  // File Information
  fileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    field: 'file_url',
    comment: 'URL to the digital file'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_name',
    comment: 'Original file name'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: 'File size in bytes'
  },

  // Uploaded By
  uploadedById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'uploaded_by_id',
    comment: 'User who uploaded the file'
  }
}, {
  tableName: 'hardcopies',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_hardcopies_category',
      fields: ['category']
    },
    {
      name: 'idx_hardcopies_uploaded_by_id',
      fields: ['uploaded_by_id']
    },
    {
      name: 'idx_hardcopies_created_at',
      fields: ['created_at']
    }
  ]
});

// Static Methods
HardCopy.getByCategory = function(category) {
  return this.findAll({
    where: { category },
    order: [['createdAt', 'DESC']]
  });
};

HardCopy.getByUploader = function(uploaderId) {
  return this.findAll({
    where: { uploadedById: uploaderId },
    order: [['createdAt', 'DESC']]
  });
};

HardCopy.searchByTitle = function(searchTerm) {
  return this.findAll({
    where: {
      title: {
        [Op.iLike]: `%${searchTerm}%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
};

export default HardCopy;







