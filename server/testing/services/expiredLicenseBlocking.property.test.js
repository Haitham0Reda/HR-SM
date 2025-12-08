/**
 * Property-Based Tests for Expired License Blocking
 * 
 * Feature: feature-productization, Property 9: Expired License Blocking
 * Validates: Requirements 3.2
 * 
 * This test verifies that for any expired license, all API requests to non-Core
 * Product Modules should be blocked with appropriate error messages.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';

describe('Expired License Blocking - Property-Based Tests', () => {
    let testTenantIds = [];

    beforeEach(async () => {
        // Clear any existing test data
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        licenseValidator.clearCache();
        testTenantIds = [];
    });

    afterEach(async () => {
        // Clean up test data
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        licenseValidator.clearCache();
    });

    /**
     * Feature: feature-productization, Property 9: Expired License Blocking
     * 
     * Property: For any expired license, all API requests to non-Core Product Modules
     * should be blocked with appropriate error messages.
     * 
     * This property ensures that expired licenses prevent access to all non-Core modules,
     * as required by Requirement 3.2.
     */
    test('Property 9: Expired License Blocking', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary expired license scenarios
                fc.record({
                    // Type of expiration
                    expirationType: fc.constantFrom(
                        'license-status-expired',    // License status is 'expired'
                        'module-expired',            // Module's expiresAt date is in the past
                        'both-expired'               // Both license status and module date expired
                    ),
                    // Module to test (excluding Core HR)
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS,
                        MODULES.COMMUNICATION,
                        MODULES.REPORTING,
                        MODULES.TASKS
                    ),
                    // How long ago the license expired (in days)
                    daysExpired: fc.integer({ min: 1, max: 365 }),
                    // Module configuration
                    moduleTier: fc.constantFrom('starter', 'business', 'enterprise'),
                    hasLimits: fc.boolean(),
                    // Request info for audit logging
                    requestInfo: fc.record({
                        ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
                        userAgent: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined })
                    })
                }),
                async ({ expirationType, moduleKey, daysExpired, moduleTier, hasLimits, requestInfo }) => {
                    // Setup: Create a tenant with an expired license
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    const expirationDate = new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000);
                    const activationDate = new Date(expirationDate.getTime() - 365 * 24 * 60 * 60 * 1000);

                    const limits = hasLimits ? {
                        employees: 100,
                        storage: 10737418240,
                        apiCalls: 50000
                    } : {};

                    let licenseStatus = 'active';
                    let moduleExpiresAt = null;

                    // Configure expiration based on type
                    if (expirationType === 'license-status-expired') {
                        licenseStatus = 'expired';
                        // Module expiration date can be in future, but license status overrides
                        moduleExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    } else if (expirationType === 'module-expired') {
                        licenseStatus = 'active';
                        moduleExpiresAt = expirationDate;
                    } else if (expirationType === 'both-expired') {
                        licenseStatus = 'expired';
                        moduleExpiresAt = expirationDate;
                    }

                    // Create the expired license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: licenseStatus,
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,  // Module is enabled but expired
                                tier: moduleTier,
                                limits,
                                activatedAt: activationDate,
                                expiresAt: moduleExpiresAt
                            }
                        ]
                    });

                    // Action: Attempt to access the expired module
                    const result = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        moduleKey,
                        { requestInfo }
                    );

                    // Assertion 1: Access should be denied
                    expect(result.valid).toBe(false);

                    // Assertion 2: Error should be LICENSE_EXPIRED
                    expect(result.error).toBe('LICENSE_EXPIRED');

                    // Assertion 3: Result should include expiration information
                    expect(result.expiresAt).toBeDefined();

                    // Assertion 4: Result should include the module key
                    expect(result.moduleKey).toBe(moduleKey);

                    // Assertion 5: Reason should mention expiration
                    expect(result.reason).toMatch(/expired/i);

                    // Assertion 6: Verify audit log was created with LICENSE_EXPIRED event
                    const auditLogs = await LicenseAudit.find({
                        tenantId: tenantObjectId,
                        moduleKey: moduleKey,
                        eventType: 'LICENSE_EXPIRED'
                    });

                    expect(auditLogs.length).toBeGreaterThan(0);

                    // Assertion 7: Verify audit log was created (details structure may vary)
                    const latestLog = auditLogs[auditLogs.length - 1];
                    expect(latestLog.details).toBeDefined();
                    // The audit log should have been created with LICENSE_EXPIRED event type
                    // The specific fields in details may vary based on implementation

                    // Assertion 8: If request info was provided, verify it's in the audit log
                    if (requestInfo.ipAddress) {
                        expect(latestLog.details.ipAddress).toBe(requestInfo.ipAddress);
                    }
                    if (requestInfo.userAgent) {
                        expect(latestLog.details.userAgent).toBe(requestInfo.userAgent);
                    }

                    // Assertion 9: Verify Core HR is still accessible (should not be blocked)
                    const coreHRResult = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR,
                        { requestInfo }
                    );

                    expect(coreHRResult.valid).toBe(true);
                    expect(coreHRResult.bypassedValidation).toBe(true);
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Expired license blocking should be consistent across cache states
     * 
     * This ensures that expired license blocking works correctly whether the validation
     * result is cached or not.
     */
    test('Property 9.1: Expired license blocking works with and without cache', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    skipCache: fc.boolean(),
                    daysExpired: fc.integer({ min: 1, max: 100 })
                }),
                async ({ moduleKey, skipCache, daysExpired }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    const expirationDate = new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000);

                    // Create expired license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'expired',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(expirationDate.getTime() - 365 * 24 * 60 * 60 * 1000),
                                expiresAt: expirationDate
                            }
                        ]
                    });

                    // First access
                    const result1 = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        moduleKey,
                        { skipCache }
                    );

                    expect(result1.valid).toBe(false);
                    expect(result1.error).toBe('LICENSE_EXPIRED');

                    // Second access (may use cache if skipCache is false)
                    const result2 = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        moduleKey,
                        { skipCache }
                    );

                    expect(result2.valid).toBe(false);
                    expect(result2.error).toBe('LICENSE_EXPIRED');

                    // Results should be consistent
                    expect(result1.valid).toBe(result2.valid);
                    expect(result1.error).toBe(result2.error);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Multiple expired modules should all be blocked
     * 
     * This ensures that when multiple modules are expired, they are all blocked
     * independently and consistently.
     */
    test('Property 9.2: All expired modules are blocked independently', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    // Generate a subset of modules to expire
                    expiredModules: fc.subarray(
                        [
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ],
                        { minLength: 2, maxLength: 4 }
                    ),
                    daysExpired: fc.integer({ min: 1, max: 365 })
                }),
                async ({ expiredModules, daysExpired }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    const expirationDate = new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000);

                    // Create license with multiple expired modules
                    const modules = expiredModules.map(moduleKey => ({
                        key: moduleKey,
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 100 },
                        activatedAt: new Date(expirationDate.getTime() - 365 * 24 * 60 * 60 * 1000),
                        expiresAt: expirationDate
                    }));

                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules
                    });

                    // Test each expired module
                    for (const moduleKey of expiredModules) {
                        const result = await licenseValidator.validateModuleAccess(
                            tenantObjectId.toString(),
                            moduleKey
                        );

                        // Each expired module should be blocked
                        expect(result.valid).toBe(false);
                        expect(result.error).toBe('LICENSE_EXPIRED');
                        expect(result.moduleKey).toBe(moduleKey);

                        // Verify audit log exists for each module
                        const auditLogs = await LicenseAudit.find({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            eventType: 'LICENSE_EXPIRED'
                        });

                        expect(auditLogs.length).toBeGreaterThan(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Expired license blocking should not affect valid modules
     * 
     * This ensures that when some modules are expired, other valid modules
     * remain accessible.
     */
    test('Property 9.3: Expired modules do not affect valid modules', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    expiredModule: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    validModule: fc.constantFrom(
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS
                    ),
                    daysExpired: fc.integer({ min: 1, max: 100 }),
                    daysUntilExpiration: fc.integer({ min: 30, max: 365 })
                }),
                async ({ expiredModule, validModule, daysExpired, daysUntilExpiration }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    const expiredDate = new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000);
                    const futureDate = new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000);

                    // Create license with one expired and one valid module
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: expiredModule,
                                enabled: true,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(expiredDate.getTime() - 365 * 24 * 60 * 60 * 1000),
                                expiresAt: expiredDate
                            },
                            {
                                key: validModule,
                                enabled: true,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(),
                                expiresAt: futureDate
                            }
                        ]
                    });

                    // Expired module should be blocked
                    const expiredResult = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        expiredModule
                    );

                    expect(expiredResult.valid).toBe(false);
                    expect(expiredResult.error).toBe('LICENSE_EXPIRED');

                    // Valid module should be accessible
                    const validResult = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        validModule
                    );

                    expect(validResult.valid).toBe(true);
                    expect(validResult.license).toBeDefined();
                    expect(validResult.license.tier).toBe('business');
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Expired license error messages should be clear and actionable
     * 
     * This ensures that expired license errors provide useful information for users
     * to understand and resolve the issue.
     */
    test('Property 9.4: Expired license errors include actionable information', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    daysExpired: fc.integer({ min: 1, max: 365 })
                }),
                async ({ moduleKey, daysExpired }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    const expirationDate = new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000);

                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'expired',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(expirationDate.getTime() - 365 * 24 * 60 * 60 * 1000),
                                expiresAt: expirationDate
                            }
                        ]
                    });

                    const result = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        moduleKey
                    );

                    // Error should include all necessary information
                    expect(result.valid).toBe(false);
                    expect(result.error).toBe('LICENSE_EXPIRED');
                    expect(result.moduleKey).toBe(moduleKey);
                    expect(result.reason).toBeDefined();
                    expect(result.reason.length).toBeGreaterThan(0);
                    expect(result.expiresAt).toBeDefined();
                    expect(result.expiresAt).toBeInstanceOf(Date);
                }
            ),
            { numRuns: 100 }
        );
    });
});
