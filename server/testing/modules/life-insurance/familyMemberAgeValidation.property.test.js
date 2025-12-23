// testing/modules/life-insurance/familyMemberAgeValidation.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import InsurancePolicy from '../../../modules/life-insurance/models/InsurancePolicy.js';
import FamilyMember from '../../../modules/life-insurance/models/FamilyMember.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';

describe('Family Member Age Validation Property-Based Tests', () => {
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

    describe('Property 17: Family Member Age Validation', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 17: Family Member Age Validation
         * Validates: Requirements 5.2
         * 
         * For any family member with relationship 'child', the system should validate that 
         * children are under 25 years old. Children 25 years or older should be rejected.
         */
        test('should accept children under 25 years old', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        ageYears: fc.integer({ min: 0, max: 24 }), // Children under 25
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, ageYears, coverageAmount }) => {
                        // Calculate date of birth based on age (ensuring child is under 25)
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                        
                        // Action: Create family member with relationship 'child' under 25
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship: 'child',
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        // Assertion 1: Child under 25 should be saved successfully
                        await expect(familyMember.save()).resolves.toBeDefined();
                        
                        // Assertion 2: Age virtual should calculate correctly
                        expect(familyMember.age).toBeLessThan(25);
                        expect(familyMember.age).toBeGreaterThanOrEqual(0);
                        
                        // Assertion 3: Family member should be persisted in database
                        const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                        expect(savedFamilyMember).toBeDefined();
                        expect(savedFamilyMember.relationship).toBe('child');
                        expect(savedFamilyMember.age).toBeLessThan(25);
                        
                        // Assertion 4: Insurance number should be generated
                        expect(savedFamilyMember.insuranceNumber).toBeDefined();
                        expect(savedFamilyMember.insuranceNumber).toMatch(/^INS-\d{4}-\d{6}-\d+$/);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should reject children 25 years or older', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        ageYears: fc.integer({ min: 25, max: 50 }), // Children 25 or older
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, ageYears, coverageAmount }) => {
                        // Calculate date of birth based on age (ensuring child is 25 or older)
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                        
                        // Action: Attempt to create family member with relationship 'child' 25 or older
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship: 'child',
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        // Assertion 1: Child 25 or older should be rejected with validation error
                        await expect(familyMember.save()).rejects.toThrow('Children must be under 25 years old for coverage');
                        
                        // Assertion 2: Age virtual should calculate correctly (even though save fails)
                        expect(familyMember.age).toBeGreaterThanOrEqual(25);
                        
                        // Assertion 3: Family member should NOT be persisted in database
                        const savedFamilyMember = await FamilyMember.findOne({
                            tenantId: testTenantId,
                            firstName,
                            lastName,
                            relationship: 'child'
                        });
                        expect(savedFamilyMember).toBeNull();
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should not apply age restrictions to spouse and parent relationships', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        relationship: fc.constantFrom('spouse', 'parent'),
                        ageYears: fc.integer({ min: 25, max: 80 }), // Adults of any age
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, relationship, ageYears, coverageAmount }) => {
                        // Calculate date of birth based on age
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
                        
                        // Action: Create family member with spouse/parent relationship (any age)
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
                        
                        // Assertion 1: Spouse/parent of any age should be saved successfully
                        await expect(familyMember.save()).resolves.toBeDefined();
                        
                        // Assertion 2: Age virtual should calculate correctly
                        expect(familyMember.age).toBe(ageYears);
                        
                        // Assertion 3: Family member should be persisted in database
                        const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                        expect(savedFamilyMember).toBeDefined();
                        expect(savedFamilyMember.relationship).toBe(relationship);
                        expect(savedFamilyMember.age).toBe(ageYears);
                        
                        // Assertion 4: Insurance number should be generated
                        expect(savedFamilyMember.insuranceNumber).toBeDefined();
                        expect(savedFamilyMember.insuranceNumber).toMatch(/^INS-\d{4}-\d{6}-\d+$/);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should handle edge cases around 25th birthday', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        daysFromBirthday: fc.integer({ min: -30, max: 30 }), // Days before/after 25th birthday
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, daysFromBirthday, coverageAmount }) => {
                        // Calculate date of birth exactly 25 years ago, then adjust by days
                        const dateOfBirth = new Date();
                        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);
                        dateOfBirth.setDate(dateOfBirth.getDate() + daysFromBirthday);
                        
                        // Calculate expected age
                        const today = new Date();
                        let expectedAge = today.getFullYear() - dateOfBirth.getFullYear();
                        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
                        
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
                            expectedAge--;
                        }
                        
                        // Action: Create family member with relationship 'child' around 25th birthday
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship: 'child',
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        if (expectedAge < 25) {
                            // Assertion 1: Child under 25 should be accepted
                            await expect(familyMember.save()).resolves.toBeDefined();
                            
                            // Assertion 2: Age should be calculated correctly
                            expect(familyMember.age).toBeLessThan(25);
                            
                            // Assertion 3: Family member should be persisted
                            const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                            expect(savedFamilyMember).toBeDefined();
                            expect(savedFamilyMember.age).toBeLessThan(25);
                        } else {
                            // Assertion 1: Child 25 or older should be rejected
                            await expect(familyMember.save()).rejects.toThrow('Children must be under 25 years old for coverage');
                            
                            // Assertion 2: Age should be calculated correctly
                            expect(familyMember.age).toBeGreaterThanOrEqual(25);
                            
                            // Assertion 3: Family member should NOT be persisted
                            const savedFamilyMember = await FamilyMember.findOne({
                                tenantId: testTenantId,
                                firstName,
                                lastName,
                                relationship: 'child'
                            });
                            expect(savedFamilyMember).toBeNull();
                        }
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should validate age correctly across different birth dates and current dates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        birthYear: fc.integer({ min: 2000, max: 2024 }), // Recent birth years
                        birthMonth: fc.integer({ min: 0, max: 11 }), // 0-11 for months
                        birthDay: fc.integer({ min: 1, max: 28 }), // 1-28 to avoid month-end issues
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, birthYear, birthMonth, birthDay, coverageAmount }) => {
                        // Create specific date of birth
                        const dateOfBirth = new Date(birthYear, birthMonth, birthDay);
                        
                        // Calculate age manually for verification
                        const today = new Date();
                        let calculatedAge = today.getFullYear() - dateOfBirth.getFullYear();
                        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
                        
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
                            calculatedAge--;
                        }
                        
                        // Action: Create family member with relationship 'child'
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship: 'child',
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        // Assertion 1: Age virtual should match manual calculation
                        expect(familyMember.age).toBe(calculatedAge);
                        
                        if (calculatedAge < 25) {
                            // Assertion 2: Child under 25 should be accepted
                            await expect(familyMember.save()).resolves.toBeDefined();
                            
                            // Assertion 3: Saved family member should have correct age
                            const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                            expect(savedFamilyMember.age).toBe(calculatedAge);
                            expect(savedFamilyMember.age).toBeLessThan(25);
                        } else {
                            // Assertion 2: Child 25 or older should be rejected
                            await expect(familyMember.save()).rejects.toThrow('Children must be under 25 years old for coverage');
                            
                            // Assertion 3: Family member should NOT be persisted
                            const savedFamilyMember = await FamilyMember.findOne({
                                tenantId: testTenantId,
                                firstName,
                                lastName,
                                relationship: 'child'
                            });
                            expect(savedFamilyMember).toBeNull();
                        }
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should handle leap year birth dates correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
                        gender: fc.constantFrom('male', 'female', 'other'),
                        leapYear: fc.constantFrom(2000, 2004, 2008, 2012, 2016, 2020), // Leap years
                        coverageAmount: fc.integer({ min: 10000, max: 500000 })
                    }),
                    async ({ firstName, lastName, gender, leapYear, coverageAmount }) => {
                        // Create date of birth on February 29th of a leap year
                        const dateOfBirth = new Date(leapYear, 1, 29); // February 29th
                        
                        // Calculate age manually
                        const today = new Date();
                        let calculatedAge = today.getFullYear() - dateOfBirth.getFullYear();
                        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
                        
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
                            calculatedAge--;
                        }
                        
                        // Action: Create family member born on leap day
                        const familyMember = new FamilyMember({
                            tenantId: testTenantId,
                            employeeId: testEmployeeId,
                            policyId: testPolicy._id,
                            firstName,
                            lastName,
                            dateOfBirth,
                            gender,
                            relationship: 'child',
                            coverageStartDate: testPolicy.startDate,
                            coverageEndDate: testPolicy.endDate,
                            coverageAmount
                        });
                        
                        // Assertion 1: Age virtual should handle leap year correctly
                        expect(familyMember.age).toBe(calculatedAge);
                        
                        if (calculatedAge < 25) {
                            // Assertion 2: Child under 25 should be accepted
                            await expect(familyMember.save()).resolves.toBeDefined();
                            
                            // Assertion 3: Leap year birth date should be preserved
                            const savedFamilyMember = await FamilyMember.findById(familyMember._id);
                            expect(savedFamilyMember.dateOfBirth.getMonth()).toBe(1); // February
                            expect(savedFamilyMember.dateOfBirth.getDate()).toBe(29); // 29th
                            expect(savedFamilyMember.age).toBe(calculatedAge);
                        } else {
                            // Assertion 2: Child 25 or older should be rejected
                            await expect(familyMember.save()).rejects.toThrow('Children must be under 25 years old for coverage');
                        }
                    }
                ),
                { numRuns: 50 } // Fewer runs since leap years are limited
            );
        }, 60000); // 60 second timeout for property-based test
    });
});