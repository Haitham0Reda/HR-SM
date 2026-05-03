const BaseRepository = require('./BaseRepository');
const { Document } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Document data access operations
 */
class DocumentRepository extends BaseRepository {
  constructor(companyId) {
    super(Document, companyId);
  }

  /**
   * Find documents for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's documents
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
   * Find documents by type
   * @param {string} type - Document type
   * @returns {Promise<Array>} Documents of specified type
   */
  async findByType(type) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        type
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Find documents expiring within specified days
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} Expiring documents
   */
  async findExpiring(daysAhead) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        expiry_date: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      order: [['expiry_date', 'ASC']]
    });
  }
}

module.exports = DocumentRepository;
