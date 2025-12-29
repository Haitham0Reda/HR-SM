/**
 * License Server Simple E2E Workflow Tests
 * 
 * Tests complete license generation and validation workflows end-to-end
 * Validates: Requirements 4.1, 4.2, 4.3 - Complete license workflows
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import License from '../models/License.js';
import LicenseGenerator from '../services/licenseGenerator.js';
import ValidationService from '../services/validationService.js';

describe('License Server Simple E2E Workflow Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    // Clean up and close connections
    await License.deleteMany({});
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await License.deleteMany({});
  });

  describe('Complete License Lifecycle Workflow', () => {
    it('should complete full license lifecycle: create → validate → renew → revoke', async () => {
      // Step 1: Create License
      const licenseData = {
        tenantId: 'lifecycle-test-001',
        tenantName: 'Lifecycle Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        modules: ['hr-core', 'payroll', 'reports'],
        maxUsers: 100,
        maxStorage: 5000,
        maxAPICallsPerMonth: 50000,
        maxActivations: 3,
        createdBy: new mongoose.Types.ObjectId()
      };

      const createResult = await LicenseGenerator.createLicense(licenseData);
      expect(createResult.license.licenseNumber).toMatch(/^HRSM-/);
      expect(createResult.token).toBeDefined();
      expect(createResult.license.status).toBe('active');

      const licenseNumber = createResult.license.licenseNumber;
      const token = createResult.token;

      // Step 2: Validate License
      const validationData = {
        machineId: 'test-machine-001',
        ipAddress: '192.168.1.100'
      };

      const validateResult = await ValidationService.validateToken(token, validationData);
      expect(validateResult.valid).toBe(true);
      expect(validateResult.license.licenseNumber).toBe(licenseNumber);

      // Step 3: Renew License
      const newExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      const renewResult = await LicenseGenerator.renewLicense(licenseNumber, newExpiryDate, 'Extended for full year');

      expect(renewResult.license.licenseNumber).toBe(licenseNumber);
      expect(renewResult.token).toBeDefined();
      expect(renewResult.license.status).toBe('active');

      // Step 4: Validate Renewed License
      const newToken = renewResult.token;
      const revalidateResult = await ValidationService.validateToken(newToken, validationData);
      expect(revalidateResult.valid).toBe(true);

      // Step 5: Revoke License
      const revokeResult = await LicenseGenerator.revokeLicense(licenseNumber, 'End-to-end test completion');
      expect(revokeResult.license.status).toBe('revoked');

      // Step 6: Validate Revoked License (should fail)
      const revokedValidateResult = await ValidationService.validateToken(newToken, validationData);
      expect(revokedValidateResult.valid).toBe(false);
      expect(revokedValidateResult.error).toBe('License is revoked');
    });

    it('should handle multi-tenant license workflow with isolation', async () => {
      // Create licenses for multiple tenants
      const tenantAData = {
        tenantId: 'tenant-a-001',
        tenantName: 'Company A',
        type: 'enterprise',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        modules: ['hr-core', 'payroll', 'reports', 'tasks'],
        maxUsers: 500,
        maxStorage: 20000,
        maxAPICallsPerMonth: 200000,
        maxActivations: 10,
        createdBy: new mongoose.Types.ObjectId()
      };

      const tenantBData = {
        tenantId: 'tenant-b-001',
        tenantName: 'Company B',
        type: 'basic',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        modules: ['hr-core', 'tasks'],
        maxUsers: 50,
        maxStorage: 2000,
        maxAPICallsPerMonth: 20000,
        maxActivations: 2,
        createdBy: new mongoose.Types.ObjectId()
      };

      // Create both licenses
      const [tenantAResult, tenantBResult] = await Promise.all([
        LicenseGenerator.createLicense(tenantAData),
        LicenseGenerator.createLicense(tenantBData)
      ]);

      const tenantALicense = tenantAResult.license;
      const tenantBLicense = tenantBResult.license;

      // Validate both licenses
      const [tenantAValidation, tenantBValidation] = await Promise.all([
        ValidationService.validateToken(tenantAResult.token, {
          machineId: 'tenant-a-machine',
          ipAddress: '192.168.1.10'
        }),
        ValidationService.validateToken(tenantBResult.token, {
          machineId: 'tenant-b-machine',
          ipAddress: '192.168.1.20'
        })
      ]);

      expect(tenantAValidation.valid).toBe(true);
      expect(tenantBValidation.valid).toBe(true);

      // Verify tenant isolation - each license should only validate for its own tenant
      expect(tenantAValidation.license.tenantId).toBe('tenant-a-001');
      expect(tenantBValidation.license.tenantId).toBe('tenant-b-001');

      // Verify different feature sets
      expect(tenantAValidation.license.features.modules).toContain('reports');
      expect(tenantBValidation.license.features.modules).not.toContain('reports');

      // Get tenant-specific licenses
      const tenantALicenses = await LicenseGenerator.getTenantLicenses('tenant-a-001');
      const tenantBLicenses = await LicenseGenerator.getTenantLicenses('tenant-b-001');

      expect(tenantALicenses).toHaveLength(1);
      expect(tenantBLicenses).toHaveLength(1);
      expect(tenantALicenses[0].tenantId).toBe('tenant-a-001');
      expect(tenantBLicenses[0].tenantId).toBe('tenant-b-001');
    });
  });

  describe('Machine Binding and Activation Workflows', () => {
    it('should handle activation limit workflow', async () => {
      // Create license with low activation limit
      const licenseData = {
        tenantId: 'activation-limit-test',
        tenantName: 'Activation Limit Test Company',
        type: 'trial',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        modules: ['hr-core'],
        maxUsers: 10,
        maxStorage: 1000,
        maxAPICallsPerMonth: 5000,
        maxActivations: 2, // Low limit for testing
        createdBy: new mongoose.Types.ObjectId()
      };

      const createResult = await LicenseGenerator.createLicense(licenseData);
      const token = createResult.token;

      // First activation should succeed
      const firstActivation = await ValidationService.validateToken(token, {
        machineId: 'machine-001',
        ipAddress: '192.168.1.1'
      });

      expect(firstActivation.valid).toBe(true);

      // Second activation should succeed
      const secondActivation = await ValidationService.validateToken(token, {
        machineId: 'machine-002',
        ipAddress: '192.168.1.2'
      });

      expect(secondActivation.valid).toBe(true);

      // Third activation should fail (exceeds limit)
      const thirdActivation = await ValidationService.validateToken(token, {
        machineId: 'machine-003',
        ipAddress: '192.168.1.3'
      });

      expect(thirdActivation.valid).toBe(false);
      expect(thirdActivation.code).toBe('MAX_ACTIVATIONS_REACHED');

      // Re-activation on existing machine should succeed
      const reactivation = await ValidationService.validateToken(token, {
        machineId: 'machine-001', // Same as first activation
        ipAddress: '192.168.1.10' // Different IP
      });

      expect(reactivation.valid).toBe(true);
    });
  });

  describe('License Expiry Workflows', () => {
    it('should handle license expiry workflow', async () => {
      // Create license that expires soon
      const expiresAt = new Date(Date.now() + 2000); // Expires in 2 seconds
      
      const licenseData = {
        tenantId: 'expiry-test-001',
        tenantName: 'Expiry Test Company',
        type: 'trial',
        expiresAt: expiresAt,
        modules: ['hr-core'],
        maxUsers: 10,
        maxStorage: 1000,
        maxAPICallsPerMonth: 5000,
        maxActivations: 1,
        createdBy: new mongoose.Types.ObjectId()
      };

      const createResult = await LicenseGenerator.createLicense(licenseData);
      const token = createResult.token;
      const licenseNumber = createResult.license.licenseNumber;

      // Initial validation should succeed
      const initialValidation = await ValidationService.validateToken(token, {
        machineId: 'expiry-test-machine',
        ipAddress: '192.168.1.1'
      });

      expect(initialValidation.valid).toBe(true);

      // Wait for license to expire
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Validation should now fail
      const expiredValidation = await ValidationService.validateToken(token, {
        machineId: 'expiry-test-machine',
        ipAddress: '192.168.1.1'
      });

      expect(expiredValidation.valid).toBe(false);
      expect(expiredValidation.code).toBe('TOKEN_EXPIRED');

      // Verify license status was updated
      const licenseDetails = await LicenseGenerator.getLicense(licenseNumber);
      expect(licenseDetails.status).toBe('expired');
    });

    it('should handle license renewal workflow', async () => {
      // Create license expiring soon
      const licenseData = {
        tenantId: 'renewal-test-001',
        tenantName: 'Renewal Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        modules: ['hr-core', 'payroll'],
        maxUsers: 100,
        maxStorage: 5000,
        maxAPICallsPerMonth: 50000,
        maxActivations: 3,
        createdBy: new mongoose.Types.ObjectId()
      };

      const createResult = await LicenseGenerator.createLicense(licenseData);
      const licenseNumber = createResult.license.licenseNumber;
      const originalToken = createResult.token;

      // Renew license for another year
      const newExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const renewResult = await LicenseGenerator.renewLicense(licenseNumber, newExpiryDate, 'Renewed for full year - E2E test');

      expect(renewResult.license.licenseNumber).toBe(licenseNumber);
      expect(renewResult.token).toBeDefined();
      expect(renewResult.token).not.toBe(originalToken); // New token issued

      const newToken = renewResult.token;

      // Validate renewed license
      const renewedValidation = await ValidationService.validateToken(newToken, {
        machineId: 'renewal-test-machine',
        ipAddress: '192.168.1.1'
      });

      expect(renewedValidation.valid).toBe(true);
      expect(renewedValidation.license.licenseNumber).toBe(licenseNumber);
    });
  });

  describe('Usage Tracking Workflow', () => {
    it('should handle usage tracking workflow', async () => {
      // Create license with specific limits
      const licenseData = {
        tenantId: 'usage-tracking-test',
        tenantName: 'Usage Tracking Test Company',
        type: 'basic',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        modules: ['hr-core', 'tasks'],
        maxUsers: 50,
        maxStorage: 2000,
        maxAPICallsPerMonth: 10000,
        maxActivations: 2,
        createdBy: new mongoose.Types.ObjectId()
      };

      const createResult = await LicenseGenerator.createLicense(licenseData);
      const licenseNumber = createResult.license.licenseNumber;
      const token = createResult.token;

      // Update usage within limits
      const usageUpdateResult = await LicenseGenerator.updateLicenseUsage(
        licenseNumber,
        25, // currentUsers
        1000, // currentStorage
        5000 // apiCallsThisMonth
      );

      expect(usageUpdateResult.license.usage.currentUsers).toBe(25);
      expect(usageUpdateResult.license.usage.currentStorage).toBe(1000);

      // Validate usage limits
      const usageLimitsValidation = await ValidationService.validateUsageLimits(
        token,
        25, // currentUsers
        1000, // currentStorage
        5000 // currentAPICallsThisMonth
      );

      expect(usageLimitsValidation.valid).toBe(true);
      expect(usageLimitsValidation.violations).toHaveLength(0);

      // Test usage limit violations
      const violationValidation = await ValidationService.validateUsageLimits(
        token,
        75, // Exceeds limit of 50
        3000, // Exceeds limit of 2000
        15000 // Exceeds limit of 10000
      );

      expect(violationValidation.valid).toBe(false);
      expect(violationValidation.violations).toHaveLength(3);
      expect(violationValidation.violations.map(v => v.type)).toEqual(
        expect.arrayContaining(['users', 'storage', 'api_calls'])
      );
    });
  });
});