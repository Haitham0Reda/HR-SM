/**
 * Self-Service Employee Functionality Tests
 * 
 * Tests for self-service employee functionality implementation
 * Validates Requirements 8.2, 8.3, 8.4
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ROLES } from '../../../shared/constants/modules.js';

// Mock the models
const mockFamilyMember = {
    withTenant: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
};

const mockInsuranceClaim = {
    withTenant: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    find: jest.fn()
};

const mockInsurancePolicy = {
    withTenant: jest.fn().mockReturnThis(),
    findOne: jest.fn()
};

const mockUser = {
    withTenant: jest.fn().mockReturnThis(),
    findById: jest.fn(),
    findOne: jest.fn()
};

// Mock the imports
jest.mock('../../../modules/life-insurance/models/FamilyMember.js', () => ({
    default: mockFamilyMember
}));

jest.mock('../../../modules/life-insurance/models/InsuranceClaim.js', () => ({
    default: mockInsuranceClaim
}));

jest.mock('../../../modules/life-insurance/models/InsurancePolicy.js', () => ({
    default: mockInsurancePolicy
}));

jest.mock('../../../modules/hr-core/users/models/user.model.js', () => ({
    default: mockUser
}));

// Mock the employee service
const mockEmployeeService = {
    canAccessEmployee: jest.fn()
};

jest.mock('../../../modules/life-insurance/services/employeeService.js', () => ({
    default: mockEmployeeService
}));

// Mock middleware
jest.mock('../../../middleware/authMiddleware.js', () => ({
    protect: (req, res, next) => {
        req.user = {
            _id: req.headers['x-user-id'] || 'employee123',
            role: req.headers['x-user-role'] || ROLES.EMPLOYEE,
            tenantId: 'test_tenant_123'
        };
        req.tenant = { id: 'test_tenant_123' };
        next();
    }
}));

jest.mock('../../../middleware/licenseValidation.middleware.js', () => ({
    requireModuleLicense: () => (req, res, next) => next()
}));

jest.mock('../../../shared/middleware/auth.js', () => ({
    requireRole: () => (req, res, next) => next()
}));

// Mock response utilities
jest.mock('../../../core/utils/response.js', () => ({
    sendSuccess: (res, data, message) => res.json({ success: true, data, message }),
    sendError: (res, message, status = 400) => res.status(status).json({ success: false, message })
}));

// Import controllers after mocking
import familyMemberController from '../../../modules/life-insurance/controllers/familyMemberController.js';
import claimController from '../../../modules/life-insurance/controllers/claimController.js';

describe('Self-Service Employee Functionality', () => {
    let app;
    let employeeUserId;
    let otherEmployeeId;
    let familyMemberId;
    let claimId;

    beforeEach(() => {
        // Create Express app for testing
        app = express();
        app.use(express.json());

        // Set up test data
        employeeUserId = 'employee123';
        otherEmployeeId = 'employee456';
        familyMemberId = 'family123';
        claimId = 'claim123';

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Family Member Operations - Self-Service Restrictions', () => {
        describe('Update Family Member', () => {
            test('should allow employee to update their own family member', async () => {
                // Mock family member belonging to the employee
                mockFamilyMember.findOne.mockResolvedValue({
                    _id: familyMemberId,
                    employeeId: employeeUserId,
                    firstName: 'John',
                    lastName: 'Doe',
                    save: jest.fn().mockResolvedValue(true)
                });

                // Create test route
                app.put('/family-members/:id', familyMemberController.updateFamilyMember);

                const response = await request(app)
                    .put(`/family-members/${familyMemberId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({ firstName: 'Jane' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should deny employee access to other employee\'s family member', async () => {
                // Mock family member belonging to another employee
                mockFamilyMember.findOne.mockResolvedValue({
                    _id: familyMemberId,
                    employeeId: otherEmployeeId,
                    firstName: 'John',
                    lastName: 'Doe'
                });

                // Create test route
                app.put('/family-members/:id', familyMemberController.updateFamilyMember);

                const response = await request(app)
                    .put(`/family-members/${familyMemberId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({ firstName: 'Jane' });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees can only update family members on their own policies');
            });
        });

        describe('View Family Member', () => {
            test('should allow employee to view their own family member', async () => {
                // Mock family member belonging to the employee
                mockFamilyMember.findOne.mockResolvedValue({
                    _id: familyMemberId,
                    employeeId: { _id: employeeUserId },
                    firstName: 'John',
                    lastName: 'Doe'
                });

                // Create test route
                app.get('/family-members/:id', familyMemberController.getFamilyMemberById);

                const response = await request(app)
                    .get(`/family-members/${familyMemberId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should deny employee access to view other employee\'s family member', async () => {
                // Mock family member belonging to another employee
                mockFamilyMember.findOne.mockResolvedValue({
                    _id: familyMemberId,
                    employeeId: { _id: otherEmployeeId },
                    firstName: 'John',
                    lastName: 'Doe'
                });

                // Create test route
                app.get('/family-members/:id', familyMemberController.getFamilyMemberById);

                const response = await request(app)
                    .get(`/family-members/${familyMemberId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees can only view family members on their own policies');
            });
        });
    });

    describe('Claim Operations - Self-Service Restrictions', () => {
        describe('Create Claim', () => {
            test('should allow employee to create claim for their own policy', async () => {
                const policyId = 'policy123';
                
                // Mock policy belonging to the employee
                mockInsurancePolicy.findOne.mockResolvedValue({
                    _id: policyId,
                    employeeId: { _id: employeeUserId },
                    status: 'active',
                    startDate: new Date('2023-01-01'),
                    endDate: new Date('2024-12-31'),
                    coverageAmount: 100000
                });

                // Mock user lookup for employee claim
                mockUser.findOne.mockResolvedValue({
                    _id: employeeUserId
                });

                // Mock claim creation
                const mockClaim = {
                    _id: claimId,
                    save: jest.fn().mockResolvedValue(true),
                    populate: jest.fn().mockResolvedValue({
                        _id: claimId,
                        claimNumber: 'CLM-2024-123456'
                    }),
                    workflow: []
                };
                
                // Mock the InsuranceClaim constructor
                jest.doMock('../../../modules/life-insurance/models/InsuranceClaim.js', () => ({
                    default: jest.fn().mockImplementation(() => mockClaim)
                }));

                // Create test route
                app.post('/claims', claimController.createClaim);

                const response = await request(app)
                    .post('/claims')
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        policyId,
                        claimantType: 'employee',
                        claimantId: employeeUserId,
                        claimType: 'medical',
                        incidentDate: '2024-01-15',
                        claimAmount: 5000,
                        description: 'Medical treatment claim'
                    });

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
            });

            test('should deny employee creating claim for other employee\'s policy', async () => {
                const policyId = 'policy123';
                
                // Mock policy belonging to another employee
                mockInsurancePolicy.findOne.mockResolvedValue({
                    _id: policyId,
                    employeeId: { _id: otherEmployeeId },
                    status: 'active'
                });

                // Create test route
                app.post('/claims', claimController.createClaim);

                const response = await request(app)
                    .post('/claims')
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        policyId,
                        claimantType: 'employee',
                        claimantId: otherEmployeeId,
                        claimType: 'medical',
                        incidentDate: '2024-01-15',
                        claimAmount: 5000,
                        description: 'Medical treatment claim'
                    });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees can only create claims for their own policies');
            });

            test('should deny employee creating employee claim for another employee', async () => {
                const policyId = 'policy123';
                
                // Mock policy belonging to the employee
                mockInsurancePolicy.findOne.mockResolvedValue({
                    _id: policyId,
                    employeeId: { _id: employeeUserId },
                    status: 'active'
                });

                // Create test route
                app.post('/claims', claimController.createClaim);

                const response = await request(app)
                    .post('/claims')
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        policyId,
                        claimantType: 'employee',
                        claimantId: otherEmployeeId, // Different employee ID
                        claimType: 'medical',
                        incidentDate: '2024-01-15',
                        claimAmount: 5000,
                        description: 'Medical treatment claim'
                    });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees can only create employee claims for themselves');
            });
        });

        describe('View Claim', () => {
            test('should allow employee to view their own claim', async () => {
                // Mock claim belonging to the employee
                mockInsuranceClaim.findOne.mockResolvedValue({
                    _id: claimId,
                    employeeId: { _id: employeeUserId },
                    claimNumber: 'CLM-2024-123456',
                    status: 'pending'
                });

                // Create test route
                app.get('/claims/:id', claimController.getClaimById);

                const response = await request(app)
                    .get(`/claims/${claimId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should deny employee access to other employee\'s claim', async () => {
                // Mock claim belonging to another employee
                mockInsuranceClaim.findOne.mockResolvedValue({
                    _id: claimId,
                    employeeId: { _id: otherEmployeeId },
                    claimNumber: 'CLM-2024-123456',
                    status: 'pending'
                });

                // Create test route
                app.get('/claims/:id', claimController.getClaimById);

                const response = await request(app)
                    .get(`/claims/${claimId}`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees can only view claims for their own policies');
            });
        });

        describe('Administrative Operations - Employee Restrictions', () => {
            test('should deny employee from reviewing claims', async () => {
                // Mock claim belonging to the employee
                mockInsuranceClaim.findOne.mockResolvedValue({
                    _id: claimId,
                    employeeId: employeeUserId,
                    status: 'pending'
                });

                // Create test route
                app.patch('/claims/:id/review', claimController.reviewClaim);

                const response = await request(app)
                    .patch(`/claims/${claimId}/review`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        action: 'approve',
                        approvedAmount: 5000,
                        reviewNotes: 'Approved'
                    });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees cannot review claims. Only managers, HR, and admins can review claims');
            });

            test('should deny employee from processing claim payments', async () => {
                // Mock claim belonging to the employee
                mockInsuranceClaim.findOne.mockResolvedValue({
                    _id: claimId,
                    employeeId: employeeUserId,
                    status: 'approved'
                });

                // Create test route
                app.patch('/claims/:id/process-payment', claimController.processClaim);

                const response = await request(app)
                    .patch(`/claims/${claimId}/process-payment`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        paymentMethod: 'bank_transfer',
                        paymentReference: 'REF123'
                    });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees cannot process claim payments. Only managers, HR, and admins can process payments');
            });

            test('should deny employee from updating claim status', async () => {
                // Mock claim belonging to the employee
                mockInsuranceClaim.findOne.mockResolvedValue({
                    _id: claimId,
                    employeeId: employeeUserId,
                    status: 'pending'
                });

                // Create test route
                app.patch('/claims/:id/status', claimController.updateClaimStatus);

                const response = await request(app)
                    .patch(`/claims/${claimId}/status`)
                    .set('x-user-id', employeeUserId)
                    .set('x-user-role', ROLES.EMPLOYEE)
                    .send({
                        status: 'under_review',
                        notes: 'Moving to review'
                    });

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Employees cannot update claim status. Only managers, HR, and admins can update claim status');
            });
        });
    });

    describe('Cross-Employee Data Access Prevention', () => {
        test('should prevent employee from accessing family member data across employees', async () => {
            // Mock family member belonging to another employee
            mockFamilyMember.findOne.mockResolvedValue({
                _id: familyMemberId,
                employeeId: otherEmployeeId,
                firstName: 'John',
                lastName: 'Doe'
            });

            // Create test route
            app.put('/family-members/:id', familyMemberController.updateFamilyMember);

            const response = await request(app)
                .put(`/family-members/${familyMemberId}`)
                .set('x-user-id', employeeUserId)
                .set('x-user-role', ROLES.EMPLOYEE)
                .send({ firstName: 'Jane' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('own policies');
        });

        test('should prevent employee from accessing claim data across employees', async () => {
            // Mock claim belonging to another employee
            mockInsuranceClaim.findOne.mockResolvedValue({
                _id: claimId,
                employeeId: { _id: otherEmployeeId },
                claimNumber: 'CLM-2024-123456',
                status: 'pending'
            });

            // Create test route
            app.get('/claims/:id', claimController.getClaimById);

            const response = await request(app)
                .get(`/claims/${claimId}`)
                .set('x-user-id', employeeUserId)
                .set('x-user-role', ROLES.EMPLOYEE);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('own policies');
        });
    });
});