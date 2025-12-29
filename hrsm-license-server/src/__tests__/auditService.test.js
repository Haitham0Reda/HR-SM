import { jest } from '@jest/globals';

// Mock dependencies before importing the service
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockAuditLog = {
  save: jest.fn(),
  find: jest.fn(),
  sort: jest.fn(),
  limit: jest.fn(),
  skip: jest.fn(),
  lean: jest.fn(),
  aggregate: jest.fn()
};

const mockMongoose = {
  Schema: jest.fn(),
  model: jest.fn(() => mockAuditLog)
};

// Mock the modules
jest.mock('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.mock('mongoose', () => mockMongoose);

// Import after mocking
const auditService = (await import('../services/auditService.js')).default;

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset method chaining
    mockAuditLog.find.mockReturnValue(mockAuditLog);
    mockAuditLog.sort.mockReturnValue(mockAuditLog);
    mockAuditLog.limit.mockReturnValue(mockAuditLog);
    mockAuditLog.skip.mockReturnValue(mockAuditLog);
    mockAuditLog.lean.mockResolvedValue([]);
    mockAuditLog.aggregate.mockResolvedValue([]);
    mockAuditLog.save.mockResolvedValue(true);
  });

  describe('logOperation', () => {
    it('should log operation successfully', async () => {
      await auditService.logOperation(
        'create',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        { type: 'professional' },
        { ipAddress: '192.168.1.100' },
        'admin-user'
      );

      expect(mockLogger.info).toHaveBeenCalledWith('License operation audit', expect.objectContaining({
        operation: 'create',
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        result: 'success'
      }));
    });

    it('should handle audit logging errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockAuditLog.save.mockRejectedValue(mockError);

      await auditService.logOperation(
        'create',
        'HRSM-2025-123456',
        'tenant-123',
        'success'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create audit log entry', expect.objectContaining({
        operation: 'create',
        licenseNumber: 'HRSM-2025-123456',
        error: 'Database connection failed'
      }));
    });

    it('should use appropriate log level based on result', async () => {
      // Test error result
      await auditService.logOperation(
        'validate',
        'HRSM-2025-123456',
        'tenant-123',
        'failure',
        {},
        {},
        'system',
        'License expired'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('License operation audit', expect.objectContaining({
        result: 'failure',
        errorMessage: 'License expired'
      }));

      // Test warning result
      await auditService.logOperation(
        'validate',
        'HRSM-2025-123456',
        'tenant-123',
        'warning'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith('License operation audit', expect.objectContaining({
        result: 'warning'
      }));
    });
  });

  describe('logLicenseCreation', () => {
    it('should log license creation with proper details', async () => {
      const licenseData = {
        type: 'professional',
        features: { modules: ['hr-core', 'payroll'] },
        expiresAt: new Date('2025-12-31'),
        maxActivations: 2
      };

      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseCreation(
        'HRSM-2025-123456',
        'tenant-123',
        licenseData,
        'admin-user'
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'create',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        {
          type: 'professional',
          features: { modules: ['hr-core', 'payroll'] },
          expiresAt: new Date('2025-12-31'),
          maxActivations: 2
        },
        {},
        'admin-user'
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('logLicenseValidation', () => {
    it('should log successful validation', async () => {
      const validationResult = {
        valid: true,
        code: null
      };

      const metadata = {
        machineId: 'test-machine',
        domain: 'test.company.com',
        ipAddress: '192.168.1.100'
      };

      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseValidation(
        'HRSM-2025-123456',
        'tenant-123',
        validationResult,
        metadata
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'validate',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        {
          valid: true,
          code: null,
          machineId: 'test-machine',
          domain: 'test.company.com'
        },
        metadata,
        'system',
        undefined
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });

    it('should log failed validation', async () => {
      const validationResult = {
        valid: false,
        code: 'LICENSE_EXPIRED',
        error: 'License has expired'
      };

      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseValidation(
        'HRSM-2025-123456',
        'tenant-123',
        validationResult
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'validate',
        'HRSM-2025-123456',
        'tenant-123',
        'failure',
        {
          valid: false,
          code: 'LICENSE_EXPIRED',
          machineId: undefined,
          domain: undefined
        },
        {},
        'system',
        'License has expired'
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('logLicenseRenewal', () => {
    it('should log license renewal with date calculations', async () => {
      const oldExpiryDate = new Date('2025-06-30');
      const newExpiryDate = new Date('2026-06-30');

      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseRenewal(
        'HRSM-2025-123456',
        'tenant-123',
        oldExpiryDate,
        newExpiryDate,
        'admin-user'
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'renew',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        {
          oldExpiryDate,
          newExpiryDate,
          extensionDays: 365 // Approximately 1 year
        },
        {},
        'admin-user'
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('logLicenseRevocation', () => {
    it('should log license revocation with reason', async () => {
      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseRevocation(
        'HRSM-2025-123456',
        'tenant-123',
        'Policy violation',
        'admin-user'
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'revoke',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        { reason: 'Policy violation' },
        {},
        'admin-user'
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('logLicenseActivation', () => {
    it('should log new license activation', async () => {
      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logLicenseActivation(
        'HRSM-2025-123456',
        'tenant-123',
        'test-machine-id',
        '192.168.1.100',
        'new'
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'activate',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        {
          activationType: 'new',
          machineId: 'test-machine-id',
          ipAddress: '192.168.1.100'
        },
        {
          machineId: 'test-machine-id',
          ipAddress: '192.168.1.100'
        }
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('logUsageUpdate', () => {
    it('should log usage tracking updates', async () => {
      const usageData = {
        currentUsers: 75,
        currentStorage: 15360,
        apiCallsThisMonth: 125000
      };

      const originalLogOperation = auditService.logOperation;
      auditService.logOperation = jest.fn().mockResolvedValue();

      await auditService.logUsageUpdate(
        'HRSM-2025-123456',
        'tenant-123',
        usageData
      );

      expect(auditService.logOperation).toHaveBeenCalledWith(
        'usage_update',
        'HRSM-2025-123456',
        'tenant-123',
        'success',
        {
          currentUsers: 75,
          currentStorage: 15360,
          apiCallsThisMonth: 125000
        }
      );

      // Restore original method
      auditService.logOperation = originalLogOperation;
    });
  });

  describe('getLicenseAuditLogs', () => {
    it('should retrieve audit logs for a specific license', async () => {
      const mockLogs = [
        {
          operation: 'create',
          licenseNumber: 'HRSM-2025-123456',
          result: 'success',
          timestamp: new Date()
        },
        {
          operation: 'validate',
          licenseNumber: 'HRSM-2025-123456',
          result: 'success',
          timestamp: new Date()
        }
      ];

      mockAuditLog.lean.mockResolvedValue(mockLogs);

      const result = await auditService.getLicenseAuditLogs('HRSM-2025-123456', 50, 10);

      expect(mockAuditLog.find).toHaveBeenCalledWith({ licenseNumber: 'HRSM-2025-123456' });
      expect(mockAuditLog.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockAuditLog.limit).toHaveBeenCalledWith(50);
      expect(mockAuditLog.skip).toHaveBeenCalledWith(10);
      expect(result).toBe(mockLogs);
    });
  });

  describe('getTenantAuditLogs', () => {
    it('should retrieve audit logs for a specific tenant', async () => {
      const mockLogs = [
        {
          operation: 'create',
          tenantId: 'tenant-123',
          result: 'success',
          timestamp: new Date()
        }
      ];

      mockAuditLog.lean.mockResolvedValue(mockLogs);

      const result = await auditService.getTenantAuditLogs('tenant-123');

      expect(mockAuditLog.find).toHaveBeenCalledWith({ tenantId: 'tenant-123' });
      expect(mockAuditLog.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockAuditLog.limit).toHaveBeenCalledWith(100); // Default limit
      expect(mockAuditLog.skip).toHaveBeenCalledWith(0); // Default offset
      expect(result).toBe(mockLogs);
    });
  });

  describe('getOperationAuditLogs', () => {
    it('should retrieve audit logs for a specific operation type', async () => {
      const mockLogs = [
        {
          operation: 'validate',
          result: 'success',
          timestamp: new Date()
        },
        {
          operation: 'validate',
          result: 'failure',
          timestamp: new Date()
        }
      ];

      mockAuditLog.lean.mockResolvedValue(mockLogs);

      const result = await auditService.getOperationAuditLogs('validate', 25, 5);

      expect(mockAuditLog.find).toHaveBeenCalledWith({ operation: 'validate' });
      expect(mockAuditLog.limit).toHaveBeenCalledWith(25);
      expect(mockAuditLog.skip).toHaveBeenCalledWith(5);
      expect(result).toBe(mockLogs);
    });
  });

  describe('getAuditStatistics', () => {
    it('should return audit statistics for date range', async () => {
      const mockStats = [
        {
          _id: 'create',
          results: [
            { result: 'success', count: 10 },
            { result: 'failure', count: 2 }
          ],
          total: 12
        },
        {
          _id: 'validate',
          results: [
            { result: 'success', count: 150 },
            { result: 'failure', count: 25 }
          ],
          total: 175
        }
      ];

      mockAuditLog.aggregate.mockResolvedValue(mockStats);

      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const result = await auditService.getAuditStatistics(startDate, endDate);

      expect(mockAuditLog.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        expect.any(Object),
        expect.any(Object)
      ]);
      expect(result).toBe(mockStats);
    });
  });
});