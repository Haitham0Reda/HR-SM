import { jest } from '@jest/globals';

// Mock dependencies before importing the job
const mockGetCachedLicense = jest.fn();
const mockUpdateLicenseCache = jest.fn();
const mockGetCacheStats = jest.fn();
const mockCreateLicenseDataService = jest.fn();
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../services/licenseCache.js', () => ({
  getCachedLicense: mockGetCachedLicense,
  updateLicenseCache: mockUpdateLicenseCache,
  getCacheStats: mockGetCacheStats
}));

jest.unstable_mockModule('../services/licenseDataService.js', () => ({
  createLicenseDataService: mockCreateLicenseDataService
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../config/sharedModels.js', () => ({
  getModelForConnection: jest.fn()
}));

jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: jest.fn(() => ({
      stop: jest.fn()
    }))
  }
}));

// Mock CompanyLicense model
const mockCompanyLicenseFind = jest.fn().mockResolvedValue([]);
jest.unstable_mockModule('../modules/licensing/models/companyLicense.model.js', () => ({
  default: {
    find: mockCompanyLicenseFind
  }
}));

describe('Cache Refresh Job', () => {
  let CacheRefreshJob;
  let cacheRefreshJob;
  let mockLicenseDataService;

  beforeAll(async () => {
    // Set environment variables
    process.env.LICENSE_SERVER_URL = 'http://localhost:4000';
    process.env.LICENSE_SERVER_API_KEY = 'test-api-key';
    process.env.NODE_ENV = 'test';

    // Import the job after mocks are set up
    const module = await import('../jobs/cacheRefresh.job.js');
    CacheRefreshJob = module.default.constructor;
    cacheRefreshJob = new CacheRefreshJob();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock License Data Service
    mockLicenseDataService = {
      getTenant: jest.fn().mockResolvedValue({
        tenantId: 'test_tenant',
        name: 'Test Tenant',
        subscription: { status: 'active' },
        enabledModules: ['surveys', 'payroll']
      })
    };

    mockCreateLicenseDataService.mockReturnValue(mockLicenseDataService);
    mockGetCacheStats.mockResolvedValue({
      total: 10,
      fresh: 8,
      stale: 2,
      cacheTtlHours: 6
    });
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const job = new CacheRefreshJob();
      
      expect(job.isRunning).toBe(false);
      expect(job.lastExecution).toBeNull();
      expect(job.executionCount).toBe(0);
      expect(job.errorCount).toBe(0);
    });

    it('should initialize License Data Service with environment variables', () => {
      const job = new CacheRefreshJob();
      job._initializeLicenseDataService();

      expect(mockCreateLicenseDataService).toHaveBeenCalledWith({
        licenseServerUrl: 'http://localhost:4000',
        licenseServerApiKey: 'test-api-key',
        clientOptions: {
          timeout: 10000
        }
      });
    });

    it('should not initialize License Data Service without API key', () => {
      const originalApiKey = process.env.LICENSE_SERVER_API_KEY;
      delete process.env.LICENSE_SERVER_API_KEY;

      const job = new CacheRefreshJob();
      job._initializeLicenseDataService();

      expect(job.licenseDataService).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'LICENSE_SERVER_API_KEY not configured, cache refresh job will not run'
      );

      // Restore
      process.env.LICENSE_SERVER_API_KEY = originalApiKey;
    });
  });

  describe('refreshAllCaches', () => {
    beforeEach(() => {
      cacheRefreshJob._initializeLicenseDataService();
    });

    it('should refresh caches for all tenants successfully', async () => {
      // Mock tenant IDs
      mockCompanyLicenseFind.mockResolvedValue([
        { companyId: 'tenant1' },
        { companyId: 'tenant2' },
        { companyId: 'tenant3' }
      ]);

      await cacheRefreshJob.refreshAllCaches();

      expect(mockCompanyLicenseFind).toHaveBeenCalledWith({}, { companyId: 1 });
      expect(mockLicenseDataService.getTenant).toHaveBeenCalledTimes(3);
      expect(mockLicenseDataService.getTenant).toHaveBeenCalledWith('tenant1', null, { forceRefresh: true });
      expect(mockLicenseDataService.getTenant).toHaveBeenCalledWith('tenant2', null, { forceRefresh: true });
      expect(mockLicenseDataService.getTenant).toHaveBeenCalledWith('tenant3', null, { forceRefresh: true });
      expect(mockGetCacheStats).toHaveBeenCalled();
      expect(cacheRefreshJob.executionCount).toBeGreaterThan(0);
      expect(cacheRefreshJob.errorCount).toBe(0);
    });

    it('should handle empty tenant list', async () => {
      mockCompanyLicenseFind.mockResolvedValue([]);

      await cacheRefreshJob.refreshAllCaches();

      expect(mockLicenseDataService.getTenant).not.toHaveBeenCalled();
    });

    it('should continue on individual tenant failures', async () => {
      mockCompanyLicenseFind.mockResolvedValue([
        { companyId: 'tenant1' },
        { companyId: 'tenant2' },
        { companyId: 'tenant3' }
      ]);

      // Make tenant2 fail
      mockLicenseDataService.getTenant
        .mockResolvedValueOnce({ tenantId: 'tenant1' })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ tenantId: 'tenant3' });

      await cacheRefreshJob.refreshAllCaches();

      expect(mockLicenseDataService.getTenant).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to refresh cache for tenant',
        expect.objectContaining({
          tenantId: 'tenant2',
          error: 'Network error'
        })
      );
    });

    it('should skip already running job', async () => {
      cacheRefreshJob.isRunning = true;

      await cacheRefreshJob.refreshAllCaches();

      expect(mockLogger.warn).toHaveBeenCalledWith('Cache refresh job already running, skipping...');
      expect(mockCompanyLicenseFind).not.toHaveBeenCalled();

      cacheRefreshJob.isRunning = false;
    });

    it('should handle License Server unavailable gracefully', async () => {
      mockCompanyLicenseFind.mockResolvedValue([
        { companyId: 'tenant1' }
      ]);

      mockLicenseDataService.getTenant.mockRejectedValue(
        new Error('License Server unavailable')
      );

      await cacheRefreshJob.refreshAllCaches();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License Server unavailable during cache refresh',
        expect.objectContaining({
          tenantId: 'tenant1'
        })
      );
    });

    it('should update execution statistics', async () => {
      mockCompanyLicenseFind.mockResolvedValue([
        { companyId: 'tenant1' }
      ]);

      const beforeCount = cacheRefreshJob.executionCount;
      await cacheRefreshJob.refreshAllCaches();

      expect(cacheRefreshJob.executionCount).toBeGreaterThan(beforeCount);
      expect(cacheRefreshJob.lastExecution).toBeInstanceOf(Date);
      expect(cacheRefreshJob.isRunning).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return job status information', () => {
      cacheRefreshJob.executionCount = 10;
      cacheRefreshJob.errorCount = 2;
      cacheRefreshJob.lastExecution = new Date('2026-01-24T10:00:00Z');
      cacheRefreshJob.lastStats = {
        total: 10,
        fresh: 8,
        stale: 2
      };

      const status = cacheRefreshJob.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastExecution).toBeInstanceOf(Date);
      expect(status.executionCount).toBe(10);
      expect(status.errorCount).toBe(2);
      expect(status.successRate).toBe('80.00');
      expect(status.lastStats).toEqual({
        total: 10,
        fresh: 8,
        stale: 2
      });
      expect(status.licenseServerConfigured).toBe(true);
    });

    it('should calculate success rate correctly', () => {
      cacheRefreshJob.executionCount = 0;
      cacheRefreshJob.errorCount = 0;

      const status = cacheRefreshJob.getStatus();
      expect(status.successRate).toBe(0);

      cacheRefreshJob.executionCount = 5;
      cacheRefreshJob.errorCount = 1;

      const status2 = cacheRefreshJob.getStatus();
      expect(status2.successRate).toBe('80.00');
    });
  });

  describe('executeNow', () => {
    it('should execute cache refresh immediately', async () => {
      mockCompanyLicenseFind.mockResolvedValue([
        { companyId: 'tenant1' }
      ]);

      cacheRefreshJob._initializeLicenseDataService();
      await cacheRefreshJob.executeNow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🚀 Manual execution of cache refresh requested...'
      );
      expect(mockLicenseDataService.getTenant).toHaveBeenCalled();
    });
  });

  describe('refreshTenant', () => {
    beforeEach(() => {
      cacheRefreshJob._initializeLicenseDataService();
    });

    it('should refresh cache for specific tenant', async () => {
      await cacheRefreshJob.refreshTenant('test_tenant');

      expect(mockLicenseDataService.getTenant).toHaveBeenCalledWith(
        'test_tenant',
        null,
        { forceRefresh: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Cache refreshed successfully for tenant',
        { tenantId: 'test_tenant' }
      );
    });

    it('should throw error if tenant ID is missing', async () => {
      await expect(cacheRefreshJob.refreshTenant()).rejects.toThrow('Tenant ID is required');
    });

    it('should handle refresh failure', async () => {
      mockLicenseDataService.getTenant.mockRejectedValue(new Error('Refresh failed'));

      await expect(cacheRefreshJob.refreshTenant('test_tenant')).rejects.toThrow('Refresh failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Failed to refresh cache for tenant',
        expect.objectContaining({
          tenantId: 'test_tenant',
          error: 'Refresh failed'
        })
      );
    });
  });
});
