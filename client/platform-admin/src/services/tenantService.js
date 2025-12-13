import platformApi from './platformApi';

const tenantService = {
  // Get all tenants
  getAllTenants: async (params = {}) => {
    try {
      const response = await platformApi.get('/tenants', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tenant by ID
  getTenantById: async (tenantId) => {
    try {
      const response = await platformApi.get(`/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new tenant
  createTenant: async (tenantData) => {
    try {
      const response = await platformApi.post('/tenants', tenantData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update tenant
  updateTenant: async (tenantId, tenantData) => {
    try {
      const response = await platformApi.patch(`/tenants/${tenantId}`, tenantData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Suspend tenant
  suspendTenant: async (tenantId, reason = '') => {
    try {
      const response = await platformApi.post(`/tenants/${tenantId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reactivate tenant
  reactivateTenant: async (tenantId) => {
    try {
      const response = await platformApi.post(`/tenants/${tenantId}/reactivate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete tenant
  deleteTenant: async (tenantId) => {
    try {
      const response = await platformApi.delete(`/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tenant statistics
  getTenantStats: async () => {
    try {
      const response = await platformApi.get('/tenants/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check tenant limits
  checkTenantLimits: async (tenantId) => {
    try {
      const response = await platformApi.get(`/tenants/${tenantId}/limits`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update tenant usage
  updateTenantUsage: async (tenantId, usageData) => {
    try {
      const response = await platformApi.patch(`/tenants/${tenantId}/usage`, usageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default tenantService;
