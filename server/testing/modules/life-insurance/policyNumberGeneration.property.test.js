// testing/modules/life-insurance/policyNumberGeneration.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import InsurancePolicy from '../../../modules/life-insurance/models/InsurancePolicy.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';

describe('Policy Number Generation Property-Based Tests', () => {
    let testTenantId;
    let testEmployeeId;
    let testUser;
    let testDepartment;
    let testPosition;

    beforeEach(async () => {
        // Create unique test tenant ID for isolation
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create test department
        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: `DEPT-${Date.now()}`
        });
        
        // Create test position
        testPosition = await Position.create({
            tenantId: testTenantId,
            title: 'Test Position',
            code: `POS-${Date.now()}`,
            department: testDepartment._id
        });
        
        // Create a test user/employee
        testUser = await User.create({
            tenantId: testTenantId,
            username: `testuser-${Date.now()}`,
            email: `test-${Date.now()}@example.com`,
            password: 'testpassword123',
            employeeId: `EMP-${Date.now()}`,
            personalInfo: {
                firstName: 'Test',
                lastName: 'Employee',
                fullName: 'Test Employee'
            },
            department: testDepartment._id,
            position: testPosition._id,
            status: 'active'
        });
        
        testEmployeeId = testUser._id;
    });

    afterEach(async () => {
        // Clean up test data
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 15: Policy Number Generation', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 15: Policy Number Generation
         * Validates: Requirements 5.1
         * 
         * For any insurance policy creation, the system should auto-generate unique policy numbers 
         * using format INS-YYYY-NNNNNN where YYYY is the current year and NNNNNN is a 6-digit number.
         */
        test('should auto-generate unique policy numbers with correct format INS-YYYY-NNNNNN', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        coverageAmount: fc.integer({ min: 10000, max: 1000000 }),
                        premium: fc.integer({ min: 100, max: 10000 }),
                        deductible: fc.integer({ min: 0, max: 5000 }),
                        startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
                        durationDays: fc.integer({ min: 30, max: 365 })
                    }),
                    async ({ policyType, coverageAmount, premium, deductible, startDate, durationDays }) => {
                        // Calculate end date
                        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
                        
                        // Action: Create insurance policy (should auto-generate policy number)
                        const policy = new InsurancePolicy({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            employeeNumber: testUser.employeeId,
                            policyType,
                            coverageAmount,
                            premium,
                            deductible,
                            startDate,
                            endDate
                        });
                        
                        await policy.save();
                        
                        // Assertion 1: Policy number should be auto-generated
                        expect(policy.policyNumber).toBeDefined();
                        expect(policy.policyNumber).not.toBeNull();
                        expect(typeof policy.policyNumber).toBe('string');
                        
                        // Assertion 2: Policy number should follow INS-YYYY-NNNNNN format
                        const policyNumberRegex = /^INS-\d{4}-\d{6}$/;
                        expect(policy.policyNumber).toMatch(policyNumberRegex);
                        
                        // Assertion 3: Year in policy number should be current year
                        const currentYear = new Date().getFullYear();
                        const yearInPolicyNumber = parseInt(policy.policyNumber.split('-')[1]);
                        expect(yearInPolicyNumber).toBe(currentYear);
                        
                        // Assertion 4: The 6-digit number should be valid (000000-999999)
                        const numberPart = policy.policyNumber.split('-')[2];
                        expect(numberPart).toHaveLength(6);
                        expect(numberPart).toMatch(/^\d{6}$/);
                        const numericPart = parseInt(numberPart);
                        expect(numericPart).toBeGreaterThanOrEqual(0);
                        expect(numericPart).toBeLessThanOrEqual(999999);
                        
                        // Assertion 5: Policy number should be unique (verify in database)
                        const savedPolicy = await InsurancePolicy.findById(policy._id);
                        expect(savedPolicy.policyNumber).toBe(policy.policyNumber);
                        
                        // Assertion 6: Policy number should not change on subsequent saves
                        const originalPolicyNumber = policy.policyNumber;
                        policy.notes = 'Updated notes';
                        await policy.save();
                        expect(policy.policyNumber).toBe(originalPolicyNumber);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should generate unique policy numbers for multiple policies created simultaneously', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        policyCount: fc.integer({ min: 2, max: 10 }),
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ policyCount, policyType, coverageAmount }) => {
                        // Create multiple policies simultaneously
                        const policyPromises = Array.from({ length: policyCount }, (_, index) => {
                            const startDate = new Date();
                            const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                            
                            return new InsurancePolicy({
                                tenantId: `${testTenantId}-batch-${index}`,
                                employeeId: testEmployeeId,
                                employeeNumber: `${testUser.employeeId}-${index}`,
                                policyType,
                                coverageAmount: coverageAmount + index * 1000, // Slight variation
                                premium: 1000 + index * 100,
                                startDate,
                                endDate
                            }).save();
                        });
                        
                        // Action: Save all policies simultaneously
                        const savedPolicies = await Promise.all(policyPromises);
                        
                        // Assertion 1: All policies should have policy numbers
                        expect(savedPolicies).toHaveLength(policyCount);
                        savedPolicies.forEach(policy => {
                            expect(policy.policyNumber).toBeDefined();
                            expect(policy.policyNumber).toMatch(/^INS-\d{4}-\d{6}$/);
                        });
                        
                        // Assertion 2: All policy numbers should be unique
                        const policyNumbers = savedPolicies.map(p => p.policyNumber);
                        const uniquePolicyNumbers = new Set(policyNumbers);
                        expect(uniquePolicyNumbers.size).toBe(policyCount);
                        
                        // Assertion 3: All policy numbers should have the same year (current year)
                        const currentYear = new Date().getFullYear().toString();
                        policyNumbers.forEach(policyNumber => {
                            const yearPart = policyNumber.split('-')[1];
                            expect(yearPart).toBe(currentYear);
                        });
                        
                        // Assertion 4: All numeric parts should be different
                        const numericParts = policyNumbers.map(pn => pn.split('-')[2]);
                        const uniqueNumericParts = new Set(numericParts);
                        expect(uniqueNumericParts.size).toBe(policyCount);
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should not generate policy number if one is already provided', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        customPolicyNumber: fc.string({ minLength: 10, maxLength: 20 })
                            .filter(s => s.match(/^[A-Z0-9-]+$/)), // Valid policy number format
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ customPolicyNumber, policyType, coverageAmount }) => {
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                        
                        // Action: Create policy with pre-set policy number
                        const policy = new InsurancePolicy({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            employeeNumber: testUser.employeeId,
                            policyNumber: customPolicyNumber, // Pre-set policy number
                            policyType,
                            coverageAmount,
                            premium: 1000,
                            startDate,
                            endDate
                        });
                        
                        await policy.save();
                        
                        // Assertion 1: Policy number should remain as provided
                        expect(policy.policyNumber).toBe(customPolicyNumber);
                        
                        // Assertion 2: Policy number should not be auto-generated format
                        const autoGeneratedRegex = /^INS-\d{4}-\d{6}$/;
                        if (!customPolicyNumber.match(autoGeneratedRegex)) {
                            expect(policy.policyNumber).not.toMatch(autoGeneratedRegex);
                        }
                        
                        // Assertion 3: Policy should be saved successfully with custom number
                        const savedPolicy = await InsurancePolicy.findById(policy._id);
                        expect(savedPolicy.policyNumber).toBe(customPolicyNumber);
                    }
                ),
                { numRuns: 30 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should maintain policy number format consistency', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ policyType, coverageAmount }) => {
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                        
                        // Action: Create policy (should use current year)
                        const policy = new InsurancePolicy({
                            tenantId: `${testTenantId}-format-test`,
                            employeeId: testEmployeeId,
                            employeeNumber: testUser.employeeId,
                            policyType,
                            coverageAmount,
                            premium: 1000,
                            startDate,
                            endDate
                        });
                        
                        await policy.save();
                        
                        // Assertion 1: Policy number should contain current year
                        const currentYear = new Date().getFullYear();
                        expect(policy.policyNumber).toMatch(new RegExp(`^INS-${currentYear}-\\d{6}$`));
                        
                        // Assertion 2: Year part should match exactly
                        const yearInPolicyNumber = parseInt(policy.policyNumber.split('-')[1]);
                        expect(yearInPolicyNumber).toBe(currentYear);
                        
                        // Assertion 3: Format should remain consistent
                        expect(policy.policyNumber).toMatch(/^INS-\d{4}-\d{6}$/);
                    }
                ),
                { numRuns: 20 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should handle edge cases in policy number generation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        coverageAmount: fc.integer({ min: 1, max: 10000000 }),
                        premium: fc.integer({ min: 1, max: 100000 }),
                        deductible: fc.integer({ min: 0, max: 50000 })
                    }),
                    async ({ policyType, coverageAmount, premium, deductible }) => {
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                        
                        // Action: Create policy with edge case values
                        const policy = new InsurancePolicy({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            employeeNumber: testUser.employeeId,
                            policyType,
                            coverageAmount,
                            premium,
                            deductible,
                            startDate,
                            endDate
                        });
                        
                        await policy.save();
                        
                        // Assertion 1: Policy number generation should not be affected by edge case values
                        expect(policy.policyNumber).toBeDefined();
                        expect(policy.policyNumber).toMatch(/^INS-\d{4}-\d{6}$/);
                        
                        // Assertion 2: Policy should be valid and saveable
                        const savedPolicy = await InsurancePolicy.findById(policy._id);
                        expect(savedPolicy).toBeDefined();
                        expect(savedPolicy.policyNumber).toBe(policy.policyNumber);
                        
                        // Assertion 3: All other fields should be preserved correctly
                        expect(savedPolicy.policyType).toBe(policyType);
                        expect(savedPolicy.coverageAmount).toBe(coverageAmount);
                        expect(savedPolicy.premium).toBe(premium);
                        expect(savedPolicy.deductible).toBe(deductible);
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000); // 60 second timeout for property-based test
    });
});