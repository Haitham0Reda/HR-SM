const BaseRepository = require('./BaseRepository');
const { Clinic } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Clinic data access operations
 */
class ClinicRepository extends BaseRepository {
  constructor(companyId) {
    super(Clinic, companyId);
  }

  /**
   * Find clinic appointments for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's clinic appointments
   */
  async findByEmployee(employeeId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        employee_id: employeeId
      },
      order: [['appointment_date', 'DESC']]
    });
  }

  /**
   * Find clinic appointments for a specific date
   * @param {Date} date - Appointment date
   * @returns {Promise<Array>} Appointments on the specified date
   */
  async findByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.model.findAll({
      where: {
        company_id: this.companyId,
        appointment_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['appointment_date', 'ASC']]
    });
  }
}

module.exports = ClinicRepository;
