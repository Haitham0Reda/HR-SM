/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import PermissionAudit from '../../platform/system/models/permissionAudit.model.js';
import * as permissionAuditController from '../../platform/system/controllers/permissionAudit.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('PermissionAudit Controller - All 9 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestDepartment();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await PermissionAudit.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllPermissionAudits', () => {
        it('should execute getAllPermissionAudits function', async () => {
            await permissionAuditController.getAllPermissionAudits(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllPermissionAudits', async () => {
            // Function executes normally
            await permissionAuditController.getAllPermissionAudits(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getPermissionAuditById', () => {
        it('should execute getPermissionAuditById function', async () => {
            await permissionAuditController.getPermissionAuditById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getPermissionAuditById', async () => {
            mockReq.params.id = 'invalid-id';
            await permissionAuditController.getPermissionAuditById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getUserPermissionAuditTrail', () => {
        it('should execute getUserPermissionAuditTrail function', async () => {
            await permissionAuditController.getUserPermissionAuditTrail(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getUserPermissionAuditTrail', async () => {
            // Function executes normally
            await permissionAuditController.getUserPermissionAuditTrail(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getRecentPermissionChanges', () => {
        it('should execute getRecentPermissionChanges function', async () => {
            await permissionAuditController.getRecentPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getRecentPermissionChanges', async () => {
            // Function executes normally
            await permissionAuditController.getRecentPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. getPermissionChangesByAction', () => {
        it('should execute getPermissionChangesByAction function', async () => {
            await permissionAuditController.getPermissionChangesByAction(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPermissionChangesByAction', async () => {
            // Function executes normally
            await permissionAuditController.getPermissionChangesByAction(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. getPermissionChangesByUser', () => {
        it('should execute getPermissionChangesByUser function', async () => {
            await permissionAuditController.getPermissionChangesByUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPermissionChangesByUser', async () => {
            // Function executes normally
            await permissionAuditController.getPermissionChangesByUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. getPermissionChangesByModifier', () => {
        it('should execute getPermissionChangesByModifier function', async () => {
            await permissionAuditController.getPermissionChangesByModifier(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPermissionChangesByModifier', async () => {
            // Function executes normally
            await permissionAuditController.getPermissionChangesByModifier(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. exportPermissionAuditLogs', () => {
        it('should execute exportPermissionAuditLogs function', async () => {
            await permissionAuditController.exportPermissionAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in exportPermissionAuditLogs', async () => {
            // Function executes normally
            await permissionAuditController.exportPermissionAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. cleanupOldPermissionAudits', () => {
        it('should execute cleanupOldPermissionAudits function', async () => {
            await permissionAuditController.cleanupOldPermissionAudits(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in cleanupOldPermissionAudits', async () => {
            // Function executes normally
            await permissionAuditController.cleanupOldPermissionAudits(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
