/**
 * AttendanceRepository - PostgreSQL (Sequelize)
 * 
 * Repository for Attendance model operations with automatic tenant scoping.
 * Extends BaseRepository to provide attendance-specific query methods.
 * 
 * @extends BaseRepository
 */

import { Op } from 'sequelize';
import BaseRepository from './BaseRepository.js';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';

class AttendanceRepository extends BaseRepository {
  /**
   * Create AttendanceRepository instance
   * @param {string} tenantId - Tenant ID for multi-tenant operations
   */
  constructor(tenantId) {
    super(Attendance, tenantId);
  }

  /**
   * Find attendance records for an employee within a date range
   * @param {string|UUID} employeeId - Employee ID
   * @param {Date|string} from - Start date (inclusive)
   * @param {Date|string} to - End date (inclusive)
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Sort criteria (default: date ASC)
   * @returns {Promise<Array>} Array of attendance records
   */
  async findByEmployeeAndDateRange(employeeId, from, to, options = {}) {
    try {
      const { attributes, include, order = [['date', 'ASC']] } = options;
      
      const where = {
        employeeId,
        date: {
          [Op.gte]: from,
          [Op.lte]: to
        },
        company_id: this.tenantId
      };
      
      const findOptions = { where, order };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      if (include) {
        findOptions.include = include;
      }
      
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmployeeAndDateRange');
    }
  }

  /**
   * Find today's attendance record for an employee
   * @param {string|UUID} employeeId - Employee ID
   * @param {Object} [options] - Query options
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @returns {Promise<Object|null>} Today's attendance record or null
   */
  async findTodayRecord(employeeId, options = {}) {
    try {
      const { attributes, include } = options;
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const where = {
        employeeId,
        date: today,
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
      throw this._handleError(error, 'findTodayRecord');
    }
  }

  /**
   * Bulk create attendance records with automatic company_id injection
   * @param {Array<Object>} records - Array of attendance records to create
   * @param {Object} [options] - Create options
   * @param {Object} [options.transaction] - Sequelize transaction
   * @param {boolean} [options.validate=true] - Whether to validate records
   * @param {boolean} [options.ignoreDuplicates=false] - Ignore duplicate key errors
   * @returns {Promise<Array>} Array of created records
   */
  async bulkCreate(records, options = {}) {
    try {
      const { transaction, validate = true, ignoreDuplicates = false } = options;
      
      // Inject tenant context into all records
      const recordsWithTenant = records.map(record => ({
        ...record,
        company_id: this.tenantId
      }));
      
      const createOptions = {
        validate,
        ignoreDuplicates
      };
      
      if (transaction) {
        createOptions.transaction = transaction;
      }
      
      return await this.model.bulkCreate(recordsWithTenant, createOptions);
    } catch (error) {
      throw this._handleError(error, 'bulkCreate');
    }
  }

  /**
   * Get monthly attendance report for all employees or specific department
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (e.g., 2024)
   * @param {Object} [options] - Query options
   * @param {string|UUID} [options.departmentId] - Filter by department
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {boolean} [options.includeEmployee=true] - Include employee details
   * @param {boolean} [options.includeDepartment=false] - Include department details
   * @param {Object} [options.order] - Sort criteria
   * @returns {Promise<Array>} Array of attendance records for the month
   */
  async getMonthlyReport(month, year, options = {}) {
    try {
      const {
        departmentId,
        attributes,
        includeEmployee = true,
        includeDepartment = false,
        order = [['date', 'ASC'], ['employeeId', 'ASC']]
      } = options;
      
      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      const where = {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        },
        company_id: this.tenantId
      };
      
      if (departmentId) {
        where.departmentId = departmentId;
      }
      
      const findOptions = { where, order };
      
      if (attributes) {
        findOptions.attributes = attributes;
      }
      
      // Build include array
      const includeArray = [];
      
      if (includeEmployee) {
        includeArray.push({
          model: User,
          as: 'employee',
          attributes: ['id', 'employeeId', 'personalInfo', 'departmentId']
        });
      }
      
      if (includeDepartment) {
        includeArray.push({
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        });
      }
      
      if (includeArray.length > 0) {
        findOptions.include = includeArray;
      }
      
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'getMonthlyReport');
    }
  }

  /**
   * Find attendance records by status
   * @param {string} status - Attendance status (e.g., 'present', 'absent', 'late')
   * @param {Object} [options] - Query options
   * @param {Date|string} [options.date] - Filter by specific date
   * @param {Date|string} [options.fromDate] - Start date for range
   * @param {Date|string} [options.toDate] - End date for range
   * @param {Array|string} [options.attributes] - Fields to select
   * @param {Array} [options.include] - Associations to include
   * @param {Object} [options.order] - Sort criteria
   * @param {number} [options.limit] - Maximum records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<Array>} Array of attendance records
   */
  async findByStatus(status, options = {}) {
    try {
      const {
        date,
        fromDate,
        toDate,
        attributes,
        include,
        order,
        limit,
        offset
      } = options;
      
      const where = {
        status,
        company_id: this.tenantId
      };
      
      // Add date filtering
      if (date) {
        where.date = date;
      } else if (fromDate && toDate) {
        where.date = {
          [Op.gte]: fromDate,
          [Op.lte]: toDate
        };
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
      throw this._handleError(error, 'findByStatus');
    }
  }

  /**
   * Count attendance records by status for a date range
   * @param {string} status - Attendance status
   * @param {Date|string} fromDate - Start date
   * @param {Date|string} toDate - End date
   * @returns {Promise<number>} Count of records
   */
  async countByStatusAndDateRange(status, fromDate, toDate) {
    try {
      const where = {
        status,
        date: {
          [Op.gte]: fromDate,
          [Op.lte]: toDate
        },
        company_id: this.tenantId
      };
      
      return await this.model.count({ where });
    } catch (error) {
      throw this._handleError(error, 'countByStatusAndDateRange');
    }
  }

  /**
   * Static factory to create a tenant-scoped AttendanceRepository instance
   * @param {string} tenantId - Tenant ID for multi-tenant operations
   * @returns {AttendanceRepository} AttendanceRepository instance
   */
  static withTenant(tenantId) {
    return new AttendanceRepository(tenantId);
  }
}

export default AttendanceRepository;
