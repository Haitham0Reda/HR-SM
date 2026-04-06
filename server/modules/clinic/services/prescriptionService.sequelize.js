import { Op } from 'sequelize';
import Prescription from '../models/Prescription.js';

/**
 * Prescription Service (Sequelize)
 * 
 * Handles prescription operations including:
 * - Creating and updating prescriptions
 * - Managing refills
 * - Tracking prescription status
 * - Prescription history
 * 
 * CRITICAL: All operations are tenant-scoped
 */

class PrescriptionService {
  /**
   * Create a new prescription
   * @param {Object} prescriptionData - Prescription data
   * @param {string} prescriptionData.tenantId - Tenant identifier
   * @param {string} prescriptionData.patientId - Patient identifier
   * @returns {Promise<Object>} Created prescription
   */
  async createPrescription(prescriptionData) {
    try {
      const prescription = await Prescription.create(prescriptionData);
      return prescription;
    } catch (error) {
      throw new Error(`Failed to create prescription: ${error.message}`);
    }
  }
  
  /**
   * Get prescription by ID
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Prescription record
   */
  async getPrescriptionById(prescriptionId, tenantId) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          tenant_id: tenantId
        },
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'medicalProfile' },
          { association: 'visit' }
        ]
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      return prescription;
    } catch (error) {
      throw new Error(`Failed to get prescription: ${error.message}`);
    }
  }
  
  /**
   * Get prescription by prescription number
   * @param {string} prescriptionNumber - Prescription number
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Prescription record
   */
  async getPrescriptionByNumber(prescriptionNumber, tenantId) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          prescription_number: prescriptionNumber,
          tenant_id: tenantId
        },
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      return prescription;
    } catch (error) {
      throw new Error(`Failed to get prescription: ${error.message}`);
    }
  }
  
  /**
   * Get all prescriptions for a patient
   * @param {string} patientId - Patient identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Prescription records
   */
  async getPrescriptionsByPatient(patientId, tenantId, options = {}) {
    try {
      return await Prescription.findByPatientAndTenant(patientId, tenantId, options);
    } catch (error) {
      throw new Error(`Failed to get prescriptions: ${error.message}`);
    }
  }
  
  /**
   * Get active prescriptions for a patient
   * @param {string} patientId - Patient identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Active prescription records
   */
  async getActivePrescriptionsByPatient(patientId, tenantId) {
    try {
      return await Prescription.findActiveByPatient(patientId, tenantId);
    } catch (error) {
      throw new Error(`Failed to get active prescriptions: ${error.message}`);
    }
  }
  
  /**
   * Update prescription
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated prescription
   */
  async updatePrescription(prescriptionId, tenantId, updateData) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          tenant_id: tenantId
        }
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.update(updateData);
      return prescription;
    } catch (error) {
      throw new Error(`Failed to update prescription: ${error.message}`);
    }
  }
  
  /**
   * Process refill
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} refillData - Refill data
   * @returns {Promise<Object>} Updated prescription
   */
  async processRefill(prescriptionId, tenantId, refillData) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          tenant_id: tenantId
        }
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.processRefill(refillData);
      return prescription;
    } catch (error) {
      throw new Error(`Failed to process refill: ${error.message}`);
    }
  }
  
  /**
   * Discontinue prescription
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} reason - Reason for discontinuation
   * @param {string} discontinuedBy - User ID who discontinued
   * @returns {Promise<Object>} Updated prescription
   */
  async discontinuePrescription(prescriptionId, tenantId, reason, discontinuedBy) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          tenant_id: tenantId
        }
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.discontinue(reason, discontinuedBy);
      return prescription;
    } catch (error) {
      throw new Error(`Failed to discontinue prescription: ${error.message}`);
    }
  }
  
  /**
   * Get prescriptions needing refill reminders
   * @param {string} tenantId - Tenant identifier
   * @param {number} daysThreshold - Days before refill needed
   * @returns {Promise<Array>} Prescriptions needing reminders
   */
  async getPrescriptionsNeedingRefillReminders(tenantId, daysThreshold = 7) {
    try {
      return await Prescription.findNeedingRefillReminders(tenantId, daysThreshold);
    } catch (error) {
      throw new Error(`Failed to get prescriptions needing reminders: ${error.message}`);
    }
  }
  
  /**
   * Get prescription statistics
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getPrescriptionStatistics(tenantId, filters = {}) {
    try {
      return await Prescription.getStatistics(tenantId, filters);
    } catch (error) {
      throw new Error(`Failed to get prescription statistics: ${error.message}`);
    }
  }
  
  /**
   * Search prescriptions
   * @param {string} tenantId - Tenant identifier
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching prescriptions
   */
  async searchPrescriptions(tenantId, searchTerm, options = {}) {
    try {
      const where = {
        tenant_id: tenantId,
        [Op.or]: [
          { prescription_number: { [Op.iLike]: `%${searchTerm}%` } },
          { 'medication.name': { [Op.iLike]: `%${searchTerm}%` } }
        ]
      };

      const prescriptions = await Prescription.findAll({
        where,
        include: [
          { association: 'patient', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['created_at', 'DESC']],
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return prescriptions;
    } catch (error) {
      throw new Error(`Failed to search prescriptions: ${error.message}`);
    }
  }
  
  /**
   * Delete prescription
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deletePrescription(prescriptionId, tenantId) {
    try {
      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          tenant_id: tenantId
        }
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.destroy();
      return { success: true, message: 'Prescription deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete prescription: ${error.message}`);
    }
  }
}

export default new PrescriptionService();
