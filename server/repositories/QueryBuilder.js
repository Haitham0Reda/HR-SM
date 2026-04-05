/**
 * Query Builder - PostgreSQL (Sequelize)
 * 
 * Query builder for constructing complex PostgreSQL queries
 * with method chaining and advanced filtering capabilities.
 * Enforces multi-tenancy with mandatory tenant() method.
 */

import { Op } from 'sequelize';

class QueryBuilder {
  /**
   * @param {Sequelize.Model} model - Sequelize model
   */
  constructor(model) {
    this.model = model;
    this._where = {};
    this._options = {};
    this._tenantId = null;
    this._includes = [];
  }

  // ==================== BASIC QUERY METHODS ====================

  /**
   * Set tenant context (REQUIRED for multi-tenant models)
   * @param {string} tenantId - Tenant ID
   * @returns {QueryBuilder} This instance for chaining
   */
  tenant(tenantId) {
    this._tenantId = tenantId;
    return this;
  }

  /**
   * Add where condition
   * @param {Object|string} field - Field name or filter object
   * @param {*} [value] - Field value
   * @returns {QueryBuilder} This instance for chaining
   */
  where(field, value) {
    if (typeof field === 'object') {
      Object.assign(this._where, field);
    } else {
      this._where[field] = value;
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
    this._where[field] = value;
    return this;
  }

  /**
   * Add not equals condition
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @returns {QueryBuilder} This instance for chaining
   */
  notEquals(field, value) {
    this._where[field] = { [Op.ne]: value };
    return this;
  }

  /**
   * Add in condition
   * @param {string} field - Field name
   * @param {Array} values - Array of values
   * @returns {QueryBuilder} This instance for chaining
   */
  in(field, values) {
    this._where[field] = { [Op.in]: values };
    return this;
  }

  /**
   * Add not in condition
   * @param {string} field - Field name
   * @param {Array} values - Array of values
   * @returns {QueryBuilder} This instance for chaining
   */
  notIn(field, values) {
    this._where[field] = { [Op.notIn]: values };
    return this;
  }

  /**
   * Add greater than condition
   * @param {string} field - Field name
   * @param {*} value - Comparison value
   * @returns {QueryBuilder} This instance for chaining
   */
  greaterThan(field, value) {
    this._where[field] = { [Op.gt]: value };
    return this;
  }

  /**
   * Add greater than or equal condition
   * @param {string} field - Field name
   * @param {*} value - Comparison value
   * @returns {QueryBuilder} This instance for chaining
   */
  greaterThanOrEqual(field, value) {
    this._where[field] = { [Op.gte]: value };
    return this;
  }

  /**
   * Add less than condition
   * @param {string} field - Field name
   * @param {*} value - Comparison value
   * @returns {QueryBuilder} This instance for chaining
   */
  lessThan(field, value) {
    this._where[field] = { [Op.lt]: value };
    return this;
  }

  /**
   * Add less than or equal condition
   * @param {string} field - Field name
   * @param {*} value - Comparison value
   * @returns {QueryBuilder} This instance for chaining
   */
  lessThanOrEqual(field, value) {
    this._where[field] = { [Op.lte]: value };
    return this;
  }

  /**
   * Add between condition
   * @param {string} field - Field name
   * @param {*} min - Minimum value
   * @param {*} max - Maximum value
   * @returns {QueryBuilder} This instance for chaining
   */
  between(field, min, max) {
    this._where[field] = { [Op.between]: [min, max] };
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
    this._where[field] = {
      [Op.gte]: startDate,
      [Op.lte]: endDate
    };
    return this;
  }

  // ==================== PATTERN MATCHING METHODS ====================

  /**
   * Add LIKE condition (case-insensitive)
   * @param {string} field - Field name
   * @param {string} pattern - Search pattern (use % for wildcards)
   * @returns {QueryBuilder} This instance for chaining
   */
  like(field, pattern) {
    this._where[field] = { [Op.iLike]: pattern };
    return this;
  }

  /**
   * Add starts with condition
   * @param {string} field - Field name
   * @param {string} text - Text to match at start
   * @returns {QueryBuilder} This instance for chaining
   */
  startsWith(field, text) {
    this._where[field] = { [Op.iLike]: `${text}%` };
    return this;
  }

  /**
   * Add ends with condition
   * @param {string} field - Field name
   * @param {string} text - Text to match at end
   * @returns {QueryBuilder} This instance for chaining
   */
  endsWith(field, text) {
    this._where[field] = { [Op.iLike]: `%${text}` };
    return this;
  }

  /**
   * Add contains condition (substring match)
   * @param {string} field - Field name
   * @param {string} text - Text to search for
   * @returns {QueryBuilder} This instance for chaining
   */
  contains(field, text) {
    this._where[field] = { [Op.iLike]: `%${text}%` };
    return this;
  }

  /**
   * Add IS NULL condition
   * @param {string} field - Field name
   * @returns {QueryBuilder} This instance for chaining
   */
  isNull(field) {
    this._where[field] = { [Op.is]: null };
    return this;
  }

  /**
   * Add IS NOT NULL condition
   * @param {string} field - Field name
   * @returns {QueryBuilder} This instance for chaining
   */
  isNotNull(field) {
    this._where[field] = { [Op.not]: null };
    return this;
  }

  // ==================== LOGICAL OPERATORS ====================

  /**
   * Add OR condition
   * @param {...Object} conditions - Condition objects to OR together
   * @returns {QueryBuilder} This instance for chaining
   */
  or(...conditions) {
    if (!this._where[Op.or]) {
      this._where[Op.or] = [];
    }
    this._where[Op.or].push(...conditions);
    return this;
  }

  /**
   * Add AND condition
   * @param {...Object} conditions - Condition objects to AND together
   * @returns {QueryBuilder} This instance for chaining
   */
  and(...conditions) {
    if (!this._where[Op.and]) {
      this._where[Op.and] = [];
    }
    this._where[Op.and].push(...conditions);
    return this;
  }

  // ==================== QUERY MODIFIERS ====================

  /**
   * Set sort order
   * @param {Array|Object|string} order - Sort criteria (Sequelize format)
   * @returns {QueryBuilder} This instance for chaining
   */
  sort(order) {
    this._options.order = order;
    return this;
  }

  /**
   * Set limit
   * @param {number} limit - Maximum number of records
   * @returns {QueryBuilder} This instance for chaining
   */
  limit(limit) {
    this._options.limit = limit;
    return this;
  }

  /**
   * Set offset (skip)
   * @param {number} offset - Number of records to skip
   * @returns {QueryBuilder} This instance for chaining
   */
  skip(offset) {
    this._options.offset = offset;
    return this;
  }

  /**
   * Set field selection
   * @param {Array|string} attributes - Fields to select
   * @returns {QueryBuilder} This instance for chaining
   */
  select(attributes) {
    this._options.attributes = attributes;
    return this;
  }

  /**
   * Add include for joins/eager loading
   * @param {Object|Array} includes - Association includes
   * @returns {QueryBuilder} This instance for chaining
   */
  include(includes) {
    if (Array.isArray(includes)) {
      this._includes.push(...includes);
    } else {
      this._includes.push(includes);
    }
    return this;
  }

  /**
   * Add pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @returns {QueryBuilder} This instance for chaining
   */
  paginate(page, limit) {
    const offset = (page - 1) * limit;
    this._options.offset = offset;
    this._options.limit = limit;
    return this;
  }

  /**
   * Exclude soft deleted documents
   * @returns {QueryBuilder} This instance for chaining
   */
  excludeDeleted() {
    this._where.deletedAt = { [Op.is]: null };
    return this;
  }

  /**
   * Include only soft deleted documents
   * @returns {QueryBuilder} This instance for chaining
   */
  onlyDeleted() {
    this._where.deletedAt = { [Op.not]: null };
    return this;
  }

  // ==================== EXECUTION METHODS ====================

  /**
   * Build final query options with tenant enforcement
   * @private
   * @returns {Object} Query options
   */
  _buildQueryOptions() {
    const where = { ...this._where };

    // Enforce tenant isolation (MANDATORY if tenant was set)
    if (this._tenantId) {
      where.tenantId = this._tenantId;
    }

    const options = {
      where,
      ...this._options
    };

    // Merge includes if any
    if (this._includes.length > 0) {
      options.include = this._includes;
    }

    return options;
  }

  /**
   * Execute the query and return records
   * @returns {Promise<Array>} Array of records
   */
  async execute() {
    const options = this._buildQueryOptions();
    return await this.model.findAll(options);
  }

  /**
   * Execute the query and return first record
   * @returns {Promise<Object|null>} First record or null
   */
  async executeOne() {
    const options = this._buildQueryOptions();
    return await this.model.findOne(options);
  }

  /**
   * Count records matching the query
   * @returns {Promise<number>} Record count
   */
  async count() {
    const options = this._buildQueryOptions();
    return await this.model.count(options);
  }

  /**
   * Check if any records match the query
   * @returns {Promise<boolean>} True if records exist
   */
  async exists() {
    const count = await this.count({ limit: 1 });
    return count > 0;
  }

  /**
   * Execute pagination query with metadata
   * @param {number} [page=1] - Page number (1-based)
   * @param {number} [limit=10] - Records per page
   * @returns {Promise<Object>} Paginated result with data, total, page, limit, totalPages
   */
  async paginate(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const findOptions = this._buildQueryOptions();
    findOptions.limit = limit;
    findOptions.offset = offset;

    const countOptions = this._buildQueryOptions();

    const [data, total] = await Promise.all([
      this.model.findAll(findOptions),
      this.model.count(countOptions)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get the built where clause
   * @returns {Object} Where clause
   */
  getWhere() {
    return { ...this._where };
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
    this._where = {};
    this._options = {};
    this._tenantId = null;
    this._includes = [];
    return this;
  }

  /**
   * Clone the query builder
   * @returns {QueryBuilder} New query builder instance
   */
  clone() {
    const cloned = new QueryBuilder(this.model);
    cloned._where = { ...this._where };
    cloned._options = { ...this._options };
    cloned._tenantId = this._tenantId;
    cloned._includes = [...this._includes];
    return cloned;
  }
}

export default QueryBuilder;
