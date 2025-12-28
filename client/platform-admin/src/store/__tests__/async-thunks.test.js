/**
 * Platform Admin Async Thunks Test
 * Tests that Redux async thunks work correctly for real-time updates
 */

import { configureStore } from '@reduxjs/toolkit';
import tenantManagementSlice, { 
  fetchTenantsAsync,
  createTenantAsync,
  updateTenantAsync,
  deleteTenantAsync
} from '../slices/tenantManagementSlice';

// Mock platform API
jest.mock('../../services/platformApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

describe('Platform Admin Async Thunks', () => {
  let store;
  let mockPlatformApi;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Import mock after clearing
    mockPlatformApi = require('../../services/platformApi');
    
    // Configure store
    store = configureStore({
      reducer: {
        tenantManagement: tenantManagementSlice,
      },
    });
  });

  it('should handle fetchTenantsAsync with real-time updates', async () => {
    const mockTenantsData = {
      data: {
        data: {
          tenants: [
            { _id: '1', name: 'Company 1', status: 'active' },
            { _id: '2', name: 'Company 2', status: 'active' }
          ],
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      }
    };

    mockPlatformApi.get.mockResolvedValue(mockTenantsData);

    // Initial state should be empty
    let state = store.getState();
    expect(state.tenantManagement.tenants).toEqual([]);
    expect(state.tenantManagement.loading).toBe(false);

    // Dispatch fetch action
    const fetchPromise = store.dispatch(fetchTenantsAsync({ page: 1, limit: 10 }));

    // Check loading state
    state = store.getState();
    expect(state.tenantManagement.loading).toBe(true);
    expect(state.tenantManagement.error).toBeNull();

    // Wait for completion
    await fetchPromise;

    // Check final state
    state = store.getState();
    expect(state.tenantManagement.loading).toBe(false);
    expect(state.tenantManagement.tenants).toEqual(mockTenantsData.data.data.tenants);
    expect(state.tenantManagement.pagination.total).toBe(2);
    expect(state.tenantManagement.lastSuccessfulOperation).toBeTruthy();
  });

  it('should handle createTenantAsync and update state', async () => {
    const newTenant = { name: 'New Company', email: 'admin@newcompany.com' };
    const createdTenant = { _id: '3', ...newTenant, status: 'active' };

    mockPlatformApi.post.mockResolvedValue({ data: { data: createdTenant } });

    // Dispatch create action
    await store.dispatch(createTenantAsync(newTenant));

    // Check state
    const state = store.getState();
    expect(state.tenantManagement.tenants).toContain(createdTenant);
    expect(state.tenantManagement.tenants[0]).toEqual(createdTenant); // Should be at the beginning
    expect(state.tenantManagement.lastSuccessfulOperation).toBeTruthy();
  });

  it('should handle updateTenantAsync and update existing tenant', async () => {
    // Set initial state with existing tenant
    const existingTenant = { _id: '1', name: 'Old Company', status: 'active' };
    store.dispatch({ 
      type: 'tenantManagement/fetchTenants/fulfilled',
      payload: {
        tenants: [existingTenant],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    });

    const updatedTenant = { _id: '1', name: 'Updated Company', status: 'active' };
    mockPlatformApi.put.mockResolvedValue({ data: { data: updatedTenant } });

    // Dispatch update action
    await store.dispatch(updateTenantAsync({ 
      tenantId: '1', 
      tenantData: { name: 'Updated Company' } 
    }));

    // Check state
    const state = store.getState();
    expect(state.tenantManagement.tenants[0]).toEqual(updatedTenant);
    expect(state.tenantManagement.lastSuccessfulOperation).toBeTruthy();
  });

  it('should handle deleteTenantAsync and remove tenant', async () => {
    // Set initial state with existing tenants
    const tenants = [
      { _id: '1', name: 'Company 1', status: 'active' },
      { _id: '2', name: 'Company 2', status: 'active' }
    ];
    store.dispatch({ 
      type: 'tenantManagement/fetchTenants/fulfilled',
      payload: {
        tenants,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      }
    });

    mockPlatformApi.delete.mockResolvedValue({});

    // Dispatch delete action
    await store.dispatch(deleteTenantAsync('1'));

    // Check state
    const state = store.getState();
    expect(state.tenantManagement.tenants).toHaveLength(1);
    expect(state.tenantManagement.tenants[0]._id).toBe('2');
    expect(state.tenantManagement.lastSuccessfulOperation).toBeTruthy();
  });

  it('should handle API errors gracefully', async () => {
    const errorResponse = {
      response: {
        data: {
          message: 'Network error'
        }
      }
    };
    mockPlatformApi.get.mockRejectedValue(errorResponse);

    // Dispatch fetch action that will fail
    await store.dispatch(fetchTenantsAsync());

    // Check error state
    const state = store.getState();
    expect(state.tenantManagement.loading).toBe(false);
    expect(state.tenantManagement.error).toEqual({
      message: 'Network error',
      code: 'FETCH_TENANTS_FAILED',
      timestamp: expect.any(String),
      retryable: true,
    });
  });

  it('should handle concurrent async operations', async () => {
    // Mock different responses for concurrent calls
    mockPlatformApi.get
      .mockResolvedValueOnce({ data: { data: { tenants: [], total: 0 } } })
      .mockResolvedValueOnce({ data: { data: { _id: '1', name: 'Company 1' } } });

    mockPlatformApi.post.mockResolvedValue({ 
      data: { data: { _id: '2', name: 'New Company' } } 
    });

    // Dispatch multiple operations concurrently
    const [fetchResult, createResult] = await Promise.all([
      store.dispatch(fetchTenantsAsync()),
      store.dispatch(createTenantAsync({ name: 'New Company' }))
    ]);

    // Both should succeed
    expect(fetchResult.type).toBe('tenantManagement/fetchTenants/fulfilled');
    expect(createResult.type).toBe('tenantManagement/createTenant/fulfilled');

    // State should reflect both operations
    const state = store.getState();
    expect(state.tenantManagement.error).toBeNull();
    expect(state.tenantManagement.lastSuccessfulOperation).toBeTruthy();
  });
});