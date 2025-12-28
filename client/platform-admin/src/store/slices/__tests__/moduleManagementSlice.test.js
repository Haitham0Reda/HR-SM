import { configureStore } from '@reduxjs/toolkit';
import moduleManagementSlice, {
  fetchAvailableModulesAsync,
  fetchTenantModulesAsync,
  updateTenantModulesAsync,
  enableModuleForTenantAsync,
  disableModuleForTenantAsync,
  createModuleAsync,
  updateModuleAsync,
  deleteModuleAsync,
  clearError,
  setTenantModules,
  clearTenantModules,
} from '../moduleManagementSlice';

// Mock the platformApi
jest.mock('../../../services/platformApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import platformApi from '../../../services/platformApi';

describe('moduleManagementSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        moduleManagement: moduleManagementSlice,
      },
    });
    
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().moduleManagement;
      expect(state).toEqual({
        modules: [],
        availableModules: [],
        tenantModules: {},
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
      });
    });
  });

  describe('reducers', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({
        type: 'moduleManagement/fetchAvailableModulesAsync/rejected',
        payload: 'Test error',
      });
      
      store.dispatch(clearError());
      
      const state = store.getState().moduleManagement;
      expect(state.error).toBeNull();
    });

    it('should handle setTenantModules', () => {
      const tenantId = 'tenant1';
      const modules = [{ moduleId: 'hr-core', enabled: true }];
      
      store.dispatch(setTenantModules({ tenantId, modules }));
      
      const state = store.getState().moduleManagement;
      expect(state.tenantModules[tenantId]).toEqual(modules);
    });

    it('should handle clearTenantModules', () => {
      const tenantId = 'tenant1';
      
      // Set modules first
      store.dispatch(setTenantModules({ 
        tenantId, 
        modules: [{ moduleId: 'hr-core', enabled: true }] 
      }));
      
      store.dispatch(clearTenantModules(tenantId));
      
      const state = store.getState().moduleManagement;
      expect(state.tenantModules[tenantId]).toBeUndefined();
    });
  });

  describe('fetchAvailableModulesAsync', () => {
    it('should handle successful fetch', async () => {
      const mockModules = [
        { _id: '1', name: 'HR Core', moduleId: 'hr-core' },
        { _id: '2', name: 'Payroll', moduleId: 'payroll' },
      ];
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockModules },
      });

      await store.dispatch(fetchAvailableModulesAsync());

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.availableModules).toEqual(mockModules);
      expect(state.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch available modules';
      
      platformApi.get.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(fetchAvailableModulesAsync());

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_AVAILABLE_MODULES_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });

  describe('fetchTenantModulesAsync', () => {
    it('should handle successful fetch', async () => {
      const tenantId = 'tenant1';
      const mockModules = [
        { moduleId: 'hr-core', enabled: true },
        { moduleId: 'payroll', enabled: false },
      ];
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockModules },
      });

      await store.dispatch(fetchTenantModulesAsync(tenantId));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.tenantModules[tenantId]).toEqual(mockModules);
      expect(state.error).toBeNull();
    });
  });

  describe('updateTenantModulesAsync', () => {
    it('should handle successful update', async () => {
      const tenantId = 'tenant1';
      const moduleConfig = { modules: ['hr-core', 'payroll'] };
      const updatedModules = [
        { moduleId: 'hr-core', enabled: true },
        { moduleId: 'payroll', enabled: true },
      ];
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: updatedModules },
      });

      await store.dispatch(updateTenantModulesAsync({ tenantId, moduleConfig }));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.tenantModules[tenantId]).toEqual(updatedModules);
      expect(state.error).toBeNull();
    });
  });

  describe('enableModuleForTenantAsync', () => {
    it('should handle successful enable', async () => {
      const tenantId = 'tenant1';
      const moduleId = 'payroll';
      const enabledModule = { moduleId: 'payroll', enabled: true };
      
      // Set initial state with existing modules
      store.dispatch(setTenantModules({
        tenantId,
        modules: [{ moduleId: 'hr-core', enabled: true }],
      }));
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: enabledModule },
      });

      await store.dispatch(enableModuleForTenantAsync({ 
        tenantId, 
        moduleId, 
        config: {} 
      }));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.tenantModules[tenantId]).toContainEqual(enabledModule);
      expect(state.error).toBeNull();
    });

    it('should update existing module if already present', async () => {
      const tenantId = 'tenant1';
      const moduleId = 'payroll';
      const updatedModule = { moduleId: 'payroll', enabled: true, config: { newSetting: true } };
      
      // Set initial state with existing module
      store.dispatch(setTenantModules({
        tenantId,
        modules: [{ moduleId: 'payroll', enabled: false }],
      }));
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: updatedModule },
      });

      await store.dispatch(enableModuleForTenantAsync({ 
        tenantId, 
        moduleId, 
        config: { newSetting: true } 
      }));

      const state = store.getState().moduleManagement;
      expect(state.tenantModules[tenantId]).toEqual([updatedModule]);
    });
  });

  describe('disableModuleForTenantAsync', () => {
    it('should handle successful disable', async () => {
      const tenantId = 'tenant1';
      const moduleId = 'payroll';
      
      // Set initial state with modules
      store.dispatch(setTenantModules({
        tenantId,
        modules: [
          { moduleId: 'hr-core', enabled: true },
          { moduleId: 'payroll', enabled: true },
        ],
      }));
      
      platformApi.post.mockResolvedValueOnce({});

      await store.dispatch(disableModuleForTenantAsync({ tenantId, moduleId }));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.tenantModules[tenantId]).toEqual([
        { moduleId: 'hr-core', enabled: true },
      ]);
      expect(state.error).toBeNull();
    });
  });

  describe('createModuleAsync', () => {
    it('should handle successful creation', async () => {
      const newModule = { _id: '3', name: 'New Module', moduleId: 'new-module' };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: newModule },
      });

      await store.dispatch(createModuleAsync({ name: 'New Module' }));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.availableModules).toContainEqual(newModule);
      expect(state.error).toBeNull();
    });
  });

  describe('updateModuleAsync', () => {
    it('should handle successful update', async () => {
      const existingModule = { _id: '1', name: 'Old Name', moduleId: 'test-module' };
      const updatedModule = { _id: '1', name: 'New Name', moduleId: 'test-module' };
      
      // Set initial state with existing module
      store.dispatch({
        type: 'moduleManagement/fetchAvailableModulesAsync/fulfilled',
        payload: [existingModule],
      });
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: updatedModule },
      });

      await store.dispatch(updateModuleAsync({
        moduleId: '1',
        moduleData: { name: 'New Name' },
      }));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.availableModules).toHaveLength(1);
      expect(state.availableModules[0]).toEqual(updatedModule);
      expect(state.error).toBeNull();
    });
  });

  describe('deleteModuleAsync', () => {
    it('should handle successful deletion', async () => {
      const module = { _id: '1', name: 'Test Module', moduleId: 'test-module' };
      
      // Set initial state with module
      store.dispatch({
        type: 'moduleManagement/fetchAvailableModulesAsync/fulfilled',
        payload: [module],
      });
      
      platformApi.delete.mockResolvedValueOnce({});

      await store.dispatch(deleteModuleAsync('1'));

      const state = store.getState().moduleManagement;
      expect(state.loading).toBe(false);
      expect(state.availableModules).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});