import fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import License from '../models/License.js';
import LicenseGenerator from '../services/licenseGenerator.js';

describe('License Generation Properties', () => {
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
  
  test('Property 11: License Number Format Validation', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 11: License Number Format Validation
     * Validates: Requirements 4.1
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
        // Set expiry date to future
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        const fullLicenseData = {
          ...licenseData,
          expiresAt,
          createdBy: new mongoose.Types.ObjectId()
        };
        
        // Create license using the service
        const { license } = await LicenseGenerator.createLicense(fullLicenseData);
        
        // Verify license number format: HRSM-{timestamp}-{random}
        const formatRegex = /^HRSM-[0-9A-F]+-[0-9A-F]{8}$/;
        expect(license.licenseNumber).toMatch(formatRegex);
        
        // Verify the format components
        const parts = license.licenseNumber.split('-');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('HRSM');
        
        // Timestamp part should be valid hex
        expect(parts[1]).toMatch(/^[0-9A-F]+$/);
        
        // Random part should be 8 hex characters
        expect(parts[2]).toMatch(/^[0-9A-F]{8}$/);
        expect(parts[2]).toHaveLength(8);
        
        // Verify uniqueness - create another license and ensure different number
        const secondLicenseData = {
          ...fullLicenseData,
          tenantId: fullLicenseData.tenantId + '_2'
        };
        
        const { license: secondLicense } = await LicenseGenerator.createLicense(secondLicenseData);
        expect(secondLicense.licenseNumber).not.toBe(license.licenseNumber);
        
        // Verify both licenses exist in database with unique license numbers
        const allLicenses = await License.find({});
        const licenseNumbers = allLicenses.map(l => l.licenseNumber);
        const uniqueLicenseNumbers = [...new Set(licenseNumbers)];
        expect(licenseNumbers).toHaveLength(uniqueLicenseNumbers.length);
      }
    ), { numRuns: 100 });
  });
  
  test('License Number Generation via Mongoose Pre-save Hook', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 11: License Number Format Validation
     * Validates: Requirements 4.1 - Testing the Mongoose pre-save middleware
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        tenantId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tenantName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
        expiresAt: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).filter(d => !isNaN(d.getTime())) // At least 1 day in future, filter invalid dates
      }),
      async (licenseData) => {
        // Create license directly using Mongoose model (triggers pre-save hook)
        const license = new License({
          ...licenseData,
          features: {
            modules: ['hr-core'],
            maxUsers: 50,
            maxStorage: 10240,
            maxAPICallsPerMonth: 100000
          }
        });
        
        // Save should trigger pre-save hook to generate license number
        await license.save();
        
        // Verify license number was generated and follows format
        expect(license.licenseNumber).toBeDefined();
        expect(license.licenseNumber).toMatch(/^HRSM-[0-9A-F]+-[0-9A-F]{8}$/);
        
        // Verify the license number is unique
        const duplicateCheck = await License.findOne({
          licenseNumber: license.licenseNumber,
          _id: { $ne: license._id }
        });
        expect(duplicateCheck).toBeNull();
      }
    ), { numRuns: 50 });
  });
  
  test('License Number Uniqueness Under Concurrent Creation', async () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 11: License Number Format Validation
     * Validates: Requirements 4.1 - Testing uniqueness under concurrent operations
     */
    const concurrentLicenseCount = 10;
    const licensePromises = [];
    
    // Create multiple licenses concurrently
    for (let i = 0; i < concurrentLicenseCount; i++) {
      const licenseData = {
        tenantId: `tenant_${i}`,
        tenantName: `Tenant ${i}`,
        type: 'trial',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        modules: ['hr-core'],
        maxUsers: 50,
        maxStorage: 10240,
        maxAPICallsPerMonth: 100000
      };
      
      licensePromises.push(LicenseGenerator.createLicense(licenseData));
    }
    
    // Wait for all licenses to be created
    const results = await Promise.all(licensePromises);
    
    // Verify all license numbers are unique
    const licenseNumbers = results.map(result => result.license.licenseNumber);
    const uniqueLicenseNumbers = [...new Set(licenseNumbers)];
    
    expect(licenseNumbers).toHaveLength(concurrentLicenseCount);
    expect(uniqueLicenseNumbers).toHaveLength(concurrentLicenseCount);
    
    // Verify all follow the correct format
    licenseNumbers.forEach(licenseNumber => {
      expect(licenseNumber).toMatch(/^HRSM-[0-9A-F]+-[0-9A-F]{8}$/);
    });
  });
  
  test('Static License Number Generation Method', () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 11: License Number Format Validation
     * Validates: Requirements 4.1 - Testing the static generation method
     */
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      (iterations) => {
        const generatedNumbers = new Set();
        
        for (let i = 0; i < iterations; i++) {
          const licenseNumber = LicenseGenerator.constructor.generateLicenseNumber();
          
          // Verify format
          expect(licenseNumber).toMatch(/^HRSM-[0-9A-F]+-[0-9A-F]{8}$/);
          
          // Verify uniqueness
          expect(generatedNumbers.has(licenseNumber)).toBe(false);
          generatedNumbers.add(licenseNumber);
          
          // Verify components
          const parts = licenseNumber.split('-');
          expect(parts).toHaveLength(3);
          expect(parts[0]).toBe('HRSM');
          expect(parts[1]).toMatch(/^[0-9A-F]+$/);
          expect(parts[2]).toMatch(/^[0-9A-F]{8}$/);
        }
      }
    ), { numRuns: 10 });
  });
});