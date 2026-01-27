/**
 * Integration tests for CompanyService with License Server client
 * 
 * Tests the integration between CompanyService, LicenseDataService, and cache layer
 * Requirements: 4.1, 4.2, 4.3, 5.1
 */

import { jest } from '@jest/globals';

describe('CompanyService Integration with License Server', () => {
  let CompanyService;
  let licenseDataService;
  let licenseServerClient;
  let licenseCache;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock the dependencies
    licenseServerClient = {
      getTenant: jest.fn(),
      getEnabledModules: jest.fn(),
      getSubscription: jest.fn()
    };

    licenseCache = {
      getCachedLicense: jest.fn(),
      isCacheStale: jest.fn(),
      updateLicenseCache: jest.fn()
    };

    // Mock the modules
    jest.unstable_mockModule('../licenseServerClient.js', () => ({
      LicenseServerClient: jest.fn(() => licenseServerClient),
      LicenseServerError: class LicenseServerError extends Error {}
    }));

    jest.unstable_mockModule('../licenseCache.js', () => licenseCache);

    jest.unstable_mockModule('../licenseDataService.js', () => ({
      createLicenseDataService: jest.fn(() => ({
        getTenant: jest.fn(async (tenantId) => {
          // Check cache first
          const cached = await licenseCache.getCachedLicense(tenantId);
          if (cached && !licenseCache.isCacheStale(cached)) {
            return {
              tenantId: cached.companyId,
              name: cached.companyName,
              subscription: { status: cached.quickAccess?.subscriptionStatus },
              enabledModules: cached.quickAccess?.enabledModules,
              cached: true
            };
          }

          // Query License Server
          const data = await licenseServerClient.getTenant(tenantId);
          await licenseCache.updateLicenseCache(tenantId, data);
          return data;
        }),
        getEnabledModules: jest.fn(async (tenantId) => {
          const cached = await licenseCache.getCachedLicense(tenantId);
          if (cached && !licenseCache.isCacheStale(cached)) {
            return cached.quickAccess?.enabledModules || [];
          }

          const modules = await licenseServerClient.getEnabledModules(tenantId);
          await licenseCache.updateLicenseCache(tenantId, { enabledModules: modules });
          return modules;
        }),
        isModuleEnabled: jest.fn(async (tenantId, moduleId) => {
          const modules = await licenseServerClient.getEnabledModules(tenantId);
          return modules.includes(moduleId);
        }),
        getSubscription: jest.fn(async (tenantId) => {
          const data = await licenseServerClient.getTenant(tenantId);
          return data.subscription;
        })
      }))
    }));

    // Import CompanyService after mocks are set up
    const module = await import('../CompanyService.js');
    CompanyService = new module.default();
  });

  describe('getCompanyByTenantId with cache integration', () => {
    it('should use cached data when cache is fresh', async () => {
      const tenantId = 'test_tenant';
      const cachedData = {
        companyId: tenantId,
        companyName: 'Test Company',
        quickAccess: {
          subscriptionStatus: 'active',
          enabledModules: ['surveys', 'payroll'],
          lastSyncedAt: new Date()
        }
      };

      licenseCache.getCachedLicense.mockResolvedValue(cachedData);
      licenseCache.isCacheStale.mockReturnValue(false);

      const result = await CompanyService.getCompanyByTenantId(tenantId);

      expect(result).toBeDefined();
      expect(result.slug).toBe(tenantId);
      expect(result._cached).toBe(true);
      expect(licenseCache.getCachedLicense).toHaveBeenCalledWith(tenantId, null);
      expect(licenseServerClient.getTenant).not.toHaveBeenCalled();
    });

    it('should query License Server when cache is stale', async () => {
      const tenantId = 'test_tenant';
      const staleCachedData = {
        companyId: tenantId,
        quickAccess: {
          lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 hours ago
        }
      };

      const freshData = {
        tenantId,
        name: 'Test Company',
        subscription: { status: 'active', plan: 'enterprise' },
        enabledModules: ['surveys', 'payroll', 'attendance']
      };

      licenseCache.getCachedLicense.mockResolvedValue(staleCachedData);
      licenseCache.isCacheStale.mockReturnValue(true);
      licenseServerClient.getTenant.mockResolvedValue(freshData);
      licenseCache.updateLicenseCache.mockResolvedValue({});

      const result = await CompanyService.getCompanyByTenantId(tenantId);

      expect(result).toBeDefined();
      expect(result.slug).toBe(tenantId);
      expect(licenseServerClient.getTenant).toHaveBeenCalledWith(tenantId);
      expect(licenseCache.updateLicenseCache).toHaveBeenCalledWith(tenantId, freshData, null);
    });

    it('should query License Server when cache is missing', async () => {
      const tenantId = 'test_tenant';
      const freshData = {
        tenantId,
        name: 'Test Company',
        subscription: { status: 'active', plan: 'enterprise' },
        enabledModules: ['surveys', 'payroll']
      };

      licenseCache.getCachedLicense.mockResolvedValue(null);
      licenseServerClient.getTenant.mockResolvedValue(freshData);
      licenseCache.updateLicenseCache.mockResolvedValue({});

      const result = await CompanyService.getCompanyByTenantId(tenantId);

      expect(result).toBeDefined();
      expect(result.slug).toBe(tenantId);
      expect(licenseServerClient.getTenant).toHaveBeenCalledWith(tenantId);
      expect(licenseCache.updateLicenseCache).toHaveBeenCalledWith(tenantId, freshData, null);
    });
  });

  describe('getEnabledModules with cache integration', () => {
    it('should use cached modules when cache is fresh', async () => {
      const tenantId = 'test_tenant';
      const cachedData = {
        companyId: tenantId,
        quickAccess: {
          enabledModules: ['surveys', 'payroll'],
          lastSyncedAt: new Date()
        }
      };

      licenseCache.getCachedLicense.mockResolvedValue(cachedData);
      licenseCache.isCacheStale.mockReturnValue(false);

      const result = await CompanyService.getEnabledModules(tenantId);

      expect(result).toEqual(['surveys', 'payroll']);
      expect(licenseCache.getCachedLicense).toHaveBeenCalledWith(tenantId, null);
      expect(licenseServerClient.getEnabledModules).not.toHaveBeenCalled();
    });

    it('should query License Server when cache is stale', async () => {
      const tenantId = 'test_tenant';
      const staleCachedData = {
        companyId: tenantId,
        quickAccess: {
          enabledModules: ['surveys'],
          lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000)
        }
      };

      licenseCache.getCachedLicense.mockResolvedValue(staleCachedData);
      licenseCache.isCacheStale.mockReturnValue(true);
      licenseServerClient.getEnabledModules.mockResolvedValue(['surveys', 'payroll', 'attendance']);
      licenseCache.updateLicenseCache.mockResolvedValue({});

      const result = await CompanyService.getEnabledModules(tenantId);

      expect(result).toEqual(['surveys', 'payroll', 'attendance']);
      expect(licenseServerClient.getEnabledModules).toHaveBeenCalledWith(tenantId);
      expect(licenseCache.updateLicenseCache).toHaveBeenCalled();
    });
  });

  describe('isModuleEnabled with cache integration', () => {
    it('should check module enablement using License Server', async () => {
      const tenantId = 'test_tenant';
      const moduleId = 'surveys';

      licenseServerClient.getEnabledModules.mockResolvedValue(['surveys', 'payroll']);

      const result = await CompanyService.isModuleEnabled(tenantId, moduleId);

      expect(result).toBe(true);
      expect(licenseServerClient.getEnabledModules).toHaveBeenCalledWith(tenantId);
    });

    it('should return false for disabled module', async () => {
      const tenantId = 'test_tenant';
      const moduleId = 'attendance';

      licenseServerClient.getEnabledModules.mockResolvedValue(['surveys', 'payroll']);

      const result = await CompanyService.isModuleEnabled(tenantId, moduleId);

      expect(result).toBe(false);
    });
  });

  describe('getSubscriptionStatus with cache integration', () => {
    it('should retrieve subscription status from License Server', async () => {
      const tenantId = 'test_tenant';
      const tenantData = {
        tenantId,
        name: 'Test Company',
        subscription: {
          status: 'active',
          plan: 'enterprise',
          expiresAt: new Date('2026-12-31')
        }
      };

      licenseCache.getCachedLicense.mockResolvedValue(null);
      licenseServerClient.getTenant.mockResolvedValue(tenantData);
      licenseCache.updateLicenseCache.mockResolvedValue({});

      const result = await CompanyService.getSubscriptionStatus(tenantId);

      expect(result).toEqual(tenantData.subscription);
      expect(licenseServerClient.getTenant).toHaveBeenCalledWith(tenantId);
    });
  });
});
