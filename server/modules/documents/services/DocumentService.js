import DocumentRepository from '../../../repositories/modules/DocumentRepository.js';
import { Op } from 'sequelize';

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
    
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      ...options
    };

    return await this.documentRepository.findAll(filter, queryOptions);
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
    return await this.documentRepository.findById(document.id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id, tenantId) {
    const document = await this.documentRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }
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
    const document = await this.documentRepository.findOne({ id, tenantId });
    
    if (!document) {
      throw new Error('Document not found');
    }

    const updatedDocument = await this.documentRepository.update(id, updateData);
    
    // Return populated document
    return await this.documentRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(id, tenantId) {
    const document = await this.documentRepository.findOne({ id, tenantId });
    
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
   * Get documents by type
   */
  async getDocumentsByType(type, tenantId, options = {}) {
    return await this.documentRepository.findByType(type, tenantId, options);
  }

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(daysAhead, tenantId, options = {}) {
    return await this.documentRepository.findExpiring(daysAhead, tenantId, options);
  }
}

export default DocumentService;
