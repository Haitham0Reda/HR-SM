import platformApi from './platformApi';

const moduleService = {
  // Get all modules
  getAllModules: async () => {
    try {
      const response = await platformApi.get('/modules');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tenant modules
  getTenantModules: async (tenantId) => {
    try {
      const response = await platformApi.get(`/modules/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Enable module for tenant
  enableModule: async (tenantId, moduleId) => {
    try {
      const response = await platformApi.post(`/modules/tenants/${tenantId}/modules/${moduleId}/enable`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Disable module for tenant
  disableModule: async (tenantId, moduleId) => {
    try {
      const response = await platformApi.delete(`/modules/tenants/${tenantId}/modules/${moduleId}/disable`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default moduleService;
