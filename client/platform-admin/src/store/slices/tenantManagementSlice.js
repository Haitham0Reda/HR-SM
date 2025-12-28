import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/platformApi';

// Initial state
const initialState = {
  tenants: [],
  currentTenant: null,
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {
    search: '',
    status: 'all',
    subscriptionPlan: 'all',
  },
};

// Async thunks
export const fetchTenantsAsync = createAsyncThunk(
  'tenantManagement/fetchTenants',
  async ({ page = 1, limit = 10, search = '', status = 'all', subscriptionPlan = 'all' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      if (subscriptionPlan !== 'all') params.append('subscriptionPlan', subscriptionPlan);

      const response = await platformApi.get(`/tenants?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tenants');
    }
  }
);

export const fetchTenantByIdAsync = createAsyncThunk(
  'tenantManagement/fetchTenantById',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await platformApi.get(`/tenants/${tenantId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tenant');
    }
  }
);

export const createTenantAsync = createAsyncThunk(
  'tenantManagement/createTenant',
  async (tenantData, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/tenants', tenantData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create tenant');
    }
  }
);

export const updateTenantAsync = createAsyncThunk(
  'tenantManagement/updateTenant',
  async ({ tenantId, tenantData }, { rejectWithValue }) => {
    try {
      const response = await platformApi.put(`/tenants/${tenantId}`, tenantData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update tenant');
    }
  }
);

export const deleteTenantAsync = createAsyncThunk(
  'tenantManagement/deleteTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      await platformApi.delete(`/tenants/${tenantId}`);
      return tenantId;
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete tenant');
    }
  }
);

export const suspendTenantAsync = createAsyncThunk(
  'tenantManagement/suspendTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await platformApi.patch(`/tenants/${tenantId}/suspend`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to suspend tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to suspend tenant');
    }
  }
);

export const activateTenantAsync = createAsyncThunk(
  'tenantManagement/activateTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await platformApi.patch(`/tenants/${tenantId}/activate`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to activate tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to activate tenant');
    }
  }
);

// Slice
const tenantManagementSlice = createSlice({
  name: 'tenantManagement',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTenant: (state, action) => {
      state.currentTenant = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentTenant: (state) => {
      state.currentTenant = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tenants
      .addCase(fetchTenantsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = action.payload.tenants || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchTenantsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_TENANTS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Tenant by ID
      .addCase(fetchTenantByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTenant = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchTenantByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_TENANT_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Create Tenant
      .addCase(createTenantAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTenantAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants.unshift(action.payload);
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(createTenantAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'CREATE_TENANT_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Update Tenant
      .addCase(updateTenantAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTenantAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tenants.findIndex(tenant => tenant._id === action.payload._id);
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
        if (state.currentTenant && state.currentTenant._id === action.payload._id) {
          state.currentTenant = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateTenantAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_TENANT_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Delete Tenant
      .addCase(deleteTenantAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTenantAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = state.tenants.filter(tenant => tenant._id !== action.payload);
        if (state.currentTenant && state.currentTenant._id === action.payload) {
          state.currentTenant = null;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(deleteTenantAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'DELETE_TENANT_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Suspend Tenant
      .addCase(suspendTenantAsync.fulfilled, (state, action) => {
        const index = state.tenants.findIndex(tenant => tenant._id === action.payload._id);
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
        if (state.currentTenant && state.currentTenant._id === action.payload._id) {
          state.currentTenant = action.payload;
        }
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Activate Tenant
      .addCase(activateTenantAsync.fulfilled, (state, action) => {
        const index = state.tenants.findIndex(tenant => tenant._id === action.payload._id);
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
        if (state.currentTenant && state.currentTenant._id === action.payload._id) {
          state.currentTenant = action.payload;
        }
        state.lastSuccessfulOperation = new Date().toISOString();
      });
  },
});

export const { clearError, setCurrentTenant, setFilters, clearCurrentTenant } = tenantManagementSlice.actions;
export default tenantManagementSlice.reducer;