/**
 * @fileoverview Repository interface definitions using JSDoc
 * These interfaces define the contracts that all repositories must implement
 */

/**
 * @typedef {Object} QueryOptions
 * @property {number} [limit] - Maximum number of documents to return
 * @property {number} [skip] - Number of documents to skip
 * @property {Object} [sort] - Sort criteria
 * @property {string|Object} [select] - Fields to include/exclude
 * @property {string|Object} [populate] - Fields to populate
 * @property {string} [tenantId] - Tenant ID for multi-tenant operations
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - Page number (1-based)
 * @property {number} [limit=10] - Documents per page
 * @property {Object} [sort] - Sort criteria
 * @property {string|Object} [select] - Fields to select
 * @property {string|Object} [populate] - Fields to populate
 * @property {string} [tenantId] - Tenant ID for multi-tenant operations
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
 * @typedef {Object} TransactionOptions
 * @property {mongoose.ClientSession} [session] - Transaction session
 * @property {string} [tenantId] - Tenant ID for multi-tenant operations
 */

/**
 * @typedef {Object} SoftDeleteOptions
 * @property {mongoose.ClientSession} [session] - Transaction session
 * @property {string} [tenantId] - Tenant ID for multi-tenant operations
 * @property {string} [deletedBy] - User ID who performed the deletion
 */

/**
 * Base repository interface that all repositories must implement
 * @interface IRepository
 * @template T - The document type
 */

/**
 * Create a new document
 * @function
 * @name IRepository#create
 * @param {Partial<T>} data - Document data
 * @param {TransactionOptions} [options] - Additional options
 * @returns {Promise<T>} Created document
 */

/**
 * Find document by ID
 * @function
 * @name IRepository#findById
 * @param {string} id - Document ID
 * @param {QueryOptions} [options] - Query options
 * @returns {Promise<T|null>} Found document or null
 */

/**
 * Find single document by filter
 * @function
 * @name IRepository#findOne
 * @param {Object} filter - Query filter
 * @param {QueryOptions} [options] - Query options
 * @returns {Promise<T|null>} Found document or null
 */

/**
 * Find multiple documents
 * @function
 * @name IRepository#find
 * @param {Object} filter - Query filter
 * @param {QueryOptions} [options] - Query options
 * @returns {Promise<Array<T>>} Array of documents
 */

/**
 * Update document by ID
 * @function
 * @name IRepository#update
 * @param {string} id - Document ID
 * @param {Partial<T>} data - Update data
 * @param {TransactionOptions & {new?: boolean}} [options] - Update options
 * @returns {Promise<T|null>} Updated document or null
 */

/**
 * Delete document by ID (hard delete)
 * @function
 * @name IRepository#delete
 * @param {string} id - Document ID
 * @param {TransactionOptions} [options] - Delete options
 * @returns {Promise<boolean>} True if deleted, false if not found
 */

/**
 * Soft delete document by ID
 * @function
 * @name IRepository#softDelete
 * @param {string} id - Document ID
 * @param {SoftDeleteOptions} [options] - Delete options
 * @returns {Promise<T|null>} Updated document or null
 */

/**
 * Count documents matching filter
 * @function
 * @name IRepository#count
 * @param {Object} filter - Query filter
 * @param {Object} [options] - Count options
 * @returns {Promise<number>} Document count
 */

/**
 * Check if document exists
 * @function
 * @name IRepository#exists
 * @param {Object} filter - Query filter
 * @param {Object} [options] - Options
 * @returns {Promise<boolean>} True if exists, false otherwise
 */

/**
 * Paginate documents
 * @function
 * @name IRepository#paginate
 * @param {Object} filter - Query filter
 * @param {PaginationOptions} [options] - Pagination options
 * @returns {Promise<PaginationResult<T>>} Paginated result
 */

/**
 * Execute operations within a transaction
 * @function
 * @name IRepository#withTransaction
 * @param {Function} operations - Function containing operations to execute
 * @returns {Promise<*>} Result of operations
 */

/**
 * Create query builder for complex queries
 * @function
 * @name IRepository#query
 * @returns {QueryBuilder} Query builder instance
 */

export default {};