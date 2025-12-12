import MedicalProfile from '../models/MedicalProfile.js';

/**
 * Clinic Service
 * 
 * Handles medical profile operations including:
 * - Creating and updating medical profiles
 * - Managing allergies and chronic conditions
 * - Managing emergency contacts
 * - Managing insurance information
 * 
 * CRITICAL: All operations are tenant-scoped
 */

class ClinicService {
  /**
   * Create a new medical profile
   * @param {Object} profileData - Medical profile data
   * @param {string} profileData.tenantId - Tenant identifier
   * @param {string} profileData.userId - User identifier
   * @returns {Promise<Object>} Created medical profile
   */
  async createMedicalProfile(profileData) {
    try {
      // Check if profile already exists for this user
      const existingProfile = await MedicalProfile.findOne({
        tenantId: profileData.tenantId,
        userId: profileData.userId
      });
      
      if (existingProfile) {
        throw new Error('Medical profile already exists for this user');
      }
      
      const profile = new MedicalProfile(profileData);
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to create medical profile: ${error.message}`);
    }
  }
  
  /**
   * Get medical profile by user ID
   * @param {string} userId - User identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Medical profile
   */
  async getMedicalProfileByUser(userId, tenantId) {
    try {
      const profile = await MedicalProfile.findByUserAndTenant(userId, tenantId);
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to get medical profile: ${error.message}`);
    }
  }
  
  /**
   * Get medical profile by ID
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Medical profile
   */
  async getMedicalProfileById(profileId, tenantId) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      }).populate('userId', 'firstName lastName email');
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to get medical profile: ${error.message}`);
    }
  }
  
  /**
   * Get all medical profiles for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {Object} options - Query options (page, limit, sort)
   * @returns {Promise<Array>} Medical profiles
   */
  async getAllMedicalProfiles(tenantId, options = {}) {
    try {
      return await MedicalProfile.findByTenant(tenantId, options);
    } catch (error) {
      throw new Error(`Failed to get medical profiles: ${error.message}`);
    }
  }
  
  /**
   * Update medical profile
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID of updater
   * @returns {Promise<Object>} Updated medical profile
   */
  async updateMedicalProfile(profileId, tenantId, updateData, updatedBy) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== 'tenantId' && key !== 'userId') {
          profile[key] = updateData[key];
        }
      });
      
      profile.updatedBy = updatedBy;
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to update medical profile: ${error.message}`);
    }
  }
  
  /**
   * Delete medical profile
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMedicalProfile(profileId, tenantId) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      await profile.deleteOne();
      
      return { success: true, message: 'Medical profile deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete medical profile: ${error.message}`);
    }
  }
  
  /**
   * Add allergy to medical profile
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} allergyData - Allergy data
   * @returns {Promise<Object>} Updated medical profile
   */
  async addAllergy(profileId, tenantId, allergyData) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      profile.allergies.push(allergyData);
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to add allergy: ${error.message}`);
    }
  }
  
  /**
   * Add chronic condition to medical profile
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} conditionData - Condition data
   * @returns {Promise<Object>} Updated medical profile
   */
  async addChronicCondition(profileId, tenantId, conditionData) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      profile.chronicConditions.push(conditionData);
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to add chronic condition: ${error.message}`);
    }
  }
  
  /**
   * Add emergency contact to medical profile
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} contactData - Emergency contact data
   * @returns {Promise<Object>} Updated medical profile
   */
  async addEmergencyContact(profileId, tenantId, contactData) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      // If this is marked as primary, unmark other primary contacts
      if (contactData.isPrimary) {
        profile.emergencyContacts.forEach(contact => {
          contact.isPrimary = false;
        });
      }
      
      profile.emergencyContacts.push(contactData);
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to add emergency contact: ${error.message}`);
    }
  }
  
  /**
   * Update insurance information
   * @param {string} profileId - Profile identifier
   * @param {string} tenantId - Tenant identifier
   * @param {Object} insuranceData - Insurance data
   * @returns {Promise<Object>} Updated medical profile
   */
  async updateInsurance(profileId, tenantId, insuranceData) {
    try {
      const profile = await MedicalProfile.findOne({
        _id: profileId,
        tenantId
      });
      
      if (!profile) {
        throw new Error('Medical profile not found');
      }
      
      profile.insurance = insuranceData;
      await profile.save();
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to update insurance: ${error.message}`);
    }
  }
  
  /**
   * Get profiles with critical allergies
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Profiles with critical allergies
   */
  async getProfilesWithCriticalAllergies(tenantId) {
    try {
      const profiles = await MedicalProfile.find({
        tenantId,
        'allergies.severity': { $in: ['severe', 'life-threatening'] }
      }).populate('userId', 'firstName lastName email');
      
      return profiles;
    } catch (error) {
      throw new Error(`Failed to get profiles with critical allergies: ${error.message}`);
    }
  }
}

export default new ClinicService();
