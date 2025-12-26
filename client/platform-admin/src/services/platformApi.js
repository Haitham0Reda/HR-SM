import axios from 'axios';

// Create axios instance for main HR-SM backend API
const platformApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/platform',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
platformApi.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('platformToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
platformApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('platformToken');
        window.location.href = '/login';
      } else if (status === 403) {
        // Forbidden
        console.error('Access forbidden:', data.error?.message);
      } else if (status === 500) {
        // Server error
        console.error('Server error:', data.error?.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Platform API methods for main backend operations
export const platformService = {
  // Tenant management
  async getTenants() {
    const response = await platformApi.get('/tenants');
    return response.data;
  },

  async getTenant(tenantId) {
    const response = await platformApi.get(`/tenants/${tenantId}`);
    return response.data;
  },

  async createTenant(tenantData) {
    const response = await platformApi.post('/tenants', tenantData);
    return response.data;
  },

  async updateTenant(tenantId, updates) {
    const response = await platformApi.put(`/tenants/${tenantId}`, updates);
    return response.data;
  },

  async suspendTenant(tenantId, reason) {
    const response = await platformApi.patch(`/tenants/${tenantId}/suspend`, { reason });
    return response.data;
  },

  async reactivateTenant(tenantId) {
    const response = await platformApi.patch(`/tenants/${tenantId}/reactivate`);
    return response.data;
  },

  // Tenant metrics and analytics
  async getTenantMetrics(tenantId) {
    const response = await platformApi.get(`/tenants/${tenantId}/metrics`);
    return response.data;
  },

  async bulkUpdateTenants(tenantIds, updates) {
    const response = await platformApi.patch('/tenants/bulk-update', { tenantIds, updates });
    return response.data;
  },

  // Module management
  async getModules() {
    const response = await platformApi.get('/modules');
    return response.data;
  },

  async enableModule(tenantId, moduleId) {
    const response = await platformApi.post(`/modules/tenants/${tenantId}/modules/${moduleId}/enable`);
    return response.data;
  },

  async disableModule(tenantId, moduleId) {
    const response = await platformApi.delete(`/modules/tenants/${tenantId}/modules/${moduleId}/disable`);
    return response.data;
  },

  // System monitoring
  async getSystemMetrics() {
    const response = await platformApi.get('/system/metrics');
    return response.data;
  },

  async getSystemHealth() {
    const response = await platformApi.get('/system/health');
    return response.data;
  },

  // Subscription management
  async getSubscriptions() {
    const response = await platformApi.get('/subscriptions');
    return response.data;
  },

  async updateSubscription(tenantId, subscriptionData) {
    const response = await platformApi.put(`/subscriptions/${tenantId}`, subscriptionData);
    return response.data;
  },

  // Analytics and reporting
  async getRevenueAnalytics(dateRange) {
    const response = await platformApi.get('/analytics/revenue', { params: dateRange });
    return response.data;
  },

  async getUsageAnalytics(dateRange) {
    const response = await platformApi.get('/analytics/usage', { params: dateRange });
    return response.data;
  },

  async getPerformanceMetrics(dateRange) {
    const response = await platformApi.get('/analytics/performance', { params: dateRange });
    return response.data;
  },

  // Audit logs
  async getAuditLogs(filters) {
    const response = await platformApi.get('/audit-logs', { params: filters });
    return response.data;
  }
};

export default platformApi;
