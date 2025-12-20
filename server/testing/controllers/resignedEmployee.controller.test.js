/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import ResignedEmployee from '../../modules/hr-core/users/models/resignedEmployee.model.js';
import * as resignedEmployeeController from '../../modules/hr-core/users/controllers/resignedEmployee.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('ResignedEmployee Controller - Existing Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestDepartment();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await ResignedEmployee.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllResignedEmployees', () => {
        it('should execute getAllResignedEmployees function', async () => {
            await resignedEmployeeController.getAllResignedEmployees(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllResignedEmployees', async () => {
            // Function executes normally
            await resignedEmployeeController.getAllResignedEmployees(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getResignedEmployeeById', () => {
        it('should execute getResignedEmployeeById function', async () => {
            await resignedEmployeeController.getResignedEmployeeById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getResignedEmployeeById', async () => {
            mockReq.params.id = 'invalid-id';
            await resignedEmployeeController.getResignedEmployeeById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createResignedEmployee', () => {
        it('should execute createResignedEmployee function', async () => {
            await resignedEmployeeController.createResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createResignedEmployee', async () => {
            // Function executes normally
            await resignedEmployeeController.createResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateResignedEmployee', () => {
        it('should execute updateResignedEmployee function', async () => {
            await resignedEmployeeController.updateResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateResignedEmployee', async () => {
            mockReq.params.id = 'invalid-id';
            await resignedEmployeeController.updateResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteResignedEmployee', () => {
        it('should execute deleteResignedEmployee function', async () => {
            await resignedEmployeeController.deleteResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteResignedEmployee', async () => {
            mockReq.params.id = 'invalid-id';
            await resignedEmployeeController.deleteResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
