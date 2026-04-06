import { Op } from 'sequelize';
import Document from '../models/document.model.js';

/**
 * Document Service - Business logic layer for document operations
 * Uses Sequelize models with proper tenant isolation
 */
class DocumentService {
  /**
   * Get all documents
   */
  async getAllDocuments(tenantId, options = {}) {
    const where = { tenant_id: tenantId };
    
    // Merge additional filters if provided
    if (options.filter) {
      Object.assign(where, options.filter);
    }
    
    const queryOptions = {
      where,
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    }

    if (options.limit) {
      queryOptions.limit = options.limit;
      queryOptions.offset = options.offset || 0;
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Create document
   */
  async createDocument(documentData, tenantId) {
    const dataToCreate = {
      ...documentData,
      tenant_id: tenantId,
      employee_id: documentData.employee,
      department_id: documentData.department,
      uploaded_by: documentData.uploadedBy,
      file_url: documentData.fileUrl,
      file_name: documentData.fileName,
      file_size: documentData.fileSize,
      expiry_date: documentData.expiryDate,
      is_confidential: documentData.isConfidential,
      arabic_title: documentData.arabicTitle
    };

    const document = await Document.create(dataToCreate);
    
    // Return populated document
    return await Document.findByPk(document.id, {
      include: [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Update document
   */
  async updateDocument(id, updateData, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Map camelCase to snake_case
    const mappedData = {
      title: updateData.title,
      arabic_title: updateData.arabicTitle,
      type: updateData.type,
      employee_id: updateData.employee,
      department_id: updateData.department,
      file_url: updateData.fileUrl,
      file_name: updateData.fileName,
      file_size: updateData.fileSize,
      expiry_date: updateData.expiryDate,
      is_confidential: updateData.isConfidential,
      updated_by: updateData.updatedBy
    };

    // Remove undefined values
    Object.keys(mappedData).forEach(key => 
      mappedData[key] === undefined && delete mappedData[key]
    );

    await document.update(mappedData);
    
    // Return populated document
    return await Document.findByPk(id, {
      include: [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(id, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    await document.destroy();
    return { message: 'Document deleted' };
  }

  /**
   * Get documents by employee
   */
  async getDocumentsByEmployee(employeeId, tenantId, options = {}) {
    const queryOptions = {
      where: { tenant_id: tenantId, employee_id: employeeId },
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category, tenantId, options = {}) {
    const queryOptions = {
      where: { tenant_id: tenantId, category },
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type, tenantId, options = {}) {
    const queryOptions = {
      where: { tenant_id: tenantId, type },
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Get documents by department
   */
  async getDocumentsByDepartment(departmentId, tenantId, options = {}) {
    const queryOptions = {
      where: { tenant_id: tenantId, department_id: departmentId },
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm, tenantId, options = {}) {
    const where = {
      tenant_id: tenantId,
      [Op.or]: [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { arabic_title: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ]
    };

    const queryOptions = {
      where,
      order: options.sort ? [[options.sort.field || 'created_at', options.sort.order || 'DESC']] : [['created_at', 'DESC']]
    };

    if (options.populate) {
      queryOptions.include = this._buildIncludes(options.populate);
    } else {
      queryOptions.include = [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ];
    }

    return await Document.findAll(queryOptions);
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(tenantId) {
    const documents = await Document.findAll({
      where: { tenant_id: tenantId },
      attributes: ['type', 'category', 'status', 'file_size', 'created_at']
    });
    
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
      if (document.file_size) {
        statistics.totalSize += document.file_size;
      }
      
      // Recent uploads
      if (document.created_at && document.created_at > thirtyDaysAgo) {
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
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const where = {
      tenant_id: tenantId,
      expiry_date: {
        [Op.gte]: now,
        [Op.lte]: futureDate
      }
    };

    if (options.excludeStatus) {
      where.status = { [Op.ne]: options.excludeStatus };
    }

    return await Document.findAll({
      where,
      include: [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ],
      order: [['expiry_date', 'ASC']]
    });
  }

  /**
   * Mark document as expired
   */
  async markDocumentExpired(id, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    await document.update({
      status: 'expired',
      expired_at: new Date()
    });

    return document;
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
          updateData.expired_at = new Date();
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
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Return access log if it exists in the document
    return document.access_log || [];
  }

  /**
   * Log document access
   */
  async logDocumentAccess(id, userId, action, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const accessEntry = {
      user: userId,
      action, // 'view', 'download', 'edit'
      timestamp: new Date(),
      ipAddress: null // Can be added if needed
    };

    // Add to access log (assuming access_log is a JSONB field)
    const accessLog = document.access_log || [];
    accessLog.push(accessEntry);

    await document.update({
      access_log: accessLog,
      last_accessed_at: new Date(),
      last_accessed_by: userId
    });

    return document;
  }

  /**
   * Get documents requiring approval
   */
  async getDocumentsRequiringApproval(tenantId, options = {}) {
    return await Document.findAll({
      where: { tenant_id: tenantId, status: 'pending_approval' },
      include: [
        { association: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ],
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Approve document
   */
  async approveDocument(id, approvedBy, tenantId) {
    const document = await Document.findOne({
      where: { id, tenant_id: tenantId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.status !== 'pending_approval') {
      throw new Error('Only documents pending approval can be approved');
    }

    await document.update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date()
    });

    return document;
  }

  /**
   * Build includes for populate option
   * @private
   */
  _buildIncludes(populate) {
    if (typeof populate === 'string') {
      return [{ association: populate }];
    }
    
    if (Array.isArray(populate)) {
      return populate.map(p => {
        if (typeof p === 'string') {
          return { association: p };
        }
        return p;
      });
    }
    
    return populate;
  }
}

export default new DocumentService();
