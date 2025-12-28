import OvertimeRepository from '../../../../repositories/modules/OvertimeRepository.js';

/**
 * Overtime Service - Business logic layer for overtime operations
 * Uses OvertimeRepository for data access
 */
class OvertimeService {
  constructor() {
    this.overtimeRepository = new OvertimeRepository();
  }

  /**
   * Get all overtime records
   */
  async getAllOvertime(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'approvedBy', select: 'firstName lastName email' },
        { path: 'department', select: 'name code' }
      ],
      sort: { createdAt: -1 },
      ...options
    };

    return await this.overtimeRepository.find(filter, queryOptions);
  }

  /**
   * Create overtime record
   */
  async createOvertime(overtimeData, tenantId) {
    const dataToCreate = {
      ...overtimeData,
      tenantId
    };

    // Calculate hours if not provided
    if (!dataToCreate.hours && dataToCreate.startTime && dataToCreate.endTime) {
      const start = new Date(dataToCreate.startTime);
      const end = new Date(dataToCreate.endTime);
      dataToCreate.hours = (end - start) / (1000 * 60 * 60); // Convert to hours
    }

    const overtime = await this.overtimeRepository.create(dataToCreate);
    
    // Return populated overtime
    return await this.overtimeRepository.findById(overtime._id, {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'approvedBy', select: 'firstName lastName email' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Get overtime by ID
   */
  async getOvertimeById(id, tenantId) {
    const overtime = await this.overtimeRepository.findOne(
      { _id: id, tenantId },
      {
        populate: [
          { path: 'employee', select: 'firstName lastName email employeeId' },
          { path: 'approvedBy', select: 'firstName lastName email' },
          { path: 'department', select: 'name code' }
        ]
      }
    );

    if (!overtime) {
      throw new Error('Overtime record not found');
    }

    return overtime;
  }

  /**
   * Update overtime record
   */
  async updateOvertime(id, updateData, tenantId) {
    const overtime = await this.overtimeRepository.findOne({ _id: id, tenantId });
    
    if (!overtime) {
      throw new Error('Overtime record not found');
    }

    // Recalculate hours if times are updated
    if ((updateData.startTime || updateData.endTime) && !updateData.hours) {
      const startTime = updateData.startTime ? new Date(updateData.startTime) : overtime.startTime;
      const endTime = updateData.endTime ? new Date(updateData.endTime) : overtime.endTime;
      
      if (startTime && endTime) {
        updateData.hours = (endTime - startTime) / (1000 * 60 * 60);
      }
    }

    const updatedOvertime = await this.overtimeRepository.update(id, updateData);
    
    // Return populated overtime
    return await this.overtimeRepository.findById(id, {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'approvedBy', select: 'firstName lastName email' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Delete overtime record
   */
  async deleteOvertime(id, tenantId) {
    const overtime = await this.overtimeRepository.findOne({ _id: id, tenantId });
    
    if (!overtime) {
      throw new Error('Overtime record not found');
    }

    await this.overtimeRepository.delete(id);
    return { message: 'Overtime record deleted' };
  }

  /**
   * Approve overtime request
   */
  async approveOvertime(id, approvedBy, tenantId) {
    const overtime = await this.overtimeRepository.findOne({ _id: id, tenantId });
    
    if (!overtime) {
      throw new Error('Overtime record not found');
    }

    if (overtime.status !== 'pending') {
      throw new Error('Only pending overtime requests can be approved');
    }

    const updateData = {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    };

    await this.overtimeRepository.update(id, updateData);
    
    // Return populated overtime
    return await this.overtimeRepository.findById(id, {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'approvedBy', select: 'firstName lastName email' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Reject overtime request
   */
  async rejectOvertime(id, rejectedBy, rejectionReason, tenantId) {
    const overtime = await this.overtimeRepository.findOne({ _id: id, tenantId });
    
    if (!overtime) {
      throw new Error('Overtime record not found');
    }

    if (overtime.status !== 'pending') {
      throw new Error('Only pending overtime requests can be rejected');
    }

    const updateData = {
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason
    };

    await this.overtimeRepository.update(id, updateData);
    
    // Return populated overtime
    return await this.overtimeRepository.findById(id, {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId' },
        { path: 'rejectedBy', select: 'firstName lastName email' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Get overtime by employee
   */
  async getOvertimeByEmployee(employeeId, tenantId, options = {}) {
    return await this.overtimeRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get overtime by status
   */
  async getOvertimeByStatus(status, tenantId, options = {}) {
    return await this.overtimeRepository.findByStatus(status, tenantId, options);
  }

  /**
   * Get overtime by date range
   */
  async getOvertimeByDateRange(startDate, endDate, tenantId, options = {}) {
    return await this.overtimeRepository.findByDateRange(startDate, endDate, tenantId, options);
  }

  /**
   * Get overtime by department
   */
  async getOvertimeByDepartment(departmentId, tenantId, options = {}) {
    return await this.overtimeRepository.findByDepartment(departmentId, tenantId, options);
  }

  /**
   * Get overtime statistics
   */
  async getOvertimeStatistics(tenantId, year = null, month = null) {
    const filter = { tenantId };
    
    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month 
        ? new Date(year, month, 0, 23, 59, 59) 
        : new Date(year, 11, 31, 23, 59, 59);
      
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const overtimeRecords = await this.overtimeRepository.find(filter);
    
    const statistics = {
      totalRecords: overtimeRecords.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalHours: 0,
      totalApprovedHours: 0,
      averageHours: 0,
      byEmployee: {},
      byDepartment: {},
      byMonth: {}
    };

    overtimeRecords.forEach(overtime => {
      // Status counts
      statistics[overtime.status]++;
      
      // Hours calculations
      const hours = overtime.hours || 0;
      statistics.totalHours += hours;
      
      if (overtime.status === 'approved') {
        statistics.totalApprovedHours += hours;
      }
      
      // By employee
      const employeeId = overtime.employee?.toString();
      if (employeeId) {
        if (!statistics.byEmployee[employeeId]) {
          statistics.byEmployee[employeeId] = {
            totalHours: 0,
            approvedHours: 0,
            records: 0
          };
        }
        statistics.byEmployee[employeeId].totalHours += hours;
        statistics.byEmployee[employeeId].records++;
        
        if (overtime.status === 'approved') {
          statistics.byEmployee[employeeId].approvedHours += hours;
        }
      }
      
      // By department
      const departmentId = overtime.department?.toString();
      if (departmentId) {
        if (!statistics.byDepartment[departmentId]) {
          statistics.byDepartment[departmentId] = {
            totalHours: 0,
            approvedHours: 0,
            records: 0
          };
        }
        statistics.byDepartment[departmentId].totalHours += hours;
        statistics.byDepartment[departmentId].records++;
        
        if (overtime.status === 'approved') {
          statistics.byDepartment[departmentId].approvedHours += hours;
        }
      }
      
      // By month
      const month = new Date(overtime.date).getMonth() + 1;
      if (!statistics.byMonth[month]) {
        statistics.byMonth[month] = {
          totalHours: 0,
          approvedHours: 0,
          records: 0
        };
      }
      statistics.byMonth[month].totalHours += hours;
      statistics.byMonth[month].records++;
      
      if (overtime.status === 'approved') {
        statistics.byMonth[month].approvedHours += hours;
      }
    });

    if (statistics.totalRecords > 0) {
      statistics.averageHours = statistics.totalHours / statistics.totalRecords;
    }

    return statistics;
  }

  /**
   * Calculate overtime compensation
   */
  async calculateOvertimeCompensation(employeeId, startDate, endDate, tenantId, hourlyRate = null) {
    const overtimeRecords = await this.overtimeRepository.findByDateRange(
      startDate, 
      endDate, 
      tenantId,
      {
        filter: { 
          employee: employeeId, 
          status: 'approved' 
        }
      }
    );

    let totalCompensation = 0;
    let totalHours = 0;
    const breakdown = [];

    overtimeRecords.forEach(overtime => {
      const hours = overtime.hours || 0;
      const rate = overtime.hourlyRate || hourlyRate || 0;
      const compensation = hours * rate;
      
      totalHours += hours;
      totalCompensation += compensation;
      
      breakdown.push({
        date: overtime.date,
        hours,
        rate,
        compensation,
        description: overtime.description
      });
    });

    return {
      employeeId,
      period: { startDate, endDate },
      totalHours,
      totalCompensation,
      averageRate: totalHours > 0 ? totalCompensation / totalHours : 0,
      breakdown
    };
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovalsForManager(managerId, tenantId) {
    // This would require getting employees under this manager first
    // For now, return all pending requests - can be enhanced based on org structure
    return await this.overtimeRepository.findByStatus('pending', tenantId, {
      populate: [
        { path: 'employee', select: 'firstName lastName email employeeId manager' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Bulk approve overtime requests
   */
  async bulkApproveOvertime(overtimeIds, approvedBy, tenantId) {
    const results = [];
    
    for (const overtimeId of overtimeIds) {
      try {
        const overtime = await this.approveOvertime(overtimeId, approvedBy, tenantId);
        results.push({ success: true, overtimeId, data: overtime });
      } catch (error) {
        results.push({ 
          success: false, 
          overtimeId, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * Get overtime summary for payroll
   */
  async getOvertimeSummaryForPayroll(tenantId, startDate, endDate) {
    const overtimeRecords = await this.overtimeRepository.findByDateRange(
      startDate, 
      endDate, 
      tenantId,
      {
        filter: { status: 'approved' },
        populate: [
          { path: 'employee', select: 'firstName lastName email employeeId' }
        ]
      }
    );

    const summary = {};

    overtimeRecords.forEach(overtime => {
      const employeeId = overtime.employee._id.toString();
      
      if (!summary[employeeId]) {
        summary[employeeId] = {
          employee: overtime.employee,
          totalHours: 0,
          totalCompensation: 0,
          records: []
        };
      }
      
      const hours = overtime.hours || 0;
      const rate = overtime.hourlyRate || 0;
      const compensation = hours * rate;
      
      summary[employeeId].totalHours += hours;
      summary[employeeId].totalCompensation += compensation;
      summary[employeeId].records.push({
        date: overtime.date,
        hours,
        rate,
        compensation,
        description: overtime.description
      });
    });

    return Object.values(summary);
  }
}

export default OvertimeService;