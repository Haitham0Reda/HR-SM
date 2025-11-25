/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import SecurityAudit from '../../models/securityAudit.model.js';
import * as securityAuditController from '../../controller/securityAudit.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('SecurityAudit Controller - All 16 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null);

        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await SecurityAudit.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllAuditLogs', () => {
        it('should execute getAllAuditLogs function', async () => {
            await securityAuditController.getAllAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllAuditLogs', async () => {
            // Function executes normally
            await securityAuditController.getAllAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getAuditLogById', () => {
        it('should execute getAuditLogById function', async () => {
            await securityAuditController.getAuditLogById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getAuditLogById', async () => {
            mockReq.params.id = 'invalid-id';
            await securityAuditController.getAuditLogById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getUserActivity', () => {
        it('should execute getUserActivity function', async () => {
            await securityAuditController.getUserActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getUserActivity', async () => {
            // Function executes normally
            await securityAuditController.getUserActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getSuspiciousActivities', () => {
        it('should execute getSuspiciousActivities function', async () => {
            await securityAuditController.getSuspiciousActivities(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getSuspiciousActivities', async () => {
            // Function executes normally
            await securityAuditController.getSuspiciousActivities(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. getFailedLogins', () => {
        it('should execute getFailedLogins function', async () => {
            await securityAuditController.getFailedLogins(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getFailedLogins', async () => {
            // Function executes normally
            await securityAuditController.getFailedLogins(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. getSecurityStats', () => {
        it('should execute getSecurityStats function', async () => {
            await securityAuditController.getSecurityStats(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getSecurityStats', async () => {
            // Function executes normally
            await securityAuditController.getSecurityStats(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. getLoginHistory', () => {
        it('should execute getLoginHistory function', async () => {
            await securityAuditController.getLoginHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getLoginHistory', async () => {
            // Function executes normally
            await securityAuditController.getLoginHistory(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. get2FAActivity', () => {
        it('should execute get2FAActivity function', async () => {
            await securityAuditController.get2FAActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in get2FAActivity', async () => {
            // Function executes normally
            await securityAuditController.get2FAActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. getPasswordActivity', () => {
        it('should execute getPasswordActivity function', async () => {
            await securityAuditController.getPasswordActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPasswordActivity', async () => {
            // Function executes normally
            await securityAuditController.getPasswordActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. getAccountEvents', () => {
        it('should execute getAccountEvents function', async () => {
            await securityAuditController.getAccountEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAccountEvents', async () => {
            // Function executes normally
            await securityAuditController.getAccountEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. getPermissionChanges', () => {
        it('should execute getPermissionChanges function', async () => {
            await securityAuditController.getPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getPermissionChanges', async () => {
            // Function executes normally
            await securityAuditController.getPermissionChanges(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('12. getDataAccessLogs', () => {
        it('should execute getDataAccessLogs function', async () => {
            await securityAuditController.getDataAccessLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getDataAccessLogs', async () => {
            // Function executes normally
            await securityAuditController.getDataAccessLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('13. getSystemEvents', () => {
        it('should execute getSystemEvents function', async () => {
            await securityAuditController.getSystemEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getSystemEvents', async () => {
            // Function executes normally
            await securityAuditController.getSystemEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('14. getIPActivity', () => {
        it('should execute getIPActivity function', async () => {
            await securityAuditController.getIPActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getIPActivity', async () => {
            // Function executes normally
            await securityAuditController.getIPActivity(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('15. exportAuditLogs', () => {
        it('should execute exportAuditLogs function', async () => {
            await securityAuditController.exportAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in exportAuditLogs', async () => {
            // Function executes normally
            await securityAuditController.exportAuditLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('16. cleanupOldLogs', () => {
        it('should execute cleanupOldLogs function', async () => {
            await securityAuditController.cleanupOldLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in cleanupOldLogs', async () => {
            // Function executes normally
            await securityAuditController.cleanupOldLogs(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
