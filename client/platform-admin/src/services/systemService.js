import platformApi from './platformApi';
import axios from 'axios';

const systemService = {
  // Get system health (public endpoint, no auth required)
  getHealth: async () => {
    try {
      // Use direct axios call for public health endpoint to avoid auth headers
      // Add timeout and better error handling
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api/platform'}/system/health`,
        {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      // Add more specific error information
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout - server may be overloaded';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Network error - server may be down';
      } else if (error.code === 'ERR_CONNECTION_REFUSED') {
        error.message = 'Connection refused - server may be restarting';
      }
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
