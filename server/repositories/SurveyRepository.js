const BaseRepository = require('./BaseRepository');
const { Survey } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Survey data access operations
 */
class SurveyRepository extends BaseRepository {
  constructor(companyId) {
    super(Survey, companyId);
  }

  /**
   * Find active surveys
   * @returns {Promise<Array>} Active surveys
   */
  async findActive() {
    const now = new Date();
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        status: 'active',
        start_date: {
          [Op.lte]: now
        },
        end_date: {
          [Op.gte]: now
        }
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Find surveys for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's surveys
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
   * Submit survey response
   * @param {Object} data - Survey response data
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<Object>} Created survey response
   */
  async submitResponse(data, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for submitting survey response');
    }

    const responseData = {
      ...data,
      company_id: this.companyId,
      submitted_at: new Date()
    };

    return this.model.create(responseData, { transaction });
  }
}

module.exports = SurveyRepository;
