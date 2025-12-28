import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/platformApi';

// Initial state
const initialState = {
  modules: [],
  availableModules: [],
  tenantModules: {},
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
};

// Async thunks
export const fetchAvailableModulesAsync = createAsyncThunk(
  'moduleManagement/fetchAvailableModules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/modules/available');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch available modules:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch available modules');
    }
  }
);

export const fetchTenantModulesAsync = createAsyncThunk(
  'moduleManagement/fetchTenantModules',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await platformApi.get(`/tenants/${tenantId}/modules`);
      return { tenantId, modules: response.data.data };
    } catch (error) {
      console.error('Failed to fetch tenant modules:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tenant modules');
    }
  }
);

export const updateTenantModulesAsync = createAsyncThunk(
  'moduleManagement/updateTenantModules',
  async ({ tenantId, moduleConfig }, { rejectWithValue }) => {
    try {
      const response = await platformApi.put(`/tenants/${tenantId}/modules`, moduleConfig);
      return { tenantId, modules: response.data.data };
    } catch (error) {
      console.error('Failed to update tenant modules:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update tenant modules');
    }
  }
);

export const enableModuleForTenantAsync = createAsyncThunk(
  'moduleManagement/enableModuleForTenant',
  async ({ tenantId, moduleId, config = {} }, { rejectWithValue }) => {
    try {
      const response = await platformApi.post(`/tenants/${tenantId}/modules/${moduleId}/enable`, config);
      return { tenantId, moduleId, module: response.data.data };
    } catch (error) {
      console.error('Failed to enable module for tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to enable module for tenant');
    }
  }
);

export const disableModuleForTenantAsync = createAsyncThunk(
  'moduleManagement/disableModuleForTenant',
  async ({ tenantId, moduleId }, { rejectWithValue }) => {
    try {
      await platformApi.post(`/tenants/${tenantId}/modules/${moduleId}/disable`);
      return { tenantId, moduleId };
    } catch (error) {
      console.error('Failed to disable module for tenant:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to disable module for tenant');
    }
  }
);

export const createModuleAsync = createAsyncThunk(
  'moduleManagement/createModule',
  async (moduleData, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/modules', moduleData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create module:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create module');
    }
  }
);

export const updateModuleAsync = createAsyncThunk(
  'moduleManagement/updateModule',
  async ({ moduleId, moduleData }, { rejectWithValue }) => {
    try {
      const response = await platformApi.put(`/modules/${moduleId}`, moduleData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update module:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update module');
    }
  }
);

export const deleteModuleAsync = createAsyncThunk(
  'moduleManagement/deleteModule',
  async (moduleId, { rejectWithValue }) => {
    try {
      await platformApi.delete(`/modules/${moduleId}`);
      return moduleId;
    } catch (error) {
      console.error('Failed to delete module:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete module');
    }
  }
);

// Slice
const moduleManagementSlice = createSlice({
  name: 'moduleManagement',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTenantModules: (state, action) => {
      const { tenantId, modules } = action.payload;
      state.tenantModules[tenantId] = modules;
    },
    clearTenantModules: (state, action) => {
      const tenantId = action.payload;
      delete state.tenantModules[tenantId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available Modules
      .addCase(fetchAvailableModulesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableModulesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.availableModules = action.payload || [];
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchAvailableModulesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_AVAILABLE_MODULES_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Tenant Modules
      .addCase(fetchTenantModulesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantModulesAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { tenantId, modules } = action.payload;
        state.tenantModules[tenantId] = modules;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchTenantModulesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_TENANT_MODULES_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Update Tenant Modules
      .addCase(updateTenantModulesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTenantModulesAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { tenantId, modules } = action.payload;
        state.tenantModules[tenantId] = modules;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateTenantModulesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_TENANT_MODULES_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Enable Module for Tenant
      .addCase(enableModuleForTenantAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enableModuleForTenantAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { tenantId, moduleId, module } = action.payload;
        if (!state.tenantModules[tenantId]) {
          state.tenantModules[tenantId] = [];
        }
        const existingIndex = state.tenantModules[tenantId].findIndex(m => m.moduleId === moduleId);
        if (existingIndex !== -1) {
          state.tenantModules[tenantId][existingIndex] = module;
        } else {
          state.tenantModules[tenantId].push(module);
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(enableModuleForTenantAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'ENABLE_MODULE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Disable Module for Tenant
      .addCase(disableModuleForTenantAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableModuleForTenantAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { tenantId, moduleId } = action.payload;
        if (state.tenantModules[tenantId]) {
          state.tenantModules[tenantId] = state.tenantModules[tenantId].filter(m => m.moduleId !== moduleId);
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(disableModuleForTenantAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'DISABLE_MODULE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Create Module
      .addCase(createModuleAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createModuleAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.availableModules.push(action.payload);
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(createModuleAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'CREATE_MODULE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Update Module
      .addCase(updateModuleAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateModuleAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.availableModules.findIndex(module => module._id === action.payload._id);
        if (index !== -1) {
          state.availableModules[index] = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateModuleAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_MODULE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Delete Module
      .addCase(deleteModuleAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteModuleAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.availableModules = state.availableModules.filter(module => module._id !== action.payload);
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(deleteModuleAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'DELETE_MODULE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      });
  },
});

export const { clearError, setTenantModules, clearTenantModules } = moduleManagementSlice.actions;
export default moduleManagementSlice.reducer;