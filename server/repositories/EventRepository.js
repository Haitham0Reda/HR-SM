const BaseRepository = require('./BaseRepository');
const { Event } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Event data access operations
 */
class EventRepository extends BaseRepository {
  constructor(companyId) {
    super(Event, companyId);
  }

  /**
   * Find upcoming events
   * @returns {Promise<Array>} Upcoming events
   */
  async findUpcoming() {
    const now = new Date();
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        start_date: {
          [Op.gte]: now
        }
      },
      order: [['start_date', 'ASC']]
    });
  }

  /**
   * Find events for a specific month and year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Array>} Events in the specified month
   */
  async findByMonth(month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        start_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['start_date', 'ASC']]
    });
  }
}

module.exports = EventRepository;
