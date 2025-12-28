import { configureStore } from '@reduxjs/toolkit';
import tenantReducer, {
  loadTenantInfo,
  switchTenant,
  clearTenantError,
  setCurrentTenant,
  clearTenantState,
  updateTenantInfo,
  selectTenant,
  selectCurrentTenant,
  selectAvailableTenants,
  selectCompanySlug,
  selectTenantLoading,
  selectTenantError,
  selectIsSwitching,
  selectTenantName,
  selectTenantId
} from '../tenantSlice';

// Mock API
jest.mock('../../../services/api', () => ({
  get: jest.fn(),
}));

const api = require('../../../services/api');

describe('tenantSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        tenant: tenantReducer,
        auth: (state = { isAuthenticated: true, user: { company: { name: 'Test Company' } }, tenantId: 'tenant1' }) => state,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().tenant;
      expect(state).toEqual({
        currentTenant: null,
        availableTenants: [],
        switching: false,
        loading: false,
        error: null,
        companySlug: null,
      });
    });
  });

  describe('reducers', () => {
    it('should clear tenant error', () => {
      // Set initial error state
      store.dispatch({ type: 'tenant/loadTenantInfo/rejected', payload: 'Test error' });
      expect(store.getState().tenant.error).toBe('Test error');

      // Clear error
      store.dispatch(clearTenantError());
      expect(store.getState().tenant.error).toBeNull();
    });

    it('should set current tenant', () => {
      const tenantData = { 
        id: 'tenant1', 
        name: 'Test Company', 
        slug: 'test-company' 
      };
      
      store.dispatch(setCurrentTenant(tenantData));
      
      const state = store.getState().tenant;
      expect(state.currentTenant).toEqual(tenantData);
      expect(state.companySlug).toBe('test-company');
    });

    it('should generate company slug from name when slug is not provided', () => {
      const tenantData = { 
        id: 'tenant1', 
        name: 'Test Company Inc.' 
      };
      
      store.dispatch(setCurrentTenant(tenantData));
      
      const state = store.getState().tenant;
      expect(state.companySlug).toBe('test_company_inc');
    });

    it('should clear tenant state', () => {
      // Set some tenant state
      store.dispatch(setCurrentTenant({ id: 'tenant1', name: 'Test Company' }));
      
      // Clear tenant state
      store.dispatch(clearTenantState());
      
      const state = store.getState().tenant;
      expect(state.currentTenant).toBeNull();
      expect(state.availableTenants).toEqual([]);
      expect(state.switching).toBe(false);
      expect(state.companySlug).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should update tenant info', () => {
      // Set initial tenant
      store.dispatch(setCurrentTenant({ id: 'tenant1', name: 'Old Name' }));
      
      // Update tenant info
      const updates = { name: 'New Name', description: 'Updated description' };
      store.dispatch(updateTenantInfo(updates));
      
      const state = store.getState().tenant;
      expect(state.currentTenant.name).toBe('New Name');
      expect(state.currentTenant.description).toBe('Updated description');
      expect(state.currentTenant.id).toBe('tenant1'); // Should preserve existing fields
      expect(state.companySlug).toBe('new_name');
    });
  });

  describe('async thunks', () => {
    describe('loadTenantInfo', () => {
      it('should load tenant info successfully', async () => {
        const mockTenant = {
          id: 'tenant1',
          name: 'Test Company',
          slug: 'test-company'
        };
        api.get.mockResolvedValue({ data: { tenant: mockTenant } });

        const result = await store.dispatch(loadTenantInfo());

        expect(result.type).toBe('tenant/loadTenantInfo/fulfilled');
        expect(result.payload).toEqual(mockTenant);

        const state = store.getState().tenant;
        expect(state.currentTenant).toEqual(mockTenant);
        expect(state.companySlug).toBe('test-company');
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle API response without tenant wrapper', async () => {
        const mockTenant = {
          id: 'tenant1',
          name: 'Test Company'
        };
        api.get.mockResolvedValue({ data: mockTenant });

        const result = await store.dispatch(loadTenantInfo());

        expect(result.type).toBe('tenant/loadTenantInfo/fulfilled');
        expect(result.payload).toEqual(mockTenant);
      });

      it('should fallback to user company data on API failure', async () => {
        api.get.mockRejectedValue(new Error('API Error'));

        const result = await store.dispatch(loadTenantInfo());

        expect(result.type).toBe('tenant/loadTenantInfo/fulfilled');
        expect(result.payload).toEqual({
          tenantId: 'tenant1',
          name: 'Test Company',
          slug: null
        });
      });

      it('should handle unauthenticated user', async () => {
        // Create store with unauthenticated state
        const unauthStore = configureStore({
          reducer: {
            tenant: tenantReducer,
            auth: (state = { isAuthenticated: false }) => state,
          },
        });

        const result = await unauthStore.dispatch(loadTenantInfo());

        expect(result.type).toBe('tenant/loadTenantInfo/rejected');
        expect(result.payload).toBe('User not authenticated');
      });
    });

    describe('switchTenant', () => {
      it('should switch tenant successfully', async () => {
        const mockTenant = {
          id: 'tenant2',
          name: 'New Company'
        };
        api.get.mockResolvedValue({ data: { tenant: mockTenant } });

        const result = await store.dispatch(switchTenant('tenant2'));

        expect(result.type).toBe('tenant/switchTenant/fulfilled');
        expect(result.payload).toEqual(mockTenant);

        const state = store.getState().tenant;
        expect(state.currentTenant).toEqual(mockTenant);
        expect(state.switching).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle switch tenant failure', async () => {
        const errorMessage = 'Failed to switch tenant';
        api.get.mockRejectedValue(new Error(errorMessage));

        const result = await store.dispatch(switchTenant('tenant2'));

        expect(result.type).toBe('tenant/switchTenant/rejected');
        expect(result.payload).toBe(errorMessage);

        const state = store.getState().tenant;
        expect(state.switching).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up test state
      store.dispatch(setCurrentTenant({
        id: 'tenant1',
        tenantId: 'tenant1',
        name: 'Test Company',
        slug: 'test-company'
      }));
    });

    it('should select tenant state', () => {
      const tenant = selectTenant(store.getState());
      expect(tenant.currentTenant).toBeDefined();
      expect(tenant.companySlug).toBe('test-company');
    });

    it('should select current tenant', () => {
      const currentTenant = selectCurrentTenant(store.getState());
      expect(currentTenant.name).toBe('Test Company');
    });

    it('should select available tenants', () => {
      const availableTenants = selectAvailableTenants(store.getState());
      expect(availableTenants).toEqual([]);
    });

    it('should select company slug', () => {
      const companySlug = selectCompanySlug(store.getState());
      expect(companySlug).toBe('test-company');
    });

    it('should select loading state', () => {
      const loading = selectTenantLoading(store.getState());
      expect(loading).toBe(false);
    });

    it('should select error', () => {
      const error = selectTenantError(store.getState());
      expect(error).toBeNull();
    });

    it('should select switching state', () => {
      const switching = selectIsSwitching(store.getState());
      expect(switching).toBe(false);
    });

    it('should select tenant name', () => {
      const tenantName = selectTenantName(store.getState());
      expect(tenantName).toBe('Test Company');
    });

    it('should select tenant ID', () => {
      const tenantId = selectTenantId(store.getState());
      expect(tenantId).toBe('tenant1');
    });

    it('should return default values when no tenant is set', () => {
      store.dispatch(clearTenantState());
      
      const tenantName = selectTenantName(store.getState());
      const tenantId = selectTenantId(store.getState());
      
      expect(tenantName).toBe('Unknown Company');
      expect(tenantId).toBeUndefined();
    });
  });
});