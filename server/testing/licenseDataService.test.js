/**
 * License Data Service Tests
 * 
 * Unit tests for License Data Service with caching and fallback logic
 * Tests integration between License Server client and cache layer
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockLicenseServerClient = {
  getTenant: jest.fn(),
  getEnabledModules: jest.fn(),
  validateLicense: jest.fn(),
  isModuleEnabled: jest.fn()
};

const mockCacheService = {
  getCachedLicense: jest.fn(),
  isCacheStale: jest.fn(),
  updateLicenseCache: jest.fn(),
  invalidateCache: jest.fn()
};

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../services/licenseServerClient.js', () => ({
  LicenseServerClient: jest.fn(() => mockLicenseServerClient),
  LicenseServerError: class LicenseServerError extends Error {
    constructor(message, originalError, statusCode) {
      super(message);
      this.name = 'LicenseServerError';
      this.originalError = originalError;
      this.statusCode = statusCode;
    }
  }
}));

jest.unstable_mockModule('../services/licenseCache.js', () => mockCacheService);

const { default: LicenseDataService } = await import('../services/licenseDataService.js');

describe('License Data Service', () => {
  let service;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    service = new LicenseDataService(mockLicenseServerClient);
  });

  describe('Constructor', () => {
    it('should create service with license server client', () => {
      expect(service).toBeInstanceOf(LicenseDataService);
      expect(service.licenseServerClient).toBe(mockLicenseServerClient);
    });

    it('should throw error when client is missing', () => {
      expect(() => new LicenseDataService(null)).toThrow(
        'License Server client is required'
      );
    });
  });

  describe('getTenant', () => {
    const mockTenantData = {
      tenantId: 'test_tenant',
      name: 'Test Tenant',
      subscription: {
        status: 'active',
        plan: 'enterprise',
        expiresAt: '2026-12-31'
      },
      enabledModules: ['surveys', 'payroll']
    };

    it('should use fresh cache when available', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys', 'payroll'],
          subscriptionStatus: 'active',
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.getTenant('test_tenant');

      expect(result).toEqual(expect.objectContaining({
        tenantId: 'test_tenant',
        cached: true
      }));
      expect(mockLicenseServerClient.getTenant).not.toHaveBeenCalled();
    });

    it('should query License Server when cache is stale', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 hours ago
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(true);
      mockLicenseServerClient.getTenant.mockResolvedValue(mockTenantData);
      mockCacheService.updateLicenseCache.mockResolvedValue({});

      const result = await service.getTenant('test_tenant');

      expect(result).toEqual(mockTenantData);
      expect(mockLicenseServerClient.getTenant).toHaveBeenCalledWith('test_tenant');
    });

    it('should fallback to stale cache when License Server is unavailable', async () => {
      const staleCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys'],
          subscriptionStatus: 'active',
          lastSyncedAt: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(staleCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(true);
      mockLicenseServerClient.getTenant.mockRejectedValue(
        new Error('License Server unreachable')
      );

      const result = await service.getTenant('test_tenant');

      expect(result).toEqual(expect.objectContaining({
        tenantId: 'test_tenant',
        cached: true
      }));
    });

    it('should throw error when License Server fails and no cache available', async () => {
      mockCacheService.getCachedLicense.mockResolvedValue(null);
      mockLicenseServerClient.getTenant.mockRejectedValue(
        new Error('License Server unreachable')
      );

      await expect(service.getTenant('test_tenant')).rejects.toThrow(
        'License Server unavailable and no cached license data available for tenant test_tenant'
      );
    });
  });

  describe('getEnabledModules', () => {
    it('should use fresh cache when available', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys', 'payroll', 'attendance'],
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.getEnabledModules('test_tenant');

      expect(result).toEqual(['surveys', 'payroll', 'attendance']);
      expect(mockLicenseServerClient.getEnabledModules).not.toHaveBeenCalled();
    });

    it('should fallback to stale cache when License Server is unavailable', async () => {
      const staleCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys'],
          lastSyncedAt: new Date(Date.now() - 10 * 60 * 60 * 1000)
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(staleCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(true);
      mockLicenseServerClient.getEnabledModules.mockRejectedValue(
        new Error('License Server unreachable')
      );

      const result = await service.getEnabledModules('test_tenant');

      expect(result).toEqual(['surveys']);
    });
  });

  describe('isModuleEnabled', () => {
    it('should return true when module is enabled', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys', 'payroll'],
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.isModuleEnabled('test_tenant', 'surveys');

      expect(result).toBe(true);
    });

    it('should return false when module is not enabled', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys'],
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.isModuleEnabled('test_tenant', 'payroll');

      expect(result).toBe(false);
    });
  });

  describe('validateLicense', () => {
    const mockValidationResult = {
      valid: true,
      subscription: {
        status: 'active',
        expiresAt: '2026-12-31'
      },
      enabledModules: ['surveys', 'payroll']
    };

    it('should validate license via License Server', async () => {
      mockLicenseServerClient.validateLicense.mockResolvedValue(mockValidationResult);
      mockCacheService.updateLicenseCache.mockResolvedValue({});

      const result = await service.validateLicense('test_tenant', 'test-license-key');

      expect(result).toEqual(mockValidationResult);
      expect(mockLicenseServerClient.validateLicense).toHaveBeenCalledWith(
        'test_tenant',
        'test-license-key'
      );
    });

    it('should fallback to cache when License Server is unavailable', async () => {
      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          licenseValid: true,
          subscriptionStatus: 'active',
          expiresAt: new Date('2026-12-31'),
          enabledModules: ['surveys']
        }
      };

      mockLicenseServerClient.validateLicense.mockRejectedValue(
        new Error('License Server unreachable')
      );
      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);

      const result = await service.validateLicense('test_tenant', 'test-license-key');

      expect(result).toEqual(expect.objectContaining({
        valid: true,
        cached: true,
        warning: 'Validation performed using cached data - License Server unavailable'
      }));
    });
  });
});
