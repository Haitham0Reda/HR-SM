const BaseRepository = require('./BaseRepository');
const { Overtime } = require('../models');

/**
 * Repository for Overtime data access operations
 */
class OvertimeRepository extends BaseRepository {
  constructor(companyId) {
    super(Overtime, companyId);
  }

  /**
   * Find overtime records for a specific employee
   * @param {number} employeeId - Employee's user ID
   * @returns {Promise<Array>} Employee's overtime records
   */
  async findByEmployee(employeeId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        employee_id: employeeId
      },
      order: [['date', 'DESC']]
    });
  }

  /**
   * Find pending overtime requests
   * @returns {Promise<Array>} Pending overtime requests
   */
  async findPending() {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        status: 'pending'
      },
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Approve overtime request
   * @param {number} id - Overtime request ID
   * @param {number} approverId - ID of approving manager
   * @param {Object} transaction - Sequelize transaction (required)
   * @returns {Promise<Object>} Updated overtime record
   */
  async approve(id, approverId, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for approving overtime');
    }

    const overtime = await this.model.findOne({
      where: {
        id,
        company_id: this.companyId
      },
      transaction
    });

    if (!overtime) {
      throw new Error('Overtime request not found');
    }

    await overtime.update(
      {
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date()
      },
      { transaction }
    );

    return overtime;
  }
}

module.exports = OvertimeRepository;
