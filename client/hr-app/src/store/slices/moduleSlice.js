import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  moduleAvailability: null,
  enabledModules: ['hr-core'], // Default to core module
  featureFlags: {},
  loading: false,
  error: null,
  lastFetch: null,
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Async thunks
export const fetchModuleAvailability = createAsyncThunk(
  'modules/fetchModuleAvailability',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (!auth.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      // Additional check for token presence
      if (!auth.tenantToken) {
        throw new Error('No authentication token available');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching module availability for tenant');
      }

      const response = await api.get('/modules/availability');
      
      if (response.data && response.data.success) {
        const availability = response.data.data;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Module availability loaded:', {
            tenant: availability.tenant.name,
            totalAvailable: availability.modules.total,
            availableModules: [...availability.modules.core, ...availability.modules.available],
            licenseValid: availability.license.valid
          });
        }
        
        return availability;
      } else if (response.success) {
        // Handle case where response is already unwrapped by axios interceptor
        const availability = response.data || response;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Module availability loaded:', {
            tenant: availability.tenant?.name || 'Unknown',
            totalAvailable: availability.modules?.total || 0,
            availableModules: [...(availability.modules?.core || []), ...(availability.modules?.available || [])],
            licenseValid: availability.license?.valid || false
          });
        }
        
        return availability;
      } else {
        throw new Error(response.message || 'Failed to load module availability');
      }
    } catch (error) {
      console.error('Failed to fetch module availability:', error);
      
      // In development, provide default configuration
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using default module configuration for development');
        return {
          tenant: { id: 'dev', name: 'Development', enabledModules: [] },
          license: { valid: true, features: ['life-insurance'], licenseType: 'development' },
          modules: {
            core: ['hr-core'],
            available: ['tasks', 'documents', 'reports', 'life-insurance'],
            unavailable: [],
            total: 5
          }
        };
      }
      
      return rejectWithValue(error.message || 'Failed to load module availability');
    }
  }
);

export const refreshModuleAvailability = createAsyncThunk(
  'modules/refreshModuleAvailability',
  async (_, { dispatch }) => {
    return dispatch(fetchModuleAvailability());
  }
);

// Module slice
const moduleSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    clearModuleError: (state) => {
      state.error = null;
    },
    setFeatureFlag: (state, action) => {
      const { flag, value } = action.payload;
      state.featureFlags[flag] = value;
    },
    clearModuleState: (state) => {
      state.moduleAvailability = null;
      state.enabledModules = ['hr-core'];
      state.featureFlags = {};
      state.error = null;
      state.lastFetch = null;
    },
    updateModuleAvailability: (state, action) => {
      state.moduleAvailability = action.payload;
      state.lastFetch = Date.now();
      
      // Update enabled modules list
      if (action.payload?.modules) {
        const { core, available } = action.payload.modules;
        state.enabledModules = [...core, ...available];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch module availability cases
      .addCase(fetchModuleAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModuleAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.moduleAvailability = action.payload;
        state.lastFetch = Date.now();
        state.error = null;
        
        // Update enabled modules list
        if (action.payload?.modules) {
          const { core, available } = action.payload.modules;
          state.enabledModules = [...core, ...available];
        }
      })
      .addCase(fetchModuleAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        
        // Fallback to core modules only on error
        state.moduleAvailability = {
          tenant: { id: null, name: null, enabledModules: [] },
          license: { valid: false, features: [], licenseType: null },
          modules: {
            core: ['hr-core'],
            available: [],
            unavailable: [],
            total: 1
          }
        };
        state.enabledModules = ['hr-core'];
      });
  },
});

// Selectors
export const selectModules = (state) => state.modules;
export const selectModuleAvailability = (state) => state.modules.moduleAvailability;
export const selectEnabledModules = (state) => state.modules.enabledModules;
export const selectFeatureFlags = (state) => state.modules.featureFlags;
export const selectModuleLoading = (state) => state.modules.loading;
export const selectModuleError = (state) => state.modules.error;
export const selectLastFetch = (state) => state.modules.lastFetch;

// Module availability selectors
export const selectIsModuleEnabled = (moduleId) => (state) => {
  const { auth, modules } = state;
  
  // Admin users have access to all modules (bypass license checks)
  if (auth.user && auth.user.role === 'admin') {
    return true;
  }
  
  // HR-Core is always enabled for all users
  if (moduleId === 'hr-core') {
    return true;
  }

  return modules.enabledModules.includes(moduleId);
};

export const selectModuleUnavailabilityReason = (moduleId) => (state) => {
  const isEnabled = selectIsModuleEnabled(moduleId)(state);
  
  if (isEnabled) {
    return null;
  }

  const { modules } = state;
  
  if (!modules.moduleAvailability) {
    return 'loading';
  }

  const unavailable = modules.moduleAvailability.modules.unavailable.find(m => m.name === moduleId);
  return unavailable ? unavailable.reason : 'module_not_found';
};

// License selectors
export const selectIsLicenseValid = (state) => {
  return state.modules.moduleAvailability?.license?.valid || false;
};

export const selectLicenseFeatures = (state) => {
  return state.modules.moduleAvailability?.license?.features || [];
};

export const selectHasLicenseFeature = (featureName) => (state) => {
  const features = selectLicenseFeatures(state);
  return features.includes(featureName);
};

// Feature flag selectors
export const selectFeatureFlag = (flagName) => (state) => {
  return state.modules.featureFlags[flagName] || false;
};

// Cache validation selector
export const selectIsCacheStale = (state) => {
  const { lastFetch } = state.modules;
  return lastFetch && (Date.now() - lastFetch) > CACHE_DURATION;
};

// Export actions
export const { clearModuleError, setFeatureFlag, clearModuleState, updateModuleAvailability } = moduleSlice.actions;

export default moduleSlice.reducer;