/**
 * Multi-tenant Switching Test
 * Tests that multi-tenant switching works correctly with Redux dispatch
 */

import { configureStore } from '@reduxjs/toolkit';
import tenantSlice, { 
  switchTenant, 
  setCurrentTenant, 
  selectCurrentTenant, 
  selectCompanySlug,
  selectIsSwitching 
} from '../slices/tenantSlice';

// Mock API
jest.mock('../../services/api', () => ({
  get: jest.fn()
}));

describe('Multi-tenant Switching with Redux', () => {
  let store;
  let mockApi;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Import mock after clearing
    mockApi = require('../../services/api');
    
    // Configure store with tenant slice
    store = configureStore({
      reducer: {
        tenant: tenantSlice,
      },
    });
  });

  it('should handle tenant switching with Redux dispatch', async () => {
    // Mock successful API response
    const mockTenantData = {
      id: 'new-tenant-id',
      name: 'New Company',
      slug: 'new-company'
    };
    
    mockApi.get.mockResolvedValue({
      data: { tenant: mockTenantData }
    });

    // Initial state should be empty
    let state = store.getState();
    expect(selectCurrentTenant(state)).toBeNull();
    expect(selectIsSwitching(state)).toBe(false);

    // Dispatch tenant switch
    const switchPromise = store.dispatch(switchTenant('new-tenant-id'));

    // Check switching state
    state = store.getState();
    expect(selectIsSwitching(state)).toBe(true);

    // Wait for async operation to complete
    await switchPromise;

    // Check final state
    state = store.getState();
    expect(selectIsSwitching(state)).toBe(false);
    expect(selectCurrentTenant(state)).toEqual(mockTenantData);
    expect(selectCompanySlug(state)).toBe('new-company');
  });

  it('should handle synchronous tenant setting', () => {
    const tenantData = {
      id: 'test-tenant',
      name: 'Test Company',
      slug: 'test-company'
    };

    // Dispatch synchronous action
    store.dispatch(setCurrentTenant(tenantData));

    // Check state immediately
    const state = store.getState();
    expect(selectCurrentTenant(state)).toEqual(tenantData);
    expect(selectCompanySlug(state)).toBe('test-company');
  });

  it('should generate company slug from tenant name when slug is missing', () => {
    const tenantData = {
      id: 'test-tenant',
      name: 'My Test Company Name!',
      // No slug provided
    };

    store.dispatch(setCurrentTenant(tenantData));

    const state = store.getState();
    expect(selectCompanySlug(state)).toBe('my_test_company_name');
  });

  it('should handle tenant switching errors gracefully', async () => {
    // Mock API error
    mockApi.get.mockRejectedValue(new Error('Network error'));

    // Initial state
    let state = store.getState();
    expect(selectIsSwitching(state)).toBe(false);

    // Dispatch tenant switch
    const switchPromise = store.dispatch(switchTenant('invalid-tenant-id'));

    // Check switching state
    state = store.getState();
    expect(selectIsSwitching(state)).toBe(true);

    // Wait for async operation to complete
    await switchPromise;

    // Check final state - should not be switching anymore
    state = store.getState();
    expect(selectIsSwitching(state)).toBe(false);
    expect(selectCurrentTenant(state)).toBeNull();
    expect(state.tenant.error).toBeTruthy();
  });

  it('should maintain tenant state consistency during multiple operations', async () => {
    const tenant1 = { id: 'tenant-1', name: 'Company 1', slug: 'company-1' };
    const tenant2 = { id: 'tenant-2', name: 'Company 2', slug: 'company-2' };

    // Set initial tenant
    store.dispatch(setCurrentTenant(tenant1));
    let state = store.getState();
    expect(selectCurrentTenant(state)).toEqual(tenant1);

    // Mock API for switch
    mockApi.get.mockResolvedValue({ data: { tenant: tenant2 } });

    // Switch to second tenant
    await store.dispatch(switchTenant('tenant-2'));
    state = store.getState();
    expect(selectCurrentTenant(state)).toEqual(tenant2);
    expect(selectCompanySlug(state)).toBe('company-2');
  });
});