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

    // Task 5.2: Unit tests for middleware error responses
    describe('Error Response Format - 403 for Unlicensed Modules', () => {
        it('should return 403 with correct error format for disabled module', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/leave/requests',
                method: 'GET'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.LEAVE);
            await middleware(req, res, next);

            // Verify status code
            expect(statusCode).toBe(403);
            expect(nextCalled).toBe(false);

            // Verify error response structure
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('moduleKey');
            expect(jsonData).toHaveProperty('upgradeUrl');

            // Verify error values
            expect(jsonData.error).toBe('MODULE_NOT_LICENSED');
            expect(jsonData.moduleKey).toBe(MODULES.LEAVE);
            expect(typeof jsonData.message).toBe('string');
            expect(jsonData.message.length).toBeGreaterThan(0);
            expect(jsonData.upgradeUrl).toContain('/pricing');
            expect(jsonData.upgradeUrl).toContain(MODULES.LEAVE);
        });

        it('should return 403 with correct error format for expired license', async () => {
            // Update license to be expired
            await License.findOneAndUpdate(
                { tenantId },
                {
                    $set: {
                        'modules.$[elem].expiresAt': new Date('2020-01-01')
                    }
                },
                {
                    arrayFilters: [{ 'elem.key': MODULES.ATTENDANCE }]
                }
            );

            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/attendance/records',
                method: 'GET'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.ATTENDANCE);
            await middleware(req, res, next);

            // Verify status code
            expect(statusCode).toBe(403);
            expect(nextCalled).toBe(false);

            // Verify error response structure
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('moduleKey');
            expect(jsonData).toHaveProperty('upgradeUrl');
            expect(jsonData).toHaveProperty('expiresAt');

            // Verify error values
            expect(jsonData.error).toBe('LICENSE_EXPIRED');
            expect(jsonData.moduleKey).toBe(MODULES.ATTENDANCE);
            expect(typeof jsonData.message).toBe('string');
            expect(jsonData.upgradeUrl).toContain('/settings/license');
            expect(jsonData.upgradeUrl).toContain('renew');
        });

        it('should return 403 with missing module in license', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/payroll/records',
                method: 'GET'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.PAYROLL);
            await middleware(req, res, next);

            // Verify status code
            expect(statusCode).toBe(403);
            expect(nextCalled).toBe(false);

            // Verify error response structure
            expect(jsonData.error).toBe('MODULE_NOT_LICENSED');
            expect(jsonData.moduleKey).toBe(MODULES.PAYROLL);
            expect(jsonData.message).toBeTruthy();
            expect(jsonData.upgradeUrl).toContain('/pricing');
        });
    });

    describe('Error Response Format - 429 for Limit Exceeded', () => {
        it('should return 429 with correct error format when usage limit exceeded', async () => {
            // Create usage tracking at the limit
            await UsageTracking.create({
                tenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    employees: 200
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
                path: '/api/attendance/employees',
                method: 'POST'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = checkUsageLimit(MODULES.ATTENDANCE, 'employees', () => 1);
            await middleware(req, res, next);

            // Verify status code
            expect(statusCode).toBe(429);
            expect(nextCalled).toBe(false);

            // Verify error response structure
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('moduleKey');
            expect(jsonData).toHaveProperty('limitType');
            expect(jsonData).toHaveProperty('currentUsage');
            expect(jsonData).toHaveProperty('limit');
            expect(jsonData).toHaveProperty('upgradeUrl');

            // Verify error values
            expect(jsonData.error).toBe('LIMIT_EXCEEDED');
            expect(jsonData.moduleKey).toBe(MODULES.ATTENDANCE);
            expect(jsonData.limitType).toBe('employees');
            expect(jsonData.currentUsage).toBe(200);
            expect(jsonData.limit).toBe(200);
            expect(typeof jsonData.message).toBe('string');
            expect(jsonData.upgradeUrl).toContain('/settings/license');
            expect(jsonData.upgradeUrl).toContain('upgrade');
        });

        it('should return 429 when rate limit exceeded', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/attendance/records',
                method: 'GET'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.ATTENDANCE);

            // Make 101 requests to exceed rate limit (max is 100)
            for (let i = 0; i < 101; i++) {
                await middleware(req, res, next);
            }

            // Verify the last request was rate limited
            expect(statusCode).toBe(429);

            // Verify error response structure
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('retryAfter');

            // Verify error values
            expect(jsonData.error).toBe('RATE_LIMIT_EXCEEDED');
            expect(typeof jsonData.message).toBe('string');
            expect(jsonData.message).toContain('Too many');
            expect(typeof jsonData.retryAfter).toBe('number');
            expect(jsonData.retryAfter).toBeGreaterThan(0);
        });

        it('should return 429 when storage limit exceeded', async () => {
            // Create usage tracking at the storage limit
            await UsageTracking.create({
                tenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    storage: 10737418240 // 10GB
                },
                limits: {
                    storage: 10737418240
                }
            });

            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/attendance/upload',
                method: 'POST'
            };

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
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = checkUsageLimit(MODULES.ATTENDANCE, 'storage', () => 1024);
            await middleware(req, res, next);

            // Verify status code
            expect(statusCode).toBe(429);
            expect(nextCalled).toBe(false);

            // Verify error response structure
            expect(jsonData.error).toBe('LIMIT_EXCEEDED');
            expect(jsonData.limitType).toBe('storage');
            expect(jsonData.currentUsage).toBe(10737418240);
            expect(jsonData.limit).toBe(10737418240);
        });
    });

    describe('Error Message Format Validation', () => {
        it('should have consistent error message structure across all error types', async () => {
            const errorScenarios = [
                {
                    name: 'disabled module',
                    moduleKey: MODULES.LEAVE,
                    expectedError: 'MODULE_NOT_LICENSED',
                    expectedStatus: 403
                },
                {
                    name: 'missing module',
                    moduleKey: MODULES.PAYROLL,
                    expectedError: 'MODULE_NOT_LICENSED',
                    expectedStatus: 403
                }
            ];

            for (const scenario of errorScenarios) {
                const req = {
                    tenant: { id: tenantId.toString() },
                    user: { _id: new mongoose.Types.ObjectId() },
                    headers: { 'user-agent': 'test' },
                    ip: '127.0.0.1',
                    path: '/api/test',
                    method: 'GET'
                };

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
                let nextCalled = false;
                const next = () => { nextCalled = true; };

                const middleware = requireModuleLicense(scenario.moduleKey);
                await middleware(req, res, next);

                // Verify consistent structure
                expect(statusCode).toBe(scenario.expectedStatus);
                expect(jsonData.error).toBe(scenario.expectedError);
                expect(jsonData).toHaveProperty('message');
                expect(jsonData).toHaveProperty('moduleKey');
                expect(jsonData.moduleKey).toBe(scenario.moduleKey);

                // Verify message is non-empty string
                expect(typeof jsonData.message).toBe('string');
                expect(jsonData.message.length).toBeGreaterThan(0);

                // Verify upgradeUrl is present and valid
                if (jsonData.upgradeUrl) {
                    expect(typeof jsonData.upgradeUrl).toBe('string');
                    expect(jsonData.upgradeUrl).toMatch(/^\/[a-z]/);
                }
            }
        });

        it('should include all required fields in 403 error responses', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/leave/requests',
                method: 'GET'
            };

            let jsonData = null;

            const res = {
                status: function () { return this; },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.LEAVE);
            await middleware(req, res, next);

            // Required fields for 403 responses
            const requiredFields = ['error', 'message', 'moduleKey'];
            requiredFields.forEach(field => {
                expect(jsonData).toHaveProperty(field);
                expect(jsonData[field]).toBeTruthy();
            });

            // Optional but expected fields
            expect(jsonData).toHaveProperty('upgradeUrl');
        });

        it('should include all required fields in 429 error responses', async () => {
            // Create usage at limit
            await UsageTracking.create({
                tenantId,
                moduleKey: MODULES.ATTENDANCE,
                period: UsageTracking.getCurrentPeriod(),
                usage: {
                    apiCalls: 50000
                },
                limits: {
                    apiCalls: 50000
                }
            });

            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/attendance/records',
                method: 'GET'
            };

            let jsonData = null;

            const res = {
                status: function () { return this; },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = checkUsageLimit(MODULES.ATTENDANCE, 'apiCalls', () => 1);
            await middleware(req, res, next);

            // Required fields for 429 responses
            const requiredFields = ['error', 'message', 'moduleKey', 'limitType', 'currentUsage', 'limit'];
            requiredFields.forEach(field => {
                expect(jsonData).toHaveProperty(field);
                expect(jsonData[field]).toBeDefined();
            });

            // Verify numeric fields are numbers
            expect(typeof jsonData.currentUsage).toBe('number');
            expect(typeof jsonData.limit).toBe('number');

            // Optional but expected fields
            expect(jsonData).toHaveProperty('upgradeUrl');
        });

        it('should have human-readable error messages', async () => {
            const req = {
                tenant: { id: tenantId.toString() },
                user: { _id: new mongoose.Types.ObjectId() },
                headers: { 'user-agent': 'test' },
                ip: '127.0.0.1',
                path: '/api/leave/requests',
                method: 'GET'
            };

            let jsonData = null;

            const res = {
                status: function () { return this; },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            const middleware = requireModuleLicense(MODULES.LEAVE);
            await middleware(req, res, next);

            // Verify message is human-readable
            expect(jsonData.message).toBeTruthy();
            expect(typeof jsonData.message).toBe('string');
            expect(jsonData.message.length).toBeGreaterThan(10);
            
            // Should not contain technical jargon or stack traces
            expect(jsonData.message).not.toContain('undefined');
            expect(jsonData.message).not.toContain('null');
            expect(jsonData.message).not.toContain('Error:');
            expect(jsonData.message).not.toContain('at ');
        });
    });
});
