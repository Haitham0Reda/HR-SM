import BaseRepository from './BaseRepository.js';

/**
 * Generic repository implementation that can be used for any Mongoose model
 * Provides all base CRUD operations without requiring a specific repository class
 * 
 * @extends BaseRepository
 */
class GenericRepository extends BaseRepository {
    /**
     * @param {mongoose.Model} model - Mongoose model instance
     */
    constructor(model) {
        super(model);
    }

    /**
     * Create a generic repository instance for any model
     * @param {mongoose.Model} model - Mongoose model
     * @returns {GenericRepository} Repository instance
     */
    static for(model) {
        return new GenericRepository(model);
    }

    /**
     * Bulk create multiple documents
     * @param {Array<Object>} documents - Array of document data
     * @param {Object} [options] - Bulk create options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {boolean} [options.ordered=true] - Whether to stop on first error
     * @returns {Promise<Array>} Created documents
     */
    async bulkCreate(documents, options = {}) {
        try {
            const { session, tenantId, ordered = true } = options;
            
            // Add tenant context if provided
            if (tenantId) {
                documents = documents.map(doc => ({ ...doc, tenantId }));
            }
            
            const createOptions = { ordered };
            if (session) {
                createOptions.session = session;
            }
            
            return await this.model.create(documents, createOptions);
        } catch (error) {
            throw this._handleError(error, 'bulkCreate');
        }
    }

    /**
     * Bulk update multiple documents
     * @param {Object} filter - Query filter
     * @param {Object} update - Update data
     * @param {Object} [options] - Bulk update options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Update result with matched and modified counts
     */
    async bulkUpdate(filter, update, options = {}) {
        try {
            const { session, tenantId } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            // Add updatedAt timestamp
            update.updatedAt = new Date();
            
            const updateOptions = { runValidators: true };
            if (session) {
                updateOptions.session = session;
            }
            
            const result = await this.model.updateMany(filter, update, updateOptions);
            
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                acknowledged: result.acknowledged
            };
        } catch (error) {
            throw this._handleError(error, 'bulkUpdate');
        }
    }

    /**
     * Bulk delete multiple documents
     * @param {Object} filter - Query filter
     * @param {Object} [options] - Bulk delete options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Delete result with deleted count
     */
    async bulkDelete(filter, options = {}) {
        try {
            const { session, tenantId } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            const deleteOptions = {};
            if (session) {
                deleteOptions.session = session;
            }
            
            const result = await this.model.deleteMany(filter, deleteOptions);
            
            return {
                deletedCount: result.deletedCount,
                acknowledged: result.acknowledged
            };
        } catch (error) {
            throw this._handleError(error, 'bulkDelete');
        }
    }

    /**
     * Bulk soft delete multiple documents
     * @param {Object} filter - Query filter
     * @param {Object} [options] - Bulk soft delete options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {string} [options.deletedBy] - User ID who performed the deletion
     * @returns {Promise<Object>} Update result with matched and modified counts
     */
    async bulkSoftDelete(filter, options = {}) {
        try {
            const { session, tenantId, deletedBy } = options;
            
            const updateData = {
                isDeleted: true,
                deletedAt: new Date()
            };
            
            if (deletedBy) {
                updateData.deletedBy = deletedBy;
            }
            
            return await this.bulkUpdate(filter, updateData, { session, tenantId });
        } catch (error) {
            throw this._handleError(error, 'bulkSoftDelete');
        }
    }

    /**
     * Find documents with aggregation pipeline
     * @param {Array} pipeline - Aggregation pipeline
     * @param {Object} [options] - Aggregation options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Aggregation results
     */
    async aggregate(pipeline, options = {}) {
        try {
            const { tenantId } = options;
            
            // Add tenant filter at the beginning if provided
            if (tenantId) {
                pipeline.unshift({ $match: { tenantId } });
            }
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'aggregate');
        }
    }

    /**
     * Find distinct values for a field
     * @param {string} field - Field name
     * @param {Object} [filter] - Query filter
     * @param {Object} [options] - Options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of distinct values
     */
    async distinct(field, filter = {}, options = {}) {
        try {
            const { tenantId } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            return await this.model.distinct(field, filter);
        } catch (error) {
            throw this._handleError(error, 'distinct');
        }
    }

    /**
     * Find and update document atomically
     * @param {Object} filter - Query filter
     * @param {Object} update - Update data
     * @param {Object} [options] - Update options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {boolean} [options.new=true] - Return updated document
     * @param {boolean} [options.upsert=false] - Create if not found
     * @returns {Promise<Object|null>} Updated document or null
     */
    async findOneAndUpdate(filter, update, options = {}) {
        try {
            const { session, tenantId, new: returnNew = true, upsert = false } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            // Add updatedAt timestamp
            update.updatedAt = new Date();
            
            const updateOptions = {
                new: returnNew,
                upsert,
                runValidators: true
            };
            
            if (session) {
                updateOptions.session = session;
            }
            
            return await this.model.findOneAndUpdate(filter, update, updateOptions);
        } catch (error) {
            throw this._handleError(error, 'findOneAndUpdate');
        }
    }

    /**
     * Find and delete document atomically
     * @param {Object} filter - Query filter
     * @param {Object} [options] - Delete options
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Deleted document or null
     */
    async findOneAndDelete(filter, options = {}) {
        try {
            const { session, tenantId } = options;
            
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            const deleteOptions = {};
            if (session) {
                deleteOptions.session = session;
            }
            
            return await this.model.findOneAndDelete(filter, deleteOptions);
        } catch (error) {
            throw this._handleError(error, 'findOneAndDelete');
        }
    }

    /**
     * Get collection statistics
     * @param {Object} [options] - Options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Collection statistics
     */
    async getStats(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [];
            
            if (tenantId) {
                pipeline.push({ $match: { tenantId } });
            }
            
            pipeline.push({
                $group: {
                    _id: null,
                    totalDocuments: { $sum: 1 },
                    avgCreatedAt: { $avg: '$createdAt' },
                    minCreatedAt: { $min: '$createdAt' },
                    maxCreatedAt: { $max: '$createdAt' }
                }
            });
            
            const [stats] = await this.model.aggregate(pipeline);
            
            return stats || {
                totalDocuments: 0,
                avgCreatedAt: null,
                minCreatedAt: null,
                maxCreatedAt: null
            };
        } catch (error) {
            throw this._handleError(error, 'getStats');
        }
    }
}

export default GenericRepository;