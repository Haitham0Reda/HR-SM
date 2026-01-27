import multiTenantDB from '../../../config/multiTenant.js';
import mongoose from 'mongoose';

/**
 * Document Service - Business logic layer for document operations
 * Uses tenant-specific database connections for proper data isolation
 */
class DocumentService {
  constructor() {
    // No repository needed - we'll use tenant-specific models directly
  }

  /**
   * Get Document model for specific tenant
   */
  async getDocumentModel(tenantId) {
    const connection = await multiTenantDB.getCompanyConnection(tenantId);
    
    // Check if model already exists on this connection
    if (connection.models.Document) {
      return connection.models.Document;
    }

    // Ensure User model is registered on this connection for populate to work
    if (!connection.models.User) {
      // Define a minimal User schema for population
      const userSchema = new mongoose.Schema({
        firstName: String,
        lastName: String,
        email: String,
        employeeId: String,
        role: String,
        tenantId: String
      }, { timestamps: true });
      connection.model('User', userSchema);
    }

    // Ensure Department model is registered on this connection
    if (!connection.models.Department) {
      // Define a minimal Department schema for population
      const departmentSchema = new mongoose.Schema({
        name: String,
        code: String,
        tenantId: String
      }, { timestamps: true });
      connection.model('Department', departmentSchema);
    }

    // Define schema (same as in document.model.js)
    const documentSchema = new mongoose.Schema({
      title: {
        type: String,
        required: true
      },
      arabicTitle: String,
      type: {
        type: String,
        enum: ['contract', 'national-id', 'certificate', 'offer-letter', 'birth-certificate', 'other'],
        required: true
      },
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileName: String,
      fileSize: Number,
      mimeType: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      expiryDate: Date,
      isConfidential: {
        type: Boolean,
        default: false
      },
      description: String,
      tenantId: {
        type: String,
        required: true,
        index: true
      }
    }, {
      timestamps: true
    });

    // Indexes for better performance
    documentSchema.index({ tenantId: 1, employee: 1 });
    documentSchema.index({ tenantId: 1, type: 1 });
    documentSchema.index({ tenantId: 1, uploadedBy: 1 });
    documentSchema.index({ tenantId: 1, expiryDate: 1 });

    return connection.model('Document', documentSchema);
  }

  /**
   * Get all documents
   */
  async getAllDocuments(tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    const filter = { tenantId };
    
    // Merge additional filters if provided
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    let query = DocumentModel.find(filter);

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    return await query.exec();
  }

  /**
   * Create document
   */
  async createDocument(documentData, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const dataToCreate = {
      ...documentData,
      tenantId
    };

    const document = await DocumentModel.create(dataToCreate);
    
    // Return populated document
    return await DocumentModel.findById(document._id)
      .populate('uploadedBy', 'firstName lastName email employeeId')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('department', 'name code')
      .exec();
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId })
      .populate('uploadedBy', 'firstName lastName email employeeId')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('department', 'name code')
      .exec();

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Update document
   */
  async updateDocument(id, updateData, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    await DocumentModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    // Return populated document
    return await DocumentModel.findById(id)
      .populate('uploadedBy', 'firstName lastName email employeeId')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('department', 'name code')
      .exec();
  }

  /**
   * Delete document
   */
  async deleteDocument(id, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    await DocumentModel.deleteOne({ _id: id });
    return { message: 'Document deleted' };
  }

  /**
   * Get documents by employee
   */
  async getDocumentsByEmployee(employeeId, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    let query = DocumentModel.find({ tenantId, employee: employeeId });

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    let query = DocumentModel.find({ tenantId, category });

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    let query = DocumentModel.find({ tenantId, type });

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }

  /**
   * Get documents by department
   */
  async getDocumentsByDepartment(departmentId, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    let query = DocumentModel.find({ tenantId, department: departmentId });

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const filter = {
      tenantId,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    };

    let query = DocumentModel.find(filter);

    if (options.populate) {
      query = query.populate(options.populate);
    } else {
      query = query
        .populate('uploadedBy', 'firstName lastName email employeeId')
        .populate('employee', 'firstName lastName email employeeId')
        .populate('department', 'name code');
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    const documents = await DocumentModel.find({ tenantId });
    
    const statistics = {
      total: documents.length,
      byCategory: {},
      byType: {},
      byStatus: {},
      totalSize: 0,
      averageSize: 0,
      recentUploads: 0 // Last 30 days
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    documents.forEach(document => {
      // By category
      if (document.category) {
        statistics.byCategory[document.category] = (statistics.byCategory[document.category] || 0) + 1;
      }
      
      // By type
      if (document.type) {
        statistics.byType[document.type] = (statistics.byType[document.type] || 0) + 1;
      }
      
      // By status
      if (document.status) {
        statistics.byStatus[document.status] = (statistics.byStatus[document.status] || 0) + 1;
      }
      
      // Size calculations
      if (document.size) {
        statistics.totalSize += document.size;
      }
      
      // Recent uploads
      if (document.createdAt && document.createdAt > thirtyDaysAgo) {
        statistics.recentUploads++;
      }
    });

    if (statistics.total > 0) {
      statistics.averageSize = statistics.totalSize / statistics.total;
    }

    return statistics;
  }

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(tenantId, days = 30, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const filter = {
      tenantId,
      expiryDate: {
        $gte: now,
        $lte: futureDate
      },
      status: { $ne: 'expired' }
    };

    let query = DocumentModel.find(filter);

    query = query
      .populate('uploadedBy', 'firstName lastName email employeeId')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('department', 'name code')
      .sort({ expiryDate: 1 });

    return await query.exec();
  }

  /**
   * Mark document as expired
   */
  async markDocumentExpired(id, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const updateData = {
      status: 'expired',
      expiredAt: new Date()
    };

    return await DocumentModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Bulk update document status
   */
  async bulkUpdateDocumentStatus(documentIds, status, tenantId) {
    const results = [];
    
    for (const documentId of documentIds) {
      try {
        const updateData = { status };
        
        if (status === 'expired') {
          updateData.expiredAt = new Date();
        }

        const document = await this.updateDocument(documentId, updateData, tenantId);
        results.push({ success: true, documentId, data: document });
      } catch (error) {
        results.push({ 
          success: false, 
          documentId, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * Get document access log
   */
  async getDocumentAccessLog(id, tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Return access log if it exists in the document
    return document.accessLog || [];
  }

  /**
   * Log document access
   */
  async logDocumentAccess(id, userId, action, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const accessEntry = {
      user: userId,
      action, // 'view', 'download', 'edit'
      timestamp: new Date(),
      ipAddress: null // Can be added if needed
    };

    // Add to access log (assuming accessLog is an array field in the document model)
    const updateData = {
      $push: { accessLog: accessEntry },
      lastAccessedAt: new Date(),
      lastAccessedBy: userId
    };

    return await DocumentModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Get documents requiring approval
   */
  async getDocumentsRequiringApproval(tenantId, options = {}) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    let query = DocumentModel.find({ tenantId, status: 'pending_approval' });

    query = query
      .populate('uploadedBy', 'firstName lastName email employeeId')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('department', 'name code')
      .sort({ createdAt: 1 });

    return await query.exec();
  }

  /**
   * Approve document
   */
  async approveDocument(id, approvedBy, tenantId) {
    const DocumentModel = await this.getDocumentModel(tenantId);
    
    const document = await DocumentModel.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.status !== 'pending_approval') {
      throw new Error('Only documents pending approval can be approved');
    }

    const updateData = {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    };

    return await DocumentModel.findByIdAndUpdate(id, updateData, { new: true });
  }
}

export default DocumentService;
