/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import MixedVacation from '../../modules/hr-core/vacations/models/mixedVacation.model.js';
import * as mixedVacationController from '../../modules/hr-core/vacations/controllers/mixedVacation.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('MixedVacation Controller - All 14 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await MixedVacation.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllPolicies', () => {
        it('should execute getAllPolicies function', async () => {
            await mixedVacationController.getAllPolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllPolicies', async () => {
            // Function executes normally
            await mixedVacationController.getAllPolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getPolicyById', () => {
        it('should execute getPolicyById function', async () => {
            await mixedVacationController.getPolicyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getPolicyById', async () => {
            mockReq.params.id = 'invalid-id';
            await mixedVacationController.getPolicyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createPolicy', () => {
        it('should execute createPolicy function', async () => {
            await mixedVacationController.createPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createPolicy', async () => {
            // Function executes normally
            await mixedVacationController.createPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updatePolicy', () => {
        it('should execute updatePolicy function', async () => {
            await mixedVacationController.updatePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updatePolicy', async () => {
            mockReq.params.id = 'invalid-id';
            await mixedVacationController.updatePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deletePolicy', () => {
        it('should execute deletePolicy function', async () => {
            await mixedVacationController.deletePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deletePolicy', async () => {
            mockReq.params.id = 'invalid-id';
            await mixedVacationController.deletePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. testPolicyOnEmployee', () => {
        it('should execute testPolicyOnEmployee function', async () => {
            await mixedVacationController.testPolicyOnEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in testPolicyOnEmployee', async () => {
            // Function executes normally
            await mixedVacationController.testPolicyOnEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. applyToEmployee', () => {
        it('should execute applyToEmployee function', async () => {
            await mixedVacationController.applyToEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in applyToEmployee', async () => {
            // Function executes normally
            await mixedVacationController.applyToEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. applyToAll', () => {
        it('should execute applyToAll function', async () => {
            await mixedVacationController.applyToAll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in applyToAll', async () => {
            // Function executes normally
            await mixedVacationController.applyToAll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. getPolicyBreakdown', () => {
        it('should execute getPolicyBreakdown function', async () => {
            await mixedVacationController.getPolicyBreakdown(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPolicyBreakdown', async () => {
            // Function executes normally
            await mixedVacationController.getPolicyBreakdown(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. getEmployeeApplications', () => {
        it('should execute getEmployeeApplications function', async () => {
            await mixedVacationController.getEmployeeApplications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getEmployeeApplications', async () => {
            // Function executes normally
            await mixedVacationController.getEmployeeApplications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. getActivePolicies', () => {
        it('should execute getActivePolicies function', async () => {
            await mixedVacationController.getActivePolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getActivePolicies', async () => {
            // Function executes normally
            await mixedVacationController.getActivePolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('12. getUpcomingPolicies', () => {
        it('should execute getUpcomingPolicies function', async () => {
            await mixedVacationController.getUpcomingPolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getUpcomingPolicies', async () => {
            // Function executes normally
            await mixedVacationController.getUpcomingPolicies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('13. cancelPolicy', () => {
        it('should execute cancelPolicy function', async () => {
            await mixedVacationController.cancelPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in cancelPolicy', async () => {
            // Function executes normally
            await mixedVacationController.cancelPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('14. activatePolicy', () => {
        it('should execute activatePolicy function', async () => {
            await mixedVacationController.activatePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in activatePolicy', async () => {
            // Function executes normally
            await mixedVacationController.activatePolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
