/**
 * Module Availability Test Utility
 * 
 * This utility helps test and debug module availability issues
 */

import api from '../services/api';

export const testModuleAvailability = async () => {
  console.log('🧪 Testing module availability...');
  
  try {
    // Check if we have authentication tokens
    const token = localStorage.getItem('tenant_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    console.log('Auth tokens:', {
      hasToken: !!token,
      hasTenantId: !!tenantId,
      tokenLength: token ? token.length : 0
    });
    
    if (!token || !tenantId) {
      console.error('❌ No authentication tokens found');
      return { success: false, error: 'No authentication tokens' };
    }
    
    // Test the API endpoint
    const response = await api.get('/modules/availability');
    
    console.log('✅ Module availability API response:', response);
    
    return { success: true, data: response };
    
  } catch (error) {
    console.error('❌ Module availability test failed:', error);
    
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      details: error
    };
  }
};

export const debugModuleState = (store) => {
  const state = store.getState();
  
  console.log('🔍 Module state debug:', {
    auth: {
      isAuthenticated: state.auth.isAuthenticated,
      hasUser: !!state.auth.user,
      hasToken: !!state.auth.tenantToken,
      hasTenantId: !!state.auth.tenantId,
      userRole: state.auth.user?.role
    },
    modules: {
      loading: state.modules.loading,
      error: state.modules.error,
      hasAvailability: !!state.modules.moduleAvailability,
      enabledModules: state.modules.enabledModules,
      lastFetch: state.modules.lastFetch
    }
  });
};

// Export for console debugging
if (typeof window !== 'undefined') {
  window.testModuleAvailability = testModuleAvailability;
  window.debugModuleState = debugModuleState;
}