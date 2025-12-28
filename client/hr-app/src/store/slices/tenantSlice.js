import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  currentTenant: null,
  availableTenants: [],
  switching: false,
  loading: false,
  error: null,
  companySlug: null,
};

// Async thunks
export const loadTenantInfo = createAsyncThunk(
  'tenant/loadTenantInfo',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (!auth.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const tenantResponse = await api.get('/tenant/info');
      const tenantData = tenantResponse.data?.tenant || tenantResponse.data || tenantResponse;
      
      if (!tenantData) {
        throw new Error('No tenant data in response');
      }

      return tenantData;
    } catch (error) {
      console.warn('Failed to load tenant info:', error);
      
      // Fallback to basic tenant info from user data
      const { auth } = getState();
      if (auth.user) {
        return {
          tenantId: auth.tenantId,
          name: auth.user.company?.name || 'TechCorp Solutions',
          slug: null
        };
      }
      
      return rejectWithValue(error.message || 'Failed to load tenant info');
    }
  }
);

export const switchTenant = createAsyncThunk(
  'tenant/switchTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      // This would be implemented when multi-tenant switching is available
      // For now, just return the current tenant
      const response = await api.get('/tenant/info');
      return response.data?.tenant || response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to switch tenant');
    }
  }
);

// Helper function to generate company slug
const generateCompanySlug = (tenantName) => {
  if (!tenantName) return 'techcorp_solutions';
  return tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

// Tenant slice
const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenantError: (state) => {
      state.error = null;
    },
    setCurrentTenant: (state, action) => {
      state.currentTenant = action.payload;
      state.companySlug = action.payload?.slug || generateCompanySlug(action.payload?.name);
    },
    clearTenantState: (state) => {
      state.currentTenant = null;
      state.availableTenants = [];
      state.switching = false;
      state.companySlug = null;
      state.error = null;
    },
    updateTenantInfo: (state, action) => {
      if (state.currentTenant) {
        state.currentTenant = { ...state.currentTenant, ...action.payload };
        state.companySlug = state.currentTenant.slug || generateCompanySlug(state.currentTenant.name);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Load tenant info cases
      .addCase(loadTenantInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTenantInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTenant = action.payload;
        state.companySlug = action.payload?.slug || generateCompanySlug(action.payload?.name);
        state.error = null;
      })
      .addCase(loadTenantInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Switch tenant cases
      .addCase(switchTenant.pending, (state) => {
        state.switching = true;
        state.error = null;
      })
      .addCase(switchTenant.fulfilled, (state, action) => {
        state.switching = false;
        state.currentTenant = action.payload;
        state.companySlug = action.payload?.slug || generateCompanySlug(action.payload?.name);
        state.error = null;
      })
      .addCase(switchTenant.rejected, (state, action) => {
        state.switching = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectTenant = (state) => state.tenant;
export const selectCurrentTenant = (state) => state.tenant.currentTenant;
export const selectAvailableTenants = (state) => state.tenant.availableTenants;
export const selectCompanySlug = (state) => state.tenant.companySlug;
export const selectTenantLoading = (state) => state.tenant.loading;
export const selectTenantError = (state) => state.tenant.error;
export const selectIsSwitching = (state) => state.tenant.switching;

// Computed selectors
export const selectTenantName = (state) => state.tenant.currentTenant?.name || 'Unknown Company';
export const selectTenantId = (state) => state.tenant.currentTenant?.tenantId || state.tenant.currentTenant?.id;

// Export actions
export const { clearTenantError, setCurrentTenant, clearTenantState, updateTenantInfo } = tenantSlice.actions;

export default tenantSlice.reducer;