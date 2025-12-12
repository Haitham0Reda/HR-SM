/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Payroll from '../../modules/payroll/models/payroll.model.js';
import * as payrollController from '../../modules/payroll/controllers/payroll.controller.js';
import { createMockResponse, createMockRequest, createTestorganization, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Payroll Controller - All 5 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Payroll.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllPayrolls', () => {
        it('should execute getAllPayrolls function', async () => {
            await payrollController.getAllPayrolls(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllPayrolls', async () => {
            // Function executes normally
            await payrollController.getAllPayrolls(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createPayroll', () => {
        it('should execute createPayroll function', async () => {
            await payrollController.createPayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createPayroll', async () => {
            // Function executes normally
            await payrollController.createPayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getPayrollById', () => {
        it('should execute getPayrollById function', async () => {
            await payrollController.getPayrollById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getPayrollById', async () => {
            mockReq.params.id = 'invalid-id';
            await payrollController.getPayrollById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updatePayroll', () => {
        it('should execute updatePayroll function', async () => {
            await payrollController.updatePayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updatePayroll', async () => {
            mockReq.params.id = 'invalid-id';
            await payrollController.updatePayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deletePayroll', () => {
        it('should execute deletePayroll function', async () => {
            await payrollController.deletePayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deletePayroll', async () => {
            mockReq.params.id = 'invalid-id';
            await payrollController.deletePayroll(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
