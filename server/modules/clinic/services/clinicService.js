import ClinicRepository from '../../../repositories/ClinicRepository.js';
import { Op } from 'sequelize';

/**
 * Clinic Service - Business logic layer for clinic operations
 * Uses ClinicRepository for data access
 */
class ClinicService {
  constructor() {
    this.clinicRepository = new ClinicRepository();
  }

  /**
   * Get all clinic appointments
   */
  async getAllAppointments(tenantId, options = {}) {
    const filter = { tenantId };
    
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] },
        { association: 'department', attributes: ['name', 'code'] }
      ],
      order: [['appointmentDate', 'DESC']],
      ...options
    };

    return await this.clinicRepository.findAll(filter, queryOptions);
  }

  /**
   * Create clinic appointment
   */
  async createAppointment(appointmentData, tenantId) {
    const dataToCreate = {
      ...appointmentData,
      tenantId
    };

    const appointment = await this.clinicRepository.create(dataToCreate);
    
    // Return populated appointment
    return await this.clinicRepository.findById(appointment.id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(id, tenantId) {
    const appointment = await this.clinicRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
          { association: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] },
          { association: 'department', attributes: ['name', 'code'] }
        ]
      }
    );

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(id, updateData, tenantId) {
    const appointment = await this.clinicRepository.findOne({ id, tenantId });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const updatedAppointment = await this.clinicRepository.update(id, updateData);
    
    // Return populated appointment
    return await this.clinicRepository.findById(id, {
      include: [
        { association: 'employee', attributes: ['firstName', 'lastName', 'email', 'employeeId'] },
        { association: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] },
        { association: 'department', attributes: ['name', 'code'] }
      ]
    });
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(id, tenantId) {
    const appointment = await this.clinicRepository.findOne({ id, tenantId });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    await this.clinicRepository.delete(id);
    return { message: 'Appointment deleted' };
  }

  /**
   * Get appointments by employee
   */
  async getAppointmentsByEmployee(employeeId, tenantId, options = {}) {
    return await this.clinicRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get appointments by date
   */
  async getAppointmentsByDate(date, tenantId, options = {}) {
    return await this.clinicRepository.findByDate(date, tenantId, options);
  }
}

export default ClinicService;
