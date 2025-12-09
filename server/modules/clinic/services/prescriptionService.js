import Prescription from '../models/Prescription.js';

/**
 * Prescription Service
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
      const prescription = new Prescription(prescriptionData);
      await prescription.save();
      
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
        _id: prescriptionId,
        tenantId
      })
      .populate('patientId', 'firstName lastName email')
      .populate('medicalProfileId')
      .populate('visitId');
      
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
        prescriptionNumber,
        tenantId
      })
      .populate('patientId', 'firstName lastName email');
      
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
   * @param {string} updatedBy - User ID of updater
   * @returns {Promise<Object>} Updated prescription
   */
  async updatePrescription(prescriptionId, tenantId, updateData, updatedBy) {
    try {
      const prescription = await Prescription.findOne({
        _id: prescriptionId,
        tenantId
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== 'tenantId' && key !== 'patientId' && key !== 'prescriptionNumber') {
          prescription[key] = updateData[key];
        }
      });
      
      prescription.updatedBy = updatedBy;
      await prescription.save();
      
      return prescription;
    } catch (error) {
      throw new Error(`Failed to update prescription: ${error.message}`);
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
        _id: prescriptionId,
        tenantId
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.deleteOne();
      
      return { success: true, message: 'Prescription deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete prescription: ${error.message}`);
    }
  }
  
  /**
   * Process a prescription refill
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @param {number} quantity - Quantity dispensed
   * @param {string} dispensedBy - Pharmacy or person dispensing
   * @returns {Promise<Object>} Updated prescription
   */
  async processRefill(prescriptionId, tenantId, quantity, dispensedBy) {
    try {
      const prescription = await Prescription.findOne({
        _id: prescriptionId,
        tenantId
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.processRefill(quantity, dispensedBy);
      
      return prescription;
    } catch (error) {
      throw new Error(`Failed to process refill: ${error.message}`);
    }
  }
  
  /**
   * Discontinue a prescription
   * @param {string} prescriptionId - Prescription identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User discontinuing the prescription
   * @param {string} reason - Reason for discontinuation
   * @returns {Promise<Object>} Updated prescription
   */
  async discontinuePrescription(prescriptionId, tenantId, userId, reason) {
    try {
      const prescription = await Prescription.findOne({
        _id: prescriptionId,
        tenantId
      });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }
      
      await prescription.discontinue(userId, reason);
      
      return prescription;
    } catch (error) {
      throw new Error(`Failed to discontinue prescription: ${error.message}`);
    }
  }
  
  /**
   * Get prescriptions needing refill reminders
   * @param {string} tenantId - Tenant identifier
   * @param {number} daysBeforeExpiry - Days before expiry to send reminder
   * @returns {Promise<Array>} Prescriptions needing reminders
   */
  async getPrescriptionsNeedingRefillReminders(tenantId, daysBeforeExpiry = 7) {
    try {
      return await Prescription.findNeedingRefillReminders(tenantId, daysBeforeExpiry);
    } catch (error) {
      throw new Error(`Failed to get prescriptions needing reminders: ${error.message}`);
    }
  }
  
  /**
   * Get prescription statistics
   * @param {string} tenantId - Tenant identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Prescription statistics
   */
  async getPrescriptionStatistics(tenantId, startDate, endDate) {
    try {
      return await Prescription.getStatistics(tenantId, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get prescription statistics: ${error.message}`);
    }
  }
  
  /**
   * Check for drug interactions
   * @param {string} patientId - Patient identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} newMedication - New medication name
   * @returns {Promise<Object>} Interaction check result
   */
  async checkDrugInteractions(patientId, tenantId, newMedication) {
    try {
      // Get all active prescriptions for the patient
      const activePrescriptions = await Prescription.findActiveByPatient(patientId, tenantId);
      
      // In a real implementation, this would check against a drug interaction database
      // For now, we'll return a simple structure
      const currentMedications = activePrescriptions.map(p => p.medication.name);
      
      return {
        newMedication,
        currentMedications,
        interactions: [],  // Would be populated by drug interaction API
        warnings: []       // Would be populated by drug interaction API
      };
    } catch (error) {
      throw new Error(`Failed to check drug interactions: ${error.message}`);
    }
  }
}

export default new PrescriptionService();
