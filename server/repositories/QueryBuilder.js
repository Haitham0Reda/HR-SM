import mongoose from 'mongoose';

/**
 * Query builder for constructing complex MongoDB queries
 * with method chaining and advanced filtering capabilities
 */
class QueryBuilder {
    /**
     * @param {mongoose.Model} model - Mongoose model
     */
    constructor(model) {
        this.model = model;
        this._query = model.find();
        this._filters = {};
        this._options = {};
    }

    /**
     * Add where condition
     * @param {Object|string} field - Field name or filter object
     * @param {*} [value] - Field value
     * @returns {QueryBuilder} This instance for chaining
     */
    where(field, value) {
        if (typeof field === 'object') {
            Object.assign(this._filters, field);
        } else {
            this._filters[field] = value;
        }
        return this;
    }

    /**
     * Add equals condition
     * @param {string} field - Field name
     * @param {*} value - Field value
     * @returns {QueryBuilder} This instance for chaining
     */
    equals(field, value) {
        this._filters[field] = value;
        return this;
    }

    /**
     * Add not equals condition
     * @param {string} field - Field name
     * @param {*} value - Field value
     * @returns {QueryBuilder} This instance for chaining
     */
    notEquals(field, value) {
        this._filters[field] = { $ne: value };
        return this;
    }

    /**
     * Add in condition
     * @param {string} field - Field name
     * @param {Array} values - Array of values
     * @returns {QueryBuilder} This instance for chaining
     */
    in(field, values) {
        this._filters[field] = { $in: values };
        return this;
    }

    /**
     * Add not in condition
     * @param {string} field - Field name
     * @param {Array} values - Array of values
     * @returns {QueryBuilder} This instance for chaining
     */
    notIn(field, values) {
        this._filters[field] = { $nin: values };
        return this;
    }

    /**
     * Add greater than condition
     * @param {string} field - Field name
     * @param {*} value - Comparison value
     * @returns {QueryBuilder} This instance for chaining
     */
    greaterThan(field, value) {
        this._filters[field] = { $gt: value };
        return this;
    }

    /**
     * Add greater than or equal condition
     * @param {string} field - Field name
     * @param {*} value - Comparison value
     * @returns {QueryBuilder} This instance for chaining
     */
    greaterThanOrEqual(field, value) {
        this._filters[field] = { $gte: value };
        return this;
    }

    /**
     * Add less than condition
     * @param {string} field - Field name
     * @param {*} value - Comparison value
     * @returns {QueryBuilder} This instance for chaining
     */
    lessThan(field, value) {
        this._filters[field] = { $lt: value };
        return this;
    }

    /**
     * Add less than or equal condition
     * @param {string} field - Field name
     * @param {*} value - Comparison value
     * @returns {QueryBuilder} This instance for chaining
     */
    lessThanOrEqual(field, value) {
        this._filters[field] = { $lte: value };
        return this;
    }

    /**
     * Add date range condition
     * @param {string} field - Field name
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {QueryBuilder} This instance for chaining
     */
    dateRange(field, startDate, endDate) {
        this._filters[field] = {
            $gte: startDate,
            $lte: endDate
        };
        return this;
    }

    /**
     * Add regex condition for text search
     * @param {string} field - Field name
     * @param {string} pattern - Regex pattern
     * @param {string} [options='i'] - Regex options
     * @returns {QueryBuilder} This instance for chaining
     */
    regex(field, pattern, options = 'i') {
        this._filters[field] = new RegExp(pattern, options);
        return this;
    }

    /**
     * Add text search condition
     * @param {string} field - Field name
     * @param {string} text - Search text
     * @returns {QueryBuilder} This instance for chaining
     */
    contains(field, text) {
        return this.regex(field, text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }

    /**
     * Add exists condition
     * @param {string} field - Field name
     * @param {boolean} [exists=true] - Whether field should exist
     * @returns {QueryBuilder} This instance for chaining
     */
    exists(field, exists = true) {
        this._filters[field] = { $exists: exists };
        return this;
    }

    /**
     * Add OR condition
     * @param {Array<Object>} conditions - Array of condition objects
     * @returns {QueryBuilder} This instance for chaining
     */
    or(conditions) {
        if (!this._filters.$or) {
            this._filters.$or = [];
        }
        this._filters.$or.push(...conditions);
        return this;
    }

    /**
     * Add AND condition
     * @param {Array<Object>} conditions - Array of condition objects
     * @returns {QueryBuilder} This instance for chaining
     */
    and(conditions) {
        if (!this._filters.$and) {
            this._filters.$and = [];
        }
        this._filters.$and.push(...conditions);
        return this;
    }

    /**
     * Set sort order
     * @param {Object|string} sort - Sort criteria
     * @returns {QueryBuilder} This instance for chaining
     */
    sort(sort) {
        this._options.sort = sort;
        return this;
    }

    /**
     * Set limit
     * @param {number} limit - Maximum number of documents
     * @returns {QueryBuilder} This instance for chaining
     */
    limit(limit) {
        this._options.limit = limit;
        return this;
    }

    /**
     * Set skip
     * @param {number} skip - Number of documents to skip
     * @returns {QueryBuilder} This instance for chaining
     */
    skip(skip) {
        this._options.skip = skip;
        return this;
    }

    /**
     * Set field selection
     * @param {string|Object} select - Fields to select
     * @returns {QueryBuilder} This instance for chaining
     */
    select(select) {
        this._options.select = select;
        return this;
    }

    /**
     * Set population
     * @param {string|Object} populate - Fields to populate
     * @returns {QueryBuilder} This instance for chaining
     */
    populate(populate) {
        this._options.populate = populate;
        return this;
    }

    /**
     * Set tenant context
     * @param {string} tenantId - Tenant ID
     * @returns {QueryBuilder} This instance for chaining
     */
    tenant(tenantId) {
        this._filters.tenantId = tenantId;
        return this;
    }

    /**
     * Exclude soft deleted documents
     * @returns {QueryBuilder} This instance for chaining
     */
    excludeDeleted() {
        this._filters.isDeleted = { $ne: true };
        return this;
    }

    /**
     * Include only soft deleted documents
     * @returns {QueryBuilder} This instance for chaining
     */
    onlyDeleted() {
        this._filters.isDeleted = true;
        return this;
    }

    /**
     * Add pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Documents per page
     * @returns {QueryBuilder} This instance for chaining
     */
    paginate(page, limit) {
        const skip = (page - 1) * limit;
        this._options.skip = skip;
        this._options.limit = limit;
        return this;
    }

    /**
     * Execute the query and return documents
     * @returns {Promise<Array>} Array of documents
     */
    async exec() {
        let query = this.model.find(this._filters);

        if (this._options.select) {
            query = query.select(this._options.select);
        }

        if (this._options.populate) {
            query = query.populate(this._options.populate);
        }

        if (this._options.sort) {
            query = query.sort(this._options.sort);
        }

        if (this._options.limit) {
            query = query.limit(this._options.limit);
        }

        if (this._options.skip) {
            query = query.skip(this._options.skip);
        }

        return await query.exec();
    }

    /**
     * Execute the query and return first document
     * @returns {Promise<Object|null>} First document or null
     */
    async first() {
        const results = await this.limit(1).exec();
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Count documents matching the query
     * @returns {Promise<number>} Document count
     */
    async count() {
        return await this.model.countDocuments(this._filters);
    }

    /**
     * Check if any documents match the query
     * @returns {Promise<boolean>} True if documents exist
     */
    async exists() {
        const result = await this.model.exists(this._filters);
        return !!result;
    }

    /**
     * Execute aggregation pipeline
     * @param {Array} pipeline - Aggregation pipeline
     * @returns {Promise<Array>} Aggregation results
     */
    async aggregate(pipeline) {
        // Add match stage with current filters if any
        if (Object.keys(this._filters).length > 0) {
            pipeline.unshift({ $match: this._filters });
        }

        return await this.model.aggregate(pipeline);
    }

    /**
     * Get the built query filters
     * @returns {Object} Query filters
     */
    getFilters() {
        return { ...this._filters };
    }

    /**
     * Get the built query options
     * @returns {Object} Query options
     */
    getOptions() {
        return { ...this._options };
    }

    /**
     * Reset the query builder
     * @returns {QueryBuilder} This instance for chaining
     */
    reset() {
        this._filters = {};
        this._options = {};
        return this;
    }

    /**
     * Clone the query builder
     * @returns {QueryBuilder} New query builder instance
     */
    clone() {
        const cloned = new QueryBuilder(this.model);
        cloned._filters = { ...this._filters };
        cloned._options = { ...this._options };
        return cloned;
    }
}

export default QueryBuilder;