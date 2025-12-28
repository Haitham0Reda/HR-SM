import { configureStore } from '@reduxjs/toolkit';
import moduleReducer, {
  fetchModuleAvailability,
  refreshModuleAvailability,
  clearModuleError,
  setFeatureFlag,
  clearModuleState,
  updateModuleAvailability,
  selectModules,
  selectModuleAvailability,
  selectEnabledModules,
  selectFeatureFlags,
  selectModuleLoading,
  selectModuleError,
  selectLastFetch,
  selectIsModuleEnabled,
  selectModuleUnavailabilityReason,
  selectIsLicenseValid,
  selectLicenseFeatures,
  selectHasLicenseFeature,
  selectFeatureFlag,
  selectIsCacheStale
} from '../moduleSlice';

// Mock API
jest.mock('../../../services/api', () => ({
  get: jest.fn(),
}));

const api = require('../../../services/api');

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('moduleSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        modules: moduleReducer,
        auth: (state = { isAuthenticated: true, user: { role: 'employee' } }) => state,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().modules;
      expect(state).toEqual({
        moduleAvailability: null,
        enabledModules: ['hr-core'],
        featureFlags: {},
        loading: false,
        error: null,
        lastFetch: null,
      });
    });
  });

  describe('reducers', () => {
    it('should clear module error', () => {
      // Set initial error state
      store.dispatch({ type: 'modules/fetchModuleAvailability/rejected', payload: 'Test error' });
      expect(store.getState().modules.error).toBe('Test error');

      // Clear error
      store.dispatch(clearModuleError());
      expect(store.getState().modules.error).toBeNull();
    });

    it('should set feature flag', () => {
      store.dispatch(setFeatureFlag({ flag: 'newFeature', value: true }));
      expect(store.getState().modules.featureFlags.newFeature).toBe(true);

      store.dispatch(setFeatureFlag({ flag: 'newFeature', value: false }));
      expect(store.getState().modules.featureFlags.newFeature).toBe(false);
    });

    it('should clear module state', () => {
      // Set some module state
      store.dispatch(setFeatureFlag({ flag: 'test', value: true }));
      store.dispatch(updateModuleAvailability({ modules: { core: ['hr-core'], available: ['tasks'] } }));
      
      // Clear module state
      store.dispatch(clearModuleState());
      
      const state = store.getState().modules;
      expect(state.moduleAvailability).toBeNull();
      expect(state.enabledModules).toEqual(['hr-core']);
      expect(state.featureFlags).toEqual({});
      expect(state.error).toBeNull();
      expect(state.lastFetch).toBeNull();
    });

    it('should update module availability', () => {
      const mockAvailability = {
        tenant: { id: 'tenant1', name: 'Test Company' },
        license: { valid: true, features: ['tasks'] },
        modules: {
          core: ['hr-core'],
          available: ['tasks', 'documents'],
          unavailable: [],
          total: 3
        }
      };

      store.dispatch(updateModuleAvailability(mockAvailability));
      
      const state = store.getState().modules;
      expect(state.moduleAvailability).toEqual(mockAvailability);
      expect(state.enabledModules).toEqual(['hr-core', 'tasks', 'documents']);
      expect(state.lastFetch).toBeGreaterThan(0);
    });
  });

  describe('async thunks', () => {
    describe('fetchModuleAvailability', () => {
      it('should fetch module availability successfully', async () => {
        const mockAvailability = {
          tenant: { id: 'tenant1', name: 'Test Company' },
          license: { valid: true, features: ['tasks'] },
          modules: {
            core: ['hr-core'],
            available: ['tasks', 'documents'],
            unavailable: [],
            total: 3
          }
        };

        api.get.mockResolvedValue({
          data: {
            success: true,
            data: mockAvailability
          }
        });

        const result = await store.dispatch(fetchModuleAvailability());

        expect(result.type).toBe('modules/fetchModuleAvailability/fulfilled');
        expect(result.payload).toEqual(mockAvailability);

        const state = store.getState().modules;
        expect(state.moduleAvailability).toEqual(mockAvailability);
        expect(state.enabledModules).toEqual(['hr-core', 'tasks', 'documents']);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
        expect(state.lastFetch).toBeGreaterThan(0);
      });

      it('should handle API failure in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        api.get.mockRejectedValue(new Error('API Error'));

        const result = await store.dispatch(fetchModuleAvailability());

        expect(result.type).toBe('modules/fetchModuleAvailability/rejected');
        expect(result.payload).toBe('API Error');

        const state = store.getState().modules;
        expect(state.loading).toBe(false);
        expect(state.error).toBe('API Error');
        expect(state.moduleAvailability.modules.core).toEqual(['hr-core']);
        expect(state.moduleAvailability.modules.available).toEqual([]);
        expect(state.enabledModules).toEqual(['hr-core']);

        process.env.NODE_ENV = originalEnv;
      });

      it('should use development fallback in development', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        api.get.mockRejectedValue(new Error('API Error'));

        const result = await store.dispatch(fetchModuleAvailability());

        expect(result.type).toBe('modules/fetchModuleAvailability/fulfilled');
        expect(result.payload.tenant.name).toBe('Development');
        expect(result.payload.modules.core).toEqual(['hr-core']);
        expect(result.payload.modules.available).toEqual(['tasks', 'documents', 'reports', 'life-insurance']);

        process.env.NODE_ENV = originalEnv;
      });

      it('should handle unauthenticated user', async () => {
        // Create store with unauthenticated state
        const unauthStore = configureStore({
          reducer: {
            modules: moduleReducer,
            auth: (state = { isAuthenticated: false }) => state,
          },
        });

        const result = await unauthStore.dispatch(fetchModuleAvailability());

        expect(result.type).toBe('modules/fetchModuleAvailability/rejected');
        expect(result.payload).toBe('User not authenticated');
      });

      it('should handle API response without success flag', async () => {
        api.get.mockResolvedValue({
          data: {
            success: false,
            message: 'Custom error message'
          }
        });

        const result = await store.dispatch(fetchModuleAvailability());

        expect(result.type).toBe('modules/fetchModuleAvailability/rejected');
        expect(result.payload).toBe('Custom error message');
      });
    });

    describe('refreshModuleAvailability', () => {
      it('should dispatch fetchModuleAvailability', async () => {
        const mockAvailability = {
          tenant: { id: 'tenant1', name: 'Test Company' },
          license: { valid: true, features: [] },
          modules: { core: ['hr-core'], available: [], unavailable: [], total: 1 }
        };

        api.get.mockResolvedValue({
          data: { success: true, data: mockAvailability }
        });

        const result = await store.dispatch(refreshModuleAvailability());

        // refreshModuleAvailability returns its own fulfilled action
        expect(result.type).toBe('modules/refreshModuleAvailability/fulfilled');
        
        // But it should have dispatched fetchModuleAvailability internally
        const state = store.getState().modules;
        expect(state.moduleAvailability).toEqual(mockAvailability);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up test state
      const mockAvailability = {
        tenant: { id: 'tenant1', name: 'Test Company' },
        license: { valid: true, features: ['tasks', 'documents'] },
        modules: {
          core: ['hr-core'],
          available: ['tasks', 'documents'],
          unavailable: [{ name: 'payroll', reason: 'license_expired' }],
          total: 3
        }
      };

      store.dispatch(updateModuleAvailability(mockAvailability));
      store.dispatch(setFeatureFlag({ flag: 'betaFeature', value: true }));
    });

    it('should select modules state', () => {
      const modules = selectModules(store.getState());
      expect(modules.moduleAvailability).toBeDefined();
      expect(modules.enabledModules).toEqual(['hr-core', 'tasks', 'documents']);
    });

    it('should select module availability', () => {
      const availability = selectModuleAvailability(store.getState());
      expect(availability.tenant.name).toBe('Test Company');
    });

    it('should select enabled modules', () => {
      const enabledModules = selectEnabledModules(store.getState());
      expect(enabledModules).toEqual(['hr-core', 'tasks', 'documents']);
    });

    it('should select feature flags', () => {
      const featureFlags = selectFeatureFlags(store.getState());
      expect(featureFlags.betaFeature).toBe(true);
    });

    it('should select loading state', () => {
      const loading = selectModuleLoading(store.getState());
      expect(loading).toBe(false);
    });

    it('should select error', () => {
      const error = selectModuleError(store.getState());
      expect(error).toBeNull();
    });

    it('should select last fetch timestamp', () => {
      const lastFetch = selectLastFetch(store.getState());
      expect(lastFetch).toBeGreaterThan(0);
    });

    it('should check if module is enabled', () => {
      const isTasksEnabled = selectIsModuleEnabled('tasks')(store.getState());
      const isPayrollEnabled = selectIsModuleEnabled('payroll')(store.getState());
      const isHRCoreEnabled = selectIsModuleEnabled('hr-core')(store.getState());

      expect(isTasksEnabled).toBe(true);
      expect(isPayrollEnabled).toBe(false);
      expect(isHRCoreEnabled).toBe(true); // Always enabled
    });

    it('should check module unavailability reason', () => {
      const tasksReason = selectModuleUnavailabilityReason('tasks')(store.getState());
      const payrollReason = selectModuleUnavailabilityReason('payroll')(store.getState());
      const unknownReason = selectModuleUnavailabilityReason('unknown')(store.getState());

      expect(tasksReason).toBeNull(); // Module is available
      expect(payrollReason).toBe('license_expired');
      expect(unknownReason).toBe('module_not_found');
    });

    it('should check license validity', () => {
      const isValid = selectIsLicenseValid(store.getState());
      expect(isValid).toBe(true);
    });

    it('should select license features', () => {
      const features = selectLicenseFeatures(store.getState());
      expect(features).toEqual(['tasks', 'documents']);
    });

    it('should check license feature availability', () => {
      const hasTasks = selectHasLicenseFeature('tasks')(store.getState());
      const hasPayroll = selectHasLicenseFeature('payroll')(store.getState());

      expect(hasTasks).toBe(true);
      expect(hasPayroll).toBe(false);
    });

    it('should select feature flag', () => {
      const betaFeature = selectFeatureFlag('betaFeature')(store.getState());
      const unknownFeature = selectFeatureFlag('unknownFeature')(store.getState());

      expect(betaFeature).toBe(true);
      expect(unknownFeature).toBe(false);
    });

    it('should check if cache is stale', () => {
      // Fresh cache
      const isStale = selectIsCacheStale(store.getState());
      expect(isStale).toBe(false);

      // Simulate stale cache by setting lastFetch to old timestamp
      store.dispatch({
        type: 'modules/updateModuleAvailability',
        payload: {
          ...store.getState().modules.moduleAvailability,
          _lastFetch: Date.now() - (6 * 60 * 1000) // 6 minutes ago
        }
      });

      // Manually update lastFetch in state for testing
      const currentState = store.getState();
      const staleState = {
        ...currentState,
        modules: {
          ...currentState.modules,
          lastFetch: Date.now() - (6 * 60 * 1000) // 6 minutes ago
        }
      };

      const isStaleNow = selectIsCacheStale(staleState);
      expect(isStaleNow).toBe(true);
    });

    it('should handle admin user permissions', () => {
      // Create store with admin user
      const adminStore = configureStore({
        reducer: {
          modules: moduleReducer,
          auth: (state = { isAuthenticated: true, user: { role: 'admin' } }) => state,
        },
      });

      // Admin should have access to all modules regardless of license
      const isPayrollEnabled = selectIsModuleEnabled('payroll')(adminStore.getState());
      expect(isPayrollEnabled).toBe(true);
    });
  });
});