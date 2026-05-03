/**
 * UserRepository - PostgreSQL (Sequelize)
 * 
 * Repository for User model operations with automatic tenant scoping.
 * Extends BaseRepository to provide user-specific query methods.
 * 
 * @extends BaseRepository
 */

import BaseRepository from './BaseRepository.js';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';

class UserRepository extends BaseRepository {
  /**
   * Create UserRepository instance
   * @param {string} tenantId - Tenant ID for multi-tenant operations
   */
  constructor(tenantId) {
    super(User, tenantId);
  }

  /**
   * Find user by email address
   * @param {string} email - User email address
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @returns {Promise<Object|null>} User record or null
   */
  async findByEmail(email, options = {}) {
    try {
      const { attributes, include } = options;
      
      const where = {
        email,
        company_id: this.tenantId
      };
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmail');
    }
  }

  /**
   * Find all users with a specific role
   * @param {string} role - User role (e.g., 'admin', 'manager', 'employee')
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Sort criteria
   * @param {number} [options.limit] - Maximum records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<Array>} Array of user records
   */
  async findByRole(role, options = {}) {
    try {
      const { attributes, include, order, limit, offset } = options;
      
      const where = {
        role,
        company_id: this.tenantId
      };
      
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
      throw this._handleError(error, 'findByRole');
    }
  }

  /**
   * Find all active employees
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Sort criteria
   * @param {number} [options.limit] - Maximum records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<Array>} Array of active employee records
   */
  async findActiveEmployees(options = {}) {
    try {
      const { attributes, include, order, limit, offset } = options;
      
      const where = {
        isActive: true,
        status: 'active',
        company_id: this.tenantId
      };
      
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
      throw this._handleError(error, 'findActiveEmployees');
    }
  }

  /**
   * Find all users in a specific department
   * @param {string|UUID} deptId - Department ID
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {boolean} [options.includeDepartment=false] - Include department details
   * @param {Object} [options.order] - Sort criteria
   * @param {number} [options.limit] - Maximum records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<Array>} Array of user records in the department
   */
  async findWithDepartment(deptId, options = {}) {
    try {
      const { attributes, includeDepartment = false, order, limit, offset } = options;
      
      const where = {
        departmentId: deptId,
        company_id: this.tenantId
      };
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (includeDepartment) {
        findOptions.include = [{
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }];
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
      throw this._handleError(error, 'findWithDepartment');
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @returns {Promise<Object|null>} User record or null
   */
  async findByUsername(username, options = {}) {
    try {
      const { attributes } = options;
      
      const where = {
        username,
        company_id: this.tenantId
      };
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByUsername');
    }
  }

  /**
   * Find user by employee ID
   * @param {string} employeeId - Employee ID
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @returns {Promise<Object|null>} User record or null
   */
  async findByEmployeeId(employeeId, options = {}) {
    try {
      const { attributes, include } = options;
      
      const where = {
        employeeId,
        company_id: this.tenantId
      };
      
      const findOptions = { where };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmployeeId');
    }
  }

  /**
   * Count users by status
   * @param {string} status - User status (e.g., 'active', 'vacation', 'resigned')
   * @returns {Promise<number>} Count of users with the specified status
   */
  async countByStatus(status) {
    try {
      const where = {
        status,
        company_id: this.tenantId
      };
      
      return await this.model.count({ where });
    } catch (error) {
      throw this._handleError(error, 'countByStatus');
    }
  }

  /**
   * Static factory to create a tenant-scoped UserRepository instance
   * @param {string} tenantId - Tenant ID for multi-tenant operations
   * @returns {UserRepository} UserRepository instance
   */
  static withTenant(tenantId) {
    return new UserRepository(tenantId);
  }
}

export default UserRepository;
