import axios from 'axios';

// Create axios instance for license server API
const licenseApi = axios.create({
  baseURL: process.env.REACT_APP_LICENSE_API_URL || 'http://localhost:4000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
licenseApi.interceptors.request.use(
  (config) => {
    // Add API key for license server authentication
    const apiKey = process.env.REACT_APP_LICENSE_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
licenseApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle license server specific errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        console.error('License server authentication failed');
      } else if (status === 403) {
        console.error('License server access forbidden:', data.error?.message);
      } else if (status === 404) {
        console.error('License not found:', data.error?.message);
      } else if (status === 500) {
        console.error('License server error:', data.error?.message);
      }
    } else if (error.request) {
      console.error('License server not responding');
    } else {
      console.error('License API request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// License API methods
export const licenseService = {
  // Create new license
  async createLicense(licenseData) {
    try {
      const response = await licenseApi.post('/licenses/create', licenseData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create license: ${error.response?.data?.error || error.message}`);
    }
  },

  // Validate license
  async validateLicense(token, machineId) {
    try {
      const response = await licenseApi.post('/licenses/validate', { token, machineId });
      return response.data;
    } catch (error) {
      throw new Error(`License validation failed: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get license details
  async getLicense(licenseNumber) {
    try {
      const response = await licenseApi.get(`/licenses/${licenseNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get license: ${error.response?.data?.error || error.message}`);
    }
  },

  // Renew license
  async renewLicense(licenseNumber, renewalData) {
    try {
      const response = await licenseApi.patch(`/licenses/${licenseNumber}/renew`, renewalData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to renew license: ${error.response?.data?.error || error.message}`);
    }
  },

  // Revoke license
  async revokeLicense(licenseNumber, reason) {
    try {
      const response = await licenseApi.delete(`/licenses/${licenseNumber}`, {
        data: { reason }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to revoke license: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get tenant's license
  async getTenantLicense(tenantId) {
    try {
      const response = await licenseApi.get(`/licenses/tenant/${tenantId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tenant license: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get license usage analytics
  async getLicenseAnalytics() {
    try {
      const response = await licenseApi.get('/analytics/licenses');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get license analytics: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get license usage by date range
  async getLicenseUsageAnalytics(dateRange) {
    try {
      const response = await licenseApi.get('/analytics/usage', { params: dateRange });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get license usage analytics: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get expiring licenses
  async getExpiringLicenses(days = 30) {
    try {
      const response = await licenseApi.get(`/analytics/expiring?days=${days}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get expiring licenses: ${error.response?.data?.error || error.message}`);
    }
  },

  // Health check for license server
  async healthCheck() {
    try {
      const response = await licenseApi.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`License server health check failed: ${error.response?.data?.error || error.message}`);
    }
  }
};

export default licenseApi;