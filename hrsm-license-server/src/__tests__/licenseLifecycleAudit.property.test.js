import fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import License from '../models/License.js';
import LicenseGenerator from '../services/licenseGenerator.js';

describe('License Lifecycle Audit Properties', () => {
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
  
  test('Property 14: License Lifecycle Audit', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 14: License Lifecycle Audit
     * Validates: Requirements 4.4
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
        modules: fc.array(fc.constantFrom('hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'), { minLength: 1, maxLength: 6 }),
        maxUsers: fc.integer({ min: 1, max: 10000 }),
        maxStorage: fc.integer({ min: 1024, max: 1000000 }),
        maxAPICallsPerMonth: fc.integer({ min: 1000, max: 10000000 }),
        domain: fc.option(fc.domain(), { nil: null }),
        machineHash: fc.option(fc.string({ minLength: 32, maxLength: 64 }), { nil: null }),
        ipWhitelist: fc.array(fc.ipV4(), { maxLength: 5 }),
        maxActivations: fc.integer({ min: 1, max: 10 }),
        notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
        revokeReason: fc.string({ minLength: 5, maxLength: 200 }),
        suspendReason: fc.string({ minLength: 5, maxLength: 200 }),
        renewalNotes: fc.string({ minLength: 5, maxLength: 200 })
      }),
      async (licenseData) => {
        const createdBy = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        const fullLicenseData = {
          ...licenseData,
          expiresAt,
          createdBy
        };
        
        // Step 1: Create license and verify creation audit trail
        const creationTimeBefore = new Date();
        const { license: createdLicense } = await LicenseGenerator.createLicense(fullLicenseData);
        const creationTimeAfter = new Date();
        
        // Verify license was created with proper audit information
        expect(createdLicense).toBeDefined();
        expect(createdLicense.licenseNumber).toBeDefined();
        expect(createdLicense.createdBy).toEqual(createdBy);
        expect(createdLicense.createdAt).toBeDefined();
        expect(createdLicense.updatedAt).toBeDefined();
        
        // Verify creation timestamp is within expected range
        expect(createdLicense.createdAt.getTime()).toBeGreaterThanOrEqual(creationTimeBefore.getTime());
        expect(createdLicense.createdAt.getTime()).toBeLessThanOrEqual(creationTimeAfter.getTime());
        
        // Verify initial status and audit fields
        expect(createdLicense.status).toBe('active');
        expect(createdLicense.tenantId).toBe(licenseData.tenantId);
        expect(createdLicense.tenantName).toBe(licenseData.tenantName);
        
        // Step 2: Suspend license and verify suspension audit trail
        const suspensionTimeBefore = new Date();
        const suspendedLicense = await LicenseGenerator.suspendLicense(
          createdLicense.licenseNumber, 
          licenseData.suspendReason
        );
        const suspensionTimeAfter = new Date();
        
        // Verify suspension was properly audited
        expect(suspendedLicense.status).toBe('suspended');
        expect(suspendedLicense.notes).toContain('Suspended:');
        expect(suspendedLicense.notes).toContain(licenseData.suspendReason);
        expect(suspendedLicense.notes).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
        expect(suspendedLicense.updatedAt.getTime()).toBeGreaterThanOrEqual(suspensionTimeBefore.getTime());
        expect(suspendedLicense.updatedAt.getTime()).toBeLessThanOrEqual(suspensionTimeAfter.getTime());
        
        // Verify creation audit trail is preserved
        expect(suspendedLicense.createdAt).toEqual(createdLicense.createdAt);
        expect(suspendedLicense.createdBy).toEqual(createdBy);
        
        // Step 3: Reactivate license and verify reactivation audit trail
        const reactivationTimeBefore = new Date();
        const { license: reactivatedLicense } = await LicenseGenerator.reactivateLicense(
          createdLicense.licenseNumber
        );
        const reactivationTimeAfter = new Date();
        
        // Verify reactivation was properly audited
        expect(reactivatedLicense.status).toBe('active');
        expect(reactivatedLicense.notes).toContain('Reactivated:');
        expect(reactivatedLicense.notes).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
        expect(reactivatedLicense.updatedAt.getTime()).toBeGreaterThanOrEqual(reactivationTimeBefore.getTime());
        expect(reactivatedLicense.updatedAt.getTime()).toBeLessThanOrEqual(reactivationTimeAfter.getTime());
        
        // Verify previous audit trails are preserved
        expect(reactivatedLicense.notes).toContain('Suspended:');
        expect(reactivatedLicense.notes).toContain(licenseData.suspendReason);
        expect(reactivatedLicense.createdAt).toEqual(createdLicense.createdAt);
        expect(reactivatedLicense.createdBy).toEqual(createdBy);
        
        // Step 4: Renew license and verify renewal audit trail
        const renewalTimeBefore = new Date();
        const newExpiryDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years from now
        const { license: renewedLicense } = await LicenseGenerator.renewLicense(
          createdLicense.licenseNumber,
          newExpiryDate,
          licenseData.renewalNotes
        );
        const renewalTimeAfter = new Date();
        
        // Verify renewal was properly audited
        expect(renewedLicense.expiresAt).toEqual(newExpiryDate);
        expect(renewedLicense.status).toBe('active');
        expect(renewedLicense.notes).toContain('Renewed:');
        expect(renewedLicense.notes).toContain(licenseData.renewalNotes);
        expect(renewedLicense.notes).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
        expect(renewedLicense.updatedAt.getTime()).toBeGreaterThanOrEqual(renewalTimeBefore.getTime());
        expect(renewedLicense.updatedAt.getTime()).toBeLessThanOrEqual(renewalTimeAfter.getTime());
        
        // Verify all previous audit trails are preserved
        expect(renewedLicense.notes).toContain('Suspended:');
        expect(renewedLicense.notes).toContain('Reactivated:');
        expect(renewedLicense.createdAt).toEqual(createdLicense.createdAt);
        expect(renewedLicense.createdBy).toEqual(createdBy);
        
        // Step 5: Revoke license and verify revocation audit trail
        const revocationTimeBefore = new Date();
        const revokedLicense = await LicenseGenerator.revokeLicense(
          createdLicense.licenseNumber,
          licenseData.revokeReason
        );
        const revocationTimeAfter = new Date();
        
        // Verify revocation was properly audited
        expect(revokedLicense.status).toBe('revoked');
        expect(revokedLicense.notes).toContain('Revoked:');
        expect(revokedLicense.notes).toContain(licenseData.revokeReason);
        expect(revokedLicense.notes).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
        expect(revokedLicense.updatedAt.getTime()).toBeGreaterThanOrEqual(revocationTimeBefore.getTime());
        expect(revokedLicense.updatedAt.getTime()).toBeLessThanOrEqual(revocationTimeAfter.getTime());
        
        // Step 6: Verify complete audit trail integrity
        const finalLicense = await License.findOne({ licenseNumber: createdLicense.licenseNumber });
        
        // Verify all lifecycle operations are audited in chronological order
        const auditEntries = finalLicense.notes.split('\n').filter(line => line.trim().length > 0);
        
        // Should have entries for: Suspended, Reactivated, Renewed, Revoked
        const suspendedEntry = auditEntries.find(entry => entry.includes('Suspended:'));
        const reactivatedEntry = auditEntries.find(entry => entry.includes('Reactivated:'));
        const renewedEntry = auditEntries.find(entry => entry.includes('Renewed:'));
        const revokedEntry = auditEntries.find(entry => entry.includes('Revoked:'));
        
        expect(suspendedEntry).toBeDefined();
        expect(reactivatedEntry).toBeDefined();
        expect(renewedEntry).toBeDefined();
        expect(revokedEntry).toBeDefined();
        
        // Verify each entry contains the reason/notes and timestamp
        expect(suspendedEntry).toContain(licenseData.suspendReason);
        expect(renewedEntry).toContain(licenseData.renewalNotes);
        expect(revokedEntry).toContain(licenseData.revokeReason);
        
        // Verify timestamps are in ISO format
        expect(suspendedEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(reactivatedEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(renewedEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(revokedEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        
        // Verify immutable creation audit fields
        expect(finalLicense.createdAt).toEqual(createdLicense.createdAt);
        expect(finalLicense.createdBy).toEqual(createdBy);
        expect(finalLicense.licenseNumber).toBe(createdLicense.licenseNumber);
        expect(finalLicense.tenantId).toBe(licenseData.tenantId);
        
        // Verify final state
        expect(finalLicense.status).toBe('revoked');
        expect(finalLicense.expiresAt).toEqual(newExpiryDate); // Should preserve renewal expiry
        
        // Step 7: Verify audit trail completeness for responsible parties
        // All operations should be traceable to the responsible party (createdBy)
        expect(finalLicense.createdBy).toBeDefined();
        expect(finalLicense.createdBy).toEqual(createdBy);
        
        // Verify timestamps are properly maintained
        expect(finalLicense.createdAt).toBeDefined();
        expect(finalLicense.updatedAt).toBeDefined();
        expect(finalLicense.updatedAt.getTime()).toBeGreaterThan(finalLicense.createdAt.getTime());
        
        // Verify license number remains immutable throughout lifecycle
        expect(finalLicense.licenseNumber).toBe(createdLicense.licenseNumber);
        expect(finalLicense.licenseNumber).toMatch(/^HRSM-[0-9A-F]+-[0-9A-F]{8}$/);
      }
    ), { numRuns: 100 });
  });
  
  test('License Lifecycle Audit with Usage Tracking', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 14: License Lifecycle Audit
     * Validates: Requirements 4.4 - Testing audit trail with usage tracking
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        currentUsers: fc.integer({ min: 1, max: 100 }),
        currentStorage: fc.integer({ min: 100, max: 10000 })
      }),
      async (licenseData) => {
        const createdBy = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'professional',
          modules: ['hr-core', 'tasks'],
          expiresAt,
          maxUsers: 200,
          maxStorage: 20480,
          maxAPICallsPerMonth: 100000,
          maxActivations: 3,
          createdBy
        };
        
        // Create license
        const { license: createdLicense } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Track initial usage
        const initialUsageTime = new Date();
        const updatedLicense = await LicenseGenerator.updateLicenseUsage(
          createdLicense.licenseNumber,
          licenseData.currentUsers,
          licenseData.currentStorage
        );
        
        // Verify usage tracking audit trail
        expect(updatedLicense.usage.currentUsers).toBe(licenseData.currentUsers);
        expect(updatedLicense.usage.currentStorage).toBe(licenseData.currentStorage);
        expect(updatedLicense.usage.lastValidatedAt).toBeDefined();
        expect(updatedLicense.usage.lastValidatedAt.getTime()).toBeGreaterThanOrEqual(initialUsageTime.getTime());
        
        // Update usage again
        const newUsers = licenseData.currentUsers + 10;
        const newStorage = licenseData.currentStorage + 500;
        const secondUsageTime = new Date();
        
        const secondUpdate = await LicenseGenerator.updateLicenseUsage(
          createdLicense.licenseNumber,
          newUsers,
          newStorage
        );
        
        // Verify usage updates maintain audit trail
        expect(secondUpdate.usage.currentUsers).toBe(newUsers);
        expect(secondUpdate.usage.currentStorage).toBe(newStorage);
        expect(secondUpdate.usage.lastValidatedAt.getTime()).toBeGreaterThanOrEqual(secondUsageTime.getTime());
        expect(secondUpdate.usage.lastValidatedAt.getTime()).toBeGreaterThan(updatedLicense.usage.lastValidatedAt.getTime());
        
        // Verify creation audit trail is preserved
        expect(secondUpdate.createdAt).toEqual(createdLicense.createdAt);
        expect(secondUpdate.createdBy).toEqual(createdBy);
        expect(secondUpdate.licenseNumber).toBe(createdLicense.licenseNumber);
      }
    ), { numRuns: 50 });
  });
  
  test('License Lifecycle Audit with Activation Tracking', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 14: License Lifecycle Audit
     * Validates: Requirements 4.4 - Testing audit trail with activation tracking
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        machineIds: fc.array(fc.string({ minLength: 32, maxLength: 64 }), { minLength: 1, maxLength: 3 }),
        ipAddresses: fc.array(fc.ipV4(), { minLength: 1, maxLength: 3 })
      }),
      async (licenseData) => {
        // Ensure we have unique machine IDs
        const uniqueMachineIds = [...new Set(licenseData.machineIds)];
        if (uniqueMachineIds.length === 0) return;
        
        const createdBy = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'enterprise',
          modules: ['hr-core', 'tasks', 'payroll'],
          expiresAt,
          maxUsers: 500,
          maxStorage: 51200,
          maxAPICallsPerMonth: 500000,
          maxActivations: Math.max(3, uniqueMachineIds.length),
          createdBy
        };
        
        // Create license
        const { license: createdLicense } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Track activations and verify audit trail
        const activationTimes = [];
        
        for (let i = 0; i < uniqueMachineIds.length; i++) {
          const machineId = uniqueMachineIds[i];
          const ipAddress = licenseData.ipAddresses[i % licenseData.ipAddresses.length];
          
          const activationTimeBefore = new Date();
          const activatedLicense = await createdLicense.activate(machineId, ipAddress);
          const activationTimeAfter = new Date();
          
          activationTimes.push({ before: activationTimeBefore, after: activationTimeAfter });
          
          // Verify activation audit trail
          expect(activatedLicense.activations).toHaveLength(i + 1);
          
          const activation = activatedLicense.activations.find(a => a.machineId === machineId);
          expect(activation).toBeDefined();
          expect(activation.machineId).toBe(machineId);
          expect(activation.ipAddress).toBe(ipAddress);
          expect(activation.activatedAt).toBeDefined();
          expect(activation.lastValidatedAt).toBeDefined();
          
          // Verify activation timestamps
          expect(activation.activatedAt.getTime()).toBeGreaterThanOrEqual(activationTimeBefore.getTime());
          expect(activation.activatedAt.getTime()).toBeLessThanOrEqual(activationTimeAfter.getTime());
          expect(activation.lastValidatedAt.getTime()).toBeGreaterThanOrEqual(activationTimeBefore.getTime());
          expect(activation.lastValidatedAt.getTime()).toBeLessThanOrEqual(activationTimeAfter.getTime());
          
          // Verify usage tracking is updated
          expect(activatedLicense.usage.lastValidatedAt).toBeDefined();
          expect(activatedLicense.usage.totalValidations).toBeGreaterThan(0);
        }
        
        // Verify final audit state
        const finalLicense = await License.findOne({ licenseNumber: createdLicense.licenseNumber });
        
        // All activations should be preserved
        expect(finalLicense.activations).toHaveLength(uniqueMachineIds.length);
        
        // Each activation should have complete audit information
        finalLicense.activations.forEach((activation, index) => {
          expect(activation.machineId).toBe(uniqueMachineIds[index]);
          expect(activation.activatedAt).toBeDefined();
          expect(activation.lastValidatedAt).toBeDefined();
          expect(activation.ipAddress).toBeDefined();
          
          // Verify activation time is within expected range
          const expectedTime = activationTimes[index];
          expect(activation.activatedAt.getTime()).toBeGreaterThanOrEqual(expectedTime.before.getTime());
          expect(activation.activatedAt.getTime()).toBeLessThanOrEqual(expectedTime.after.getTime());
        });
        
        // Verify creation audit trail is preserved
        expect(finalLicense.createdAt).toEqual(createdLicense.createdAt);
        expect(finalLicense.createdBy).toEqual(createdBy);
        expect(finalLicense.licenseNumber).toBe(createdLicense.licenseNumber);
        
        // Verify usage audit trail
        expect(finalLicense.usage.lastValidatedAt).toBeDefined();
        expect(finalLicense.usage.totalValidations).toBe(uniqueMachineIds.length);
      }
    ), { numRuns: 30 });
  });
  
  test('License Lifecycle Audit Immutability', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 14: License Lifecycle Audit
     * Validates: Requirements 4.4 - Testing audit trail immutability
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        operations: fc.array(
          fc.record({
            type: fc.constantFrom('suspend', 'reactivate', 'renew'),
            reason: fc.string({ minLength: 5, maxLength: 100 })
          }),
          { minLength: 2, maxLength: 5 }
        )
      }),
      async (licenseData) => {
        const createdBy = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'basic',
          modules: ['hr-core'],
          expiresAt,
          maxUsers: 50,
          maxStorage: 2048,
          maxAPICallsPerMonth: 25000,
          maxActivations: 1,
          createdBy
        };
        
        // Create license
        const { license: createdLicense } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Store immutable creation audit fields
        const immutableFields = {
          licenseNumber: createdLicense.licenseNumber,
          tenantId: createdLicense.tenantId,
          tenantName: createdLicense.tenantName,
          createdAt: createdLicense.createdAt,
          createdBy: createdLicense.createdBy
        };
        
        let currentLicense = createdLicense;
        const auditHistory = [];
        
        // Perform multiple operations and track audit history
        for (const operation of licenseData.operations) {
          let updatedLicense;
          
          switch (operation.type) {
            case 'suspend':
              if (currentLicense.status === 'active') {
                updatedLicense = await LicenseGenerator.suspendLicense(
                  currentLicense.licenseNumber,
                  operation.reason
                );
                auditHistory.push({
                  type: 'suspend',
                  reason: operation.reason,
                  timestamp: updatedLicense.updatedAt
                });
              }
              break;
              
            case 'reactivate':
              if (currentLicense.status === 'suspended') {
                const { license } = await LicenseGenerator.reactivateLicense(
                  currentLicense.licenseNumber
                );
                updatedLicense = license;
                auditHistory.push({
                  type: 'reactivate',
                  timestamp: updatedLicense.updatedAt
                });
              }
              break;
              
            case 'renew':
              if (currentLicense.status === 'active') {
                const newExpiry = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
                const { license } = await LicenseGenerator.renewLicense(
                  currentLicense.licenseNumber,
                  newExpiry,
                  operation.reason
                );
                updatedLicense = license;
                auditHistory.push({
                  type: 'renew',
                  reason: operation.reason,
                  timestamp: updatedLicense.updatedAt
                });
              }
              break;
          }
          
          if (updatedLicense) {
            currentLicense = updatedLicense;
          }
        }
        
        // Verify immutable fields remain unchanged
        const finalLicense = await License.findOne({ licenseNumber: createdLicense.licenseNumber });
        
        expect(finalLicense.licenseNumber).toBe(immutableFields.licenseNumber);
        expect(finalLicense.tenantId).toBe(immutableFields.tenantId);
        expect(finalLicense.tenantName).toBe(immutableFields.tenantName);
        expect(finalLicense.createdAt).toEqual(immutableFields.createdAt);
        expect(finalLicense.createdBy).toEqual(immutableFields.createdBy);
        
        // Verify audit history is preserved and complete
        if (auditHistory.length > 0) {
          expect(finalLicense.notes).toBeDefined();
          
          // Each operation should be recorded in the audit trail
          auditHistory.forEach(auditEntry => {
            switch (auditEntry.type) {
              case 'suspend':
                expect(finalLicense.notes).toContain('Suspended:');
                expect(finalLicense.notes).toContain(auditEntry.reason);
                break;
              case 'reactivate':
                expect(finalLicense.notes).toContain('Reactivated:');
                break;
              case 'renew':
                expect(finalLicense.notes).toContain('Renewed:');
                expect(finalLicense.notes).toContain(auditEntry.reason);
                break;
            }
          });
          
          // Verify timestamps are in chronological order
          const timestamps = finalLicense.notes
            .split('\n')
            .filter(line => line.includes('(') && line.includes(')'))
            .map(line => {
              const match = line.match(/\(([^)]+)\)/);
              if (!match) return null;
              const date = new Date(match[1]);
              return isNaN(date.getTime()) ? null : date;
            })
            .filter(date => date !== null);
          
          // Only verify chronological order if we have multiple valid timestamps
          if (timestamps.length > 1) {
            // Sort timestamps to verify they are in chronological order
            const sortedTimestamps = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
            
            // Timestamps should be in ascending order (chronological)
            for (let i = 0; i < timestamps.length; i++) {
              expect(timestamps[i].getTime()).toBe(sortedTimestamps[i].getTime());
            }
          }
        }
        
        // Verify updatedAt reflects the latest operation
        if (auditHistory.length > 0) {
          const latestAuditTime = Math.max(...auditHistory.map(a => a.timestamp.getTime()));
          expect(finalLicense.updatedAt.getTime()).toBeGreaterThanOrEqual(latestAuditTime);
        }
      }
    ), { numRuns: 50 });
  });
});