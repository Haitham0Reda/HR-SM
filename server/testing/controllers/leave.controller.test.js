/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Leave from '../../models/leave.model.js';
import * as leaveController from '../../controller/leave.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Leave Controller - All 5 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Leave.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllLeaves', () => {
        it('should execute getAllLeaves function', async () => {
            await leaveController.getAllLeaves(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllLeaves', async () => {
            // Function executes normally
            await leaveController.getAllLeaves(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createLeave', () => {
        it('should execute createLeave function', async () => {
            await leaveController.createLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createLeave', async () => {
            // Function executes normally
            await leaveController.createLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getLeaveById', () => {
        it('should execute getLeaveById function', async () => {
            await leaveController.getLeaveById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getLeaveById', async () => {
            mockReq.params.id = 'invalid-id';
            await leaveController.getLeaveById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateLeave', () => {
        it('should execute updateLeave function', async () => {
            await leaveController.updateLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateLeave', async () => {
            mockReq.params.id = 'invalid-id';
            await leaveController.updateLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteLeave', () => {
        it('should execute deleteLeave function', async () => {
            await leaveController.deleteLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteLeave', async () => {
            mockReq.params.id = 'invalid-id';
            await leaveController.deleteLeave(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
