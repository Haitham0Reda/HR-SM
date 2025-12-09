import platformApi from './platformApi';

const subscriptionService = {
  // Get all plans
  getAllPlans: async () => {
    try {
      const response = await platformApi.get('/subscriptions/plans');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new plan
  createPlan: async (planData) => {
    try {
      const response = await platformApi.post('/subscriptions/plans', planData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update plan
  updatePlan: async (planId, planData) => {
    try {
      const response = await platformApi.patch(`/subscriptions/plans/${planId}`, planData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Assign plan to tenant
  assignPlanToTenant: async (tenantId, planId) => {
    try {
      const response = await platformApi.patch(`/subscriptions/tenants/${tenantId}/subscription`, {
        planId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tenant subscription
  getTenantSubscription: async (tenantId) => {
    try {
      const response = await platformApi.get(`/subscriptions/tenants/${tenantId}/subscription`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default subscriptionService;
