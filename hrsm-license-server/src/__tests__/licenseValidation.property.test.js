import fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import License from '../models/License.js';
import LicenseGenerator from '../services/licenseGenerator.js';
import ValidationService from '../services/validationService.js';

describe('License Validation Properties', () => {
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
  
  test('Property 12: License Validation Round Trip', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2
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
        notes: fc.option(fc.string({ maxLength: 500 }), { nil: null })
      }),
      async (licenseData) => {
        // Set expiry date to future (at least 1 hour from now)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          expiresAt,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Step 1: Generate license and JWT token
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Verify license was created
        expect(license).toBeDefined();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        
        // Step 2: Validate the generated token
        const validationResult = await ValidationService.validateToken(token);
        
        // Verify validation succeeded
        expect(validationResult.valid).toBe(true);
        expect(validationResult.error).toBeUndefined();
        expect(validationResult.license).toBeDefined();
        expect(validationResult.decoded).toBeDefined();
        
        // Step 3: Verify round trip - all original data should match
        const validatedLicense = validationResult.license;
        
        // Core license information should match
        expect(validatedLicense.licenseNumber).toBe(license.licenseNumber);
        expect(validatedLicense.tenantId).toBe(licenseData.tenantId);
        expect(validatedLicense.tenantName).toBe(licenseData.tenantName);
        expect(validatedLicense.type).toBe(licenseData.type);
        expect(validatedLicense.status).toBe('active');
        
        // Features should match
        expect(validatedLicense.features.modules).toEqual(expect.arrayContaining(licenseData.modules));
        expect(validatedLicense.features.modules.length).toBe(licenseData.modules.length);
        expect(validatedLicense.features.maxUsers).toBe(licenseData.maxUsers);
        expect(validatedLicense.features.maxStorage).toBe(licenseData.maxStorage);
        expect(validatedLicense.features.maxAPICallsPerMonth).toBe(licenseData.maxAPICallsPerMonth);
        
        // Expiry should match (within 1 second tolerance for timing)
        const expectedExpiry = new Date(expiresAt).getTime();
        const actualExpiry = new Date(validatedLicense.expiresAt).getTime();
        expect(Math.abs(expectedExpiry - actualExpiry)).toBeLessThan(1000);
        
        // Activation limits should match
        expect(validatedLicense.maxActivations).toBe(licenseData.maxActivations);
        
        // JWT payload should contain correct information
        const decoded = validationResult.decoded;
        expect(decoded.ln).toBe(license.licenseNumber);
        expect(decoded.tid).toBe(licenseData.tenantId);
        expect(decoded.type).toBe(licenseData.type);
        expect(decoded.features).toEqual(expect.arrayContaining(licenseData.modules));
        expect(decoded.maxUsers).toBe(licenseData.maxUsers);
        expect(decoded.maxStorage).toBe(licenseData.maxStorage);
        expect(decoded.maxAPI).toBe(licenseData.maxAPICallsPerMonth);
        expect(decoded.domain).toBe(licenseData.domain);
        expect(decoded.machineHash).toBe(licenseData.machineHash);
        
        // JWT issuer and subject should be correct
        expect(decoded.iss).toBe('HRSM-License-Server');
        expect(decoded.sub).toBe(licenseData.tenantId);
        
        // Expiry in JWT should match license expiry
        const jwtExpiry = decoded.exp * 1000; // JWT exp is in seconds
        expect(Math.abs(expectedExpiry - jwtExpiry)).toBeLessThan(1000);
      }
    ), { numRuns: 100 });
  });
  
  test('License Validation Round Trip with Machine Binding', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2 - Testing machine binding validation
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: fc.constantFrom('trial', 'basic', 'professional', 'enterprise'),
        modules: fc.array(fc.constantFrom('hr-core', 'tasks', 'clinic'), { minLength: 1, maxLength: 3 }),
        machineId: fc.string({ minLength: 32, maxLength: 64 }),
        ipAddress: fc.ipV4()
      }),
      async (licenseData) => {
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
        
        // Generate machine hash for binding
        const crypto = await import('crypto');
        const machineHash = crypto.createHash('sha256').update(licenseData.machineId).digest('hex');
        
        const fullLicenseData = {
          ...licenseData,
          machineHash,
          ipWhitelist: [licenseData.ipAddress],
          expiresAt,
          maxUsers: 100,
          maxStorage: 5120,
          maxAPICallsPerMonth: 50000,
          maxActivations: 1,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license with machine binding
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Validate with correct machine ID and IP
        const validationResult = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: licenseData.ipAddress
        });
        
        // Should succeed with correct machine binding
        expect(validationResult.valid).toBe(true);
        expect(validationResult.license.licenseNumber).toBe(license.licenseNumber);
        
        // Verify activation was tracked
        const updatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(updatedLicense.activations).toHaveLength(1);
        expect(updatedLicense.activations[0].machineId).toBe(licenseData.machineId);
        expect(updatedLicense.activations[0].ipAddress).toBe(licenseData.ipAddress);
        
        // Validate again with same machine ID (should reuse activation)
        const secondValidation = await ValidationService.validateToken(token, {
          machineId: licenseData.machineId,
          ipAddress: licenseData.ipAddress
        });
        
        expect(secondValidation.valid).toBe(true);
        
        // Should still have only 1 activation
        const finalLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(finalLicense.activations).toHaveLength(1);
        
        // Validate with wrong machine ID (should fail)
        const wrongMachineId = licenseData.machineId + '_wrong';
        const failedValidation = await ValidationService.validateToken(token, {
          machineId: wrongMachineId,
          ipAddress: licenseData.ipAddress
        });
        
        expect(failedValidation.valid).toBe(false);
        expect(failedValidation.code).toBe('MACHINE_MISMATCH');
      }
    ), { numRuns: 50 });
  });
  
  test('License Validation Round Trip with Domain Binding', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2 - Testing domain binding validation
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        domain: fc.domain()
      }),
      async (licenseData) => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'professional',
          modules: ['hr-core', 'tasks'],
          expiresAt,
          maxUsers: 200,
          maxStorage: 10240,
          maxAPICallsPerMonth: 100000,
          maxActivations: 3,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license with domain binding
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Validate with correct domain
        const validationResult = await ValidationService.validateToken(token, {
          domain: licenseData.domain
        });
        
        // Should succeed with correct domain
        expect(validationResult.valid).toBe(true);
        expect(validationResult.license.licenseNumber).toBe(license.licenseNumber);
        
        // Validate with wrong domain (should fail)
        const wrongDomain = 'wrong-' + licenseData.domain;
        const failedValidation = await ValidationService.validateToken(token, {
          domain: wrongDomain
        });
        
        expect(failedValidation.valid).toBe(false);
        expect(failedValidation.code).toBe('DOMAIN_MISMATCH');
        expect(failedValidation.expectedDomain).toBe(licenseData.domain);
        expect(failedValidation.providedDomain).toBe(wrongDomain);
        
        // Validate without domain (should succeed - domain is optional in validation)
        const noDomainValidation = await ValidationService.validateToken(token);
        expect(noDomainValidation.valid).toBe(true);
      }
    ), { numRuns: 30 });
  });
  
  test('License Validation Round Trip with Expired License', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2 - Testing expired license handling
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: fc.constantFrom('trial', 'basic', 'professional')
      }),
      async (licenseData) => {
        // Create license with future expiry first, then manually expire it
        const futureExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          modules: ['hr-core'],
          expiresAt: futureExpiresAt,
          maxUsers: 50,
          maxStorage: 2048,
          maxAPICallsPerMonth: 25000,
          maxActivations: 1,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license with future expiry (so JWT token is valid)
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Manually expire the license in the database (but keep JWT token valid)
        const pastExpiresAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        await License.findByIdAndUpdate(license._id, { expiresAt: pastExpiresAt });
        
        // Validation should fail for expired license
        const validationResult = await ValidationService.validateToken(token);
        
        expect(validationResult.valid).toBe(false);
        expect(validationResult.code).toBe('LICENSE_EXPIRED');
        expect(validationResult.error).toBe('License has expired');
        expect(validationResult.expiresAt).toBeDefined();
        
        // Verify license status was updated to expired in database
        const updatedLicense = await License.findOne({ licenseNumber: license.licenseNumber });
        expect(updatedLicense.status).toBe('expired');
      }
    ), { numRuns: 20 });
  });
  
  test('License Validation Round Trip with Revoked License', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2 - Testing revoked license handling
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
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
          maxActivations: 5,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate valid license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // First validation should succeed
        const initialValidation = await ValidationService.validateToken(token);
        expect(initialValidation.valid).toBe(true);
        
        // Revoke the license
        await LicenseGenerator.revokeLicense(license.licenseNumber, licenseData.revokeReason);
        
        // Validation should now fail
        const revokedValidation = await ValidationService.validateToken(token);
        
        expect(revokedValidation.valid).toBe(false);
        expect(revokedValidation.code).toBe('LICENSE_INACTIVE');
        expect(revokedValidation.status).toBe('revoked');
        expect(revokedValidation.error).toBe('License is revoked');
      }
    ), { numRuns: 20 });
  });
  
  test('License Validation Round Trip with Usage Limits', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 12: License Validation Round Trip
     * Validates: Requirements 4.2 - Testing usage limit validation
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        maxUsers: fc.integer({ min: 10, max: 100 }),
        maxStorage: fc.integer({ min: 1024, max: 10240 }),
        maxAPICallsPerMonth: fc.integer({ min: 10000, max: 100000 })
      }),
      async (licenseData) => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        const fullLicenseData = {
          ...licenseData,
          type: 'basic',
          modules: ['hr-core'],
          expiresAt,
          maxActivations: 1,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Generate license
        const { license, token } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Test within limits (should pass)
        const withinLimitsValidation = await ValidationService.validateUsageLimits(
          token,
          licenseData.maxUsers - 1,
          licenseData.maxStorage - 100,
          licenseData.maxAPICallsPerMonth - 1000
        );
        
        expect(withinLimitsValidation.valid).toBe(true);
        expect(withinLimitsValidation.violations).toHaveLength(0);
        expect(withinLimitsValidation.license.licenseNumber).toBe(license.licenseNumber);
        
        // Test exceeding user limit (should fail)
        const exceedUsersValidation = await ValidationService.validateUsageLimits(
          token,
          licenseData.maxUsers + 1,
          licenseData.maxStorage - 100,
          licenseData.maxAPICallsPerMonth - 1000
        );
        
        expect(exceedUsersValidation.valid).toBe(false);
        expect(exceedUsersValidation.violations).toHaveLength(1);
        expect(exceedUsersValidation.violations[0].type).toBe('users');
        expect(exceedUsersValidation.violations[0].current).toBe(licenseData.maxUsers + 1);
        expect(exceedUsersValidation.violations[0].limit).toBe(licenseData.maxUsers);
        
        // Test exceeding all limits (should fail with multiple violations)
        const exceedAllValidation = await ValidationService.validateUsageLimits(
          token,
          licenseData.maxUsers + 10,
          licenseData.maxStorage + 500,
          licenseData.maxAPICallsPerMonth + 5000
        );
        
        expect(exceedAllValidation.valid).toBe(false);
        expect(exceedAllValidation.violations).toHaveLength(3);
        
        const violationTypes = exceedAllValidation.violations.map(v => v.type);
        expect(violationTypes).toContain('users');
        expect(violationTypes).toContain('storage');
        expect(violationTypes).toContain('api_calls');
      }
    ), { numRuns: 30 });
  });
});