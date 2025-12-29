import { jest } from '@jest/globals';

// Mock all external dependencies before importing
jest.mock('mongoose', () => ({
  Schema: jest.fn(),
  model: jest.fn(() => ({
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn()
  })),
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    close: jest.fn().mockResolvedValue(true),
    on: jest.fn()
  }
}));

jest.mock('../services/auditService.js', () => ({
  default: {
    logLicenseCreation: jest.fn().mockResolvedValue(),
    logLicenseRevocation: jest.fn().mockResolvedValue(),
    logLicenseRenewal: jest.fn().mockResolvedValue(),
    logLicenseSuspension: jest.fn().mockResolvedValue(),
    logLicenseReactivation: jest.fn().mockResolvedValue(),
    logUsageUpdate: jest.fn().mockResolvedValue(),
    logOperation: jest.fn().mockResolvedValue()
  }
}));

jest.mock('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Import the service after mocking
const LicenseGenerator = (await import('../services/licenseGenerator.js')).default;

describe('LicenseGenerator Service - Simple Tests', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mockLicense = {
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
      };

      const token = LicenseGenerator.generateToken(mockLicense);

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