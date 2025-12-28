import { configureStore } from '@reduxjs/toolkit';
import tenantManagementSlice, {
  fetchTenantsAsync,
  fetchTenantByIdAsync,
  createTenantAsync,
  updateTenantAsync,
  deleteTenantAsync,
  suspendTenantAsync,
  activateTenantAsync,
  clearError,
  setCurrentTenant,
  setFilters,
  clearCurrentTenant,
} from '../tenantManagementSlice';

// Mock the platformApi
jest.mock('../../../services/platformApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));

import platformApi from '../../../services/platformApi';

describe('tenantManagementSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        tenantManagement: tenantManagementSlice,
      },
    });
    
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().tenantManagement;
      expect(state).toEqual({
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
      });
    });
  });

  describe('reducers', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({
        type: 'tenantManagement/fetchTenantsAsync/rejected',
        payload: 'Test error',
      });
      
      store.dispatch(clearError());
      
      const state = store.getState().tenantManagement;
      expect(state.error).toBeNull();
    });

    it('should handle setCurrentTenant', () => {
      const tenant = { _id: '1', name: 'Test Tenant' };
      
      store.dispatch(setCurrentTenant(tenant));
      
      const state = store.getState().tenantManagement;
      expect(state.currentTenant).toEqual(tenant);
    });

    it('should handle setFilters', () => {
      const filters = { search: 'test', status: 'active' };
      
      store.dispatch(setFilters(filters));
      
      const state = store.getState().tenantManagement;
      expect(state.filters).toEqual({
        search: 'test',
        status: 'active',
        subscriptionPlan: 'all',
      });
    });

    it('should handle clearCurrentTenant', () => {
      // Set a tenant first
      store.dispatch(setCurrentTenant({ _id: '1', name: 'Test Tenant' }));
      
      store.dispatch(clearCurrentTenant());
      
      const state = store.getState().tenantManagement;
      expect(state.currentTenant).toBeNull();
    });
  });

  describe('fetchTenantsAsync', () => {
    it('should handle successful fetch', async () => {
      const mockTenants = [
        { _id: '1', name: 'Tenant 1' },
        { _id: '2', name: 'Tenant 2' },
      ];
      const mockResponse = {
        tenants: mockTenants,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockResponse },
      });

      await store.dispatch(fetchTenantsAsync());

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.tenants).toEqual(mockTenants);
      expect(state.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(state.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch tenants';
      
      platformApi.get.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(fetchTenantsAsync());

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_TENANTS_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });

    it('should build correct query parameters', async () => {
      platformApi.get.mockResolvedValueOnce({
        data: { data: { tenants: [] } },
      });

      await store.dispatch(fetchTenantsAsync({
        page: 2,
        limit: 20,
        search: 'test',
        status: 'active',
        subscriptionPlan: 'premium',
      }));

      expect(platformApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2&limit=20&search=test&status=active&subscriptionPlan=premium')
      );
    });
  });

  describe('fetchTenantByIdAsync', () => {
    it('should handle successful fetch', async () => {
      const mockTenant = { _id: '1', name: 'Test Tenant' };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockTenant },
      });

      await store.dispatch(fetchTenantByIdAsync('1'));

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.currentTenant).toEqual(mockTenant);
      expect(state.error).toBeNull();
    });
  });

  describe('createTenantAsync', () => {
    it('should handle successful creation', async () => {
      const newTenant = { _id: '3', name: 'New Tenant' };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: newTenant },
      });

      await store.dispatch(createTenantAsync({ name: 'New Tenant' }));

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.tenants[0]).toEqual(newTenant); // Should be added to beginning
      expect(state.error).toBeNull();
    });
  });

  describe('updateTenantAsync', () => {
    it('should handle successful update', async () => {
      const existingTenant = { _id: '1', name: 'Old Name' };
      const updatedTenant = { _id: '1', name: 'New Name' };
      
      // Set initial state with existing tenant
      store.dispatch(setCurrentTenant(existingTenant));
      // Manually set the tenants array
      store.dispatch({
        type: 'tenantManagement/fetchTenantsAsync/fulfilled',
        payload: { tenants: [existingTenant] },
      });
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: updatedTenant },
      });

      await store.dispatch(updateTenantAsync({
        tenantId: '1',
        tenantData: { name: 'New Name' },
      }));

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.tenants).toHaveLength(1);
      expect(state.tenants[0]).toEqual(updatedTenant);
      expect(state.currentTenant).toEqual(updatedTenant);
      expect(state.error).toBeNull();
    });
  });

  describe('deleteTenantAsync', () => {
    it('should handle successful deletion', async () => {
      const tenant = { _id: '1', name: 'Test Tenant' };
      
      // Set initial state with tenant
      store.dispatch(setCurrentTenant(tenant));
      store.dispatch({
        type: 'tenantManagement/fetchTenantsAsync/fulfilled',
        payload: { tenants: [tenant] },
      });
      
      platformApi.delete.mockResolvedValueOnce({});

      await store.dispatch(deleteTenantAsync('1'));

      const state = store.getState().tenantManagement;
      expect(state.loading).toBe(false);
      expect(state.tenants).toEqual([]);
      expect(state.currentTenant).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('suspendTenantAsync', () => {
    it('should handle successful suspension', async () => {
      const tenant = { _id: '1', name: 'Test Tenant', status: 'active' };
      const suspendedTenant = { _id: '1', name: 'Test Tenant', status: 'suspended' };
      
      // Set initial state
      store.dispatch({
        type: 'tenantManagement/fetchTenantsAsync/fulfilled',
        payload: { tenants: [tenant] },
      });
      
      platformApi.patch.mockResolvedValueOnce({
        data: { data: suspendedTenant },
      });

      await store.dispatch(suspendTenantAsync('1'));

      const state = store.getState().tenantManagement;
      expect(state.tenants).toHaveLength(1);
      expect(state.tenants[0]).toEqual(suspendedTenant);
    });
  });

  describe('activateTenantAsync', () => {
    it('should handle successful activation', async () => {
      const tenant = { _id: '1', name: 'Test Tenant', status: 'suspended' };
      const activatedTenant = { _id: '1', name: 'Test Tenant', status: 'active' };
      
      // Set initial state
      store.dispatch({
        type: 'tenantManagement/fetchTenantsAsync/fulfilled',
        payload: { tenants: [tenant] },
      });
      
      platformApi.patch.mockResolvedValueOnce({
        data: { data: activatedTenant },
      });

      await store.dispatch(activateTenantAsync('1'));

      const state = store.getState().tenantManagement;
      expect(state.tenants).toHaveLength(1);
      expect(state.tenants[0]).toEqual(activatedTenant);
    });
  });
});