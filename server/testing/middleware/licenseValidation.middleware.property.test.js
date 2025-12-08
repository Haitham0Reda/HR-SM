// testing/middleware/licenseValidation.middleware.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import { requireModuleLicense } from '../../middleware/licenseValidation.middleware.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';

describe('License Validation Middleware Property-Based Tests', () => {
    let testTenantId;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

        // Clear collections
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
    });

    describe('Property 2: Disabled Module API Blocking', () => {
        /**
         * Feature: feature-productization, Property 2: Disabled Module API Blocking
         * Validates: Requirements 1.2
         * 
         * For any Product Module that is disabled, all API requests to that module's endpoints
         * should be blocked with a 403 error.
         */
        test('should block all API requests to disabled modules with 403 error', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.TASKS,
                            MODULES.COMMUNICATION,
                            MODULES.REPORTING
                        ),
                        httpMethod: fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
                        apiPath: fc.constantFrom(
                            '/api/v1/resource',
                            '/api/v1/resource/123',
                            '/api/v1/resource/create',
                            '/api/v1/resource/update',
                            '/api/v1/resource/delete'
                        )
                    }),
                    async ({ moduleKey, httpMethod, apiPath }) => {
                        // Setup: Create a license with the module disabled
                        await License.create({
                            tenantId: testTenantId,
                            subscriptionId: `sub-test-${Date.now()}`,
                            status: 'active',
                            modules: [
                                {
                                    key: moduleKey,
                                    enabled: false, // Module is disabled
                                    tier: 'business',
                                    limits: {
                                        employees: 100,
                                        storage: 10737418240,
                                        apiCalls: 50000
                                    },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ]
                        });

                        // Create mock request object
                        const req = {
                            tenant: { id: testTenantId.toString() },
                            user: { _id: new mongoose.Types.ObjectId() },
                            headers: { 'user-agent': 'test-agent' },
                            ip: '127.0.0.1',
                            path: apiPath,
                            method: httpMethod
                        };

                        // Create mock response object
                        let statusCode = null;
                        let jsonData = null;
                        let nextCalled = false;

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

                        const next = () => {
                            nextCalled = true;
                        };

                        // Action: Apply middleware
                        const middleware = requireModuleLicense(moduleKey);
                        await middleware(req, res, next);

                        // Assertion 1: next() should NOT be called (request blocked)
                        expect(nextCalled).toBe(false);

                        // Assertion 2: Response status should be 403 (Forbidden)
                        expect(statusCode).toBe(403);

                        // Assertion 3: Response should contain error information
                        expect(jsonData).toBeDefined();
                        expect(jsonData).not.toBeNull();

                        // Assertion 4: Error code should be MODULE_NOT_LICENSED
                        expect(jsonData.error).toBe('MODULE_NOT_LICENSED');

                        // Assertion 5: Response should include module key
                        expect(jsonData.moduleKey).toBe(moduleKey);

                        // Assertion 6: Response should include error message
                        expect(jsonData.message).toBeDefined();
                        expect(typeof jsonData.message).toBe('string');
                        expect(jsonData.message.length).toBeGreaterThan(0);

                        // Assertion 7: Response should include upgrade URL
                        expect(jsonData.upgradeUrl).toBeDefined();
                        expect(jsonData.upgradeUrl).toContain('/pricing');
                        expect(jsonData.upgradeUrl).toContain(moduleKey);

                        // Assertion 8: Request should NOT have moduleLicense attached
                        expect(req.moduleLicense).toBeUndefined();

                        // Assertion 9: Audit log should be created for the blocked request
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_FAILURE'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should block disabled modules regardless of HTTP method', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        httpMethods: fc.array(
                            fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
                            { minLength: 1, maxLength: 5 }
                        )
                    }),
                    async ({ moduleKey, httpMethods }) => {
                        // Setup: Create license with disabled module
                        await License.deleteMany({ tenantId: testTenantId });
                        await License.create({
                            tenantId: testTenantId,
                            subscriptionId: `sub-test-${Date.now()}`,
                            status: 'active',
                            modules: [
                                {
                                    key: moduleKey,
                                    enabled: false,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ]
                        });

                        // Test each HTTP method with unique IP to avoid rate limiting
                        for (let i = 0; i < httpMethods.length; i++) {
                            const method = httpMethods[i];
                            const req = {
                                tenant: { id: testTenantId.toString() },
                                user: { _id: new mongoose.Types.ObjectId() },
                                headers: { 'user-agent': 'test' },
                                ip: `127.0.0.${i + 1}`, // Unique IP per request to avoid rate limiting
                                path: '/api/test',
                                method
                            };

                            let statusCode = null;
                            let jsonData = null;
                            let nextCalled = false;

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

                            const middleware = requireModuleLicense(moduleKey);
                            await middleware(req, res, next);

                            // All methods should be blocked
                            expect(nextCalled).toBe(false);
                            expect(statusCode).toBe(403);
                            expect(jsonData.error).toBe('MODULE_NOT_LICENSED');
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should block disabled modules for all tenant IDs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tenantCount: fc.integer({ min: 1, max: 5 })
                    }),
                    async ({ moduleKey, tenantCount }) => {
                        // Setup: Create multiple tenants with disabled module
                        const tenantIds = [];
                        for (let i = 0; i < tenantCount; i++) {
                            const tid = new mongoose.Types.ObjectId();
                            tenantIds.push(tid);

                            await License.create({
                                tenantId: tid,
                                subscriptionId: `sub-${tid}`,
                                status: 'active',
                                modules: [
                                    {
                                        key: moduleKey,
                                        enabled: false,
                                        tier: 'business',
                                        limits: { employees: 100 },
                                        activatedAt: new Date(),
                                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                    }
                                ]
                            });
                        }

                        // Test each tenant
                        for (const tid of tenantIds) {
                            const req = {
                                tenant: { id: tid.toString() },
                                user: { _id: new mongoose.Types.ObjectId() },
                                headers: { 'user-agent': 'test' },
                                ip: '127.0.0.1',
                                path: '/api/test',
                                method: 'GET'
                            };

                            let statusCode = null;
                            let nextCalled = false;

                            const res = {
                                status: function (code) {
                                    statusCode = code;
                                    return this;
                                },
                                json: function (data) {
                                    return this;
                                }
                            };

                            const next = () => { nextCalled = true; };

                            const middleware = requireModuleLicense(moduleKey);
                            await middleware(req, res, next);

                            // All tenants should be blocked
                            expect(nextCalled).toBe(false);
                            expect(statusCode).toBe(403);
                        }

                        // Cleanup
                        await License.deleteMany({ tenantId: { $in: tenantIds } });
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should block when module is not in license at all', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        )
                    }),
                    async ({ moduleKey }) => {
                        // Setup: Create license WITHOUT the module
                        await License.deleteMany({ tenantId: testTenantId });
                        await License.create({
                            tenantId: testTenantId,
                            subscriptionId: `sub-test-${Date.now()}`,
                            status: 'active',
                            modules: [] // Empty modules array - module not included
                        });

                        const req = {
                            tenant: { id: testTenantId.toString() },
                            user: { _id: new mongoose.Types.ObjectId() },
                            headers: { 'user-agent': 'test' },
                            ip: '127.0.0.1',
                            path: '/api/test',
                            method: 'GET'
                        };

                        let statusCode = null;
                        let jsonData = null;
                        let nextCalled = false;

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

                        const middleware = requireModuleLicense(moduleKey);
                        await middleware(req, res, next);

                        // Should be blocked
                        expect(nextCalled).toBe(false);
                        expect(statusCode).toBe(403);
                        expect(jsonData.error).toBe('MODULE_NOT_LICENSED');
                        expect(jsonData.moduleKey).toBe(moduleKey);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should consistently block disabled modules across multiple requests', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        requestCount: fc.integer({ min: 2, max: 10 })
                    }),
                    async ({ moduleKey, requestCount }) => {
                        // Setup: Create license with disabled module
                        await License.deleteMany({ tenantId: testTenantId });
                        await License.create({
                            tenantId: testTenantId,
                            subscriptionId: `sub-test-${Date.now()}`,
                            status: 'active',
                            modules: [
                                {
                                    key: moduleKey,
                                    enabled: false,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ]
                        });

                        // Make multiple requests with unique IPs to avoid rate limiting
                        const results = [];
                        for (let i = 0; i < requestCount; i++) {
                            const req = {
                                tenant: { id: testTenantId.toString() },
                                user: { _id: new mongoose.Types.ObjectId() },
                                headers: { 'user-agent': 'test' },
                                ip: `192.168.1.${i + 1}`, // Unique IP per request to avoid rate limiting
                                path: '/api/test',
                                method: 'GET'
                            };

                            let statusCode = null;
                            let nextCalled = false;

                            const res = {
                                status: function (code) {
                                    statusCode = code;
                                    return this;
                                },
                                json: function (data) {
                                    return this;
                                }
                            };

                            const next = () => { nextCalled = true; };

                            const middleware = requireModuleLicense(moduleKey);
                            await middleware(req, res, next);

                            results.push({ statusCode, nextCalled });
                        }

                        // All requests should be consistently blocked
                        results.forEach(result => {
                            expect(result.nextCalled).toBe(false);
                            expect(result.statusCode).toBe(403);
                        });

                        // Verify all were blocked (no successful requests)
                        const successfulRequests = results.filter(r => r.nextCalled);
                        expect(successfulRequests.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should provide upgrade URL in all blocked responses', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.TASKS
                        )
                    }),
                    async ({ moduleKey }) => {
                        // Setup: Disabled module
                        await License.deleteMany({ tenantId: testTenantId });
                        await License.create({
                            tenantId: testTenantId,
                            subscriptionId: `sub-test-${Date.now()}`,
                            status: 'active',
                            modules: [
                                {
                                    key: moduleKey,
                                    enabled: false,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ]
                        });

                        const req = {
                            tenant: { id: testTenantId.toString() },
                            user: { _id: new mongoose.Types.ObjectId() },
                            headers: { 'user-agent': 'test' },
                            ip: '127.0.0.1',
                            path: '/api/test',
                            method: 'GET'
                        };

                        let jsonData = null;

                        const res = {
                            status: function (code) {
                                return this;
                            },
                            json: function (data) {
                                jsonData = data;
                                return this;
                            }
                        };

                        const next = () => {};

                        const middleware = requireModuleLicense(moduleKey);
                        await middleware(req, res, next);

                        // Verify upgrade URL is present and valid
                        expect(jsonData.upgradeUrl).toBeDefined();
                        expect(typeof jsonData.upgradeUrl).toBe('string');
                        expect(jsonData.upgradeUrl).toContain('/pricing');
                        expect(jsonData.upgradeUrl).toContain('module=');
                        expect(jsonData.upgradeUrl).toContain(moduleKey);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
