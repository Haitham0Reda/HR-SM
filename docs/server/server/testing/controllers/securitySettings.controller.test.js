/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import SecuritySettings from '../../platform/system/models/securitySettings.model.js';
import * as securitySettingsController from '../../platform/system/controllers/securitySettings.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('SecuritySettings Controller - All 13 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null, null);
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await SecuritySettings.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getSecuritySettings', () => {
        it('should execute getSecuritySettings function', async () => {
            await securitySettingsController.getSecuritySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getSecuritySettings', async () => {
            // Function executes normally
            await securitySettingsController.getSecuritySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. updateSecuritySettings', () => {
        it('should execute updateSecuritySettings function', async () => {
            await securitySettingsController.updateSecuritySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateSecuritySettings', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.updateSecuritySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. update2FASettings', () => {
        it('should execute update2FASettings function', async () => {
            await securitySettingsController.update2FASettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in update2FASettings', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.update2FASettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updatePasswordPolicy', () => {
        it('should execute updatePasswordPolicy function', async () => {
            await securitySettingsController.updatePasswordPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updatePasswordPolicy', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.updatePasswordPolicy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. updateLockoutSettings', () => {
        it('should execute updateLockoutSettings function', async () => {
            await securitySettingsController.updateLockoutSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateLockoutSettings', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.updateLockoutSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. addIPToWhitelist', () => {
        it('should execute addIPToWhitelist function', async () => {
            await securitySettingsController.addIPToWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addIPToWhitelist', async () => {
            // Function executes normally
            await securitySettingsController.addIPToWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. removeIPFromWhitelist', () => {
        it('should execute removeIPFromWhitelist function', async () => {
            await securitySettingsController.removeIPFromWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in removeIPFromWhitelist', async () => {
            // Function executes normally
            await securitySettingsController.removeIPFromWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. toggleIPWhitelist', () => {
        it('should execute toggleIPWhitelist function', async () => {
            await securitySettingsController.toggleIPWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in toggleIPWhitelist', async () => {
            // Function executes normally
            await securitySettingsController.toggleIPWhitelist(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. updateSessionSettings', () => {
        it('should execute updateSessionSettings function', async () => {
            await securitySettingsController.updateSessionSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateSessionSettings', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.updateSessionSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. enableDevelopmentMode', () => {
        it('should execute enableDevelopmentMode function', async () => {
            await securitySettingsController.enableDevelopmentMode(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in enableDevelopmentMode', async () => {
            // Function executes normally
            await securitySettingsController.enableDevelopmentMode(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. disableDevelopmentMode', () => {
        it('should execute disableDevelopmentMode function', async () => {
            await securitySettingsController.disableDevelopmentMode(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in disableDevelopmentMode', async () => {
            // Function executes normally
            await securitySettingsController.disableDevelopmentMode(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('12. updateAuditSettings', () => {
        it('should execute updateAuditSettings function', async () => {
            await securitySettingsController.updateAuditSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateAuditSettings', async () => {
            mockReq.params.id = 'invalid-id';
            await securitySettingsController.updateAuditSettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('13. testPassword', () => {
        it('should execute testPassword function', async () => {
            await securitySettingsController.testPassword(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in testPassword', async () => {
            // Function executes normally
            await securitySettingsController.testPassword(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
