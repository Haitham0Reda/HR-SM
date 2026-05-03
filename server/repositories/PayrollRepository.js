const BaseRepository = require('./BaseRepository');
const { Payroll } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Payroll data access operations
 * All financial writes require transaction support
 */
class PayrollRepository extends BaseRepository {
  constructor(companyId) {
    super(Payroll, companyId);
  }

  /**
   * Find payroll records for a specific month and year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Array>} Payroll records
   */
  async findByMonth(month, year) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        month,
        year
      },
      order: [['employee_id', 'ASC']]
    });
  }

  /**
   * Find payroll records for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's payroll records
   */
  async findByEmployee(employeeId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        employee_id: employeeId
      },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
  }

  /**
   * Process payroll for multiple employees
   * @param {Array<number>} employeeIds - Array of employee IDs
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<Array>} Created payroll records
   */
  async processPayroll(employeeIds, month, year, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for payroll processing');
    }

    const payrollRecords = employeeIds.map(employeeId => ({
      company_id: this.companyId,
      employee_id: employeeId,
      month,
      year,
      status: 'processed',
      processed_at: new Date()
    }));

    return this.model.bulkCreate(payrollRecords, { transaction });
  }

  /**
   * Lock a payroll period to prevent further modifications
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<number>} Number of records locked
   */
  async lockPeriod(month, year, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for locking payroll period');
    }

    const [affectedCount] = await this.model.update(
      {
        is_locked: true,
        locked_at: new Date()
      },
      {
        where: {
          company_id: this.companyId,
          month,
          year,
          is_locked: false
        },
        transaction
      }
    );

    return affectedCount;
  }
}

module.exports = PayrollRepository;
