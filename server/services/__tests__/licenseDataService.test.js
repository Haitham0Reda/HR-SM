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

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('./licenseServerClient.js', () => ({
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

jest.unstable_mockModule('./licenseCache.js', () => mockCacheService);

const { default: LicenseDataService } = await import('../licenseDataService.js');

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
      expect(mockCacheService.getCachedLicense).toHaveBeenCalledWith('test_tenant', null);
      expect(mockCacheService.isCacheStale).toHaveBeenCalledWith(mockCachedLicense);
      expect(mockLicenseServerClient.getTenant).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using fresh cached license data',
        expect.objectContaining({ tenantId: 'test_tenant', source: 'cache' })
      );
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
      expect(mockCacheService.updateLicenseCache).toHaveBeenCalledWith(
        'test_tenant',
        mockTenantData,
        null
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrieved tenant from License Server and updated cache',
        expect.objectContaining({ tenantId: 'test_tenant', source: 'license_server' })
      );
    });

    it('should query License Server when cache is missing', async () => {
      mockCacheService.getCachedLicense.mockResolvedValue(null);
      mockLicenseServerClient.getTenant.mockResolvedValue(mockTenantData);
      mockCacheService.updateLicenseCache.mockResolvedValue({});

      const result = await service.getTenant('test_tenant');

      expect(result).toEqual(mockTenantData);
      expect(mockLicenseServerClient.getTenant).toHaveBeenCalledWith('test_tenant');
    });

    it('should force refresh when forceRefresh option is true', async () => {
      mockLicenseServerClient.getTenant.mockResolvedValue(mockTenantData);
      mockCacheService.updateLicenseCache.mockResolvedValue({});

      const result = await service.getTenant('test_tenant', null, { forceRefresh: true });

      expect(result).toEqual(mockTenantData);
      expect(mockCacheService.getCachedLicense).not.toHaveBeenCalled();
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License Server unavailable, attempting fallback to cached data',
        expect.objectContaining({
          operation: 'getTenant',
          tenantId: 'test_tenant'
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using stale cached license data due to License Server unavailability',
        expect.objectContaining({
          tenantId: 'test_tenant',
          warning: 'Data may be outdated'
        })
      );
    });

    it('should throw error when License Server fails and no cache available', async () => {
      mockCacheService.getCachedLicense.mockResolvedValue(null);
      mockLicenseServerClient.getTenant.mockRejectedValue(
        new Error('License Server unreachable')
      );

      await expect(service.getTenant('test_tenant')).rejects.toThrow(
        'License Server unavailable and no cached license data available for tenant test_tenant'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License Server unavailable and no cached data available',
        expect.objectContaining({
          operation: 'getTenant',
          tenantId: 'test_tenant'
        })
      );
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(service.getTenant(null)).rejects.toThrow('Tenant ID is required');
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using cached enabled modules',
        expect.objectContaining({
          tenantId: 'test_tenant',
          moduleCount: 3,
          source: 'cache'
        })
      );
    });

    it('should query License Server when cache is stale', async () => {
      const mockModules = ['surveys', 'payroll'];

      mockCacheService.getCachedLicense.mockResolvedValue({
        quickAccess: { lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) }
      });
      mockCacheService.isCacheStale.mockReturnValue(true);
      mockLicenseServerClient.getEnabledModules.mockResolvedValue(mockModules);
      mockCacheService.updateLicenseCache.mockResolvedValue({});

      const result = await service.getEnabledModules('test_tenant');

      expect(result).toEqual(mockModules);
      expect(mockLicenseServerClient.getEnabledModules).toHaveBeenCalledWith('test_tenant');
      expect(mockCacheService.updateLicenseCache).toHaveBeenCalledWith(
        'test_tenant',
        { enabledModules: mockModules },
        null
      );
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License Server unavailable, attempting fallback to cached data',
        expect.any(Object)
      );
    });

    it('should return empty array when cache has no modules', async () => {
      const cachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(cachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.getEnabledModules('test_tenant');

      expect(result).toEqual([]);
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Module enablement check',
        expect.objectContaining({
          tenantId: 'test_tenant',
          moduleId: 'surveys',
          isEnabled: true
        })
      );
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

    it('should throw error when tenantId is missing', async () => {
      await expect(service.isModuleEnabled(null, 'surveys')).rejects.toThrow(
        'Tenant ID is required'
      );
    });

    it('should throw error when moduleId is missing', async () => {
      await expect(service.isModuleEnabled('test_tenant', null)).rejects.toThrow(
        'Module ID is required'
      );
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
      expect(mockCacheService.updateLicenseCache).toHaveBeenCalledWith(
        'test_tenant',
        mockValidationResult,
        null
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'License validated via License Server',
        expect.objectContaining({
          tenantId: 'test_tenant',
          valid: true
        })
      );
    });

    it('should not update cache when validation fails', async () => {
      const invalidResult = { valid: false, reason: 'expired' };
      mockLicenseServerClient.validateLicense.mockResolvedValue(invalidResult);

      const result = await service.validateLicense('test_tenant', 'test-license-key');

      expect(result).toEqual(invalidResult);
      expect(mockCacheService.updateLicenseCache).not.toHaveBeenCalled();
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License Server unavailable during validation, using cached data',
        expect.any(Object)
      );
    });

    it('should throw error when License Server fails and no cache available', async () => {
      mockLicenseServerClient.validateLicense.mockRejectedValue(
        new Error('License Server unreachable')
      );
      mockCacheService.getCachedLicense.mockResolvedValue(null);

      await expect(
        service.validateLicense('test_tenant', 'test-license-key')
      ).rejects.toThrow('License Server unavailable and no cached license data available');
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(service.validateLicense(null, 'key')).rejects.toThrow(
        'Tenant ID is required'
      );
    });

    it('should throw error when licenseKey is missing', async () => {
      await expect(service.validateLicense('test_tenant', null)).rejects.toThrow(
        'License key is required'
      );
    });
  });

  describe('getSubscription', () => {
    it('should return subscription details from tenant data', async () => {
      const mockTenantData = {
        tenantId: 'test_tenant',
        subscription: {
          status: 'active',
          plan: 'enterprise',
          expiresAt: '2026-12-31'
        }
      };

      const mockCachedLicense = {
        companyId: 'test_tenant',
        quickAccess: {
          subscriptionStatus: 'active',
          lastSyncedAt: new Date()
        }
      };

      mockCacheService.getCachedLicense.mockResolvedValue(mockCachedLicense);
      mockCacheService.isCacheStale.mockReturnValue(false);

      const result = await service.getSubscription('test_tenant');

      expect(result).toEqual(expect.objectContaining({
        status: 'active'
      }));
    });
  });

  describe('invalidateTenantCache', () => {
    it('should invalidate cache for tenant', async () => {
      mockCacheService.invalidateCache.mockResolvedValue({
        invalidated: true,
        modifiedCount: 1
      });

      const result = await service.invalidateTenantCache('test_tenant');

      expect(result).toEqual({
        invalidated: true,
        modifiedCount: 1
      });
      expect(mockCacheService.invalidateCache).toHaveBeenCalledWith('test_tenant', null);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tenant cache invalidated',
        expect.objectContaining({ tenantId: 'test_tenant' })
      );
    });

    it('should handle invalidation errors', async () => {
      const error = new Error('Invalidation failed');
      mockCacheService.invalidateCache.mockRejectedValue(error);

      await expect(service.invalidateTenantCache('test_tenant')).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to invalidate tenant cache',
        expect.objectContaining({
          tenantId: 'test_tenant',
          error: 'Invalidation failed'
        })
      );
    });
  });
});
