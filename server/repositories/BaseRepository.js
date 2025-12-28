import mongoose from 'mongoose';
import QueryBuilder from './QueryBuilder.js';

/**
 * @typedef {Object} QueryOptions
 * @property {number} [limit] - Maximum number of documents to return
 * @property {number} [skip] - Number of documents to skip
 * @property {Object} [sort] - Sort criteria
 * @property {string|Object} [select] - Fields to include/exclude
 * @property {string|Object} [populate] - Fields to populate
 */

/**
 * @typedef {Object} PaginationResult
 * @property {Array} data - Array of documents
 * @property {number} total - Total count of documents
 * @property {number} page - Current page number
 * @property {number} limit - Documents per page
 * @property {number} totalPages - Total number of pages
 */

/**
 * Abstract base repository class providing common CRUD operations
 * and advanced query capabilities for Mongoose models
 * 
 * @abstract
 */
class BaseRepository {
    /**
     * @param {mongoose.Model} model - Mongoose model instance
     */
    constructor(model) {
        if (this.constructor === BaseRepository) {
            throw new Error('BaseRepository is abstract and cannot be instantiated directly');
        }
        
        if (!model || !model.schema) {
            throw new Error('Valid Mongoose model is required');
        }
        
        this.model = model;
        this.modelName = model.modelName;
    }

    /**
     * Create a new document
     * @param {Object} data - Document data
     * @param {Object} [options] - Additional options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Created document
     */
    async create(data, options = {}) {
        try {
            const { session, tenantId } = options;
            
            // Add tenant context if provided
            if (tenantId) {
                data.tenantId = tenantId;
            }
            
            const createOptions = session ? { session } : {};
            const [document] = await this.model.create([data], createOptions);
            
            return document;
        } catch (error) {
            throw this._handleError(error, 'create');
        }
    }

    /**
     * Find document by ID
     * @param {string} id - Document ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Found document or null
     */
    async findById(id, options = {}) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            
            let query = this.model.findById(id);
            
            if (options.select) {
                query = query.select(options.select);
            }
            
            if (options.populate) {
                query = query.populate(options.populate);
            }
            
            if (options.tenantId) {
                query = query.where({ tenantId: options.tenantId });
            }
            
            return await query.exec();
        } catch (error) {
            throw this._handleError(error, 'findById');
        }
    }

    /**
     * Find single document by filter
     * @param {Object} filter - Query filter
     * @param {QueryOptions} [options] - Query options
     * @returns {Promise<Object|null>} Found document or null
     */
    async findOne(filter = {}, options = {}) {
        try {
            let query = this.model.findOne(filter);
            
            if (options.select) {
                query = query.select(options.select);
            }
            
            if (options.populate) {
                query = query.populate(options.populate);
            }
            
            if (options.tenantId) {
                query = query.where({ tenantId: options.tenantId });
            }
            
            return await query.exec();
        } catch (error) {
            throw this._handleError(error, 'findOne');
        }
    }

    /**
     * Find multiple documents
     * @param {Object} filter - Query filter
     * @param {QueryOptions} [options] - Query options
     * @returns {Promise<Array>} Array of documents
     */
    async find(filter = {}, options = {}) {
        try {
            let query = this.model.find(filter);
            
            if (options.select) {
                query = query.select(options.select);
            }
            
            if (options.populate) {
                query = query.populate(options.populate);
            }
            
            if (options.sort) {
                query = query.sort(options.sort);
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            if (options.skip) {
                query = query.skip(options.skip);
            }
            
            if (options.tenantId) {
                query = query.where({ tenantId: options.tenantId });
            }
            
            return await query.exec();
        } catch (error) {
            throw this._handleError(error, 'find');
        }
    }

    /**
     * Update document by ID
     * @param {string} id - Document ID
     * @param {Object} data - Update data
     * @param {Object} [options] - Update options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {boolean} [options.new=true] - Return updated document
     * @returns {Promise<Object|null>} Updated document or null
     */
    async update(id, data, options = {}) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            
            const { session, tenantId, new: returnNew = true } = options;
            
            const filter = { _id: id };
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            // Add updatedAt timestamp
            data.updatedAt = new Date();
            
            const updateOptions = {
                new: returnNew,
                runValidators: true
            };
            
            if (session) {
                updateOptions.session = session;
            }
            
            return await this.model.findOneAndUpdate(filter, data, updateOptions);
        } catch (error) {
            throw this._handleError(error, 'update');
        }
    }

    /**
     * Delete document by ID (hard delete)
     * @param {string} id - Document ID
     * @param {Object} [options] - Delete options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    async delete(id, options = {}) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return false;
            }
            
            const { session, tenantId } = options;
            
            const filter = { _id: id };
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            const deleteOptions = session ? { session } : {};
            
            const result = await this.model.deleteOne(filter, deleteOptions);
            return result.deletedCount > 0;
        } catch (error) {
            throw this._handleError(error, 'delete');
        }
    }

    /**
     * Soft delete document by ID
     * @param {string} id - Document ID
     * @param {Object} [options] - Delete options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {string} [options.deletedBy] - User ID who performed the deletion
     * @returns {Promise<Object|null>} Updated document or null
     */
    async softDelete(id, options = {}) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            
            const { session, tenantId, deletedBy } = options;
            
            const updateData = {
                isDeleted: true,
                deletedAt: new Date()
            };
            
            if (deletedBy) {
                updateData.deletedBy = deletedBy;
            }
            
            return await this.update(id, updateData, { session, tenantId });
        } catch (error) {
            throw this._handleError(error, 'softDelete');
        }
    }

    /**
     * Count documents matching filter
     * @param {Object} filter - Query filter
     * @param {Object} [options] - Count options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<number>} Document count
     */
    async count(filter = {}, options = {}) {
        try {
            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }
            
            return await this.model.countDocuments(filter);
        } catch (error) {
            throw this._handleError(error, 'count');
        }
    }

    /**
     * Check if document exists
     * @param {Object} filter - Query filter
     * @param {Object} [options] - Options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async exists(filter = {}, options = {}) {
        try {
            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }
            
            const result = await this.model.exists(filter);
            return !!result;
        } catch (error) {
            throw this._handleError(error, 'exists');
        }
    }

    /**
     * Paginate documents
     * @param {Object} filter - Query filter
     * @param {Object} options - Pagination options
     * @param {number} [options.page=1] - Page number (1-based)
     * @param {number} [options.limit=10] - Documents per page
     * @param {Object} [options.sort] - Sort criteria
     * @param {string|Object} [options.select] - Fields to select
     * @param {string|Object} [options.populate] - Fields to populate
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<PaginationResult>} Paginated result
     */
    async paginate(filter = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sort,
                select,
                populate,
                tenantId
            } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            const skip = (page - 1) * limit;
            
            const [data, total] = await Promise.all([
                this.find(filter, { sort, select, populate, limit, skip }),
                this.count(filter, { tenantId })
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
     * @param {Function} operations - Function containing operations to execute
     * @returns {Promise<*>} Result of operations
     */
    async withTransaction(operations) {
        const session = await mongoose.startSession();
        
        try {
            return await session.withTransaction(async () => {
                return await operations(session);
            });
        } finally {
            await session.endSession();
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
        
        return enhancedError;
    }
}

export default BaseRepository;