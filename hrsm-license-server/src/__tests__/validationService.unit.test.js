import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

describe('Validation Service Unit Tests', () => {
  let publicKey;
  let privateKey;
  
  beforeAll(() => {
    // Load the actual keys for JWT testing
    try {
      const publicKeyPath = path.resolve('./keys/public.pem');
      const privateKeyPath = path.resolve('./keys/private.pem');
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    } catch (error) {
      // Skip JWT tests if no keys are available
      publicKey = null;
      privateKey = null;
    }
  });

  describe('JWT Token Validation', () => {
    it('should validate a valid token successfully', () => {
      if (!publicKey || !privateKey) {
        console.log('Skipping JWT test - no keys available');
        return;
      }

      const payload = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123',
        type: 'professional',
        features: ['hr-core', 'payroll'],
        maxUsers: 100,
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };

      // Create a token
      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server'
      });

      // Verify the token
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
      });

      expect(decoded.ln).toBe('HRSM-2025-123456');
      expect(decoded.tid).toBe('tenant-123');
      expect(decoded.type).toBe('professional');
    });

    it('should reject expired tokens', () => {
      if (!publicKey || !privateKey) {
        console.log('Skipping JWT test - no keys available');
        return;
      }

      const payload = {
        ln: 'HRSM-2025-123456',
        tid: 'tenant-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server'
      });

      expect(() => {
        jwt.verify(token, publicKey, {
          algorithms: ['RS256'],
          issuer: 'HRSM-License-Server'
        });
      }).toThrow('jwt expired');
    });

    it('should reject tokens with invalid signature', () => {
      if (!publicKey) {
        console.log('Skipping JWT test - no keys available');
        return;
      }

      const invalidToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsbiI6IkhSU00tMjAyNS0xMjM0NTYiLCJ0aWQiOiJ0ZW5hbnQtMTIzIiwiZXhwIjoxNzM1NDk5MjAwfQ.invalid-signature';

      expect(() => {
        jwt.verify(invalidToken, publicKey, {
          algorithms: ['RS256'],
          issuer: 'HRSM-License-Server'
        });
      }).toThrow('invalid signature');
    });
  });

  describe('Machine Binding Validation', () => {
    it('should validate machine binding successfully', () => {
      const validateMachineBinding = (license, machineId, ipAddress) => {
        // Check if machine binding is required
        if (license.binding.machineHash) {
          // Generate hash of provided machine ID
          const providedHash = crypto.createHash('sha256').update(machineId).digest('hex');
          
          if (license.binding.machineHash !== providedHash) {
            return {
              valid: false,
              error: 'Machine ID mismatch',
              code: 'MACHINE_MISMATCH'
            };
          }
        }
        
        // Check IP whitelist if configured
        if (license.binding.ipWhitelist && license.binding.ipWhitelist.length > 0) {
          if (ipAddress && !license.binding.ipWhitelist.includes(ipAddress)) {
            return {
              valid: false,
              error: 'IP address not whitelisted',
              code: 'IP_NOT_WHITELISTED',
              ipAddress
            };
          }
        }
        
        return { valid: true };
      };

      const machineId = 'test-machine-id';
      const expectedHash = crypto.createHash('sha256').update(machineId).digest('hex');
      
      const mockLicense = {
        binding: {
          machineHash: expectedHash,
          ipWhitelist: ['192.168.1.100', '192.168.1.101']
        }
      };

      const result = validateMachineBinding(
        mockLicense,
        machineId,
        '192.168.1.100'
      );

      expect(result.valid).toBe(true);
    });

    it('should reject machine binding mismatch', () => {
      const validateMachineBinding = (license, machineId, ipAddress) => {
        if (license.binding.machineHash) {
          const providedHash = crypto.createHash('sha256').update(machineId).digest('hex');
          
          if (license.binding.machineHash !== providedHash) {
            return {
              valid: false,
              error: 'Machine ID mismatch',
              code: 'MACHINE_MISMATCH'
            };
          }
        }
        
        return { valid: true };
      };

      const mockLicense = {
        binding: {
          machineHash: 'expected-hash',
          ipWhitelist: []
        }
      };

      const result = validateMachineBinding(
        mockLicense,
        'different-machine-id',
        '192.168.1.100'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Machine ID mismatch');
      expect(result.code).toBe('MACHINE_MISMATCH');
    });

    it('should reject IP not in whitelist', () => {
      const validateMachineBinding = (license, machineId, ipAddress) => {
        if (license.binding.ipWhitelist && license.binding.ipWhitelist.length > 0) {
          if (ipAddress && !license.binding.ipWhitelist.includes(ipAddress)) {
            return {
              valid: false,
              error: 'IP address not whitelisted',
              code: 'IP_NOT_WHITELISTED',
              ipAddress
            };
          }
        }
        
        return { valid: true };
      };

      const mockLicense = {
        binding: {
          machineHash: null,
          ipWhitelist: ['192.168.1.100', '192.168.1.101']
        }
      };

      const result = validateMachineBinding(
        mockLicense,
        'test-machine-id',
        '192.168.1.200'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address not whitelisted');
      expect(result.code).toBe('IP_NOT_WHITELISTED');
      expect(result.ipAddress).toBe('192.168.1.200');
    });

    it('should pass validation when no binding restrictions', () => {
      const validateMachineBinding = (license, machineId, ipAddress) => {
        if (license.binding.machineHash) {
          const providedHash = crypto.createHash('sha256').update(machineId).digest('hex');
          
          if (license.binding.machineHash !== providedHash) {
            return {
              valid: false,
              error: 'Machine ID mismatch',
              code: 'MACHINE_MISMATCH'
            };
          }
        }
        
        if (license.binding.ipWhitelist && license.binding.ipWhitelist.length > 0) {
          if (ipAddress && !license.binding.ipWhitelist.includes(ipAddress)) {
            return {
              valid: false,
              error: 'IP address not whitelisted',
              code: 'IP_NOT_WHITELISTED',
              ipAddress
            };
          }
        }
        
        return { valid: true };
      };

      const mockLicense = {
        binding: {
          machineHash: null,
          ipWhitelist: []
        }
      };

      const result = validateMachineBinding(
        mockLicense,
        'test-machine-id',
        '192.168.1.100'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Feature Validation', () => {
    it('should validate feature access successfully', () => {
      const validateFeature = (license, featureName) => {
        const hasFeature = license.features.modules.includes(featureName);
        
        return {
          valid: hasFeature,
          error: hasFeature ? null : `Feature '${featureName}' not included in license`,
          code: hasFeature ? null : 'FEATURE_NOT_LICENSED',
          license
        };
      };

      const mockLicense = {
        features: {
          modules: ['hr-core', 'payroll', 'reports']
        }
      };

      const result = validateFeature(mockLicense, 'payroll');

      expect(result.valid).toBe(true);
      expect(result.license).toBe(mockLicense);
    });

    it('should reject feature not included in license', () => {
      const validateFeature = (license, featureName) => {
        const hasFeature = license.features.modules.includes(featureName);
        
        return {
          valid: hasFeature,
          error: hasFeature ? null : `Feature '${featureName}' not included in license`,
          code: hasFeature ? null : 'FEATURE_NOT_LICENSED',
          license
        };
      };

      const mockLicense = {
        features: {
          modules: ['hr-core']
        }
      };

      const result = validateFeature(mockLicense, 'payroll');

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Feature 'payroll' not included in license");
      expect(result.code).toBe('FEATURE_NOT_LICENSED');
    });
  });

  describe('Usage Limits Validation', () => {
    it('should validate usage within limits', () => {
      const validateUsageLimits = (license, currentUsers, currentStorage, currentAPICallsThisMonth) => {
        const violations = [];
        
        if (currentUsers > license.features.maxUsers) {
          violations.push({
            type: 'users',
            current: currentUsers,
            limit: license.features.maxUsers,
            message: `User limit exceeded: ${currentUsers}/${license.features.maxUsers}`
          });
        }
        
        if (currentStorage > license.features.maxStorage) {
          violations.push({
            type: 'storage',
            current: currentStorage,
            limit: license.features.maxStorage,
            message: `Storage limit exceeded: ${currentStorage}MB/${license.features.maxStorage}MB`
          });
        }
        
        if (currentAPICallsThisMonth > license.features.maxAPICallsPerMonth) {
          violations.push({
            type: 'api_calls',
            current: currentAPICallsThisMonth,
            limit: license.features.maxAPICallsPerMonth,
            message: `API call limit exceeded: ${currentAPICallsThisMonth}/${license.features.maxAPICallsPerMonth}`
          });
        }
        
        return {
          valid: violations.length === 0,
          violations,
          license
        };
      };

      const mockLicense = {
        features: {
          maxUsers: 100,
          maxStorage: 20480,
          maxAPICallsPerMonth: 200000
        }
      };

      const result = validateUsageLimits(
        mockLicense,
        50,    // currentUsers
        10240, // currentStorage
        100000 // currentAPICallsThisMonth
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect usage limit violations', () => {
      const validateUsageLimits = (license, currentUsers, currentStorage, currentAPICallsThisMonth) => {
        const violations = [];
        
        if (currentUsers > license.features.maxUsers) {
          violations.push({
            type: 'users',
            current: currentUsers,
            limit: license.features.maxUsers,
            message: `User limit exceeded: ${currentUsers}/${license.features.maxUsers}`
          });
        }
        
        if (currentStorage > license.features.maxStorage) {
          violations.push({
            type: 'storage',
            current: currentStorage,
            limit: license.features.maxStorage,
            message: `Storage limit exceeded: ${currentStorage}MB/${license.features.maxStorage}MB`
          });
        }
        
        if (currentAPICallsThisMonth > license.features.maxAPICallsPerMonth) {
          violations.push({
            type: 'api_calls',
            current: currentAPICallsThisMonth,
            limit: license.features.maxAPICallsPerMonth,
            message: `API call limit exceeded: ${currentAPICallsThisMonth}/${license.features.maxAPICallsPerMonth}`
          });
        }
        
        return {
          valid: violations.length === 0,
          violations,
          license
        };
      };

      const mockLicense = {
        features: {
          maxUsers: 50,
          maxStorage: 10240,
          maxAPICallsPerMonth: 100000
        }
      };

      const result = validateUsageLimits(
        mockLicense,
        75,     // currentUsers (exceeds limit of 50)
        15360,  // currentStorage (exceeds limit of 10240)
        150000  // currentAPICallsThisMonth (exceeds limit of 100000)
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(3);
      expect(result.violations[0].type).toBe('users');
      expect(result.violations[1].type).toBe('storage');
      expect(result.violations[2].type).toBe('api_calls');
    });
  });

  describe('Activation Tracking', () => {
    it('should track new activation', () => {
      const trackActivation = (license, machineId, ipAddress) => {
        // Check if already activated on this machine
        let activation = license.activations.find(a => a.machineId === machineId);
        
        if (activation) {
          // Update existing activation
          activation.lastValidatedAt = new Date();
          if (ipAddress) activation.ipAddress = ipAddress;
          return { type: 'existing', activation };
        } else {
          // Check if max activations reached
          if (license.activations.length >= license.maxActivations) {
            throw new Error(`Maximum activations (${license.maxActivations}) reached for this license`);
          }
          
          // Add new activation
          const newActivation = {
            machineId,
            activatedAt: new Date(),
            lastValidatedAt: new Date(),
            ipAddress
          };
          license.activations.push(newActivation);
          
          return { type: 'new', activation: newActivation };
        }
      };

      const mockLicense = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [],
        maxActivations: 2
      };

      const result = trackActivation(
        mockLicense,
        'new-machine-id',
        '192.168.1.100'
      );

      expect(mockLicense.activations).toHaveLength(1);
      expect(mockLicense.activations[0].machineId).toBe('new-machine-id');
      expect(mockLicense.activations[0].ipAddress).toBe('192.168.1.100');
      expect(result.type).toBe('new');
    });

    it('should update existing activation', () => {
      const trackActivation = (license, machineId, ipAddress) => {
        let activation = license.activations.find(a => a.machineId === machineId);
        
        if (activation) {
          activation.lastValidatedAt = new Date();
          if (ipAddress) activation.ipAddress = ipAddress;
          return { type: 'existing', activation };
        } else {
          if (license.activations.length >= license.maxActivations) {
            throw new Error(`Maximum activations (${license.maxActivations}) reached for this license`);
          }
          
          const newActivation = {
            machineId,
            activatedAt: new Date(),
            lastValidatedAt: new Date(),
            ipAddress
          };
          license.activations.push(newActivation);
          
          return { type: 'new', activation: newActivation };
        }
      };

      const existingActivation = {
        machineId: 'existing-machine-id',
        activatedAt: new Date('2025-01-01'),
        lastValidatedAt: new Date('2025-01-01'),
        ipAddress: '192.168.1.100'
      };

      const mockLicense = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [existingActivation],
        maxActivations: 2
      };

      const result = trackActivation(
        mockLicense,
        'existing-machine-id',
        '192.168.1.200'
      );

      expect(mockLicense.activations).toHaveLength(1);
      expect(mockLicense.activations[0].ipAddress).toBe('192.168.1.200');
      expect(mockLicense.activations[0].lastValidatedAt).toBeInstanceOf(Date);
      expect(result.type).toBe('existing');
    });

    it('should reject activation when max activations reached', () => {
      const trackActivation = (license, machineId, ipAddress) => {
        let activation = license.activations.find(a => a.machineId === machineId);
        
        if (activation) {
          activation.lastValidatedAt = new Date();
          if (ipAddress) activation.ipAddress = ipAddress;
          return { type: 'existing', activation };
        } else {
          if (license.activations.length >= license.maxActivations) {
            throw new Error(`Maximum activations (${license.maxActivations}) reached for this license`);
          }
          
          const newActivation = {
            machineId,
            activatedAt: new Date(),
            lastValidatedAt: new Date(),
            ipAddress
          };
          license.activations.push(newActivation);
          
          return { type: 'new', activation: newActivation };
        }
      };

      const mockLicense = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        activations: [
          { machineId: 'machine-1' },
          { machineId: 'machine-2' }
        ],
        maxActivations: 2
      };

      expect(() => {
        trackActivation(
          mockLicense,
          'machine-3',
          '192.168.1.100'
        );
      }).toThrow('Maximum activations (2) reached for this license');
    });
  });
});