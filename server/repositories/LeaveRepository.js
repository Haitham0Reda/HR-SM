const BaseRepository = require('./BaseRepository');
const { Leave } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Leave data access operations
 * Handles leave requests with proper transaction support
 */
class LeaveRepository extends BaseRepository {
  constructor(companyId) {
    super(Leave, companyId);
  }

  /**
   * Find pending leave requests for a specific manager
   * @param {number} managerId - Manager's user ID
   * @returns {Promise<Array>} Pending leave requests
   */
  async findPendingByManager(managerId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        manager_id: managerId,
        status: 'pending'
      },
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Find all leave requests for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's leave requests
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
   * Find leave requests by status
   * @param {string} status - Leave status (pending, approved, rejected)
   * @returns {Promise<Array>} Leave requests with specified status
   */
  async findByStatus(status) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        status
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Update leave request status with transaction support
   * @param {number} id - Leave request ID
   * @param {string} status - New status (approved, rejected)
   * @param {number} approverId - ID of approving manager
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object>} Updated leave request
   */
  async updateStatus(id, status, approverId, transaction) {
    const leave = await this.model.findOne({
      where: {
        id,
        company_id: this.companyId
      },
      transaction
    });

    if (!leave) {
      throw new Error('Leave request not found');
    }

    await leave.update(
      {
        status,
        approved_by: approverId,
        approved_at: new Date()
      },
      { transaction }
    );

    return leave;
  }
}

module.exports = LeaveRepository;
