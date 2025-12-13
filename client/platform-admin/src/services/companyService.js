import platformApi from './platformApi';

/**
 * Company Service for Platform Admin
 * Handles all company-related API calls
 */
class CompanyService {
  /**
   * Get all companies with metadata and statistics
   */
  async getAllCompanies() {
    try {
      const response = await platformApi.get('/companies');
      return response.data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific company
   */
  async getCompanyDetails(companyName) {
    try {
      const response = await platformApi.get(`/companies/${companyName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company details:', error);
      throw error;
    }
  }

  /**
   * Create a new company
   */
  async createCompany(companyData) {
    try {
      const response = await platformApi.post('/companies', companyData);
      return response.data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Update company metadata
   */
  async updateCompany(companyName, updates) {
    try {
      const response = await platformApi.patch(`/companies/${companyName}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete/Archive a company
   */
  async deleteCompany(companyName, permanent = false) {
    try {
      const response = await platformApi.delete(`/companies/${companyName}`, {
        params: { permanent }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Get available modules and models
   */
  async getAvailableModulesAndModels() {
    try {
      const response = await platformApi.get('/companies/modules-and-models');
      return response.data;
    } catch (error) {
      console.error('Error fetching modules and models:', error);
      throw error;
    }
  }

  /**
   * Get company modules
   */
  async getCompanyModules(companyName) {
    try {
      const response = await platformApi.get(`/companies/${companyName}/modules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching company modules:', error);
      throw error;
    }
  }

  /**
   * Update company modules (bulk update)
   */
  async updateCompanyModules(companyName, modules) {
    try {
      const response = await platformApi.patch(`/companies/${companyName}/modules`, { modules });
      return response.data;
    } catch (error) {
      console.error('Error updating company modules:', error);
      throw error;
    }
  }

  /**
   * Enable a specific module for a company
   */
  async enableModule(companyName, moduleName, tier) {
    try {
      // If no tier specified, use business as default (works for most modules)
      // If business doesn't work, the server will return an error with available tiers
      const requestTier = tier || 'business';
      
      const response = await platformApi.post(`/companies/${companyName}/modules/${moduleName}/enable`, {
        tier: requestTier,
        limits: {}
      });
      return response.data;
    } catch (error) {
      console.error('Error enabling module:', error);
      throw error;
    }
  }

  /**
   * Disable a specific module for a company
   */
  async disableModule(companyName, moduleName) {
    try {
      const response = await platformApi.delete(`/companies/${companyName}/modules/${moduleName}/disable`);
      return response.data;
    } catch (error) {
      console.error('Error disabling module:', error);
      throw error;
    }
  }
}

const companyService = new CompanyService();
export default companyService;