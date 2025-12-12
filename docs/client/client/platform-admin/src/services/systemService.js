import platformApi from './platformApi';

const systemService = {
  // Get system health
  getHealth: async () => {
    try {
      const response = await platformApi.get('/system/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get system metrics
  getMetrics: async () => {
    try {
      const response = await platformApi.get('/system/metrics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get usage statistics
  getUsageStats: async (params = {}) => {
    try {
      const response = await platformApi.get('/system/usage', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default systemService;
