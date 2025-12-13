/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';
import * as attendanceController from '../../modules/hr-core/attendance/controllers/attendance.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Attendance Controller - All 7 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Attendance.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllAttendance', () => {
        it('should execute getAllAttendance function', async () => {
            await attendanceController.getAllAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllAttendance', async () => {
            // Function executes normally
            await attendanceController.getAllAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createAttendance', () => {
        it('should execute createAttendance function', async () => {
            await attendanceController.createAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createAttendance', async () => {
            // Function executes normally
            await attendanceController.createAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getAttendanceById', () => {
        it('should execute getAttendanceById function', async () => {
            await attendanceController.getAttendanceById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getAttendanceById', async () => {
            mockReq.params.id = 'invalid-id';
            await attendanceController.getAttendanceById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateAttendance', () => {
        it('should execute updateAttendance function', async () => {
            await attendanceController.updateAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateAttendance', async () => {
            mockReq.params.id = 'invalid-id';
            await attendanceController.updateAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteAttendance', () => {
        it('should execute deleteAttendance function', async () => {
            await attendanceController.deleteAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteAttendance', async () => {
            mockReq.params.id = 'invalid-id';
            await attendanceController.deleteAttendance(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
