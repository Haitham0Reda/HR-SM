const BaseRepository = require('./BaseRepository');
const { Mission } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Mission data access operations
 */
class MissionRepository extends BaseRepository {
  constructor(companyId) {
    super(Mission, companyId);
  }

  /**
   * Find missions for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's missions
   */
  async findByEmployee(employeeId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        employee_id: employeeId
      },
      order: [['start_date', 'DESC']]
    });
  }

  /**
   * Find active missions
   * @returns {Promise<Array>} Active missions
   */
  async findActive() {
    const now = new Date();
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        start_date: {
          [Op.lte]: now
        },
        end_date: {
          [Op.gte]: now
        },
        status: 'active'
      },
      order: [['start_date', 'ASC']]
    });
  }
}

module.exports = MissionRepository;
