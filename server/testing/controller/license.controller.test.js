/**
 * License Controller Integration Tests
 * 
 * Tests for license management API endpoints
 */

import mongoose from 'mongoose';
import {
    createOrUpdateLicense,
    getLicenseDetails,
    getUsageMetrics,
    queryAuditLogs,
    activateModule,
    deactivateModule
} from '../../controller/license.controller.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

// Mock response object helper
function createMockResponse() {
    const res = {
        statusCode: 200,
        data: null
    };
    res.status = function(code) {
        res.statusCode = code;
        return res;
    };
    res.json = function(data) {
        res.data = data;
        return res;
    };
    return res;
}

// Mock request object helper
function createMockRequest(overrides = {}) {
    return {
        body: {},
        params: {},
        query: {},
        user: { _id: new mongoose.Types.ObjectId() },
        ip: '127.0.0.1',
        get: (header) => header === 'user-agent' ? 'test-agent' : null,
        ...overrides
    };
}

describe('License Controller', () => {
    let testTenantId;
    let testSubscriptionId;

    beforeEach(() => {
        testTenantId = new mongoose.Types.ObjectId();
        testSubscriptionId = `sub_${Date.now()}`;
    });

    afterEach(async () => {
        // Clean up test data
        await License.deleteMany({ tenantId: testTenantId });
        await LicenseAudit.deleteMany({ tenantId: testTenantId });
        await UsageTracking.deleteMany({ tenantId: testTenantId });
    });

    describe('createOrUpdateLicense', () => {
        test('should create a new license', async () => {
            const req = createMockRequest({
                body: {
                    tenantId: testTenantId,
                    subscriptionId: testSubscriptionId,
                    modules: [
                        {
                            key: MODULES.ATTENDANCE,
                            enabled: true,
                            tier: 'starter',
                            limits: { employees: 50 }
                        }
                    ],
                    billingCycle: 'monthly',
                    status: 'active'
                }
            });

            const res = createMockResponse();

            await createOrUpdateLicense(req, res);

            expect(res.statusCode).toBe(201);
            expect(res.data.success).toBe(true);
            expect(res.data.license).toBeDefined();
            expect(res.data.license.tenantId.toString()).toBe(testTenantId.toString());
        });

        test('should update an existing license', async () => {
            // Create initial license
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'starter',
                        limits: { employees: 50 }
                    }
                ]
            });

            // Update license
            const req = createMockRequest({
                body: {
                    tenantId: testTenantId,
                    subscriptionId: testSubscriptionId,
                    status: 'active',
                    modules: [
                        {
                            key: MODULES.ATTENDANCE,
                            enabled: true,
                            tier: 'business',
                            limits: { employees: 200 }
                        }
                    ]
                }
            });

            const res = createMockResponse();

            await createOrUpdateLicense(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.license.modules[0].tier).toBe('business');
        });

        test('should return 400 if required fields are missing', async () => {
            const req = createMockRequest({
                body: {
                    // Missing tenantId and subscriptionId
                    modules: []
                }
            });

            const res = createMockResponse();

            await createOrUpdateLicense(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data.error).toBe('MISSING_REQUIRED_FIELDS');
        });
    });

    describe('getLicenseDetails', () => {
        test('should return license details for a tenant', async () => {
            // Create license
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'starter',
                        limits: { employees: 50 }
                    }
                ]
            });

            const req = createMockRequest({
                params: { tenantId: testTenantId.toString() }
            });

            const res = createMockResponse();

            await getLicenseDetails(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.license).toBeDefined();
            expect(res.data.license.tenantId.toString()).toBe(testTenantId.toString());
        });

        test('should return 404 if license not found', async () => {
            const req = createMockRequest({
                params: { tenantId: new mongoose.Types.ObjectId().toString() }
            });

            const res = createMockResponse();

            await getLicenseDetails(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.data.error).toBe('LICENSE_NOT_FOUND');
        });
    });

    describe('activateModule', () => {
        test('should activate a module', async () => {
            // Create license
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: []
            });

            const req = createMockRequest({
                params: {
                    tenantId: testTenantId.toString(),
                    moduleKey: MODULES.ATTENDANCE
                },
                body: {
                    tier: 'starter',
                    limits: { employees: 50 }
                }
            });

            const res = createMockResponse();

            await activateModule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.module).toBeDefined();
            expect(res.data.module.enabled).toBe(true);
        });

        test('should return 400 if tier is missing', async () => {
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: []
            });

            const req = createMockRequest({
                params: {
                    tenantId: testTenantId.toString(),
                    moduleKey: MODULES.ATTENDANCE
                },
                body: {
                    // Missing tier
                    limits: { employees: 50 }
                }
            });

            const res = createMockResponse();

            await activateModule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data.error).toBe('MISSING_REQUIRED_FIELDS');
        });

        test('should return 400 for invalid tier', async () => {
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: []
            });

            const req = createMockRequest({
                params: {
                    tenantId: testTenantId.toString(),
                    moduleKey: MODULES.ATTENDANCE
                },
                body: {
                    tier: 'invalid-tier',
                    limits: { employees: 50 }
                }
            });

            const res = createMockResponse();

            await activateModule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data.error).toBe('INVALID_TIER');
        });
    });

    describe('deactivateModule', () => {
        test('should deactivate a module', async () => {
            // Create license with active module
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'starter',
                        limits: { employees: 50 }
                    }
                ]
            });

            const req = createMockRequest({
                params: {
                    tenantId: testTenantId.toString(),
                    moduleKey: MODULES.ATTENDANCE
                }
            });

            const res = createMockResponse();

            await deactivateModule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.module.enabled).toBe(false);
        });

        test('should return 400 when trying to deactivate Core HR', async () => {
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: []
            });

            const req = createMockRequest({
                params: {
                    tenantId: testTenantId.toString(),
                    moduleKey: MODULES.CORE_HR
                }
            });

            const res = createMockResponse();

            await deactivateModule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data.error).toBe('CANNOT_DEACTIVATE_CORE_HR');
        });
    });

    describe('queryAuditLogs', () => {
        test('should query audit logs with filters', async () => {
            // Create some audit logs
            await LicenseAudit.createLog({
                tenantId: testTenantId,
                moduleKey: MODULES.ATTENDANCE,
                eventType: 'MODULE_ACTIVATED',
                severity: 'info'
            });

            const req = createMockRequest({
                query: {
                    tenantId: testTenantId.toString(),
                    limit: '10',
                    skip: '0'
                }
            });

            const res = createMockResponse();

            await queryAuditLogs(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.logs).toBeDefined();
            expect(Array.isArray(res.data.logs)).toBe(true);
        });

        test('should return 400 for invalid limit', async () => {
            const req = createMockRequest({
                query: {
                    limit: 'invalid',
                    skip: '0'
                }
            });

            const res = createMockResponse();

            await queryAuditLogs(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data.error).toBe('INVALID_LIMIT');
        });
    });

    describe('getUsageMetrics', () => {
        test('should return usage metrics for a tenant', async () => {
            // Create license
            await License.create({
                tenantId: testTenantId,
                subscriptionId: testSubscriptionId,
                modules: [
                    {
                        key: MODULES.ATTENDANCE,
                        enabled: true,
                        tier: 'starter',
                        limits: { employees: 50 }
                    }
                ]
            });

            const req = createMockRequest({
                params: { tenantId: testTenantId.toString() },
                query: {}
            });

            const res = createMockResponse();

            await getUsageMetrics(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data.success).toBe(true);
            expect(res.data.usage).toBeDefined();
        });

        test('should return 404 if license not found', async () => {
            const req = createMockRequest({
                params: { tenantId: new mongoose.Types.ObjectId().toString() },
                query: {}
            });

            const res = createMockResponse();

            await getUsageMetrics(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.data.error).toBe('LICENSE_NOT_FOUND');
        });
    });
});
