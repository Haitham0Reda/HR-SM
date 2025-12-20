import fc from 'fast-check';
import { describe, test, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import License from '../models/License.js';
import LicenseGenerator from '../services/licenseGenerator.js';
import ValidationService from '../services/validationService.js';

describe('License Activation Limits Properties', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clean database before each test
    await License.deleteMany({});
  });
  
  test('Property 13: License Activation Limits', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 13: License Activation Limits
     * Validates: Requirements 4.3
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
        maxActivations: fc.integer({ min: 1, max: 5 }),
        machineIds: fc.array(fc.string({ minLength: 32, maxLength: 64 }), { minLength: 1, maxLength: 10 })
      }),
      async (licenseData) => {
        // Ensure we have unique machine IDs
        const uniqueMachineIds = [...new Set(licenseData.machineIds)];
        if (uniqueMachineIds.length === 0) return; // Skip if no valid machine IDs
        
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          modules: ['hr-core'],
          expiresAt,
          maxUsers: 100,
          maxStorage: 5120,
          maxAPICallsPerMonth: 50000,
          maxActivations: licenseData.maxActivations,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Test activation within limits
        const successfulActivations = [];
        const expectedSuccessfulCount = Math.min(licenseData.maxActivations, uniqueMachineIds.length);
        
        // Activate up to the maximum allowed
        for (let i = 0; i < expectedSuccessfulCount; i++) {
          const machineId = uniqueMachineIds[i];
          const ipAddress = `192.168.1.${i + 1}`;
          
          const validationResult = await ValidationService.validateToken(token, {
            machineId,
            ipAddress
          });
          
          // Should succeed within limits
          expect(validationResult.valid).toBe(true);
          expect(validationResult.license.licenseNumber).toBe(license.licenseNumber);
          
          successfulActivations.push(machineId);
          
          // Verify activation was tracked
          const updatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
          expect(updatedLicense.activations).toHaveLength(i + 1);
          expect(updatedLicense.activations.some(a => a.machineId === machineId)).toBe(true);
        }
        
        // Test activation beyond limits (if we have more machine IDs than max activations)
        if (uniqueMachineIds.length > licenseData.maxActivations) {
          const excessMachineId = uniqueMachineIds[licenseData.maxActivations];
          const excessIpAddress = `192.168.1.${licenseData.maxActivations + 1}`;
          
          // This should fail due to activation limit
          const excessValidation = await ValidationService.validateToken(token, {
            machineId: excessMachineId,
            ipAddress: excessIpAddress
          });
          
          expect(excessValidation.valid).toBe(false);
          expect(excessValidation.code).toBe('MAX_ACTIVATIONS_REACHED');
          expect(excessValidation.currentActivations).toBe(licenseData.maxActivations);
          expect(excessValidation.maxActivations).toBe(licenseData.maxActivations);
          
          // Verify activation count didn't increase
          const finalLicense = await License.findOne({ licenseNumber: license.licenseNumber });
          expect(finalLicense.activations).toHaveLength(licenseData.maxActivations);
          expect(finalLicense.activations.every(a => a.machineId !== excessMachineId)).toBe(true);
        }
        
        // Test re-activation on same machine (should succeed without increasing count)
        if (successfulActivations.length > 0) {
          const existingMachineId = successfulActivations[0];
          const newIpAddress = '10.0.0.1';
          
          const reactivationResult = await ValidationService.validateToken(token, {
            machineId: existingMachineId,
            ipAddress: newIpAddress
          });
          
          // Should succeed (reusing existing activation)
          expect(reactivationResult.valid).toBe(true);
          
          // Activation count should remain the same
          const reactivatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
          expect(reactivatedLicense.activations).toHaveLength(expectedSuccessfulCount);
          
          // IP address should be updated
          const updatedActivation = reactivatedLicense.activations.find(a => a.machineId === existingMachineId);
          expect(updatedActivation.ipAddress).toBe(newIpAddress);
          expect(updatedActivation.lastValidatedAt).toBeDefined();
        }
        
        // Verify final state
        const finalLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(finalLicense.activations.length).toBeLessThanOrEqual(licenseData.maxActivations);
        expect(finalLicense.maxActivations).toBe(licenseData.maxActivations);
        
        // All activations should have valid machine IDs from our successful list
        finalLicense.activations.forEach(activation => {
          expect(successfulActivations).toContain(activation.machineId);
          expect(activation.activatedAt).toBeDefined();
          expect(activation.lastValidatedAt).toBeDefined();
        });
      }
    ), { numRuns: 100 });
  });
  
  test('License Activation Limits with Machine Binding', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 13: License Activation Limits
     * Validates: Requirements 4.3 - Testing activation limits with machine binding
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        maxActivations: fc.integer({ min: 1, max: 3 }),
        boundMachineId: fc.string({ minLength: 32, maxLength: 64 }),
        otherMachineIds: fc.array(fc.string({ minLength: 32, maxLength: 64 }), { minLength: 1, maxLength: 5 })
      }),
      async (licenseData) => {
        // Ensure bound machine ID is different from others
        const uniqueOtherIds = licenseData.otherMachineIds.filter(id => id !== licenseData.boundMachineId);
        if (uniqueOtherIds.length === 0) return; // Skip if no valid other machine IDs
        
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        // Generate machine hash for binding
        const crypto = await import('crypto');
        const machineHash = crypto.createHash('sha256').update(licenseData.boundMachineId).digest('hex');
        
        const fullLicenseData = {
          ...licenseData,
          type: 'professional',
          modules: ['hr-core', 'tasks'],
          machineHash,
          expiresAt,
          maxUsers: 200,
          maxStorage: 10240,
          maxAPICallsPerMonth: 100000,
          maxActivations: licenseData.maxActivations,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license with machine binding
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Test activation with bound machine (should succeed)
        const boundValidation = await ValidationService.validateToken(token, {
          machineId: licenseData.boundMachineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(boundValidation.valid).toBe(true);
        expect(boundValidation.license.licenseNumber).toBe(license.licenseNumber);
        
        // Verify activation was tracked
        let updatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(updatedLicense.activations).toHaveLength(1);
        expect(updatedLicense.activations[0].machineId).toBe(licenseData.boundMachineId);
        
        // Test activation with unbound machine (should fail due to machine mismatch)
        const unboundMachineId = uniqueOtherIds[0];
        const unboundValidation = await ValidationService.validateToken(token, {
          machineId: unboundMachineId,
          ipAddress: '192.168.1.2'
        });
        
        expect(unboundValidation.valid).toBe(false);
        expect(unboundValidation.code).toBe('MACHINE_MISMATCH');
        
        // Activation count should remain 1 (failed activation doesn't count)
        updatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(updatedLicense.activations).toHaveLength(1);
        expect(updatedLicense.activations[0].machineId).toBe(licenseData.boundMachineId);
        
        // Test multiple activations on bound machine (should reuse same activation)
        for (let i = 0; i < licenseData.maxActivations + 1; i++) {
          const reactivationResult = await ValidationService.validateToken(token, {
            machineId: licenseData.boundMachineId,
            ipAddress: `192.168.1.${i + 10}`
          });
          
          expect(reactivationResult.valid).toBe(true);
          
          // Should still have only 1 activation (reusing the same one)
          const reactivatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
          expect(reactivatedLicense.activations).toHaveLength(1);
          expect(reactivatedLicense.activations[0].machineId).toBe(licenseData.boundMachineId);
          expect(reactivatedLicense.activations[0].ipAddress).toBe(`192.168.1.${i + 10}`);
        }
      }
    ), { numRuns: 50 });
  });
  
  test('License Activation Limits Edge Cases', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 13: License Activation Limits
     * Validates: Requirements 4.3 - Testing edge cases for activation limits
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        maxActivations: fc.constantFrom(1), // Test with single activation limit
        machineId: fc.string({ minLength: 32, maxLength: 64 }),
        secondMachineId: fc.string({ minLength: 32, maxLength: 64 })
      }),
      async (licenseData) => {
        // Ensure machine IDs are different
        if (licenseData.machineId === licenseData.secondMachineId) return;
        
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'trial',
          modules: ['hr-core'],
          expiresAt,
          maxUsers: 10,
          maxStorage: 1024,
          maxAPICallsPerMonth: 5000,
          maxActivations: licenseData.maxActivations,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // First activation should succeed
        const firstActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(firstActivation.valid).toBe(true);
        expect(firstActivation.license.activations).toBe(1);
        expect(firstActivation.license.maxActivations).toBe(1);
        
        // Second activation on different machine should fail
        const secondActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.secondMachineId,
          ipAddress: '192.168.1.2'
        });
        
        expect(secondActivation.valid).toBe(false);
        expect(secondActivation.code).toBe('MAX_ACTIVATIONS_REACHED');
        expect(secondActivation.currentActivations).toBe(1);
        expect(secondActivation.maxActivations).toBe(1);
        
        // Verify only one activation exists
        const finalLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(finalLicense.activations).toHaveLength(1);
        expect(finalLicense.activations[0].machineId).toBe(licenseData.machineId);
        
        // Test canActivate method directly
        expect(finalLicense.canActivate(licenseData.machineId)).toBe(true); // Same machine
        expect(finalLicense.canActivate(licenseData.secondMachineId)).toBe(false); // Different machine
        
        // Test activate method directly (should throw for second machine)
        expect(() => {
          finalLicense.activate(licenseData.secondMachineId, '192.168.1.3');
        }).toThrow('Cannot activate license on this machine');
      }
    ), { numRuns: 50 });
  });
  
  test('License Activation Limits with Expired License', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 13: License Activation Limits
     * Validates: Requirements 4.3 - Testing activation limits with expired license
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        maxActivations: fc.integer({ min: 2, max: 5 }),
        machineId: fc.string({ minLength: 32, maxLength: 64 })
      }),
      async (licenseData) => {
        // Create license with future expiry first
        const futureExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'basic',
          modules: ['hr-core'],
          expiresAt: futureExpiresAt,
          maxUsers: 50,
          maxStorage: 2048,
          maxAPICallsPerMonth: 25000,
          maxActivations: licenseData.maxActivations,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // First activation should succeed
        const firstActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(firstActivation.valid).toBe(true);
        
        // Manually expire the license
        const pastExpiresAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        await License.findByIdAndUpdate(license._id, { expiresAt: pastExpiresAt });
        
        // Activation should now fail due to expiry (not activation limits)
        const expiredActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(expiredActivation.valid).toBe(false);
        expect(expiredActivation.code).toBe('LICENSE_EXPIRED');
        
        // Verify canActivate returns false for expired license
        const expiredLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(expiredLicense.canActivate(licenseData.machineId)).toBe(false);
        expect(expiredLicense.isValid).toBe(false);
        expect(expiredLicense.isExpired).toBe(true);
      }
    ), { numRuns: 30 });
  });
  
  test('License Activation Limits with Revoked License', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 13: License Activation Limits
     * Validates: Requirements 4.3 - Testing activation limits with revoked license
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        maxActivations: fc.integer({ min: 2, max: 5 }),
        machineId: fc.string({ minLength: 32, maxLength: 64 }),
        revokeReason: fc.string({ minLength: 5, maxLength: 100 })
      }),
      async (licenseData) => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'enterprise',
          modules: ['hr-core', 'tasks', 'payroll'],
          expiresAt,
          maxUsers: 500,
          maxStorage: 51200,
          maxAPICallsPerMonth: 500000,
          maxActivations: licenseData.maxActivations,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // First activation should succeed
        const firstActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(firstActivation.valid).toBe(true);
        
        // Revoke the license
        await LicenseGenerator.revokeLicense(license.licenseNumber, licenseData.revokeReason);
        
        // Activation should now fail due to revocation (not activation limits)
        const revokedActivation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: '192.168.1.1'
        });
        
        expect(revokedActivation.valid).toBe(false);
        expect(revokedActivation.code).toBe('LICENSE_INACTIVE');
        expect(revokedActivation.status).toBe('revoked');
        
        // Verify canActivate returns false for revoked license
        const revokedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(revokedLicense.canActivate(licenseData.machineId)).toBe(false);
        expect(revokedLicense.isValid).toBe(false);
        expect(revokedLicense.status).toBe('revoked');
        
        // Activation count should remain unchanged
        expect(revokedLicense.activations).toHaveLength(1);
      }
    ), { numRuns: 30 });
  });
});