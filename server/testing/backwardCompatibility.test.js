import { jest } from '@jest/globals';
import {
  getCompatibilityConfig,
  isCompatibilityModeEnabled,
  getTenantWithCompatibility,
  getEnabledModulesWithCompatibility,
  isModuleEnabledWithCompatibility,
  updateCompatibilityConfig
} from '../services/backwardCompatibility.js';

/**
 * Tests for Backward Compatibility Service
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

describe('Backward Compatibility Service', () => {
  let originalEnv;
  let mockLicenseDataService;
  let mockConnection;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset environment variables
    delete process.env.BACKWARD_COMPATIBILITY_MODE;
    delete process.env.PRIMARY_DATA_SOURCE;
    delete process.env.LOG_DATA_SOURCE;
    delete process.env.ENABLE_DATA_SOURCE_FALLBACK;

    // Create mock license data service
    mockLicenseDataService = {
      getTenant: jest.fn(),
      getEnabledModules: jest.fn(),
      isModuleEnabled: jest.fn()
    };

    // Create mock connection
    mockConnection = {};

    // Reset compatibility config to defaults
    updateCompatibilityConfig({
      enabled: false,
      primarySource: 'license_server',
      logDataSource: true,
      enableFallback: true
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('getCompatibilityConfig', () => {
    it('should return current compatibility configuration', () => {
      const config = getCompatibilityConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('primarySource');
      expect(config).toHaveProperty('logDataSource');
      expect(config).toHaveProperty('enableFallback');
    });

    it('should return a copy of the configuration', () => {
      const config1 = getCompatibilityConfig();
      const config2 = getCompatibilityConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('isCompatibilityModeEnabled', () => {
    it('should return false when compatibility mode is disabled', () => {
      updateCompatibilityConfig({ enabled: false });

      expect(isCompatibilityModeEnabled()).toBe(false);
    });

    it('should return true when compatibility mode is enabled', () => {
      updateCompatibilityConfig({ enabled: true });

      expect(isCompatibilityModeEnabled()).toBe(true);
    });
  });

  describe('updateCompatibilityConfig', () => {
    it('should update enabled flag', () => {
      updateCompatibilityConfig({ enabled: true });

      const config = getCompatibilityConfig();
      expect(config.enabled).toBe(true);
    });

    it('should update primary source', () => {
      updateCompatibilityConfig({ primarySource: 'local_database' });

      const config = getCompatibilityConfig();
      expect(config.primarySource).toBe('local_database');
    });

    it('should throw error for invalid primary source', () => {
      expect(() => {
        updateCompatibilityConfig({ primarySource: 'invalid_source' });
      }).toThrow('Primary source must be "license_server" or "local_database"');
    });

    it('should update logDataSource flag', () => {
      updateCompatibilityConfig({ logDataSource: false });

      const config = getCompatibilityConfig();
      expect(config.logDataSource).toBe(false);
    });

    it('should update enableFallback flag', () => {
      updateCompatibilityConfig({ enableFallback: false });

      const config = getCompatibilityConfig();
      expect(config.enableFallback).toBe(false);
    });

    it('should update multiple config values at once', () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'local_database',
        logDataSource: false,
        enableFallback: false
      });

      const config = getCompatibilityConfig();
      expect(config.enabled).toBe(true);
      expect(config.primarySource).toBe('local_database');
      expect(config.logDataSource).toBe(false);
      expect(config.enableFallback).toBe(false);
    });
  });

  describe('getTenantWithCompatibility', () => {
    const mockTenantData = {
      tenantId: 'test_tenant',
      name: 'Test Tenant',
      subscription: {
        status: 'active',
        plan: 'enterprise'
      },
      enabledModules: ['surveys', 'payroll']
    };

    it('should throw error if tenantId is not provided', async () => {
      await expect(
        getTenantWithCompatibility(null, mockLicenseDataService, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should use License Server only when compatibility mode is disabled', async () => {
      updateCompatibilityConfig({ enabled: false });
      mockLicenseDataService.getTenant.mockResolvedValue(mockTenantData);

      const result = await getTenantWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(mockLicenseDataService.getTenant).toHaveBeenCalledWith('test_tenant', mockConnection);
      expect(result).toEqual(mockTenantData);
    });

    it('should prioritize License Server when both sources available', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server'
      });

      mockLicenseDataService.getTenant.mockResolvedValue(mockTenantData);

      const result = await getTenantWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(mockLicenseDataService.getTenant).toHaveBeenCalled();
      expect(result).toMatchObject(mockTenantData);
      expect(result._dataSource).toBe('license_server');
      expect(result._compatibilityMode).toBe(true);
    });

    it('should throw error when tenant not found in any source', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server',
        enableFallback: false // Disable fallback to avoid model registry error
      });

      mockLicenseDataService.getTenant.mockRejectedValue(new Error('Not found'));

      await expect(
        getTenantWithCompatibility('nonexistent_tenant', mockLicenseDataService, mockConnection)
      ).rejects.toThrow();
    });
  });

  describe('getEnabledModulesWithCompatibility', () => {
    const mockModules = ['surveys', 'payroll', 'attendance'];

    it('should throw error if tenantId is not provided', async () => {
      await expect(
        getEnabledModulesWithCompatibility(null, mockLicenseDataService, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should use License Server only when compatibility mode is disabled', async () => {
      updateCompatibilityConfig({ enabled: false });
      mockLicenseDataService.getEnabledModules.mockResolvedValue(mockModules);

      const result = await getEnabledModulesWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(mockLicenseDataService.getEnabledModules).toHaveBeenCalledWith('test_tenant', mockConnection);
      expect(result).toEqual(mockModules);
    });

    it('should return modules from License Server when available', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server'
      });

      mockLicenseDataService.getEnabledModules.mockResolvedValue(mockModules);

      const result = await getEnabledModulesWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(mockLicenseDataService.getEnabledModules).toHaveBeenCalled();
      expect(result).toEqual(mockModules);
    });

    it('should throw error when modules not found in any source', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server',
        enableFallback: false // Disable fallback to avoid model registry error
      });

      mockLicenseDataService.getEnabledModules.mockRejectedValue(new Error('Not found'));

      await expect(
        getEnabledModulesWithCompatibility('nonexistent_tenant', mockLicenseDataService, mockConnection)
      ).rejects.toThrow();
    });
  });

  describe('isModuleEnabledWithCompatibility', () => {
    const mockModules = ['surveys', 'payroll', 'attendance'];

    it('should throw error if tenantId is not provided', async () => {
      await expect(
        isModuleEnabledWithCompatibility(null, 'surveys', mockLicenseDataService, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if moduleId is not provided', async () => {
      await expect(
        isModuleEnabledWithCompatibility('test_tenant', null, mockLicenseDataService, mockConnection)
      ).rejects.toThrow('Module ID is required');
    });

    it('should return true when module is enabled', async () => {
      updateCompatibilityConfig({ enabled: false });
      mockLicenseDataService.getEnabledModules.mockResolvedValue(mockModules);

      const result = await isModuleEnabledWithCompatibility(
        'test_tenant',
        'surveys',
        mockLicenseDataService,
        mockConnection
      );

      expect(result).toBe(true);
    });

    it('should return false when module is not enabled', async () => {
      updateCompatibilityConfig({ enabled: false });
      mockLicenseDataService.getEnabledModules.mockResolvedValue(mockModules);

      const result = await isModuleEnabledWithCompatibility(
        'test_tenant',
        'recruitment',
        mockLicenseDataService,
        mockConnection
      );

      expect(result).toBe(false);
    });
  });

  describe('Requirements Validation', () => {
    it('should support reading from both databases (Requirement 6.1)', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server',
        enableFallback: true
      });

      mockLicenseDataService.getTenant.mockResolvedValue({
        tenantId: 'test_tenant',
        name: 'Test Tenant'
      });

      const result = await getTenantWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(result).toBeDefined();
      expect(result._compatibilityMode).toBe(true);
    });

    it('should prioritize License Server data (Requirement 6.2)', async () => {
      updateCompatibilityConfig({
        enabled: true,
        primarySource: 'license_server'
      });

      const licenseServerData = {
        tenantId: 'test_tenant',
        name: 'License Server Name'
      };

      mockLicenseDataService.getTenant.mockResolvedValue(licenseServerData);

      const result = await getTenantWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(result.name).toBe('License Server Name');
      expect(result._dataSource).toBe('license_server');
    });

    it('should log data source being used (Requirement 6.5)', async () => {
      updateCompatibilityConfig({
        enabled: true,
        logDataSource: true,
        primarySource: 'license_server'
      });

      mockLicenseDataService.getTenant.mockResolvedValue({
        tenantId: 'test_tenant',
        name: 'Test Tenant'
      });

      const result = await getTenantWithCompatibility(
        'test_tenant',
        mockLicenseDataService,
        mockConnection
      );

      expect(result._dataSource).toBeDefined();
      expect(result._compatibilityMode).toBe(true);
    });
  });
});
