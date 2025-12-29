import { jest } from '@jest/globals';

// Mock dependencies before importing the service
const mockLicense = jest.fn();
mockLicense.findOne = jest.fn();

const mockAuditService = {
  logLicenseValidation: jest.fn(),
  logLicenseActivation: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockJwt = {
  verify: jest.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor(message) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor(message, expiredAt) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  }
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

jest.mock('jsonwebtoken', () => mockJwt);

// Import after mocking
const ValidationService = (await import('../services/validationService.js')).default;

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should validate a valid token successfully', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123',
        type: 'professional',
        features: ['hr-core', 'payroll'],
        maxUsers: 100,
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        tenantName: 'Test Company',
        type: 'professional',
        status: 'active',
        isExpired: false,
        features: {
          modules: ['hr-core', 'payroll'],
          maxUsers: 100,
          maxStorage: 20480,
          maxAPICallsPerMonth: 200000
        },
        expiresAt: new Date('2025-12-31'),
        activations: [],
        maxActivations: 2,
        usage: {
          lastValidatedAt: new Date(),
          totalValidations: 5
        },
        save: jest.fn().mockResolvedValue(true)
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      const result = await ValidationService.validateToken('valid-jwt-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', expect.any(String), {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
      });
      expect(mockLicense.findOne).toHaveBeenCalledWith({ licenseNumber: 'HRSM-2025-123456' });
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseValidation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        expect.objectContaining({ valid: true }),
        {}
      );
      expect(result.valid).toBe(true);
      expect(result.license.licenseNumber).toBe('HRSM-2025-123456');
      expect(result.decoded).toBe(mockDecoded);
    });

    it('should reject token for non-existent license', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-INVALID',
        tid: 'tenant-123'
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(null);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      const result = await ValidationService.validateToken('invalid-jwt-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License not found in database');
      expect(result.code).toBe('LICENSE_NOT_FOUND');
      expect(mockAuditService.logLicenseValidation).toHaveBeenCalledWith(
        'HRSM-2025-INVALID',
        'tenant-123',
        expect.objectContaining({ valid: false }),
        {}
      );
    });

    it('should reject token for inactive license', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123'
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'suspended',
        isExpired: false
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      const result = await ValidationService.validateToken('suspended-license-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License is suspended');
      expect(result.code).toBe('LICENSE_INACTIVE');
      expect(result.status).toBe('suspended');
    });

    it('should reject token for expired license', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123'
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'active',
        isExpired: true,
        expiresAt: new Date('2024-12-31'),
        save: jest.fn().mockResolvedValue(true)
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      const result = await ValidationService.validateToken('expired-license-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License has expired');
      expect(result.code).toBe('LICENSE_EXPIRED');
      expect(mockLicenseInstance.status).toBe('expired');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
    });

    it('should validate machine binding when provided', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123'
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'active',
        isExpired: false,
        features: { modules: ['hr-core'] },
        expiresAt: new Date('2025-12-31'),
        activations: [],
        maxActivations: 2,
        usage: { totalValidations: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      // Mock validateMachineBinding to return valid
      const originalValidateMachineBinding = ValidationService.validateMachineBinding;
      ValidationService.validateMachineBinding = jest.fn().mockResolvedValue({ valid: true });

      // Mock trackActivation
      const originalTrackActivation = ValidationService.trackActivation;
      ValidationService.trackActivation = jest.fn().mockResolvedValue(mockLicenseInstance);

      const options = {
        machineId: 'test-machine-id',
        ipAddress: '192.168.1.100'
      };

      const result = await ValidationService.validateToken('valid-token', options);

      expect(ValidationService.validateMachineBinding).toHaveBeenCalledWith(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.100'
      );
      expect(ValidationService.trackActivation).toHaveBeenCalledWith(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.100'
      );
      expect(result.valid).toBe(true);

      // Restore original methods
      ValidationService.validateMachineBinding = originalValidateMachineBinding;
      ValidationService.trackActivation = originalTrackActivation;
    });

    it('should validate domain binding when provided', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123'
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        status: 'active',
        isExpired: false,
        binding: {
          boundDomain: 'test.company.com'
        },
        features: { modules: ['hr-core'] },
        expiresAt: new Date('2025-12-31'),
        activations: [],
        maxActivations: 2,
        usage: { totalValidations: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockLicense.findOne.mockResolvedValue(mockLicenseInstance);
      mockAuditService.logLicenseValidation.mockResolvedValue();

      const options = {
        domain: 'wrong.domain.com'
      };

      const result = await ValidationService.validateToken('valid-token', options);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Domain mismatch');
      expect(result.code).toBe('DOMAIN_MISMATCH');
      expect(result.expectedDomain).toBe('test.company.com');
      expect(result.providedDomain).toBe('wrong.domain.com');
    });

    it('should handle JWT verification errors', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.JsonWebTokenError('Invalid signature');
      });

      const result = await ValidationService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
      expect(result.code).toBe('INVALID_SIGNATURE');
    });

    it('should handle token expiry errors', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.TokenExpiredError('Token expired', new Date());
      });

      const result = await ValidationService.validateToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
      expect(result.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('validateMachineBinding', () => {
    it('should validate machine binding successfully', async () => {
      const mockLicenseInstance = {
        binding: {
          machineHash: 'expected-hash',
          ipWhitelist: ['192.168.1.100', '192.168.1.101']
        }
      };

      // Mock crypto.createHash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('expected-hash')
      };
      
      // Mock crypto module
      const originalCrypto = await import('crypto');
      const mockCrypto = {
        ...originalCrypto,
        createHash: jest.fn().mockReturnValue(mockHash)
      };
      
      // Temporarily replace the crypto import
      jest.doMock('crypto', () => mockCrypto);

      const result = await ValidationService.validateMachineBinding(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.100'
      );

      expect(result.valid).toBe(true);
    });

    it('should reject machine binding mismatch', async () => {
      const mockLicenseInstance = {
        binding: {
          machineHash: 'expected-hash',
          ipWhitelist: []
        }
      };

      // Mock crypto.createHash to return different hash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-hash')
      };
      
      const originalCrypto = await import('crypto');
      const mockCrypto = {
        ...originalCrypto,
        createHash: jest.fn().mockReturnValue(mockHash)
      };
      
      jest.doMock('crypto', () => mockCrypto);

      const result = await ValidationService.validateMachineBinding(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.100'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Machine ID mismatch');
      expect(result.code).toBe('MACHINE_MISMATCH');
    });

    it('should reject IP not in whitelist', async () => {
      const mockLicenseInstance = {
        binding: {
          machineHash: null,
          ipWhitelist: ['192.168.1.100', '192.168.1.101']
        }
      };

      const result = await ValidationService.validateMachineBinding(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.200'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address not whitelisted');
      expect(result.code).toBe('IP_NOT_WHITELISTED');
      expect(result.ipAddress).toBe('192.168.1.200');
    });

    it('should pass validation when no binding restrictions', async () => {
      const mockLicenseInstance = {
        binding: {
          machineHash: null,
          ipWhitelist: []
        }
      };

      const result = await ValidationService.validateMachineBinding(
        mockLicenseInstance,
        'test-machine-id',
        '192.168.1.100'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('trackActivation', () => {
    it('should track new activation', async () => {
      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [],
        maxActivations: 2,
        save: jest.fn().mockResolvedValue(true)
      };

      mockAuditService.logLicenseActivation.mockResolvedValue();

      const result = await ValidationService.trackActivation(
        mockLicenseInstance,
        'new-machine-id',
        '192.168.1.100'
      );

      expect(mockLicenseInstance.activations).toHaveLength(1);
      expect(mockLicenseInstance.activations[0].machineId).toBe('new-machine-id');
      expect(mockLicenseInstance.activations[0].ipAddress).toBe('192.168.1.100');
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseActivation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        'new-machine-id',
        '192.168.1.100',
        'new'
      );
      expect(result).toBe(mockLicenseInstance);
    });

    it('should update existing activation', async () => {
      const existingActivation = {
        machineId: 'existing-machine-id',
        activatedAt: new Date('2025-01-01'),
        lastValidatedAt: new Date('2025-01-01'),
        ipAddress: '192.168.1.100'
      };

      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [existingActivation],
        maxActivations: 2,
        save: jest.fn().mockResolvedValue(true)
      };

      mockAuditService.logLicenseActivation.mockResolvedValue();

      const result = await ValidationService.trackActivation(
        mockLicenseInstance,
        'existing-machine-id',
        '192.168.1.200'
      );

      expect(mockLicenseInstance.activations).toHaveLength(1);
      expect(mockLicenseInstance.activations[0].ipAddress).toBe('192.168.1.200');
      expect(mockLicenseInstance.activations[0].lastValidatedAt).toBeInstanceOf(Date);
      expect(mockLicenseInstance.save).toHaveBeenCalled();
      expect(mockAuditService.logLicenseActivation).toHaveBeenCalledWith(
        'HRSM-2025-123456',
        'tenant-123',
        'existing-machine-id',
        '192.168.1.200',
        'existing'
      );
      expect(result).toBe(mockLicenseInstance);
    });

    it('should reject activation when max activations reached', async () => {
      const mockLicenseInstance = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [
          { machineId: 'machine-1' },
          { machineId: 'machine-2' }
        ],
        maxActivations: 2
      };

      await expect(ValidationService.trackActivation(
        mockLicenseInstance,
        'machine-3',
        '192.168.1.100'
      )).rejects.toThrow('Maximum activations (2) reached for this license');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to track license activation', expect.any(Object));
    });
  });

  describe('quickValidateToken', () => {
    it('should quickly validate a valid token', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123',
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };

      mockJwt.verify.mockReturnValue(mockDecoded);

      const result = await ValidationService.quickValidateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.decoded).toBe(mockDecoded);
      expect(mockLicense.findOne).not.toHaveBeenCalled(); // Should not query database
    });

    it('should reject expired token in quick validation', async () => {
      const mockDecoded = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      mockJwt.verify.mockReturnValue(mockDecoded);

      const result = await ValidationService.quickValidateToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('validateFeature', () => {
    it('should validate feature access successfully', async () => {
      const mockValidationResult = {
        valid: true,
        license: {
          features: {
            modules: ['hr-core', 'payroll', 'reports']
          }
        }
      };

      // Mock the validateToken method
      const originalValidateToken = ValidationService.validateToken;
      ValidationService.validateToken = jest.fn().mockResolvedValue(mockValidationResult);

      const result = await ValidationService.validateFeature('valid-token', 'payroll');

      expect(ValidationService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(result.valid).toBe(true);
      expect(result.license).toBe(mockValidationResult.license);

      // Restore original method
      ValidationService.validateToken = originalValidateToken;
    });

    it('should reject feature not included in license', async () => {
      const mockValidationResult = {
        valid: true,
        license: {
          features: {
            modules: ['hr-core']
          }
        }
      };

      // Mock the validateToken method
      const originalValidateToken = ValidationService.validateToken;
      ValidationService.validateToken = jest.fn().mockResolvedValue(mockValidationResult);

      const result = await ValidationService.validateFeature('valid-token', 'payroll');

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Feature 'payroll' not included in license");
      expect(result.code).toBe('FEATURE_NOT_LICENSED');

      // Restore original method
      ValidationService.validateToken = originalValidateToken;
    });
  });

  describe('validateUsageLimits', () => {
    it('should validate usage within limits', async () => {
      const mockValidationResult = {
        valid: true,
        license: {
          features: {
            maxUsers: 100,
            maxStorage: 20480,
            maxAPICallsPerMonth: 200000
          }
        }
      };

      // Mock the validateToken method
      const originalValidateToken = ValidationService.validateToken;
      ValidationService.validateToken = jest.fn().mockResolvedValue(mockValidationResult);

      const result = await ValidationService.validateUsageLimits(
        'valid-token',
        50,    // currentUsers
        10240, // currentStorage
        100000 // currentAPICallsThisMonth
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);

      // Restore original method
      ValidationService.validateToken = originalValidateToken;
    });

    it('should detect usage limit violations', async () => {
      const mockValidationResult = {
        valid: true,
        license: {
          features: {
            maxUsers: 50,
            maxStorage: 10240,
            maxAPICallsPerMonth: 100000
          }
        }
      };

      // Mock the validateToken method
      const originalValidateToken = ValidationService.validateToken;
      ValidationService.validateToken = jest.fn().mockResolvedValue(mockValidationResult);

      const result = await ValidationService.validateUsageLimits(
        'valid-token',
        75,     // currentUsers (exceeds limit of 50)
        15360,  // currentStorage (exceeds limit of 10240)
        150000  // currentAPICallsThisMonth (exceeds limit of 100000)
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(3);
      expect(result.violations[0].type).toBe('users');
      expect(result.violations[1].type).toBe('storage');
      expect(result.violations[2].type).toBe('api_calls');

      // Restore original method
      ValidationService.validateToken = originalValidateToken;
    });
  });

  describe('generateMachineId', () => {
    it('should generate a machine ID', () => {
      const machineId = ValidationService.generateMachineId();

      expect(typeof machineId).toBe('string');
      expect(machineId).toHaveLength(64); // SHA256 hash length
    });

    it('should generate consistent machine ID for same system', () => {
      const machineId1 = ValidationService.generateMachineId();
      const machineId2 = ValidationService.generateMachineId();

      expect(machineId1).toBe(machineId2);
    });
  });

  describe('validateMachineFingerprint', () => {
    it('should validate matching fingerprints', () => {
      const fingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const result = ValidationService.validateMachineFingerprint(
        JSON.stringify(fingerprint),
        JSON.stringify(fingerprint),
        0.8
      );

      expect(result.valid).toBe(true);
      expect(result.similarity).toBe(1.0);
      expect(result.matches).toBe(4);
      expect(result.total).toBe(4);
    });

    it('should validate partial fingerprint matches above threshold', () => {
      const storedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const providedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i9' // Different CPU
      };

      const result = ValidationService.validateMachineFingerprint(
        JSON.stringify(providedFingerprint),
        JSON.stringify(storedFingerprint),
        0.7 // 70% threshold
      );

      expect(result.valid).toBe(true);
      expect(result.similarity).toBe(0.75); // 3 out of 4 match
    });

    it('should reject fingerprints below threshold', () => {
      const storedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const providedFingerprint = {
        hostname: 'different-machine',
        platform: 'windows',
        arch: 'x64',
        cpus: 'AMD Ryzen'
      };

      const result = ValidationService.validateMachineFingerprint(
        JSON.stringify(providedFingerprint),
        JSON.stringify(storedFingerprint),
        0.8 // 80% threshold
      );

      expect(result.valid).toBe(false);
      expect(result.similarity).toBe(0.25); // Only 1 out of 4 match
    });
  });

  describe('createMachineBindingHash', () => {
    it('should create a machine binding hash', () => {
      const machineInfo = {
        machineId: 'test-machine-id',
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64'
      };

      const hash = ValidationService.createMachineBindingHash(machineInfo);

      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA256 hash length
    });

    it('should create different hashes for different machine info', () => {
      const machineInfo1 = {
        machineId: 'machine-1',
        hostname: 'test-machine-1',
        platform: 'linux',
        arch: 'x64'
      };

      const machineInfo2 = {
        machineId: 'machine-2',
        hostname: 'test-machine-2',
        platform: 'linux',
        arch: 'x64'
      };

      const hash1 = ValidationService.createMachineBindingHash(machineInfo1);
      const hash2 = ValidationService.createMachineBindingHash(machineInfo2);

      expect(hash1).not.toBe(hash2);
    });
  });
});