import PayrollRepository from '../../../repositories/modules/PayrollRepository.js';

/**
 * Payroll Service - Business logic layer for payroll operations
 * Uses PayrollRepository for data access
 */
class PayrollService {
  constructor() {
    this.payrollRepository = new PayrollRepository();
  }

  /**
   * Get all payroll records
   */
  async getAllPayrolls(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      populate: [
        { path: 'employee', select: 'name email role firstName lastName employeeId' }
      ],
      sort: { period: -1, createdAt: -1 },
      ...options
    };

    return await this.payrollRepository.find(filter, queryOptions);
  }

  /**
   * Create payroll record
   */
  async createPayroll(payrollData, tenantId) {
    const dataToCreate = {
      ...payrollData,
      tenantId
    };

    const payroll = await this.payrollRepository.create(dataToCreate);
    
    // Return populated payroll
    return await this.payrollRepository.findById(payroll._id, {
      populate: [
        { path: 'employee', select: 'name email role firstName lastName employeeId' }
      ]
    });
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(id, tenantId) {
    const payroll = await this.payrollRepository.findOne(
      { _id: id, tenantId },
      {
        populate: [
          { path: 'employee', select: 'name email role firstName lastName employeeId' }
        ]
      }
    );

    if (!payroll) {
      throw new Error('Payroll not found');
    }

    return payroll;
  }

  /**
   * Update payroll record
   */
  async updatePayroll(id, updateData, tenantId) {
    const payroll = await this.payrollRepository.findOne({ _id: id, tenantId });
    
    if (!payroll) {
      throw new Error('Payroll not found');
    }

    const updatedPayroll = await this.payrollRepository.update(id, updateData);
    
    // Return populated payroll
    return await this.payrollRepository.findById(id, {
      populate: [
        { path: 'employee', select: 'name email role firstName lastName employeeId' }
      ]
    });
  }

  /**
   * Delete payroll record
   */
  async deletePayroll(id, tenantId) {
    const payroll = await this.payrollRepository.findOne({ _id: id, tenantId });
    
    if (!payroll) {
      throw new Error('Payroll not found');
    }

    await this.payrollRepository.delete(id);
    return { message: 'Payroll deleted' };
  }

  /**
   * Get payroll by employee
   */
  async getPayrollByEmployee(employeeId, tenantId, options = {}) {
    return await this.payrollRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get payroll by period
   */
  async getPayrollByPeriod(startDate, endDate, tenantId, options = {}) {
    return await this.payrollRepository.findByPeriod(startDate, endDate, tenantId, options);
  }

  /**
   * Calculate salary for employee
   */
  async calculateSalary(employeeId, period, tenantId) {
    return await this.payrollRepository.calculateSalary(employeeId, period, tenantId);
  }

  /**
   * Get payroll statistics
   */
  async getPayrollStatistics(tenantId, period = null) {
    const filter = { tenantId };
    
    if (period) {
      filter.period = period;
    }

    const payrolls = await this.payrollRepository.find(filter);
    
    const statistics = {
      totalRecords: payrolls.length,
      totalGrossSalary: 0,
      totalNetSalary: 0,
      totalDeductions: 0,
      totalBonuses: 0,
      averageGrossSalary: 0,
      averageNetSalary: 0
    };

    payrolls.forEach(payroll => {
      statistics.totalGrossSalary += payroll.grossSalary || 0;
      statistics.totalNetSalary += payroll.netSalary || 0;
      statistics.totalDeductions += payroll.totalDeductions || 0;
      statistics.totalBonuses += payroll.totalBonuses || 0;
    });

    if (statistics.totalRecords > 0) {
      statistics.averageGrossSalary = statistics.totalGrossSalary / statistics.totalRecords;
      statistics.averageNetSalary = statistics.totalNetSalary / statistics.totalRecords;
    }

    return statistics;
  }

  /**
   * Process bulk payroll
   */
  async processBulkPayroll(payrollDataArray, tenantId) {
    const results = [];
    
    for (const payrollData of payrollDataArray) {
      try {
        const payroll = await this.createPayroll(payrollData, tenantId);
        results.push({ success: true, data: payroll });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          data: payrollData 
        });
      }
    }
    
    return results;
  }

  /**
   * Get payroll summary by department
   */
  async getPayrollSummaryByDepartment(tenantId, period = null) {
    const filter = { tenantId };
    
    if (period) {
      filter.period = period;
    }

    const payrolls = await this.payrollRepository.find(filter, {
      populate: [
        { path: 'employee', select: 'department', populate: { path: 'department', select: 'name code' } }
      ]
    });

    const departmentSummary = {};

    payrolls.forEach(payroll => {
      const department = payroll.employee?.department;
      if (department) {
        const deptKey = department._id.toString();
        
        if (!departmentSummary[deptKey]) {
          departmentSummary[deptKey] = {
            department: department,
            totalEmployees: 0,
            totalGrossSalary: 0,
            totalNetSalary: 0,
            totalDeductions: 0,
            totalBonuses: 0
          };
        }

        departmentSummary[deptKey].totalEmployees++;
        departmentSummary[deptKey].totalGrossSalary += payroll.grossSalary || 0;
        departmentSummary[deptKey].totalNetSalary += payroll.netSalary || 0;
        departmentSummary[deptKey].totalDeductions += payroll.totalDeductions || 0;
        departmentSummary[deptKey].totalBonuses += payroll.totalBonuses || 0;
      }
    });

    return Object.values(departmentSummary);
  }
}

export default PayrollService;