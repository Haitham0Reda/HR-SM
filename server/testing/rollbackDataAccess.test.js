import { jest } from '@jest/globals';
import {
  getTenantFromLocalDatabase,
  getEnabledModulesFromLocalDatabase,
  isModuleEnabledInLocalDatabase,
  getSubscriptionFromLocalDatabase,
  verifyRollbackFunctionality,
  RollbackDataService
} from '../services/rollbackDataAccess.js';

/**
 * Tests for Rollback Data Access Service
 * 
 * Requirements: 6.4, 12.2
 */

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

// Mock Tenant model
const mockTenant = {
  findOne: jest.fn()
};

jest.unstable_mockModule('../platform/tenants/models/Tenant.js', () => ({
  default: mockTenant
}));

describe('Rollback Data Access Service', () => {
  let mockConnection;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock connection
    mockConnection = {};
  });

  describe('getTenantFromLocalDatabase', () => {
    const mockTenantData = {
      tenantId: 'test_tenant',
      name: 'Test Tenant',
      domain: 'test.com',
      contactEmail: 'admin@test.com',
      contactPhone: '+1234567890',
      subscription: {
        status: 'active',
        planId: 'enterprise',
        expiresAt: new Date('2026-12-31'),
        startDate: new Date('2025-01-01'),
        autoRenew: true,
        billingCycle: 'monthly'
      },
      enabledModules: [
        { moduleId: 'surveys' },
        { moduleId: 'payroll' }
      ],
      status: 'active',
      deploymentMode: 'saas',
      config: {},
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2026-01-24')
    };

    it('should throw error if tenantId is not provided', async () => {
      await expect(
        getTenantFromLocalDatabase(null, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should retrieve tenant from local database', async () => {
      mockTenant.findOne.mockResolvedValue(mockTenantData);

      const result = await getTenantFromLocalDatabase('test_tenant', null);

      expect(mockTenant.findOne).toHaveBeenCalledWith({ tenantId: 'test_tenant' });
      expect(result.tenantId).toBe('test_tenant');
      expect(result.name).toBe('Test Tenant');
      expect(result._source).toBe('local_database');
      expect(result._rollbackMode).toBe(true);
    });

    it('should throw error when tenant not found', async () => {
      mockTenant.findOne.mockResolvedValue(null);

      await expect(
        getTenantFromLocalDatabase('nonexistent_tenant', null)
      ).rejects.toThrow('not found in local database');
    });

    it('should format tenant data correctly', async () => {
      mockTenant.findOne.mockResolvedValue(mockTenantData);

      const result = await getTenantFromLocalDatabase('test_tenant', null);

      expect(result.subscription).toBeDefined();
      expect(result.subscription.status).toBe('active');
      expect(result.enabledModules).toEqual(['surveys', 'payroll']);
    });
  });

  describe('getEnabledModulesFromLocalDatabase', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(
        getEnabledModulesFromLocalDatabase(null, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should retrieve enabled modules from local database', async () => {
      const mockTenantData = {
        enabledModules: [
          { moduleId: 'surveys' },
          { moduleId: 'payroll' },
          { moduleId: 'attendance' }
        ]
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await getEnabledModulesFromLocalDatabase('test_tenant', null);

      expect(result).toEqual(['surveys', 'payroll', 'attendance']);
    });

    it('should return empty array when no modules enabled', async () => {
      const mockTenantData = {
        enabledModules: []
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await getEnabledModulesFromLocalDatabase('test_tenant', null);

      expect(result).toEqual([]);
    });

    it('should throw error when tenant not found', async () => {
      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(
        getEnabledModulesFromLocalDatabase('nonexistent_tenant', null)
      ).rejects.toThrow('not found in local database');
    });
  });

  describe('isModuleEnabledInLocalDatabase', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(
        isModuleEnabledInLocalDatabase(null, 'surveys', mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if moduleId is not provided', async () => {
      await expect(
        isModuleEnabledInLocalDatabase('test_tenant', null, mockConnection)
      ).rejects.toThrow('Module ID is required');
    });

    it('should return true when module is enabled', async () => {
      const mockTenantData = {
        enabledModules: [
          { moduleId: 'surveys' },
          { moduleId: 'payroll' }
        ]
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await isModuleEnabledInLocalDatabase('test_tenant', 'surveys', null);

      expect(result).toBe(true);
    });

    it('should return false when module is not enabled', async () => {
      const mockTenantData = {
        enabledModules: [
          { moduleId: 'surveys' },
          { moduleId: 'payroll' }
        ]
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await isModuleEnabledInLocalDatabase('test_tenant', 'recruitment', null);

      expect(result).toBe(false);
    });
  });

  describe('getSubscriptionFromLocalDatabase', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(
        getSubscriptionFromLocalDatabase(null, mockConnection)
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should retrieve subscription from local database', async () => {
      const mockTenantData = {
        subscription: {
          status: 'active',
          planId: 'enterprise',
          expiresAt: new Date('2026-12-31'),
          startDate: new Date('2025-01-01'),
          autoRenew: true,
          billingCycle: 'monthly'
        }
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await getSubscriptionFromLocalDatabase('test_tenant', null);

      expect(result.status).toBe('active');
      expect(result.plan).toBe('enterprise');
      expect(result.autoRenew).toBe(true);
    });

    it('should throw error when tenant not found', async () => {
      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(
        getSubscriptionFromLocalDatabase('nonexistent_tenant', null)
      ).rejects.toThrow('not found in local database');
    });
  });

  describe('RollbackDataService', () => {
    let service;

    beforeEach(() => {
      service = new RollbackDataService();
    });

    it('should create instance successfully', () => {
      expect(service).toBeInstanceOf(RollbackDataService);
    });

    it('should provide getTenant method', async () => {
      const mockTenantData = {
        tenantId: 'test_tenant',
        name: 'Test Tenant',
        subscription: { status: 'active' },
        enabledModules: [{ moduleId: 'surveys' }],
        status: 'active'
      };

      mockTenant.findOne.mockResolvedValue(mockTenantData);

      const result = await service.getTenant('test_tenant', null);

      expect(result.tenantId).toBe('test_tenant');
      expect(result._rollbackMode).toBe(true);
    });

    it('should provide getEnabledModules method', async () => {
      const mockTenantData = {
        enabledModules: [
          { moduleId: 'surveys' },
          { moduleId: 'payroll' }
        ]
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await service.getEnabledModules('test_tenant', null);

      expect(result).toEqual(['surveys', 'payroll']);
    });

    it('should provide isModuleEnabled method', async () => {
      const mockTenantData = {
        enabledModules: [
          { moduleId: 'surveys' }
        ]
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await service.isModuleEnabled('test_tenant', 'surveys', null);

      expect(result).toBe(true);
    });

    it('should provide getSubscription method', async () => {
      const mockTenantData = {
        subscription: {
          status: 'active',
          planId: 'enterprise'
        }
      };

      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      const result = await service.getSubscription('test_tenant', null);

      expect(result.status).toBe('active');
    });

    it('should provide validateLicense method with rollback mode', async () => {
      const mockTenantData = {
        tenantId: 'test_tenant',
        name: 'Test Tenant',
        subscription: { status: 'active' },
        enabledModules: [{ moduleId: 'surveys' }],
        status: 'active'
      };

      mockTenant.findOne.mockResolvedValue(mockTenantData);

      const result = await service.validateLicense('test_tenant', 'dummy-key', null);

      expect(result.valid).toBe(true);
      expect(result.rollbackMode).toBe(true);
      expect(result._source).toBe('local_database');
    });
  });

  describe('Requirements Validation', () => {
    it('should switch back to local database queries (Requirement 6.4)', async () => {
      const mockTenantData = {
        tenantId: 'test_tenant',
        name: 'Test Tenant',
        subscription: { status: 'active' },
        enabledModules: [{ moduleId: 'surveys' }],
        status: 'active'
      };

      mockTenant.findOne.mockResolvedValue(mockTenantData);

      const result = await getTenantFromLocalDatabase('test_tenant', null);

      expect(result._source).toBe('local_database');
      expect(result._rollbackMode).toBe(true);
    });

    it('should verify functionality after rollback (Requirement 12.2)', async () => {
      const service = new RollbackDataService();

      const mockTenantData = {
        tenantId: 'test_tenant',
        name: 'Test Tenant',
        subscription: { status: 'active' },
        enabledModules: [{ moduleId: 'surveys' }],
        status: 'active'
      };

      mockTenant.findOne.mockResolvedValue(mockTenantData);
      mockTenant.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTenantData)
      });

      // Verify all methods work
      const tenant = await service.getTenant('test_tenant', null);
      expect(tenant).toBeDefined();

      const modules = await service.getEnabledModules('test_tenant', null);
      expect(Array.isArray(modules)).toBe(true);

      const subscription = await service.getSubscription('test_tenant', null);
      expect(subscription).toBeDefined();
    });
  });
});
