import HolidayRepository from '../../../../repositories/HolidayRepository.js';
import { Op } from 'sequelize';

/**
 * Holiday Service - Business logic layer for holiday operations
 * Uses HolidayRepository for data access
 */
class HolidayService {
  constructor() {
    this.holidayRepository = new HolidayRepository();
  }

  /**
   * Get all holidays
   */
  async getAllHolidays(tenantId, options = {}) {
    const filter = { tenantId };
    
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    const queryOptions = {
      order: [['date', 'ASC']],
      ...options
    };

    return await this.holidayRepository.findAll(filter, queryOptions);
  }

  /**
   * Create holiday
   */
  async createHoliday(holidayData, tenantId) {
    const dataToCreate = {
      ...holidayData,
      tenantId
    };

    const holiday = await this.holidayRepository.create(dataToCreate);
    return holiday;
  }

  /**
   * Get holiday by ID
   */
  async getHolidayById(id, tenantId) {
    const holiday = await this.holidayRepository.findOne({ id, tenantId });

    if (!holiday) {
      throw new Error('Holiday not found');
    }

    return holiday;
  }

  /**
   * Update holiday
   */
  async updateHoliday(id, updateData, tenantId) {
    const holiday = await this.holidayRepository.findOne({ id, tenantId });
    
    if (!holiday) {
      throw new Error('Holiday not found');
    }

    return await this.holidayRepository.update(id, updateData);
  }

  /**
   * Delete holiday
   */
  async deleteHoliday(id, tenantId) {
    const holiday = await this.holidayRepository.findOne({ id, tenantId });
    
    if (!holiday) {
      throw new Error('Holiday not found');
    }

    await this.holidayRepository.delete(id);
    return { message: 'Holiday deleted' };
  }

  /**
   * Get holidays by year
   */
  async getHolidaysByYear(year, tenantId, options = {}) {
    return await this.holidayRepository.findByYear(year, tenantId, options);
  }

  /**
   * Get upcoming holidays
   */
  async getUpcomingHolidays(days, tenantId, options = {}) {
    return await this.holidayRepository.findUpcoming(days, tenantId, options);
  }
}

export default HolidayService;
