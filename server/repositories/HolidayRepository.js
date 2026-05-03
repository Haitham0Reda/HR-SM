const BaseRepository = require('./BaseRepository');
const { Holiday } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Holiday data access operations
 */
class HolidayRepository extends BaseRepository {
  constructor(companyId) {
    super(Holiday, companyId);
  }

  /**
   * Find holidays for a specific year
   * @param {number} year - Year
   * @returns {Promise<Array>} Holidays in the specified year
   */
  async findByYear(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Find upcoming holidays within specified days
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Upcoming holidays
   */
  async findUpcoming(days) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        date: {
          [Op.between]: [now, futureDate]
        }
      },
      order: [['date', 'ASC']]
    });
  }
}

module.exports = HolidayRepository;
