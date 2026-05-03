import InsuranceRepository from '../../../repositories/InsuranceRepository.js';
import { Op } from 'sequelize';

/**
 * Insurance Service - Business logic layer for insurance operations
 * Uses InsuranceRepository for data access
 */
class InsuranceService {
  constructor() {
    this.insuranceRepository = new InsuranceRepository();
  }

  /**
   * Get all insurance records
   */
  async getAllInsurance(tenantId, options = {}) {
    const filter = { tenantId };
    
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'provider', attributes: ['name', 'code', 'contactInfo'] },
        { association: 'department', attributes: ['name', 'code'] }
      ],
      order: [['createdAt', 'DESC']],
      ...options
    };

    return await this.insuranceRepository.findAll(filter, queryOptions);
  }

  /**
   * Create insurance record
   */
  async createInsurance(insuranceData, tenantId) {
    const dataToCreate = {
      ...insuranceData,
      tenantId
    };

    const insurance = await this.insuranceRepository.create(dataToCreate);
    
    // Return populated insurance
    return await this.insuranceRepository.findById(insurance.id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'provider', attributes: ['name', 'code', 'contactInfo'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get insurance by ID
   */
  async getInsuranceById(id, tenantId) {
    const insurance = await this.insuranceRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
          { association: 'provider', attributes: ['name', 'code', 'contactInfo'] },
          { association: 'department', attributes: ['name', 'code'] }
        ]
      }
    );

    if (!insurance) {
      throw new Error('Insurance record not found');
    }

    return insurance;
  }

  /**
   * Update insurance record
   */
  async updateInsurance(id, updateData, tenantId) {
    const insurance = await this.insuranceRepository.findOne({ id, tenantId });
    
    if (!insurance) {
      throw new Error('Insurance record not found');
    }

    const updatedInsurance = await this.insuranceRepository.update(id, updateData);
    
    // Return populated insurance
    return await this.insuranceRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'provider', attributes: ['name', 'code', 'contactInfo'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Delete insurance record
   */
  async deleteInsurance(id, tenantId) {
    const insurance = await this.insuranceRepository.findOne({ id, tenantId });
    
    if (!insurance) {
      throw new Error('Insurance record not found');
    }

    await this.insuranceRepository.delete(id);
    return { message: 'Insurance record deleted' };
  }

  /**
   * Get insurance by employee
   */
  async getInsuranceByEmployee(employeeId, tenantId, options = {}) {
    return await this.insuranceRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get expiring insurance records
   */
  async getExpiringInsurance(daysAhead, tenantId, options = {}) {
    return await this.insuranceRepository.findExpiring(daysAhead, tenantId, options);
  }
}

export default InsuranceService;
