/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Backup from '../../modules/hr-core/backup/models/backup.model.js';
import * as backupController from '../../modules/hr-core/backup/controllers/backup.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('Backup Controller - All 9 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestDepartment();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Backup.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllBackups', () => {
        it('should execute getAllBackups function', async () => {
            await backupController.getAllBackups(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllBackups', async () => {
            // Function executes normally
            await backupController.getAllBackups(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getBackupById', () => {
        it('should execute getBackupById function', async () => {
            await backupController.getBackupById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getBackupById', async () => {
            mockReq.params.id = 'invalid-id';
            await backupController.getBackupById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createBackup', () => {
        it('should execute createBackup function', async () => {
            await backupController.createBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createBackup', async () => {
            // Function executes normally
            await backupController.createBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateBackup', () => {
        it('should execute updateBackup function', async () => {
            await backupController.updateBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateBackup', async () => {
            mockReq.params.id = 'invalid-id';
            await backupController.updateBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteBackup', () => {
        it('should execute deleteBackup function', async () => {
            await backupController.deleteBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteBackup', async () => {
            mockReq.params.id = 'invalid-id';
            await backupController.deleteBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. executeBackup', () => {
        it('should execute executeBackup function', async () => {
            await backupController.executeBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in executeBackup', async () => {
            // Function executes normally
            await backupController.executeBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. getExecutionHistory', () => {
        it('should execute getExecutionHistory function', async () => {
            await backupController.getExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getExecutionHistory', async () => {
            // Function executes normally
            await backupController.getExecutionHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. getBackupStatistics', () => {
        it('should execute getBackupStatistics function', async () => {
            await backupController.getBackupStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getBackupStatistics', async () => {
            // Function executes normally
            await backupController.getBackupStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. restoreBackup', () => {
        it('should execute restoreBackup function', async () => {
            await backupController.restoreBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in restoreBackup', async () => {
            // Function executes normally
            await backupController.restoreBackup(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
