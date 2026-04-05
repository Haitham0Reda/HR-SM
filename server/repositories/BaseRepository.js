/**
 * Base Repository - PostgreSQL (Sequelize)
 * 
 * Abstract base repository class providing common CRUD operations
 * and advanced query capabilities for Sequelize models.
 * Enforces multi-tenancy with automatic tenant_id filtering.
 * 
 * @abstract
 */

import { Op } from 'sequelize';
import QueryBuilder from './QueryBuilder.js';

class BaseRepository {
  /**
   * @param {Sequelize.Model} model - Sequelize model instance
   */
  constructor(model) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository is abstract and cannot be instantiated directly');
    }
    
    if (!model || !model.sequelize) {
      throw new Error('Valid Sequelize model is required');
    }
    
    this.model = model;
    this.modelName = model.name;
  }

  /**
   * Create a new record with automatic tenant_id injection
   * @param {Object} data - Record data
   * @param {Object} [options] - Additional options
   * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
   * @param {Object} [options.transaction] - Sequelize transaction
   * @returns {Promise<Object>} Created record
   */
  async create(data, options = {}) {
    try {
      const { tenantId, transaction } = options;
      
      // Add tenant context if provided
      if (tenantId) {
        data.tenantId = tenantId;
      }
      
      const createOptions = transaction ? { transaction } : {};
      const record = await this.model.create(data, createOptions);
      
      return record;
    } catch (error) {
      throw this._handleError(error, 'create');
    }
  }

  /**
   * Find record by ID with tenant filtering
   * @param {string|UUID} id - Record ID
   * @param {Object} [options] - Query options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Array|string} [options.attributes] - Fields to include/exclude
   * @param {Array} [options.include] - Associations to include
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id, options = {}) {
    try {
      const { tenantId, attributes, include } = options;
      
      const where = { id };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findById');
    }
  }

  /**
   * Find single record by filter with tenant filtering
   * @param {Object} filter - Query filter
   * @param {Object} [options] - Query options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Order criteria
   * @returns {Promise<Object|null>} Found record or null
   */
  async findOne(filter = {}, options = {}) {
    try {
      const { tenantId, attributes, include, order } = options;
      
      const where = { ...filter };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      if (order) {
        findOptions.order = order;
      }
      
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findOne');
    }
  }

  /**
   * Find multiple records with tenant filtering
   * @param {Object} filter - Query filter
   * @param {Object} [options] - Query options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Sort criteria
   * @param {number} [options.limit] - Maximum records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<Array>} Array of records
   */
  async findAll(filter = {}, options = {}) {
    try {
      const { tenantId, attributes, include, order, limit, offset } = options;
      
      const where = { ...filter };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      if (order) {
        findOptions.order = order;
      }
      
      if (limit) {
        findOptions.limit = limit;
      }
      
      if (offset !== undefined) {
        findOptions.offset = offset;
      }
      
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findAll');
    }
  }

  /**
   * Update record by ID with tenant filtering
   * @param {string|UUID} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} [options] - Update options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Object} [options.transaction] - Sequelize transaction
   * @param {boolean} [options.returning=true] - Return updated record
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data, options = {}) {
    try {
      const { tenantId, transaction, returning = true } = options;
      
      const where = { id };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const updateOptions = {
        where,
        returning: returning ? true : false
      };
      
      if (transaction) {
        updateOptions.transaction = transaction;
      }
      
      const [affectedCount, updatedRecords] = await this.model.update(data, updateOptions);
      
      if (returning && updatedRecords && updatedRecords.length > 0) {
        return updatedRecords[0];
      }
      
      return affectedCount > 0 ? await this.findById(id, { tenantId }) : null;
    } catch (error) {
      throw this._handleError(error, 'update');
    }
  }

  /**
   * Delete record by ID with tenant filtering (hard delete)
   * @param {string|UUID} id - Record ID
   * @param {Object} [options] - Delete options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Object} [options.transaction] - Sequelize transaction
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, options = {}) {
    try {
      const { tenantId, transaction } = options;
      
      const where = { id };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const deleteOptions = { where };
      
      if (transaction) {
        deleteOptions.transaction = transaction;
      }
      
      const affectedCount = await this.model.destroy(deleteOptions);
      return affectedCount > 0;
    } catch (error) {
      throw this._handleError(error, 'delete');
    }
  }

  /**
   * Soft delete record by setting deletedAt timestamp
   * @param {string|UUID} id - Record ID
   * @param {Object} [options] - Delete options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @param {Object} [options.transaction] - Sequelize transaction
   * @param {string} [options.deletedBy] - User ID who performed deletion
   * @returns {Promise<Object|null>} Updated record or null
   */
  async softDelete(id, options = {}) {
    try {
      const { tenantId, transaction, deletedBy } = options;
      
      const updateData = {
        deletedAt: new Date()
      };
      
      if (deletedBy) {
        updateData.deletedBy = deletedBy;
      }
      
      return await this.update(id, updateData, { tenantId, transaction });
    } catch (error) {
      throw this._handleError(error, 'softDelete');
    }
  }

  /**
   * Count records matching filter with tenant filtering
   * @param {Object} filter - Query filter
   * @param {Object} [options] - Count options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @returns {Promise<number>} Record count
   */
  async count(filter = {}, options = {}) {
    try {
      const { tenantId } = options;
      
      const where = { ...filter };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      return await this.model.count({ where });
    } catch (error) {
      throw this._handleError(error, 'count');
    }
  }

  /**
   * Check if record exists with tenant filtering
   * @param {Object} filter - Query filter
   * @param {Object} [options] - Options
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(filter = {}, options = {}) {
    try {
      const { tenantId } = options;
      
      const where = { ...filter };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const count = await this.model.count({ where, limit: 1 });
      return count > 0;
    } catch (error) {
      throw this._handleError(error, 'exists');
    }
  }

  /**
   * Paginate records with tenant filtering
   * @param {Object} filter - Query filter
   * @param {Object} options - Pagination options
   * @param {number} [options.page=1] - Page number (1-based)
   * @param {number} [options.limit=10] - Records per page
   * @param {Object} [options.order] - Sort criteria
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {string} [options.tenantId] - Tenant ID (required for multi-tenant models)
   * @returns {Promise<Object>} Paginated result with data, total, page, limit, totalPages
   */
  async paginate(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        order,
        attributes,
        include,
        tenantId
      } = options;
      
      const where = { ...filter };
      
      // Enforce tenant isolation
      if (tenantId) {
        where.tenantId = tenantId;
      }
      
      const offset = (page - 1) * limit;
      
      const findOptions = {
        where,
        limit,
        offset
      };
      
      if (order) {
        findOptions.order = order;
      }
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      const [data, total] = await Promise.all([
        this.model.findAll(findOptions),
        this.model.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      throw this._handleError(error, 'paginate');
    }
  }

  /**
   * Execute operations within a transaction
   * @param {Function} callback - Function containing operations to execute
   * @returns {Promise<*>} Result of operations
   */
  async withTransaction(callback) {
    const transaction = await this.model.sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw this._handleError(error, 'withTransaction');
    }
  }

  /**
   * Create query builder for complex queries
   * @returns {QueryBuilder} Query builder instance
   */
  query() {
    return new QueryBuilder(this.model);
  }

  /**
   * Handle repository errors with context
   * @private
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Enhanced error
   */
  _handleError(error, operation) {
    const enhancedError = new Error(
      `Repository error in ${this.modelName}.${operation}: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.operation = operation;
    enhancedError.model = this.modelName;
    enhancedError.stack = error.stack;
    
    return enhancedError;
  }
}

export default BaseRepository;
