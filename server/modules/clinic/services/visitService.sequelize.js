import { Op } from 'sequelize';
import Visit from '../models/Visit.js';
import Appointment from '../models/Appointment.js';

/**
 * Visit Service (Sequelize)
 * 
 * Handles medical visit operations including:
 * - Creating and updating visit records
 * - Managing visit details (diagnosis, treatment, etc.)
 * - Linking visits to appointments
 * - Visit history and statistics
 * 
 * CRITICAL: All operations are tenant-scoped
 * CRITICAL: Does NOT directly modify HR-Core data (attendance, vacation balances)
 */

class VisitService {
  /**
   * Create a new visit record
   * @param {Object} visitData - Visit data
   * @param {string} visitData.tenantId - Tenant identifier
   * @param {string} visitData.patientId - Patient identifier
   * @returns {Promise<Object>} Created visit
   */
  async createVisit(visitData) {
    try {
      const visit = await Visit.create(visitData);
      
      // If visit is linked to an appointment, update appointment status
      if (visitData.appointmentId) {
        await Appointment.update(
          {
            status: 'completed',
            visit_id: visit.id
          },
          {
            where: { id: visitData.appointmentId }
          }
        );
      }
      
      return visit;
    } catch (error) {
      throw new Error(`Failed to create visit: ${error.message}`);
    }
  }
  
  /**
   * Get visit by ID
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Visit record
   */
  async getVisitById(visitId, tenantId) {
    try {
      const visit = await Visit.findOne({
        where: {
          id: visitId,
          tenant_id: tenantId
        },
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'medicalProfile' }
        ]
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      return visit;
    } catch (error) {
      throw new Error(`Failed to get visit: ${error.message}`);
    }
  }
  
  /**
   * Get all visits for a patient
   * @param {string} patientId - Patient identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Visit records
   */
  async getVisitsByPatient(patientId, tenantId, options = {}) {
    try {
      return await Visit.findByPatientAndTenant(patientId, tenantId, options);
    } catch (error) {
      throw new Error(`Failed to get visits: ${error.message}`);
    }
  }
  
  /**
   * Get visits by date range
   * @param {string} tenantId - Tenant identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Visit records
   */
  async getVisitsByDateRange(tenantId, startDate, endDate, options = {}) {
    try {
      return await Visit.findByDateRange(tenantId, startDate, endDate, options);
    } catch (error) {
      throw new Error(`Failed to get visits by date range: ${error.message}`);
    }
  }
  
  /**
   * Update visit
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated visit
   */
  async updateVisit(visitId, tenantId, updateData) {
    try {
      const visit = await Visit.findOne({
        where: {
          id: visitId,
          tenant_id: tenantId
        }
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      await visit.update(updateData);
      return visit;
    } catch (error) {
      throw new Error(`Failed to update visit: ${error.message}`);
    }
  }
  
  /**
   * Delete visit
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteVisit(visitId, tenantId) {
    try {
      const visit = await Visit.findOne({
        where: {
          id: visitId,
          tenant_id: tenantId
        }
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      await visit.destroy();
      return { success: true, message: 'Visit deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete visit: ${error.message}`);
    }
  }
  
  /**
   * Get visit statistics
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getVisitStatistics(tenantId, filters = {}) {
    try {
      return await Visit.getStatistics(tenantId, filters);
    } catch (error) {
      throw new Error(`Failed to get visit statistics: ${error.message}`);
    }
  }
  
  /**
   * Search visits
   * @param {string} tenantId - Tenant identifier
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching visits
   */
  async searchVisits(tenantId, searchTerm, options = {}) {
    try {
      const where = {
        tenant_id: tenantId,
        [Op.or]: [
          { 'diagnosis.condition': { [Op.iLike]: `%${searchTerm}%` } },
          { 'treatment.description': { [Op.iLike]: `%${searchTerm}%` } }
        ]
      };

      const visits = await Visit.findAll({
        where,
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['visit_date', 'DESC']],
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return visits;
    } catch (error) {
      throw new Error(`Failed to search visits: ${error.message}`);
    }
  }
  
  /**
   * Get visits requiring follow-up
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Visits requiring follow-up
   */
  async getVisitsRequiringFollowUp(tenantId) {
    try {
      const visits = await Visit.findAll({
        where: {
          tenant_id: tenantId,
          'follow_up.required': true,
          'follow_up.completed': false
        },
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['follow_up.date', 'ASC']]
      });

      return visits;
    } catch (error) {
      throw new Error(`Failed to get visits requiring follow-up: ${error.message}`);
    }
  }
  
  /**
   * Get visits with medical leave recommendations
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Visits with medical leave
   */
  async getVisitsWithMedicalLeave(tenantId) {
    try {
      const visits = await Visit.findAll({
        where: {
          tenant_id: tenantId,
          'medical_leave.recommended': true
        },
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['visit_date', 'DESC']]
      });

      return visits;
    } catch (error) {
      throw new Error(`Failed to get visits with medical leave: ${error.message}`);
    }
  }
}

export default new VisitService();
