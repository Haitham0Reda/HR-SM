import Visit from '../models/Visit.js';
import Appointment from '../models/Appointment.js';

/**
 * Visit Service
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
      const visit = new Visit(visitData);
      await visit.save();
      
      // If visit is linked to an appointment, update appointment status
      if (visitData.appointmentId) {
        await Appointment.findByIdAndUpdate(visitData.appointmentId, {
          status: 'completed',
          visitId: visit._id
        });
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
        _id: visitId,
        tenantId
      })
      .populate('patientId', 'firstName lastName email')
      .populate('medicalProfileId');
      
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
   * Update visit record
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID of updater
   * @returns {Promise<Object>} Updated visit
   */
  async updateVisit(visitId, tenantId, updateData, updatedBy) {
    try {
      const visit = await Visit.findOne({
        _id: visitId,
        tenantId
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== 'tenantId' && key !== 'patientId') {
          visit[key] = updateData[key];
        }
      });
      
      visit.updatedBy = updatedBy;
      await visit.save();
      
      return visit;
    } catch (error) {
      throw new Error(`Failed to update visit: ${error.message}`);
    }
  }
  
  /**
   * Delete visit record
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteVisit(visitId, tenantId) {
    try {
      const visit = await Visit.findOne({
        _id: visitId,
        tenantId
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      await visit.deleteOne();
      
      return { success: true, message: 'Visit deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete visit: ${error.message}`);
    }
  }
  
  /**
   * Add lab test to visit
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} labTestData - Lab test data
   * @returns {Promise<Object>} Updated visit
   */
  async addLabTest(visitId, tenantId, labTestData) {
    try {
      const visit = await Visit.findOne({
        _id: visitId,
        tenantId
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      visit.labTests.push(labTestData);
      await visit.save();
      
      return visit;
    } catch (error) {
      throw new Error(`Failed to add lab test: ${error.message}`);
    }
  }
  
  /**
   * Update lab test results
   * @param {string} visitId - Visit identifier
   * @param {string} tenantId - Tenant identifier
   * @param {string} labTestId - Lab test ID
   * @param {Object} results - Test results
   * @returns {Promise<Object>} Updated visit
   */
  async updateLabTestResults(visitId, tenantId, labTestId, results) {
    try {
      const visit = await Visit.findOne({
        _id: visitId,
        tenantId
      });
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      const labTest = visit.labTests.id(labTestId);
      if (!labTest) {
        throw new Error('Lab test not found');
      }
      
      labTest.results = results;
      labTest.resultDate = new Date();
      labTest.status = 'completed';
      
      await visit.save();
      
      return visit;
    } catch (error) {
      throw new Error(`Failed to update lab test results: ${error.message}`);
    }
  }
  
  /**
   * Get visit statistics
   * @param {string} tenantId - Tenant identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Visit statistics
   */
  async getVisitStatistics(tenantId, startDate, endDate) {
    try {
      return await Visit.getStatistics(tenantId, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get visit statistics: ${error.message}`);
    }
  }
  
  /**
   * Get visits requiring follow-up
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Visits requiring follow-up
   */
  async getVisitsRequiringFollowUp(tenantId) {
    try {
      const visits = await Visit.find({
        tenantId,
        'followUp.required': true,
        status: 'completed'
      })
      .populate('patientId', 'firstName lastName email')
      .sort({ 'followUp.date': 1 });
      
      return visits;
    } catch (error) {
      throw new Error(`Failed to get visits requiring follow-up: ${error.message}`);
    }
  }
  
  /**
   * Get visits with medical leave recommendations
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Visits with medical leave recommendations
   */
  async getVisitsWithMedicalLeave(tenantId) {
    try {
      const visits = await Visit.find({
        tenantId,
        'medicalLeave.recommended': true
      })
      .populate('patientId', 'firstName lastName email')
      .sort({ visitDate: -1 });
      
      return visits;
    } catch (error) {
      throw new Error(`Failed to get visits with medical leave: ${error.message}`);
    }
  }
}

export default new VisitService();
