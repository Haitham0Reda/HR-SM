const BaseRepository = require('./BaseRepository');
const { Task } = require('../models');
const { Op } = require('sequelize');

/**
 * Repository for Task data access operations
 */
class TaskRepository extends BaseRepository {
  constructor(companyId) {
    super(Task, companyId);
  }

  /**
   * Find tasks assigned to a specific user
   * @param {number} userId - Assignee's user ID
   * @returns {Promise<Array>} Assigned tasks
   */
  async findByAssignee(userId) {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        assignee_id: userId
      },
      order: [['due_date', 'ASC']]
    });
  }

  /**
   * Find tasks by status
   * @param {string} status - Task status
   * @returns {Promise<Array>} Tasks with specified status
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
   * Find overdue tasks
   * @returns {Promise<Array>} Overdue tasks
   */
  async findOverdue() {
    return this.model.findAll({
      where: {
        company_id: this.companyId,
        due_date: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.notIn]: ['completed', 'cancelled']
        }
      },
      order: [['due_date', 'ASC']]
    });
  }
}

module.exports = TaskRepository;
