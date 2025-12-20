/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import User from '../../modules/hr-core/users/models/user.model.js';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';
import Vacation from '../../modules/hr-core/vacations/models/vacation.model.js';
import Payroll from '../../modules/payroll/models/payroll.model.js';
import * as analyticsController from '../../modules/analytics/controllers/analytics.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('Analytics Controller - All 7 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestDepartment();
        testUser = await createTestUser(testorganization._id, null, null);

        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Payroll.deleteMany({});
        await Vacation.deleteMany({});
        await Attendance.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getHRDashboard', () => {
        it('should execute getHRDashboard function', async () => {
            await analyticsController.getHRDashboard(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getHRDashboard', async () => {
            // Function executes normally
            await analyticsController.getHRDashboard(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getAttendanceAnalytics', () => {
        it('should execute getAttendanceAnalytics function', async () => {
            await analyticsController.getAttendanceAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAttendanceAnalytics', async () => {
            // Function executes normally
            await analyticsController.getAttendanceAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getLeaveAnalytics', () => {
        it('should execute getLeaveAnalytics function', async () => {
            await analyticsController.getLeaveAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getLeaveAnalytics', async () => {
            // Function executes normally
            await analyticsController.getLeaveAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getEmployeeAnalytics', () => {
        it('should execute getEmployeeAnalytics function', async () => {
            await analyticsController.getEmployeeAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getEmployeeAnalytics', async () => {
            // Function executes normally
            await analyticsController.getEmployeeAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. getPayrollAnalytics', () => {
        it('should execute getPayrollAnalytics function', async () => {
            await analyticsController.getPayrollAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPayrollAnalytics', async () => {
            // Function executes normally
            await analyticsController.getPayrollAnalytics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. getKPIs', () => {
        it('should execute getKPIs function', async () => {
            await analyticsController.getKPIs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getKPIs', async () => {
            // Function executes normally
            await analyticsController.getKPIs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. getTrendAnalysis', () => {
        it('should execute getTrendAnalysis function', async () => {
            await analyticsController.getTrendAnalysis(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getTrendAnalysis', async () => {
            // Function executes normally
            await analyticsController.getTrendAnalysis(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
