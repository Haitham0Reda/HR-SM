import { jest } from '@jest/globals';

// Create a complete mock for the License model
const createMockLicense = (data = {}) => ({
  licenseNumber: data.licenseNumber || 'HRSM-2025-123456',
  tenantId: data.tenantId || 'tenant-123',
  tenantName: data.tenantName || 'Test Company',
  type: data.type || 'professional',
  features: data.features || {
    modules: ['hr-core', 'payroll'],
    maxUsers: 100,
    maxStorage: 20480,
    maxAPICallsPerMonth: 200000
  },
  binding: data.binding || {
    boundDomain: 'test.company.com'
  },
  expiresAt: data.expiresAt || new Date('2025-12-31'),
  maxActivations: data.maxActivations || 2,
  notes: data.notes || 'Test license',
  status: data.status || 'active',
  isExpired: data.isExpired || false,
  activations: data.activations || [],
  usage: data.usage || {
    currentUsers: 50,
    currentStorage: 5000,
    totalValidations: 0
  },
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue(data),
  updateUsage: jest.fn().mockResolvedValue(true)
});

// Mock the License model constructor and static methods
const mockLicense = jest.fn((data) => createMockLicense(data));
mockLicense.findOne = jest.fn();
mockLicense.find = jest.fn();
mockLicense.aggregate = jest.fn();

// Mock other dependencies
const mockAuditService = {
  logLicenseCreation: jest.fn().mockResolvedValue(),
  logLicenseRevocation: jest.fn().mockResolvedValue(),
  logLicenseRenewal: jest.fn().mockResolvedValue(),
  logLicenseSuspension: jest.fn().mockResolvedValue(),
  logLicenseReactivation: jest.fn().mockResolvedValue(),
  logUsageUpdate: jest.fn().mockResolvedValue(),
  logOperation: jest.fn().mockResolvedValue()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// Mock the modules
jest.mock('../models/License.js', () => ({
  default: mockLicense
}));

jest.mock('../services/auditService.js', () => ({
  default: mockAuditService
}));

jest.mock('../utils/logger.js', () => ({
  default: mockLogger
}));

// Import the service after mocking
const LicenseGenerator = (await import('../services/licenseGenerator.js')).default;

describe('LicenseGenerator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLicense', () => {
    it('should create a license with valid data', async () => {
      const mockLicenseData = {
        tenantId: 'tenant-123',
        tenantName: 'Test Company',
        type: 'professional',
        modules: ['hr-core', 'payroll'],
        maxUsers: 100,
        maxStorage: 20480,
        maxAPICallsPerMonth: 200000,
        domain: 'test.company.com',
        expiresAt: new Date('2025-12-31'),
        maxActivations: 2,
        notes: 'Test license'
      };

      const result = await LicenseGenerator.createLicense(mockLicenseData, 'admin-user');

      expect(mockLicense).toHaveBeenCalled();
      expect(mockAuditService.logLicenseCreation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        expect.any(Object),
        'admin-user'
      );
      expect(result).toHaveProperty('license');
      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
    });

    it('should handle license creation errors', async () => {
      const mockLicenseData = {
        tenantId: 'tenant-123',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date('2025-12-31')
      };

      const mockError = new Error('Database connection failed');
      mockLicense.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(mockError)
      }));

      await expect(LicenseGenerator.createLicense(mockLicenseData)).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create license', expect.any(Object));
    });
  });

  describe('revokeLicense', () => {
    it('should revoke an existing license', async () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'active',
        notes: 'Original notes'
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      const result = await LicenseGenerator.revokeLicense('HRSM-2025-123456', 'Policy violation', 'admin-user');

      expect(mockLicense.findOne).toHaveBeenCalledWith({ licenseNumber: 'HRSM-2025-123456' });
      expect(mockLicenseInstance.status).toBe('revoked');
      expect(mockLicenseInstance.notes).toContain('Revoked: Policy violation');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseRevocation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        'Policy violation',
        'admin-user'
      );
      expect(result).toBe(mockLicenseInstance);
    });

    it('should throw error for non-existent license', async () => {
      mockLicense.findOne.mockResolvedValue(null);

      await expect(LicenseGenerator.revokeLicense('INVALID-LICENSE', 'Test reason')).rejects.toThrow('License not found');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to revoke license', expect.any(Object));
    });
  });

  describe('renewLicense', () => {
    it('should renew an existing license', async () => {
      const oldExpiryDate = new Date('2025-06-30');
      const newExpiryDate = new Date('2026-06-30');
      
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'expired',
        expiresAt: oldExpiryDate,
        notes: 'Original notes'
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      const result = await LicenseGenerator.renewLicense('HRSM-2025-123456', newExpiryDate, 'Annual renewal', 'admin-user');

      expect(mockLicenseInstance.expiresAt).toBe(newExpiryDate);
      expect(mockLicenseInstance.status).toBe('active');
      expect(mockLicenseInstance.notes).toContain('Renewed: Annual renewal');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseRenewal).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        oldExpiryDate,
        newExpiryDate,
        'admin-user'
      );
      expect(result).toHaveProperty('license');
      expect(result).toHaveProperty('token');
    });
  });

  describe('suspendLicense', () => {
    it('should suspend an active license', async () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'active',
        notes: 'Original notes'
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      const result = await LicenseGenerator.suspendLicense('HRSM-2025-123456', 'Payment overdue', 'admin-user');

      expect(mockLicenseInstance.status).toBe('suspended');
      expect(mockLicenseInstance.notes).toContain('Suspended: Payment overdue');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseSuspension).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        'Payment overdue',
        'admin-user'
      );
      expect(result).toBe(mockLicenseInstance);
    });
  });

  describe('reactivateLicense', () => {
    it('should reactivate a suspended license', async () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'suspended',
        isExpired: false,
        notes: 'Original notes'
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      const result = await LicenseGenerator.reactivateLicense('HRSM-2025-123456', 'admin-user');

      expect(mockLicenseInstance.status).toBe('active');
      expect(mockLicenseInstance.notes).toContain('Reactivated:');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseReactivation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        'admin-user'
      );
      expect(result).toHaveProperty('license');
      expect(result).toHaveProperty('token');
    });

    it('should not reactivate an expired license', async () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'suspended',
        isExpired: true
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      await expect(LicenseGenerator.reactivateLicense('HRSM-2025-123456')).rejects.toThrow('Cannot reactivate expired license. Renew first.');
    });
  });

  describe('updateLicenseUsage', () => {
    it('should update license usage tracking', async () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        usage: {
          currentUsers: 50,
          currentStorage: 5000
        }
      });

      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);

      const result = await LicenseGenerator.updateLicenseUsage('HRSM-2025-123456', 75, 7500, 50000);

      expect(mockLicense.findOne).toHaveBeenCalledWith({ licenseNumber: 'HRSM-2025-123456' });
      expect(mockLicenseInstance.updateUsage).toHaveBeenCalledWith(75, 7500);
      expect(mockLicenseInstance.usage.apiCallsThisMonth).toBe(50000);
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logUsageUpdate).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        {
          currentUsers: 75,
          currentStorage: 7500,
          apiCallsThisMonth: 50000
        }
      );
    });
  });

  describe('autoRenewExpiringLicenses', () => {
    it('should auto-renew expiring professional licenses', async () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 5); // Expires in 5 days

      const mockLicenses = [
        {
          licenseNumber: 'HRSM-2025-123456',
          tenantId: 'tenant-123',
          type: 'professional',
          status: 'active',
          expiresAt: expiringDate
        },
        {
          licenseNumber: 'HRSM-2025-789012',
          tenantId: 'tenant-456',
          type: 'enterprise',
          status: 'active',
          expiresAt: expiringDate
        }
      ];

      mockLicense.find.mockResolvedValue(mockLicenses);
      
      // Mock the renewLicense method
      const originalRenewLicense = LicenseGenerator.renewLicense;
      LicenseGenerator.renewLicense = jest.fn().mockResolvedValue({
        license: { licenseNumber: 'test' },
        token: 'test-token'
      });

      const results = await LicenseGenerator.autoRenewExpiringLicenses(7, 365, 'auto-renewal-system');

      expect(mockLicense.find).toHaveBeenCalledWith({
        status: 'active',
        expiresAt: { $lte: expect.any(Date) },
        type: { $in: ['professional', 'enterprise', 'unlimited'] }
      });
      expect(LicenseGenerator.renewLicense).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');

      // Restore original method
      LicenseGenerator.renewLicense = originalRenewLicense;
    });

    it('should handle renewal failures gracefully', async () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 5);

      const mockLicenses = [
        {
          licenseNumber: 'HRSM-2025-123456',
          tenantId: 'tenant-123',
          type: 'professional',
          status: 'active',
          expiresAt: expiringDate
        }
      ];

      mockLicense.find.mockResolvedValue(mockLicenses);
      
      // Mock renewal failure
      const originalRenewLicense = LicenseGenerator.renewLicense;
      LicenseGenerator.renewLicense = jest.fn().mockRejectedValue(new Error('Renewal failed'));

      const results = await LicenseGenerator.autoRenewExpiringLicenses(7, 365);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBe('Renewal failed');

      // Restore original method
      LicenseGenerator.renewLicense = originalRenewLicense;
    });
  });

  describe('updateExpiredLicenses', () => {
    it('should update status of expired licenses', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // Expired 10 days ago

      const mockExpiredLicenses = [
        createMockLicense({
          licenseNumber: 'HRSM-2025-123456',
          tenantId: 'tenant-123',
          status: 'active',
          expiresAt: pastDate,
          notes: 'Original notes'
        }),
        createMockLicense({
          licenseNumber: 'HRSM-2025-789012',
          tenantId: 'tenant-456',
          status: 'active',
          expiresAt: pastDate,
          notes: 'Original notes'
        })
      ];

      mockLicense.find.mockResolvedValue(mockExpiredLicenses);

      const results = await LicenseGenerator.updateExpiredLicenses();

      expect(mockLicense.find).toHaveBeenCalledWith({
        status: 'active',
        expiresAt: { $lt: expect.any(Date) }
      });
      expect(mockExpiredLicenses[0].status).toBe('expired');
      expect(mockExpiredLicenses[1].status).toBe('expired');
      expect(mockExpiredLicenses[0].save).toHaveBeenCalled();
      expect(mockExpiredLicenses[1].save).toHaveBeenCalled();
      expect(mockAuditService.logOperation).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('expired');
      expect(results[1].status).toBe('expired');
    });
  });

  describe('getLicenseStatistics', () => {
    it('should return license statistics', async () => {
      const mockStatusStats = [
        { _id: 'active', count: 10, totalUsers: 500, totalStorage: 50000, avgUsers: 50, avgStorage: 5000 },
        { _id: 'expired', count: 3, totalUsers: 150, totalStorage: 15000, avgUsers: 50, avgStorage: 5000 }
      ];

      const mockTypeStats = [
        { _id: 'professional', count: 8, activeCount: 6 },
        { _id: 'enterprise', count: 5, activeCount: 4 }
      ];

      const mockExpiryStats = [
        { _id: null, expiringIn7Days: 2, expiringIn30Days: 5 }
      ];

      mockLicense.aggregate
        .mockResolvedValueOnce(mockStatusStats)
        .mockResolvedValueOnce(mockTypeStats)
        .mockResolvedValueOnce(mockExpiryStats);

      const result = await LicenseGenerator.getLicenseStatistics();

      expect(mockLicense.aggregate).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('statusStats', mockStatusStats);
      expect(result).toHaveProperty('typeStats', mockTypeStats);
      expect(result).toHaveProperty('expiryStats');
      expect(result.expiryStats.expiringIn7Days).toBe(2);
      expect(result.expiryStats.expiringIn30Days).toBe(5);
      expect(result).toHaveProperty('generatedAt');
    });

    it('should return statistics for specific tenant', async () => {
      mockLicense.aggregate.mockResolvedValue([]);

      await LicenseGenerator.getLicenseStatistics('tenant-123');

      expect(mockLicense.aggregate).toHaveBeenCalledWith([
        { $match: { tenantId: 'tenant-123' } },
        expect.any(Object)
      ]);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mockLicenseInstance = createMockLicense({
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        type: 'professional',
        features: {
          modules: ['hr-core', 'payroll'],
          maxUsers: 100,
          maxStorage: 20480,
          maxAPICallsPerMonth: 200000
        },
        binding: {
          boundDomain: 'test.company.com',
          machineHash: 'test-hash'
        },
        expiresAt: new Date('2025-12-31')
      });

      const token = LicenseGenerator.generateToken(mockLicenseInstance);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('generateLicenseNumber', () => {
    it('should generate a unique license number', () => {
      const licenseNumber = LicenseGenerator.constructor.generateLicenseNumber();

      expect(typeof licenseNumber).toBe('string');
      expect(licenseNumber).toMatch(/^HRSM-[A-F0-9]+-[A-F0-9]+$/);
    });

    it('should generate different license numbers on subsequent calls', () => {
      const licenseNumber1 = LicenseGenerator.constructor.generateLicenseNumber();
      const licenseNumber2 = LicenseGenerator.constructor.generateLicenseNumber();

      expect(licenseNumber1).not.toBe(licenseNumber2);
    });
  });
});