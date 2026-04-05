import VacationRepository from '../../../../repositories/modules/VacationRepository.js';
import { Op } from 'sequelize';

/**
 * Vacation Service - Business logic layer for vacation/leave operations
 * Uses VacationRepository for data access
 */
class VacationService {
  constructor() {
    this.vacationRepository = new VacationRepository();
  }

  /**
   * Get all vacation requests
   */
  async getAllVacations(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ],
      order: [['createdAt', 'DESC']],
      ...options
    };

    return await this.vacationRepository.findAll(filter, queryOptions);
  }

  /**
   * Create vacation request
   */
  async createVacation(vacationData, tenantId) {
    const dataToCreate = {
      ...vacationData,
      tenantId
    };

    // Calculate duration if not provided
    if (!dataToCreate.duration && dataToCreate.startDate && dataToCreate.endDate) {
      const start = new Date(dataToCreate.startDate);
      const end = new Date(dataToCreate.endDate);
      dataToCreate.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    const vacation = await this.vacationRepository.create(dataToCreate);
    
    // Return populated vacation
    return await this.vacationRepository.findById(vacation.id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get vacation by ID
   */
  async getVacationById(id, tenantId) {
    const vacation = await this.vacationRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
          { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
          { association: 'department', attributes: ['name', 'code'] }
        ]
      }
    );

    if (!vacation) {
      throw new Error('Vacation request not found');
    }

    return vacation;
  }

  /**
   * Update vacation request
   */
  async updateVacation(id, updateData, tenantId) {
    const vacation = await this.vacationRepository.findOne({ id, tenantId });
    
    if (!vacation) {
      throw new Error('Vacation request not found');
    }

    // Recalculate duration if dates are updated
    if ((updateData.startDate || updateData.endDate) && !updateData.duration) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : vacation.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : vacation.endDate;
      
      if (startDate && endDate) {
        updateData.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    const updatedVacation = await this.vacationRepository.update(id, updateData);
    
    // Return populated vacation
    return await this.vacationRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Delete vacation request
   */
  async deleteVacation(id, tenantId) {
    const vacation = await this.vacationRepository.findOne({ id, tenantId });
    
    if (!vacation) {
      throw new Error('Vacation request not found');
    }

    await this.vacationRepository.delete(id);
    return { message: 'Vacation request deleted' };
  }

  /**
   * Approve vacation request
   */
  async approveVacation(id, approvedBy, tenantId) {
    const vacation = await this.vacationRepository.findOne({ id, tenantId });
    
    if (!vacation) {
      throw new Error('Vacation request not found');
    }

    if (vacation.status !== 'pending') {
      throw new Error('Only pending vacation requests can be approved');
    }

    const updateData = {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    };

    await this.vacationRepository.update(id, updateData);
    
    // Return populated vacation
    return await this.vacationRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Reject vacation request
   */
  async rejectVacation(id, rejectedBy, rejectionReason, tenantId) {
    const vacation = await this.vacationRepository.findOne({ id, tenantId });
    
    if (!vacation) {
      throw new Error('Vacation request not found');
    }

    if (vacation.status !== 'pending') {
      throw new Error('Only pending vacation requests can be rejected');
    }

    const updateData = {
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason
    };

    await this.vacationRepository.update(id, updateData);
    
    // Return populated vacation
    return await this.vacationRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'rejectedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get vacation requests by employee
   */
  async getVacationsByEmployee(employeeId, tenantId, options = {}) {
    return await this.vacationRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get vacation requests by status
   */
  async getVacationsByStatus(status, tenantId, options = {}) {
    return await this.vacationRepository.findByStatus(status, tenantId, options);
  }

  /**
   * Get vacation requests by date range
   */
  async getVacationsByDateRange(startDate, endDate, tenantId, options = {}) {
    return await this.vacationRepository.findByDateRange(startDate, endDate, tenantId, options);
  }

  /**
   * Get vacation balance for employee
   */
  async getVacationBalance(employeeId, tenantId) {
    return await this.vacationRepository.getVacationBalance(employeeId, tenantId);
  }

  /**
   * Get vacation statistics
   */
  async getVacationStatistics(tenantId, year = null) {
    const filter = { tenantId };
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      filter.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const vacations = await this.vacationRepository.find(filter);
    
    const statistics = {
      totalRequests: vacations.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      totalDays: 0,
      averageDuration: 0,
      byType: {},
      byMonth: {}
    };

    vacations.forEach(vacation => {
      // Status counts
      statistics[vacation.status]++;
      
      // Total days
      statistics.totalDays += vacation.duration || 0;
      
      // By type
      if (!statistics.byType[vacation.type]) {
        statistics.byType[vacation.type] = 0;
      }
      statistics.byType[vacation.type]++;
      
      // By month
      const month = new Date(vacation.startDate).getMonth() + 1;
      if (!statistics.byMonth[month]) {
        statistics.byMonth[month] = 0;
      }
      statistics.byMonth[month]++;
    });

    if (statistics.totalRequests > 0) {
      statistics.averageDuration = statistics.totalDays / statistics.totalRequests;
    }

    return statistics;
  }

  /**
   * Check vacation conflicts
   */
  async checkVacationConflicts(employeeId, startDate, endDate, tenantId, excludeId = null) {
    const filter = {
      employee: employeeId,
      tenantId,
      status: { [Op.in]: ['approved', 'pending'] },
      [Op.or]: [
        {
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: startDate }
        }
      ]
    };

    if (excludeId) {
      filter.id = { [Op.ne]: excludeId };
    }

    const conflicts = await this.vacationRepository.findAll(filter);
    return conflicts;
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovalsForManager(managerId, tenantId) {
    // This would require getting employees under this manager first
    // For now, return all pending requests - can be enhanced based on org structure
    return await this.vacationRepository.findByStatus('pending', tenantId, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId', 'manager'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }
}

export default VacationService;