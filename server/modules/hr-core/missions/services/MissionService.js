import MissionRepository from '../../../../repositories/modules/MissionRepository.js';
import { Op } from 'sequelize';

/**
 * Mission Service - Business logic layer for mission operations
 * Uses MissionRepository for data access
 */
class MissionService {
  constructor() {
    this.missionRepository = new MissionRepository();
  }

  /**
   * Get all missions
   */
  async getAllMissions(tenantId, options = {}) {
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

    return await this.missionRepository.findAll(filter, queryOptions);
  }

  /**
   * Create mission
   */
  async createMission(missionData, tenantId) {
    const dataToCreate = {
      ...missionData,
      tenantId
    };

    // Calculate duration if not provided
    if (!dataToCreate.duration && dataToCreate.startDate && dataToCreate.endDate) {
      const start = new Date(dataToCreate.startDate);
      const end = new Date(dataToCreate.endDate);
      dataToCreate.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    const mission = await this.missionRepository.create(dataToCreate);
    
    // Return populated mission
    return await this.missionRepository.findById(mission.id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get mission by ID
   */
  async getMissionById(id, tenantId) {
    const mission = await this.missionRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
          { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
          { association: 'department', attributes: ['name', 'code'] }
        ]
      }
    );

    if (!mission) {
      throw new Error('Mission not found');
    }

    return mission;
  }

  /**
   * Update mission
   */
  async updateMission(id, updateData, tenantId) {
    const mission = await this.missionRepository.findOne({ id, tenantId });
    
    if (!mission) {
      throw new Error('Mission not found');
    }

    // Recalculate duration if dates are updated
    if ((updateData.startDate || updateData.endDate) && !updateData.duration) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : mission.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : mission.endDate;
      
      if (startDate && endDate) {
        updateData.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    const updatedMission = await this.missionRepository.update(id, updateData);
    
    // Return populated mission
    return await this.missionRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Delete mission
   */
  async deleteMission(id, tenantId) {
    const mission = await this.missionRepository.findOne({ id, tenantId });
    
    if (!mission) {
      throw new Error('Mission not found');
    }

    await this.missionRepository.delete(id);
    return { message: 'Mission deleted' };
  }

  /**
   * Approve mission
   */
  async approveMission(id, approvedBy, tenantId) {
    const mission = await this.missionRepository.findOne({ id, tenantId });
    
    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== 'pending') {
      throw new Error('Only pending missions can be approved');
    }

    const updateData = {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    };

    await this.missionRepository.update(id, updateData);
    
    // Return populated mission
    return await this.missionRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Reject mission
   */
  async rejectMission(id, rejectedBy, rejectionReason, tenantId) {
    const mission = await this.missionRepository.findOne({ id, tenantId });
    
    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== 'pending') {
      throw new Error('Only pending missions can be rejected');
    }

    const updateData = {
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason
    };

    await this.missionRepository.update(id, updateData);
    
    // Return populated mission
    return await this.missionRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'rejectedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Complete mission
   */
  async completeMission(id, completedBy, completionNotes, tenantId) {
    const mission = await this.missionRepository.findOne({ id, tenantId });
    
    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== 'approved' && mission.status !== 'in_progress') {
      throw new Error('Only approved or in-progress missions can be completed');
    }

    const updateData = {
      status: 'completed',
      completedAt: new Date(),
      completedBy,
      completionNotes
    };

    await this.missionRepository.update(id, updateData);
    
    // Return populated mission
    return await this.missionRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'completedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get missions by employee
   */
  async getMissionsByEmployee(employeeId, tenantId, options = {}) {
    return await this.missionRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get missions by status
   */
  async getMissionsByStatus(status, tenantId, options = {}) {
    return await this.missionRepository.findByStatus(status, tenantId, options);
  }

  /**
   * Get missions by date range
   */
  async getMissionsByDateRange(startDate, endDate, tenantId, options = {}) {
    return await this.missionRepository.findByDateRange(startDate, endDate, tenantId, options);
  }

  /**
   * Get missions by department
   */
  async getMissionsByDepartment(departmentId, tenantId, options = {}) {
    return await this.missionRepository.findByDepartment(departmentId, tenantId, options);
  }

  /**
   * Get mission statistics
   */
  async getMissionStatistics(tenantId, year = null) {
    const filter = { tenantId };
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      filter.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const missions = await this.missionRepository.find(filter);
    
    const statistics = {
      totalMissions: missions.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      in_progress: 0,
      totalDays: 0,
      averageDuration: 0,
      byLocation: {},
      byMonth: {}
    };

    missions.forEach(mission => {
      // Status counts
      statistics[mission.status]++;
      
      // Total days
      statistics.totalDays += mission.duration || 0;
      
      // By location
      if (mission.location) {
        if (!statistics.byLocation[mission.location]) {
          statistics.byLocation[mission.location] = 0;
        }
        statistics.byLocation[mission.location]++;
      }
      
      // By month
      const month = new Date(mission.startDate).getMonth() + 1;
      if (!statistics.byMonth[month]) {
        statistics.byMonth[month] = 0;
      }
      statistics.byMonth[month]++;
    });

    if (statistics.totalMissions > 0) {
      statistics.averageDuration = statistics.totalDays / statistics.totalMissions;
    }

    return statistics;
  }

  /**
   * Check mission conflicts
   */
  async checkMissionConflicts(employeeId, startDate, endDate, tenantId, excludeId = null) {
    const filter = {
      employee: employeeId,
      tenantId,
      status: { $in: ['approved', 'pending', 'in_progress'] },
      $or: [
        {
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: startDate }
        }
      ]
    };

    if (excludeId) {
      filter.id = { [Op.ne]: excludeId };
    }

    const conflicts = await this.missionRepository.findAll(filter);
    return conflicts;
  }

  /**
   * Get upcoming missions
   */
  async getUpcomingMissions(tenantId, days = 30, options = {}) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const filter = {
      tenantId,
      status: { [Op.in]: ['approved', 'in_progress'] },
      startDate: {
        [Op.gte]: now,
        [Op.lte]: futureDate
      }
    };

    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'approvedBy', attributes: ['firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['name', 'code'] }
      ],
      order: [['startDate', 'ASC']],
      ...options
    };

    return await this.missionRepository.findAll(filter, queryOptions);
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovalsForManager(managerId, tenantId) {
    // This would require getting employees under this manager first
    // For now, return all pending requests - can be enhanced based on org structure
    return await this.missionRepository.findByStatus('pending', tenantId, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId', 'manager'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }
}

export default MissionService;