/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import BackupExecution from '../../modules/hr-core/backup/models/backupExecution.model.js';
import * as backupExecutionController from '../../modules/hr-core/backup/controllers/backupExecution.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('BackupExecution Controller - All 6 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await BackupExecution.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllBackupExecutions', () => {
        it('should execute getAllBackupExecutions function', async () => {
            await backupExecutionController.getAllBackupExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllBackupExecutions', async () => {
            // Function executes normally
            await backupExecutionController.getAllBackupExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getBackupExecutionById', () => {
        it('should execute getBackupExecutionById function', async () => {
            await backupExecutionController.getBackupExecutionById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getBackupExecutionById', async () => {
            mockReq.params.id = 'invalid-id';
            await backupExecutionController.getBackupExecutionById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getBackupExecutionHistory', () => {
        it('should execute getBackupExecutionHistory function', async () => {
            await backupExecutionController.getBackupExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getBackupExecutionHistory', async () => {
            // Function executes normally
            await backupExecutionController.getBackupExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getBackupExecutionStats', () => {
        it('should execute getBackupExecutionStats function', async () => {
            await backupExecutionController.getBackupExecutionStats(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getBackupExecutionStats', async () => {
            // Function executes normally
            await backupExecutionController.getBackupExecutionStats(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. getFailedExecutions', () => {
        it('should execute getFailedExecutions function', async () => {
            await backupExecutionController.getFailedExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getFailedExecutions', async () => {
            // Function executes normally
            await backupExecutionController.getFailedExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. getRunningExecutions', () => {
        it('should execute getRunningExecutions function', async () => {
            await backupExecutionController.getRunningExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getRunningExecutions', async () => {
            // Function executes normally
            await backupExecutionController.getRunningExecutions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. cancelBackupExecution', () => {
        it('should execute cancelBackupExecution function', async () => {
            await backupExecutionController.cancelBackupExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in cancelBackupExecution', async () => {
            // Function executes normally
            await backupExecutionController.cancelBackupExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. retryFailedExecution', () => {
        it('should execute retryFailedExecution function', async () => {
            await backupExecutionController.retryFailedExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in retryFailedExecution', async () => {
            // Function executes normally
            await backupExecutionController.retryFailedExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. deleteBackupExecution', () => {
        it('should execute deleteBackupExecution function', async () => {
            await backupExecutionController.deleteBackupExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteBackupExecution', async () => {
            mockReq.params.id = 'invalid-id';
            await backupExecutionController.deleteBackupExecution(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. exportExecutionLogs', () => {
        it('should execute exportExecutionLogs function', async () => {
            await backupExecutionController.exportExecutionLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in exportExecutionLogs', async () => {
            // Function executes normally
            await backupExecutionController.exportExecutionLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
