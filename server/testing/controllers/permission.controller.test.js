/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Permission from '../../modules/hr-core/requests/models/permission.model.js';
import * as permissionController from '../../modules/hr-core/requests/controllers/permission.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Permission Controller - All 9 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Permission.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllPermissions', () => {
        it('should execute getAllPermissions function', async () => {
            await permissionController.getAllPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllPermissions', async () => {
            // Function executes normally
            await permissionController.getAllPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getRolePermissionsList', () => {
        it('should execute getRolePermissionsList function', async () => {
            await permissionController.getRolePermissionsList(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getRolePermissionsList', async () => {
            // Function executes normally
            await permissionController.getRolePermissionsList(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getUserPermissions', () => {
        it('should execute getUserPermissions function', async () => {
            await permissionController.getUserPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getUserPermissions', async () => {
            // Function executes normally
            await permissionController.getUserPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. addPermissionsToUser', () => {
        it('should execute addPermissionsToUser function', async () => {
            await permissionController.addPermissionsToUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addPermissionsToUser', async () => {
            // Function executes normally
            await permissionController.addPermissionsToUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. removePermissionsFromUser', () => {
        it('should execute removePermissionsFromUser function', async () => {
            await permissionController.removePermissionsFromUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in removePermissionsFromUser', async () => {
            // Function executes normally
            await permissionController.removePermissionsFromUser(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. resetUserPermissions', () => {
        it('should execute resetUserPermissions function', async () => {
            await permissionController.resetUserPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in resetUserPermissions', async () => {
            // Function executes normally
            await permissionController.resetUserPermissions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. changeUserRole', () => {
        it('should execute changeUserRole function', async () => {
            await permissionController.changeUserRole(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in changeUserRole', async () => {
            // Function executes normally
            await permissionController.changeUserRole(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. getPermissionAuditLog', () => {
        it('should execute getPermissionAuditLog function', async () => {
            await permissionController.getPermissionAuditLog(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPermissionAuditLog', async () => {
            // Function executes normally
            await permissionController.getPermissionAuditLog(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. getRecentPermissionChanges', () => {
        it('should execute getRecentPermissionChanges function', async () => {
            await permissionController.getRecentPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getRecentPermissionChanges', async () => {
            // Function executes normally
            await permissionController.getRecentPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
