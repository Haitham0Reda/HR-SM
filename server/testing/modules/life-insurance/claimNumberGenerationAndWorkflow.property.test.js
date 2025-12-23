// testing/modules/life-insurance/claimNumberGenerationAndWorkflow.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import InsuranceClaim from '../../../modules/life-insurance/models/InsuranceClaim.js';
import InsurancePolicy from '../../../modules/life-insurance/models/InsurancePolicy.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';
import FamilyMember from '../../../modules/life-insurance/models/FamilyMember.js';

describe('Claim Number Generation and Workflow Property-Based Tests', () => {
    let testTenantId;
    let testEmployeeId;
    let testPolicyId;
    let testUser;
    let testDepartment;
    let testPosition;
    let testPolicy;
    let testFamilyMember;

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
        
        // Create a test insurance policy
        testPolicy = await InsurancePolicy.create({
            tenantId: testTenantId,
            employeeId: testEmployeeId,
            employeeNumber: testUser.employeeId,
            policyType: 'CAT_C',
            coverageAmount: 100000,
            premium: 1000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        
        testPolicyId = testPolicy._id;
        
        // Create a test family member for family member claims
        testFamilyMember = await FamilyMember.create({
            tenantId: testTenantId,
            employeeId: testEmployeeId,
            policyId: testPolicyId,
            firstName: 'Test',
            lastName: 'FamilyMember',
            relationship: 'spouse',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            coverageStartDate: testPolicy.startDate,
            coverageEndDate: testPolicy.endDate,
            coverageAmount: 50000 // Required field
        });
    });

    afterEach(async () => {
        // Clean up test data
        await InsuranceClaim.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await FamilyMember.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 18: Claim Number Generation and Workflow', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 18: Claim Number Generation and Workflow
         * Validates: Requirements 5.3
         * 
         * For any insurance claim processing, the system should auto-generate claim numbers 
         * using format CLM-YYYY-NNNNNN and support claim workflow from pending through 
         * review to approval/rejection and payment.
         */
        test('should auto-generate unique claim numbers with correct format CLM-YYYY-NNNNNN', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        claimType: fc.constantFrom('death', 'disability', 'medical', 'accident', 'other'),
                        claimAmount: fc.integer({ min: 1000, max: 500000 }),
                        description: fc.string({ minLength: 10, maxLength: 200 }),
                        claimantType: fc.constantFrom('employee', 'family_member'),
                        priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                        incidentDaysAgo: fc.integer({ min: 1, max: 365 })
                    }),
                    async ({ claimType, claimAmount, description, claimantType, priority, incidentDaysAgo }) => {
                        // Calculate incident date (in the past)
                        const incidentDate = new Date(Date.now() - incidentDaysAgo * 24 * 60 * 60 * 1000);
                        
                        // Determine claimant based on type
                        const claimantId = claimantType === 'employee' ? testEmployeeId : testFamilyMember._id;
                        
                        // Action: Create insurance claim (should auto-generate claim number)
                        const claim = new InsuranceClaim({
                            tenantId: testTenantId,
                            policyId: testPolicyId,
                            employeeId: testEmployeeId,
                            claimantType,
                            claimantId,
                            claimantModel: claimantType === 'employee' ? 'User' : 'FamilyMember',
                            claimType,
                            incidentDate,
                            claimAmount,
                            description,
                            priority
                        });
                        
                        await claim.save();
                        
                        // Assertion 1: Claim number should be auto-generated
                        expect(claim.claimNumber).toBeDefined();
                        expect(claim.claimNumber).not.toBeNull();
                        expect(typeof claim.claimNumber).toBe('string');
                        
                        // Assertion 2: Claim number should follow CLM-YYYY-NNNNNN format
                        const claimNumberRegex = /^CLM-\d{4}-\d{6}$/;
                        expect(claim.claimNumber).toMatch(claimNumberRegex);
                        
                        // Assertion 3: Year in claim number should be current year
                        const currentYear = new Date().getFullYear();
                        const yearInClaimNumber = parseInt(claim.claimNumber.split('-')[1]);
                        expect(yearInClaimNumber).toBe(currentYear);
                        
                        // Assertion 4: The 6-digit number should be valid (000000-999999)
                        const numberPart = claim.claimNumber.split('-')[2];
                        expect(numberPart).toHaveLength(6);
                        expect(numberPart).toMatch(/^\d{6}$/);
                        const numericPart = parseInt(numberPart);
                        expect(numericPart).toBeGreaterThanOrEqual(0);
                        expect(numericPart).toBeLessThanOrEqual(999999);
                        
                        // Assertion 5: Claim number should be unique (verify in database)
                        const savedClaim = await InsuranceClaim.findById(claim._id);
                        expect(savedClaim.claimNumber).toBe(claim.claimNumber);
                        
                        // Assertion 6: Claim number should not change on subsequent saves
                        const originalClaimNumber = claim.claimNumber;
                        claim.notes = 'Updated notes';
                        await claim.save();
                        expect(claim.claimNumber).toBe(originalClaimNumber);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should support complete claim workflow from pending to final status', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        claimType: fc.constantFrom('death', 'disability', 'medical', 'accident'),
                        claimAmount: fc.integer({ min: 5000, max: 200000 }),
                        description: fc.string({ minLength: 20, maxLength: 100 }),
                        approvedAmount: fc.integer({ min: 1000, max: 150000 }),
                        reviewNotes: fc.string({ minLength: 10, maxLength: 50 }),
                        paymentMethod: fc.constantFrom('bank_transfer', 'check', 'cash'),
                        workflowPath: fc.constantFrom('approve_and_pay', 'reject', 'approve_only')
                    }),
                    async ({ claimType, claimAmount, description, approvedAmount, reviewNotes, paymentMethod, workflowPath }) => {
                        const incidentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
                        
                        // Action 1: Create claim (starts in 'pending' status)
                        const claim = new InsuranceClaim({
                            tenantId: testTenantId,
                            policyId: testPolicyId,
                            employeeId: testEmployeeId,
                            claimantType: 'employee',
                            claimantId: testEmployeeId,
                            claimantModel: 'User',
                            claimType,
                            incidentDate,
                            claimAmount,
                            description
                        });
                        
                        await claim.save();
                        
                        // Assertion 1: Initial status should be 'pending'
                        expect(claim.status).toBe('pending');
                        expect(claim.workflow).toHaveLength(0); // No workflow history yet
                        
                        // Action 2: Move to 'under_review' status
                        await claim.updateStatus('under_review', testEmployeeId, 'Starting review process');
                        
                        // Assertion 2: Status should be updated and workflow tracked
                        expect(claim.status).toBe('under_review');
                        expect(claim.workflow).toHaveLength(1);
                        expect(claim.workflow[0].status).toBe('under_review');
                        expect(claim.workflow[0].previousStatus).toBe('pending');
                        expect(claim.workflow[0].performedBy.toString()).toBe(testEmployeeId.toString());
                        
                        // Action 3: Follow different workflow paths
                        if (workflowPath === 'approve_and_pay') {
                            // Approve claim
                            await claim.approve(approvedAmount, testEmployeeId, reviewNotes);
                            
                            // Assertion 3a: Claim should be approved
                            expect(claim.status).toBe('approved');
                            expect(claim.approvedAmount).toBe(approvedAmount);
                            expect(claim.reviewedBy.toString()).toBe(testEmployeeId.toString());
                            expect(claim.reviewedAt).toBeDefined();
                            expect(claim.reviewNotes).toBe(reviewNotes);
                            expect(claim.workflow).toHaveLength(2);
                            
                            // Action 4: Process payment
                            claim.status = 'paid';
                            claim.paymentDate = new Date();
                            claim.paymentMethod = paymentMethod;
                            claim.paymentReference = `PAY-${Date.now()}`;
                            await claim.save();
                            
                            // Assertion 4a: Claim should be paid
                            expect(claim.status).toBe('paid');
                            expect(claim.paymentDate).toBeDefined();
                            expect(claim.paymentMethod).toBe(paymentMethod);
                            expect(claim.paymentReference).toBeDefined();
                            expect(claim.workflow).toHaveLength(3);
                            
                        } else if (workflowPath === 'reject') {
                            // Reject claim
                            await claim.reject(testEmployeeId, reviewNotes);
                            
                            // Assertion 3b: Claim should be rejected
                            expect(claim.status).toBe('rejected');
                            expect(claim.reviewedBy.toString()).toBe(testEmployeeId.toString());
                            expect(claim.reviewedAt).toBeDefined();
                            expect(claim.reviewNotes).toBe(reviewNotes);
                            expect(claim.workflow).toHaveLength(2);
                            expect(claim.workflow[1].status).toBe('rejected');
                            
                        } else if (workflowPath === 'approve_only') {
                            // Approve but don't pay yet
                            await claim.approve(approvedAmount, testEmployeeId, reviewNotes);
                            
                            // Assertion 3c: Claim should be approved but not paid
                            expect(claim.status).toBe('approved');
                            expect(claim.approvedAmount).toBe(approvedAmount);
                            expect(claim.paymentDate).toBeUndefined();
                            expect(claim.workflow).toHaveLength(2);
                        }
                        
                        // Assertion 5: Workflow history should be complete and chronological
                        expect(claim.workflow.length).toBeGreaterThan(0);
                        for (let i = 1; i < claim.workflow.length; i++) {
                            expect(claim.workflow[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                                claim.workflow[i - 1].timestamp.getTime()
                            );
                        }
                        
                        // Assertion 6: Final status should be valid workflow status
                        const validFinalStatuses = ['pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'];
                        expect(validFinalStatuses).toContain(claim.status);
                    }
                ),
                { numRuns: 100 } // Run 100 iterations as specified in design
            );
        }, 60000); // 60 second timeout for property-based test

        test('should generate unique claim numbers for multiple claims created simultaneously', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        claimCount: fc.integer({ min: 2, max: 8 }),
                        claimType: fc.constantFrom('medical', 'accident', 'other'),
                        baseClaimAmount: fc.integer({ min: 10000, max: 100000 })
                    }),
                    async ({ claimCount, claimType, baseClaimAmount }) => {
                        const incidentDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
                        
                        // Create multiple claims simultaneously
                        const claimPromises = Array.from({ length: claimCount }, (_, index) => {
                            return new InsuranceClaim({
                                tenantId: `${testTenantId}-batch-${index}`,
                                policyId: testPolicyId,
                                employeeId: testEmployeeId,
                                claimantType: 'employee',
                                claimantId: testEmployeeId,
                                claimantModel: 'User',
                                claimType,
                                incidentDate,
                                claimAmount: baseClaimAmount + index * 1000, // Slight variation
                                description: `Test claim ${index + 1} for ${claimType}`
                            }).save();
                        });
                        
                        // Action: Save all claims simultaneously
                        const savedClaims = await Promise.all(claimPromises);
                        
                        // Assertion 1: All claims should have claim numbers
                        expect(savedClaims).toHaveLength(claimCount);
                        savedClaims.forEach(claim => {
                            expect(claim.claimNumber).toBeDefined();
                            expect(claim.claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
                        });
                        
                        // Assertion 2: All claim numbers should be unique
                        const claimNumbers = savedClaims.map(c => c.claimNumber);
                        const uniqueClaimNumbers = new Set(claimNumbers);
                        expect(uniqueClaimNumbers.size).toBe(claimCount);
                        
                        // Assertion 3: All claim numbers should have the same year (current year)
                        const currentYear = new Date().getFullYear().toString();
                        claimNumbers.forEach(claimNumber => {
                            const yearPart = claimNumber.split('-')[1];
                            expect(yearPart).toBe(currentYear);
                        });
                        
                        // Assertion 4: All numeric parts should be different
                        const numericParts = claimNumbers.map(cn => cn.split('-')[2]);
                        const uniqueNumericParts = new Set(numericParts);
                        expect(uniqueNumericParts.size).toBe(claimCount);
                        
                        // Assertion 5: All claims should start with 'pending' status
                        savedClaims.forEach(claim => {
                            expect(claim.status).toBe('pending');
                        });
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should maintain workflow integrity during status transitions', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        claimType: fc.constantFrom('death', 'disability', 'medical'),
                        claimAmount: fc.integer({ min: 20000, max: 300000 }),
                        statusTransitions: fc.array(
                            fc.record({
                                status: fc.constantFrom('under_review', 'approved', 'rejected'),
                                notes: fc.string({ minLength: 5, maxLength: 30 })
                            }),
                            { minLength: 1, maxLength: 3 }
                        )
                    }),
                    async ({ claimType, claimAmount, statusTransitions }) => {
                        const incidentDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
                        
                        // Action 1: Create initial claim
                        const claim = new InsuranceClaim({
                            tenantId: testTenantId,
                            policyId: testPolicyId,
                            employeeId: testEmployeeId,
                            claimantType: 'employee',
                            claimantId: testEmployeeId,
                            claimantModel: 'User',
                            claimType,
                            incidentDate,
                            claimAmount,
                            description: `Test ${claimType} claim for workflow integrity`
                        });
                        
                        await claim.save();
                        
                        // Assertion 1: Initial state should be correct
                        expect(claim.status).toBe('pending');
                        expect(claim.workflow).toHaveLength(0);
                        
                        // Action 2: Apply status transitions
                        let previousStatus = 'pending';
                        for (let i = 0; i < statusTransitions.length; i++) {
                            const transition = statusTransitions[i];
                            await claim.updateStatus(transition.status, testEmployeeId, transition.notes);
                            
                            // Assertion 2: Each transition should be recorded
                            expect(claim.status).toBe(transition.status);
                            expect(claim.workflow).toHaveLength(i + 1);
                            
                            const workflowEntry = claim.workflow[i];
                            expect(workflowEntry.status).toBe(transition.status);
                            expect(workflowEntry.previousStatus).toBe(previousStatus);
                            expect(workflowEntry.performedBy.toString()).toBe(testEmployeeId.toString());
                            expect(workflowEntry.notes).toBe(transition.notes);
                            expect(workflowEntry.timestamp).toBeDefined();
                            
                            previousStatus = transition.status;
                        }
                        
                        // Assertion 3: Workflow should maintain chronological order
                        for (let i = 1; i < claim.workflow.length; i++) {
                            expect(claim.workflow[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                                claim.workflow[i - 1].timestamp.getTime()
                            );
                        }
                        
                        // Assertion 4: Claim should be retrievable with complete workflow
                        const retrievedClaim = await InsuranceClaim.findById(claim._id);
                        expect(retrievedClaim.workflow).toHaveLength(statusTransitions.length);
                        expect(retrievedClaim.status).toBe(claim.status);
                        expect(retrievedClaim.claimNumber).toBe(claim.claimNumber);
                    }
                ),
                { numRuns: 75 }
            );
        }, 60000); // 60 second timeout for property-based test

        test('should handle edge cases in claim number generation and workflow', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        claimType: fc.constantFrom('death', 'disability', 'medical', 'accident', 'other'),
                        claimAmount: fc.integer({ min: 1, max: 10000000 }),
                        description: fc.string({ minLength: 1, maxLength: 500 }),
                        priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                        claimantType: fc.constantFrom('employee', 'family_member')
                    }),
                    async ({ claimType, claimAmount, description, priority, claimantType }) => {
                        const incidentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
                        const claimantId = claimantType === 'employee' ? testEmployeeId : testFamilyMember._id;
                        
                        // Action: Create claim with edge case values
                        const claim = new InsuranceClaim({
                            tenantId: testTenantId,
                            policyId: testPolicyId,
                            employeeId: testEmployeeId,
                            claimantType,
                            claimantId,
                            claimantModel: claimantType === 'employee' ? 'User' : 'FamilyMember',
                            claimType,
                            incidentDate,
                            claimAmount,
                            description,
                            priority
                        });
                        
                        await claim.save();
                        
                        // Assertion 1: Claim number generation should not be affected by edge case values
                        expect(claim.claimNumber).toBeDefined();
                        expect(claim.claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
                        
                        // Assertion 2: Claim should be valid and saveable
                        const savedClaim = await InsuranceClaim.findById(claim._id);
                        expect(savedClaim).toBeDefined();
                        expect(savedClaim.claimNumber).toBe(claim.claimNumber);
                        
                        // Assertion 3: All fields should be preserved correctly
                        expect(savedClaim.claimType).toBe(claimType);
                        expect(savedClaim.claimAmount).toBe(claimAmount);
                        expect(savedClaim.description).toBe(description);
                        expect(savedClaim.priority).toBe(priority);
                        expect(savedClaim.claimantType).toBe(claimantType);
                        
                        // Assertion 4: Initial workflow state should be correct
                        expect(savedClaim.status).toBe('pending');
                        expect(savedClaim.workflow).toHaveLength(0);
                        
                        // Assertion 5: Workflow should function normally even with edge case data
                        await savedClaim.updateStatus('under_review', testEmployeeId, 'Edge case review');
                        expect(savedClaim.status).toBe('under_review');
                        expect(savedClaim.workflow).toHaveLength(1);
                    }
                ),
                { numRuns: 50 }
            );
        }, 60000); // 60 second timeout for property-based test
    });
});