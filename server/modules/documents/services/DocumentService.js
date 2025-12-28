import DocumentRepository from '../../../repositories/modules/DocumentRepository.js';

/**
 * Document Service - Business logic layer for document operations
 * Uses DocumentRepository for data access
 */
class DocumentService {
  constructor() {
    this.documentRepository = new DocumentRepository();
  }

  /**
   * Get all documents
   */
  async getAllDocuments(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      populate: [
        { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'department', select: 'name code' }
      ],
      sort: { createdAt: -1 },
      ...options
    };

    return await this.documentRepository.find(filter, queryOptions);
  }

  /**
   * Create document
   */
  async createDocument(documentData, tenantId) {
    const dataToCreate = {
      ...documentData,
      tenantId
    };

    const document = await this.documentRepository.create(dataToCreate);
    
    // Return populated document
    return await this.documentRepository.findById(document._id, {
      populate: [
        { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id, tenantId) {
    const document = await this.documentRepository.findOne(
      { _id: id, tenantId },
      {
        populate: [
          { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
          { path: 'employee', select: 'firstName lastName email employeeId' },
          { path: 'department', select: 'name code' }
        ]
      }
    );

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Update document
   */
  async updateDocument(id, updateData, tenantId) {
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const updatedDocument = await this.documentRepository.update(id, updateData);
    
    // Return populated document
    return await this.documentRepository.findById(id, {
      populate: [
        { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(id, tenantId) {
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    await this.documentRepository.delete(id);
    return { message: 'Document deleted' };
  }

  /**
   * Get documents by employee
   */
  async getDocumentsByEmployee(employeeId, tenantId, options = {}) {
    return await this.documentRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category, tenantId, options = {}) {
    return await this.documentRepository.findByCategory(category, tenantId, options);
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type, tenantId, options = {}) {
    return await this.documentRepository.findByType(type, tenantId, options);
  }

  /**
   * Get documents by department
   */
  async getDocumentsByDepartment(departmentId, tenantId, options = {}) {
    return await this.documentRepository.findByDepartment(departmentId, tenantId, options);
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm, tenantId, options = {}) {
    const filter = {
      tenantId,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    };

    const queryOptions = {
      populate: [
        { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'department', select: 'name code' }
      ],
      sort: { createdAt: -1 },
      ...options
    };

    return await this.documentRepository.find(filter, queryOptions);
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(tenantId) {
    const documents = await this.documentRepository.find({ tenantId });
    
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

    const queryOptions = {
      populate: [
        { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'department', select: 'name code' }
      ],
      sort: { expiryDate: 1 },
      ...options
    };

    return await this.documentRepository.find(filter, queryOptions);
  }

  /**
   * Mark document as expired
   */
  async markDocumentExpired(id, tenantId) {
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const updateData = {
      status: 'expired',
      expiredAt: new Date()
    };

    return await this.documentRepository.update(id, updateData);
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
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
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
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
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

    return await this.documentRepository.update(id, updateData);
  }

  /**
   * Get documents requiring approval
   */
  async getDocumentsRequiringApproval(tenantId, options = {}) {
    return await this.documentRepository.find(
      { tenantId, status: 'pending_approval' },
      {
        populate: [
          { path: 'uploadedBy', select: 'firstName lastName email employeeId' },
          { path: 'employee', select: 'firstName lastName email employeeId' },
          { path: 'department', select: 'name code' }
        ],
        sort: { createdAt: 1 },
        ...options
      }
    );
  }

  /**
   * Approve document
   */
  async approveDocument(id, approvedBy, tenantId) {
    const document = await this.documentRepository.findOne({ _id: id, tenantId });
    
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

    return await this.documentRepository.update(id, updateData);
  }
}

export default DocumentService;