// testing/middleware/licenseValidation.middleware.test.js
import {
    requireModuleLicense,
    checkUsageLimit,
    attachLicenseInfo,
    getRateLimitStats,
    clearRateLimitCache
} from '../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../models/license.model.js';
import License from '../../models/license.model.js';
import UsageTracking from '../../models/usageTracking.model.js';
import mongoose from 'mongoose';

describe('License Validation Middleware', () => {
    let tenantId;
    let license;

    beforeEach(async () => {
        // Clear collections
        await License.deleteMany({});
        await UsageTracking.deleteMany({});
        clearRateLimitCache();

        // Create a test tenant ID
        tenantId = new mongoose.Types.ObjectId();

        // Create a test license
        license = await License.create({
            tenantId,
            subscriptionId: `sub-${Date.now()}`,
            status: 'active',
            modules: [
                {
                    key: MODULES.ATTENDANCE,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 200,
                        storage: 10737418240,
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date('2026-12-31')
                },
                {
                    key: MODULES.LEAVE,
                    enabled: false,
                    tier: 'starter',
                    limits: {
                        employees: 50
                    }
                }
            ]
        });
    });

    describe('requireModuleLicense - Core HR', () => {
        it('should allow access to Core HR without validation', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.CORE_HR);
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('requireModuleLicense - Enabled Module', () => {
        it('should validate and allow access to enabled module', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.ATTENDANCE);
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
            expect(req.moduleLicense).toBeDefined();
            expect(req.moduleLicense.moduleKey).toBe(MODULES.ATTENDANCE);
            expect(req.moduleLicense.tier).toBe('business');
        });
    });

    describe('requireModuleLicense - Disabled Module', () => {
        it('should block access to disabled module', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            let statusCode = null;
            let jsonData = null;

            const res = {
                status: function (code) {
                    statusCode = code;
                    return this;
                },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.LEAVE);
            await middleware(req, res, next);

            expect(nextCalled).toBe(false);
            expect(statusCode).toBe(403);
            expect(jsonData.error).toBe('MODULE_NOT_LICENSED');
        });
    });

    describe('requireModuleLicense - Missing Tenant', () => {
        it('should return 400 if tenant ID is missing', async () => {
            const req = {
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            let statusCode = null;
            let jsonData = null;

            const res = {
                status: function (code) {
                    statusCode = code;
                    return this;
                },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.ATTENDANCE);
            await middleware(req, res, next);

            expect(nextCalled).toBe(false);
            expect(statusCode).toBe(400);
            expect(jsonData.error).toBe('TENANT_ID_REQUIRED');
        });
    });

    describe('checkUsageLimit - Core HR', () => {
        it('should allow Core HR without limit checks', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = checkUsageLimit(MODULES.CORE_HR, 'employees');
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('checkUsageLimit - Within Limits', () => {
        it('should check and allow usage within limits', async () => {
            // Create usage tracking
            await UsageTracking.create({
                tenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    employees: 180
                },
                limits: {
                    employees: 200
                }
            });

            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = checkUsageLimit(MODULES.ATTENDANCE, 'employees');
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
            expect(req.usageLimit).toBeDefined();
            expect(req.usageLimit.limitType).toBe('employees');
            expect(req.usageLimit.currentUsage).toBe(180);
            expect(req.usageLimit.limit).toBe(200);
        });
    });

    describe('attachLicenseInfo', () => {
        it('should attach license info for valid module', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = attachLicenseInfo(MODULES.ATTENDANCE);
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
            expect(req.moduleLicense).toBeDefined();
            expect(req.moduleLicense.valid).toBe(true);
        });

        it('should continue if tenant ID is missing', async () => {
            const req = {
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            const middleware = attachLicenseInfo(MODULES.ATTENDANCE);
            await middleware(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        it('should track rate limit statistics', () => {
            const stats = getRateLimitStats();

            expect(stats).toHaveProperty('totalEntries');
            expect(stats).toHaveProperty('activeEntries');
            expect(stats).toHaveProperty('expiredEntries');
            expect(stats).toHaveProperty('rateLimitWindow');
            expect(stats).toHaveProperty('maxRequestsPerWindow');
        });

        it('should clear rate limit cache', () => {
            clearRateLimitCache();
            const stats = getRateLimitStats();

            expect(stats.totalEntries).toBe(0);
        });
    });
});
