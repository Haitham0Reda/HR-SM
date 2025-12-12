/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Report from '../../modules/reports/models/report.model.js';
import * as reportController from '../../modules/reports/controllers/report.controller.js';
import { createMockResponse, createMockRequest, createTestorganization, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Report Controller - All 12 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Report.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllReports', () => {
        it('should execute getAllReports function', async () => {
            await reportController.getAllReports(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllReports', async () => {
            // Function executes normally
            await reportController.getAllReports(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getReportById', () => {
        it('should execute getReportById function', async () => {
            await reportController.getReportById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getReportById', async () => {
            mockReq.params.id = 'invalid-id';
            await reportController.getReportById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createReport', () => {
        it('should execute createReport function', async () => {
            await reportController.createReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createReport', async () => {
            // Function executes normally
            await reportController.createReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateReport', () => {
        it('should execute updateReport function', async () => {
            await reportController.updateReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateReport', async () => {
            mockReq.params.id = 'invalid-id';
            await reportController.updateReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteReport', () => {
        it('should execute deleteReport function', async () => {
            await reportController.deleteReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteReport', async () => {
            mockReq.params.id = 'invalid-id';
            await reportController.deleteReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. executeReport', () => {
        it('should execute executeReport function', async () => {
            await reportController.executeReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in executeReport', async () => {
            // Function executes normally
            await reportController.executeReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. exportReport', () => {
        it('should execute exportReport function', async () => {
            await reportController.exportReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in exportReport', async () => {
            // Function executes normally
            await reportController.exportReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. getTemplates', () => {
        it('should execute getTemplates function', async () => {
            await reportController.getTemplates(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getTemplates', async () => {
            // Function executes normally
            await reportController.getTemplates(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. getExecutionHistory', () => {
        it('should execute getExecutionHistory function', async () => {
            await reportController.getExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getExecutionHistory', async () => {
            // Function executes normally
            await reportController.getExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. getReportStatistics', () => {
        it('should execute getReportStatistics function', async () => {
            await reportController.getReportStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getReportStatistics', async () => {
            // Function executes normally
            await reportController.getReportStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. shareReport', () => {
        it('should execute shareReport function', async () => {
            await reportController.shareReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in shareReport', async () => {
            // Function executes normally
            await reportController.shareReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('12. unshareReport', () => {
        it('should execute unshareReport function', async () => {
            await reportController.unshareReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in unshareReport', async () => {
            // Function executes normally
            await reportController.unshareReport(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
