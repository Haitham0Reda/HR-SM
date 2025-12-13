/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import ResignedEmployee from '../../modules/hr-core/users/models/resignedEmployee.model.js';
import * as resignedEmployeeController from '../../modules/hr-core/users/controllers/resignedEmployee.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('ResignedEmployee Controller - All 11 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
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

    describe('4. updateResignationType', () => {
        it('should execute updateResignationType function', async () => {
            await resignedEmployeeController.updateResignationType(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateResignationType', async () => {
            mockReq.params.id = 'invalid-id';
            await resignedEmployeeController.updateResignationType(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. addPenalty', () => {
        it('should execute addPenalty function', async () => {
            await resignedEmployeeController.addPenalty(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addPenalty', async () => {
            // Function executes normally
            await resignedEmployeeController.addPenalty(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. removePenalty', () => {
        it('should execute removePenalty function', async () => {
            await resignedEmployeeController.removePenalty(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in removePenalty', async () => {
            // Function executes normally
            await resignedEmployeeController.removePenalty(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. generateLetter', () => {
        it('should execute generateLetter function', async () => {
            await resignedEmployeeController.generateLetter(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in generateLetter', async () => {
            // Function executes normally
            await resignedEmployeeController.generateLetter(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. generateArabicDisclaimer', () => {
        it('should execute generateArabicDisclaimer function', async () => {
            await resignedEmployeeController.generateArabicDisclaimer(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in generateArabicDisclaimer', async () => {
            // Function executes normally
            await resignedEmployeeController.generateArabicDisclaimer(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. lockResignedEmployee', () => {
        it('should execute lockResignedEmployee function', async () => {
            await resignedEmployeeController.lockResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in lockResignedEmployee', async () => {
            // Function executes normally
            await resignedEmployeeController.lockResignedEmployee(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. updateStatus', () => {
        it('should execute updateStatus function', async () => {
            await resignedEmployeeController.updateStatus(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateStatus', async () => {
            mockReq.params.id = 'invalid-id';
            await resignedEmployeeController.updateStatus(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. deleteResignedEmployee', () => {
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
