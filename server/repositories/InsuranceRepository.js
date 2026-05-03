const BaseRepository = require('./BaseRepository');
const { Insurance } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Insurance data access operations
 */
class InsuranceRepository extends BaseRepository {
  constructor(companyId) {
    super(Insurance, companyId);
  }

  /**
   * Find insurance records for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's insurance records
   */
  async findByEmployee(employeeId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        employee_id: employeeId
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Find insurance records expiring within specified days
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} Expiring insurance records
   */
  async findExpiring(daysAhead) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        expiry_date: {
          [Op.between]: [now, futureDate]
        }
      },
      order: [['expiry_date', 'ASC']]
    });
  }
}

module.exports = InsuranceRepository;
