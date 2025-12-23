// testing/modules/life-insurance/familyMemberInsuranceNumber.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import InsurancePolicy from '../../../modules/life-insurance/models/InsurancePolicy.js';
import FamilyMember from '../../../modules/life-insurance/models/FamilyMember.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';

describe('Family Member Insurance Number Derivation Property-Based Tests', () => {
    let testTenantId;
    let testEmployeeId;
    let testUser;
    let testDepartment;
    let testPosition;
    let testPolicy;

    beforeEach(async () => {
        // Create unique test tenant ID for isolation
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Clean up any existing test data first
        await FamilyMember.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        
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
        
        // Create a test insurance policy
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        testPolicy = await InsurancePolicy.create({
            tenantId: testTenantId,
            employeeId: testEmployeeId,
            employeeNumber: testUser.employeeId,
            policyType: 'CAT_C',
            coverageAmount: 100000,
            premium: 1000,
            startDate,
            endDate
        });
    });

    afterEach(async () => {
        // Clean up test data
        await FamilyMember.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 16: Family Member Insurance Number Derivation', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 16: Family Member Insurance Number Derivation
         * Validates: Requirements 5.2
         * 
         * For any family member added to an insurance policy, the system should generate derived 
         * insurance numbers using format {PolicyNumber}-N where N is the sequential number.
         */
        test('should auto-generate derived insurance numbers with format {PolicyNumber}-N', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        relationship: fc.constantFrom('spouse', 'child', 'parent'),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        ageYears: fc.integer({ min: 0, max: 80 }),
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, relationship, gender, ageYears, coverageAmount }) => {
                        // Calculate date of birth based on age
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                        
                        // Skip if child is 25 or older (validation rule)
                        if (relationship === 'child' && ageYears >= 25) {
                            return; // Skip this test case
                        }
                        
                        // Action: Create family member (should auto-generate insurance number)
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship,
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        await familyMember.save();
                        
                        // Assertion 1: Insurance number should be auto-generated
                        expect(familyMember.insuranceNumber).toBeDefined();
                        expect(familyMember.insuranceNumber).not.toBeNull();
                        expect(typeof familyMember.insuranceNumber).toBe('string');
                        
                        // Assertion 2: Insurance number should follow {PolicyNumber}-N format
                        const expectedPrefix = testPolicy.policyNumber;
                        expect(familyMember.insuranceNumber).toMatch(new RegExp(`^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`));
                        
                        // Assertion 3: Insurance number should start with policy number
                        expect(familyMember.insuranceNumber.startsWith(expectedPrefix)).toBe(true);
                        
                        // Assertion 4: The sequential number should be valid (positive integer)
                        const parts = familyMember.insuranceNumber.split('-');
                        const sequentialNumber = parseInt(parts[parts.length - 1]);
                        expect(sequentialNumber).toBeGreaterThan(0);
                        expect(Number.isInteger(sequentialNumber)).toBe(true);
                        
                        // Assertion 5: Insurance number should be unique in database
                        const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                        expect(savedFamilyMember.insuranceNumber).toBe(familyMember.insuranceNumber);
                        
                        // Assertion 6: Insurance number should not change on subsequent saves
                        const originalInsuranceNumber = familyMember.insuranceNumber;
                        familyMember.notes = 'Updated notes';
                        await familyMember.save();
                        expect(familyMember.insuranceNumber).toBe(originalInsuranceNumber);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should generate sequential insurance numbers for multiple family members', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        familyMemberCount: fc.integer({ min: 2, max: 5 }),
                        baseFirstName: fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        baseLastName: fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        relationship: fc.constantFrom('spouse', 'child', 'parent'),
                        gender: fc.constantFrom('male', 'female', 'other')
                    }),
                    async ({ familyMemberCount, baseFirstName, baseLastName, relationship, gender }) => {
                        // Create a unique tenant and policy for this test to ensure isolation
                        const uniqueTenantId = `${testTenantId}-seq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Create a unique policy for this test
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                        
                        const uniquePolicy = await InsurancePolicy.create({
                            tenantId: uniqueTenantId,
                            employeeId: testEmployeeId,
                            employeeNumber: `${testUser.employeeId}-seq`,
                            policyType: 'CAT_C',
                            coverageAmount: 100000,
                            premium: 1000,
                            startDate,
                            endDate
                        });
                        
                        // Create multiple family members for the same policy
                        const familyMembers = [];
                        
                        for (let i = 0; i < familyMemberCount; i++) {
                            // Calculate appropriate age based on relationship
                            let ageYears;
                            if (relationship === 'child') {
                                ageYears = Math.floor(Math.random() * 24); // 0-23 years for children
                            } else if (relationship === 'spouse') {
                                ageYears = 25 + Math.floor(Math.random() * 40); // 25-64 years for spouse
                            } else { // parent
                                ageYears = 50 + Math.floor(Math.random() * 30); // 50-79 years for parent
                            }
                            
                            const dateOfBirth = new Date();
                            dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                            
                            const familyMember = new FamilyMember({
                                tenantId: uniqueTenantId,
                                employeeId: testEmployeeId,
                                policyId: uniquePolicy._id,
                                firstName: `${baseFirstName}${i + 1}`,
                                lastName: baseLastName,
                                dateOfBirth,
                                gender,
                                relationship,
                                coverageStartDate: uniquePolicy.startDate,
                                coverageEndDate: uniquePolicy.endDate,
                                coverageAmount: 50000 + (i * 10000)
                            });
                            
                            await familyMember.save();
                            familyMembers.push(familyMember);
                        }
                        
                        // Assertion 1: All family members should have insurance numbers
                        expect(familyMembers).toHaveLength(familyMemberCount);
                        familyMembers.forEach(fm => {
                            expect(fm.insuranceNumber).toBeDefined();
                            expect(fm.insuranceNumber.startsWith(uniquePolicy.policyNumber)).toBe(true);
                        });
                        
                        // Assertion 2: All insurance numbers should be unique
                        const insuranceNumbers = familyMembers.map(fm => fm.insuranceNumber);
                        const uniqueInsuranceNumbers = new Set(insuranceNumbers);
                        expect(uniqueInsuranceNumbers.size).toBe(familyMemberCount);
                        
                        // Assertion 3: Sequential numbers should be consecutive starting from 1
                        const sequentialNumbers = insuranceNumbers.map(num => {
                            const parts = num.split('-');
                            return parseInt(parts[parts.length - 1]);
                        }).sort((a, b) => a - b);
                        
                        for (let i = 0; i < sequentialNumbers.length; i++) {
                            expect(sequentialNumbers[i]).toBe(i + 1);
                        }
                        
                        // Assertion 4: All insurance numbers should have the same policy prefix
                        const expectedPrefix = uniquePolicy.policyNumber;
                        insuranceNumbers.forEach(insuranceNumber => {
                            expect(insuranceNumber.startsWith(expectedPrefix)).toBe(true);
                        });
                        
                        // Clean up unique test data
                        await FamilyMember.deleteMany({ tenantId: uniqueTenantId });
                        await InsurancePolicy.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should handle insurance number generation for different policy types', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        policyType: fc.constantFrom('CAT_A', 'CAT_B', 'CAT_C'),
                        firstName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        relationship: fc.constantFrom('spouse', 'child', 'parent')
                    }),
                    async ({ policyType, firstName, lastName, relationship }) => {
                        // Create a new policy with different type
                        const startDate = new Date();
                        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
                        
                        const policy = await InsurancePolicy.create({
                            tenantId: `${testTenantId}-${policyType}`,
                            employeeId: testEmployeeId,
                            employeeNumber: `${testUser.employeeId}-${policyType}`,
                            policyType,
                            coverageAmount: 100000,
                            premium: 1000,
                            startDate,
                            endDate
                        });
                        
                        // Calculate appropriate age
                        let ageYears;
                        if (relationship === 'child') {
                            ageYears = Math.floor(Math.random() * 24); // 0-23 years
                        } else if (relationship === 'spouse') {
                            ageYears = 25 + Math.floor(Math.random() * 40); // 25-64 years
                        } else { // parent
                            ageYears = 50 + Math.floor(Math.random() * 30); // 50-79 years
                        }
                        
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                        
                        // Action: Create family member for this policy
                        const familyMember = new FamilyMember({
                            tenantId: `${testTenantId}-${policyType}`,
                            employeeId: testEmployeeId,
                            policyId: policy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender: 'other',
                            relationship,
                            coverageStartDate: policy.startDate,
                            coverageEndDate: policy.endDate,
                            coverageAmount: 50000
                        });
                        
                        await familyMember.save();
                        
                        // Assertion 1: Insurance number should be derived from the specific policy
                        expect(familyMember.insuranceNumber).toBeDefined();
                        expect(familyMember.insuranceNumber.startsWith(policy.policyNumber)).toBe(true);
                        
                        // Assertion 2: Insurance number should follow the correct format
                        const expectedPattern = new RegExp(`^${policy.policyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`);
                        expect(familyMember.insuranceNumber).toMatch(expectedPattern);
                        
                        // Assertion 3: Sequential number should be 1 (first family member for this policy)
                        const parts = familyMember.insuranceNumber.split('-');
                        const sequentialNumber = parseInt(parts[parts.length - 1]);
                        expect(sequentialNumber).toBe(1);
                        
                        // Assertion 4: Policy type should not affect insurance number format
                        expect(familyMember.insuranceNumber).toMatch(/^INS-\d{4}-\d{6}-\d+$/);
                    }
                ),
                { numRuns: 30 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should not generate insurance number if one is already provided', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        customInsuranceNumber: fc.string({ minLength: 10, maxLength: 25 })
                            .filter(s => s.match(/^[A-Z0-9-]+$/)), // Valid insurance number format
                        firstName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        relationship: fc.constantFrom('spouse', 'parent') // Avoid child to skip age validation
                    }),
                    async ({ customInsuranceNumber, firstName, lastName, relationship }) => {
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 30); // 30 years old
                        
                        // Action: Create family member with pre-set insurance number
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            insuranceNumber: customInsuranceNumber, // Pre-set insurance number
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender: 'other',
                            relationship,
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount: 50000
                        });
                        
                        await familyMember.save();
                        
                        // Assertion 1: Insurance number should remain as provided
                        expect(familyMember.insuranceNumber).toBe(customInsuranceNumber);
                        
                        // Assertion 2: Insurance number should not be auto-generated format
                        const autoGeneratedPattern = new RegExp(`^${testPolicy.policyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`);
                        if (!customInsuranceNumber.match(autoGeneratedPattern)) {
                            expect(familyMember.insuranceNumber).not.toMatch(autoGeneratedPattern);
                        }
                        
                        // Assertion 3: Family member should be saved successfully with custom number
                        const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                        expect(savedFamilyMember.insuranceNumber).toBe(customInsuranceNumber);
                    }
                ),
                { numRuns: 20 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should maintain insurance number consistency across policy updates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        relationship: fc.constantFrom('spouse', 'parent'),
                        newCoverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, relationship, newCoverageAmount }) => {
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 35); // 35 years old
                        
                        // Action: Create family member
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender: 'other',
                            relationship,
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount: 50000
                        });
                        
                        await familyMember.save();
                        const originalInsuranceNumber = familyMember.insuranceNumber;
                        
                        // Action: Update family member details
                        familyMember.coverageAmount = newCoverageAmount;
                        familyMember.notes = 'Updated coverage amount';
                        await familyMember.save();
                        
                        // Assertion 1: Insurance number should remain unchanged after updates
                        expect(familyMember.insuranceNumber).toBe(originalInsuranceNumber);
                        
                        // Assertion 2: Insurance number should still follow the correct format
                        const expectedPattern = new RegExp(`^${testPolicy.policyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`);
                        expect(familyMember.insuranceNumber).toMatch(expectedPattern);
                        
                        // Assertion 3: Updated fields should be saved correctly
                        expect(familyMember.coverageAmount).toBe(newCoverageAmount);
                        expect(familyMember.notes).toBe('Updated coverage amount');
                        
                        // Assertion 4: Database should reflect the unchanged insurance number
                        const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                        expect(savedFamilyMember.insuranceNumber).toBe(originalInsuranceNumber);
                    }
                ),
                { numRuns: 30 }
            );
        }, 60000); // 60 second timeout for property-based test
    });
});