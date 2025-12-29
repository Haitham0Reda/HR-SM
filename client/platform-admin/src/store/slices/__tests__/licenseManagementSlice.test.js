import licenseManagementSlice, {
  fetchLicensesAsync,
  fetchLicenseByIdAsync,
  fetchTenantLicenseAsync,
  createLicenseAsync,
  renewLicenseAsync,
  revokeLicenseAsync,
  validateLicenseAsync,
  fetchLicenseAnalyticsAsync,
  fetchExpiringLicensesAsync,
  fetchLicenseUsageAnalyticsAsync,
  fetchLicenseAuditTrailAsync,
  clearError,
  setCurrentLicense,
  setFilters,
  clearCurrentLicense,
  clearAuditTrail,
  resetAnalytics,
} from '../licenseManagementSlice';
import { configureStore } from '@reduxjs/toolkit';

// Mock the license service
jest.mock('../../../services/licenseApi', () => ({
  licenseService: {
    getLicenses: jest.fn(),
    getLicense: jest.fn(),
    getTenantLicense: jest.fn(),
    createLicense: jest.fn(),
    renewLicense: jest.fn(),
    revokeLicense: jest.fn(),
    validateLicense: jest.fn(),
    getLicenseAnalytics: jest.fn(),
    getExpiringLicenses: jest.fn(),
    getLicenseUsageAnalytics: jest.fn(),
    getLicenseAuditTrail: jest.fn(),
  },
}));

const { licenseService } = require('../../../services/licenseApi');

describe('licenseManagementSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        licenseManagement: licenseManagementSlice,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    test('should have correct initial state', () => {
      const state = store.getState().licenseManagement;
      
      expect(state).toEqual({
        licenses: [],
        currentLicense: null,
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
        analytics: {
          totalLicenses: 0,
          activeLicenses: 0,
          expiredLicenses: 0,
          revokedLicenses: 0,
          expiringLicenses: [],
          usageStats: null,
        },
        auditTrail: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
        filters: {
          search: '',
          status: 'all',
          type: 'all',
          expiryRange: 'all',
        },
      });
    });
  });

  describe('synchronous actions', () => {
    test('should clear error', () => {
      // Set an error first
      store.dispatch({
        type: fetchLicensesAsync.rejected.type,
        payload: 'Test error',
      });
      
      expect(store.getState().licenseManagement.error).toBeTruthy();
      
      store.dispatch(clearError());
      
      expect(store.getState().licenseManagement.error).toBeNull();
    });

    test('should set current license', () => {
      const license = { licenseNumber: 'LIC-001', type: 'professional' };
      
      store.dispatch(setCurrentLicense(license));
      
      expect(store.getState().licenseManagement.currentLicense).toEqual(license);
    });

    test('should set filters', () => {
      const filters = { search: 'test', status: 'active' };
      
      store.dispatch(setFilters(filters));
      
      expect(store.getState().licenseManagement.filters).toEqual({
        search: 'test',
        status: 'active',
        type: 'all',
        expiryRange: 'all',
      });
    });

    test('should clear current license', () => {
      const license = { licenseNumber: 'LIC-001', type: 'professional' };
      store.dispatch(setCurrentLicense(license));
      
      store.dispatch(clearCurrentLicense());
      
      expect(store.getState().licenseManagement.currentLicense).toBeNull();
    });

    test('should clear audit trail', () => {
      // Set audit trail first
      const initialState = {
        ...store.getState().licenseManagement,
        auditTrail: [{ id: 1, action: 'created' }],
      };
      
      store.dispatch({ type: 'test', payload: initialState });
      store.dispatch(clearAuditTrail());
      
      expect(store.getState().licenseManagement.auditTrail).toEqual([]);
    });

    test('should reset analytics', () => {
      store.dispatch(resetAnalytics());
      
      expect(store.getState().licenseManagement.analytics).toEqual({
        totalLicenses: 0,
        activeLicenses: 0,
        expiredLicenses: 0,
        revokedLicenses: 0,
        expiringLicenses: [],
        usageStats: null,
      });
    });
  });

  describe('fetchLicensesAsync', () => {
    test('should handle successful license fetch', async () => {
      const mockResponse = {
        data: {
          licenses: [
            { licenseNumber: 'LIC-001', type: 'professional' },
            { licenseNumber: 'LIC-002', type: 'basic' },
          ],
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      licenseService.getLicenses.mockResolvedValue(mockResponse);

      await store.dispatch(fetchLicensesAsync({ page: 1, limit: 10 }));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.licenses).toEqual(mockResponse.data.licenses);
      expect(state.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(state.error).toBeNull();
      expect(state.lastSuccessfulOperation).toBeTruthy();
    });

    test('should handle failed license fetch', async () => {
      const errorMessage = 'Failed to fetch licenses';
      licenseService.getLicenses.mockRejectedValue(new Error(errorMessage));

      await store.dispatch(fetchLicensesAsync());

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_LICENSES_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });

    test('should set loading state during fetch', () => {
      licenseService.getLicenses.mockImplementation(() => new Promise(() => {})); // Never resolves

      store.dispatch(fetchLicensesAsync());

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchLicenseByIdAsync', () => {
    test('should handle successful license fetch by ID', async () => {
      const mockLicense = { licenseNumber: 'LIC-001', type: 'professional' };
      const mockResponse = { data: mockLicense };

      licenseService.getLicense.mockResolvedValue(mockResponse);

      await store.dispatch(fetchLicenseByIdAsync('LIC-001'));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.currentLicense).toEqual(mockLicense);
      expect(state.error).toBeNull();
    });

    test('should handle failed license fetch by ID', async () => {
      const errorMessage = 'License not found';
      licenseService.getLicense.mockRejectedValue(new Error(errorMessage));

      await store.dispatch(fetchLicenseByIdAsync('LIC-001'));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_LICENSE_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });

  describe('fetchTenantLicenseAsync', () => {
    test('should handle successful tenant license fetch', async () => {
      const mockLicense = { licenseNumber: 'LIC-001', tenantId: 'tenant1' };
      const mockResponse = { data: mockLicense };

      licenseService.getTenantLicense.mockResolvedValue(mockResponse);

      await store.dispatch(fetchTenantLicenseAsync('tenant1'));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.currentLicense).toEqual(mockLicense);
      expect(state.error).toBeNull();
    });
  });

  describe('createLicenseAsync', () => {
    test('should handle successful license creation', async () => {
      const newLicense = { licenseNumber: 'LIC-003', type: 'enterprise' };
      const mockResponse = { data: newLicense };

      licenseService.createLicense.mockResolvedValue(mockResponse);

      await store.dispatch(createLicenseAsync({
        tenantId: 'tenant1',
        type: 'enterprise',
      }));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.licenses[0]).toEqual(newLicense); // Should be added to beginning
      expect(state.error).toBeNull();
    });

    test('should handle failed license creation', async () => {
      const errorMessage = 'Failed to create license';
      licenseService.createLicense.mockRejectedValue(new Error(errorMessage));

      await store.dispatch(createLicenseAsync({}));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'CREATE_LICENSE_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });

  describe('renewLicenseAsync', () => {
    test('should handle successful license renewal', async () => {
      // Set up initial state with a license
      const initialLicense = { licenseNumber: 'LIC-001', type: 'professional' };
      store.dispatch(setCurrentLicense(initialLicense));
      
      const renewedLicense = { 
        licenseNumber: 'LIC-001', 
        type: 'professional',
        expiresAt: '2025-12-31T23:59:59.000Z'
      };
      const mockResponse = { data: renewedLicense };

      licenseService.renewLicense.mockResolvedValue(mockResponse);

      await store.dispatch(renewLicenseAsync({
        licenseNumber: 'LIC-001',
        renewalData: { expiresAt: '2025-12-31T23:59:59.000Z' }
      }));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.currentLicense).toEqual(renewedLicense);
      expect(state.error).toBeNull();
    });
  });

  describe('revokeLicenseAsync', () => {
    test('should handle successful license revocation', async () => {
      // Set up initial state with a license
      const initialLicense = { licenseNumber: 'LIC-001', status: 'active' };
      store.dispatch(setCurrentLicense(initialLicense));
      
      const mockResponse = { data: { success: true } };
      licenseService.revokeLicense.mockResolvedValue(mockResponse);

      await store.dispatch(revokeLicenseAsync({
        licenseNumber: 'LIC-001',
        reason: 'Policy violation'
      }));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.currentLicense.status).toBe('revoked');
      expect(state.error).toBeNull();
    });
  });

  describe('validateLicenseAsync', () => {
    test('should handle successful license validation', async () => {
      const mockResponse = { data: { valid: true, license: { licenseNumber: 'LIC-001' } } };
      licenseService.validateLicense.mockResolvedValue(mockResponse);

      await store.dispatch(validateLicenseAsync({
        token: 'license-token',
        machineId: 'machine-123'
      }));

      const state = store.getState().licenseManagement;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchLicenseAnalyticsAsync', () => {
    test('should handle successful analytics fetch', async () => {
      const mockAnalytics = {
        totalLicenses: 10,
        activeLicenses: 8,
        expiredLicenses: 1,
        revokedLicenses: 1,
      };
      const mockResponse = { data: mockAnalytics };

      licenseService.getLicenseAnalytics.mockResolvedValue(mockResponse);

      await store.dispatch(fetchLicenseAnalyticsAsync());

      const state = store.getState().licenseManagement;
      expect(state.analytics).toEqual({
        ...state.analytics,
        ...mockAnalytics,
      });
    });
  });

  describe('fetchExpiringLicensesAsync', () => {
    test('should handle successful expiring licenses fetch', async () => {
      const mockExpiringLicenses = [
        { licenseNumber: 'LIC-001', expiresAt: '2024-02-01' },
        { licenseNumber: 'LIC-002', expiresAt: '2024-02-15' },
      ];
      const mockResponse = { data: { licenses: mockExpiringLicenses } };

      licenseService.getExpiringLicenses.mockResolvedValue(mockResponse);

      await store.dispatch(fetchExpiringLicensesAsync(30));

      const state = store.getState().licenseManagement;
      expect(state.analytics.expiringLicenses).toEqual(mockExpiringLicenses);
    });
  });

  describe('fetchLicenseUsageAnalyticsAsync', () => {
    test('should handle successful usage analytics fetch', async () => {
      const mockUsageStats = {
        totalValidations: 5000,
        averageUsersPerLicense: 75,
        totalStorageUsed: 10240,
      };
      const mockResponse = { data: mockUsageStats };

      licenseService.getLicenseUsageAnalytics.mockResolvedValue(mockResponse);

      await store.dispatch(fetchLicenseUsageAnalyticsAsync({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }));

      const state = store.getState().licenseManagement;
      expect(state.analytics.usageStats).toEqual(mockUsageStats);
    });
  });

  describe('fetchLicenseAuditTrailAsync', () => {
    test('should handle successful audit trail fetch', async () => {
      const mockAuditEntries = [
        { id: 1, action: 'created', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: 2, action: 'renewed', timestamp: '2024-01-15T00:00:00.000Z' },
      ];
      const mockResponse = { data: { auditEntries: mockAuditEntries } };

      licenseService.getLicenseAuditTrail.mockResolvedValue(mockResponse);

      await store.dispatch(fetchLicenseAuditTrailAsync({
        licenseNumber: 'LIC-001',
        page: 1,
        limit: 20
      }));

      const state = store.getState().licenseManagement;
      expect(state.auditTrail).toEqual(mockAuditEntries);
    });
  });

  describe('error handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      
      licenseService.getLicenses.mockRejectedValue(networkError);

      await store.dispatch(fetchLicensesAsync());

      const state = store.getState().licenseManagement;
      expect(state.error.message).toBe('Network Error');
      expect(state.error.retryable).toBe(true);
    });

    test('should preserve error timestamp', async () => {
      const errorMessage = 'Test error';
      licenseService.getLicenses.mockRejectedValue(new Error(errorMessage));

      await store.dispatch(fetchLicensesAsync());

      const state = store.getState().licenseManagement;
      expect(state.error.timestamp).toBeTruthy();
      expect(new Date(state.error.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('loading states', () => {
    test('should set loading to true when starting async operation', () => {
      licenseService.getLicenses.mockImplementation(() => new Promise(() => {}));

      store.dispatch(fetchLicensesAsync());

      expect(store.getState().licenseManagement.loading).toBe(true);
    });

    test('should set loading to false when async operation completes', async () => {
      licenseService.getLicenses.mockResolvedValue({ data: { licenses: [] } });

      await store.dispatch(fetchLicensesAsync());

      expect(store.getState().licenseManagement.loading).toBe(false);
    });

    test('should set loading to false when async operation fails', async () => {
      licenseService.getLicenses.mockRejectedValue(new Error('Test error'));

      await store.dispatch(fetchLicensesAsync());

      expect(store.getState().licenseManagement.loading).toBe(false);
    });
  });
});