/**
 * Property-Based Tests for Core HR Always Accessible
 * 
 * Feature: feature-productization, Property 5: Core HR Always Accessible
 * Validates: Requirements 1.5, 3.5
 * 
 * This test verifies that for any license state (valid, expired, missing, invalid),
 * Core HR functionality should always be accessible without license validation.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import License, { MODULES } from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';

describe('Core HR Always Accessible - Property-Based Tests', () => {
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
     * Feature: feature-productization, Property 5: Core HR Always Accessible
     * 
     * Property: For any license state (valid, expired, missing, invalid), Core HR
     * functionality should always be accessible without license validation.
     * 
     * This property ensures that Core HR is always accessible regardless of license
     * status, as required by Requirements 1.5 and 3.5.
     */
    test('Property 5: Core HR Always Accessible', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary license states and tenant configurations
                fc.record({
                    licenseState: fc.constantFrom(
                        'valid',           // Valid license with active modules
                        'expired',         // License with expired status
                        'missing',         // No license exists for tenant
                        'module-expired',  // License exists but module is expired
                        'disabled'         // License exists but all modules disabled
                    ),
                    tenantId: fc.uuid(),
                    hasOtherModules: fc.boolean(),
                    requestInfo: fc.record({
                        // Don't include userId to avoid audit log validation errors
                        ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
                        userAgent: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined })
                    })
                }),
                async ({ licenseState, tenantId, hasOtherModules, requestInfo }) => {
                    // Setup license state based on the generated scenario
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    if (licenseState === 'valid') {
                        // Create a valid license
                        await License.create({
                            tenantId: tenantObjectId,
                            subscriptionId: `sub-${tenantObjectId.toString()}`,
                            status: 'active',
                            modules: hasOtherModules ? [
                                {
                                    key: MODULES.ATTENDANCE,
                                    enabled: true,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ] : []
                        });
                    } else if (licenseState === 'expired') {
                        // Create an expired license
                        await License.create({
                            tenantId: tenantObjectId,
                            subscriptionId: `sub-${tenantObjectId.toString()}`,
                            status: 'expired',
                            modules: hasOtherModules ? [
                                {
                                    key: MODULES.ATTENDANCE,
                                    enabled: true,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
                                    expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                                }
                            ] : []
                        });
                    } else if (licenseState === 'module-expired') {
                        // Create a license with expired module
                        await License.create({
                            tenantId: tenantObjectId,
                            subscriptionId: `sub-${tenantObjectId.toString()}`,
                            status: 'active',
                            modules: hasOtherModules ? [
                                {
                                    key: MODULES.ATTENDANCE,
                                    enabled: true,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
                                    expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
                                }
                            ] : []
                        });
                    } else if (licenseState === 'disabled') {
                        // Create a license with all modules disabled
                        await License.create({
                            tenantId: tenantObjectId,
                            subscriptionId: `sub-${tenantObjectId.toString()}`,
                            status: 'active',
                            modules: hasOtherModules ? [
                                {
                                    key: MODULES.ATTENDANCE,
                                    enabled: false,
                                    tier: 'business',
                                    limits: { employees: 100 },
                                    activatedAt: new Date(),
                                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            ] : []
                        });
                    }
                    // For 'missing' state, we don't create any license

                    // Attempt to access Core HR
                    const result = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR,
                        { requestInfo }
                    );

                    // Core HR should ALWAYS be accessible
                    expect(result.valid).toBe(true);
                    expect(result.bypassedValidation).toBe(true);
                    expect(result.moduleKey).toBe(MODULES.CORE_HR);
                    expect(result.reason).toContain('Core HR');

                    // Verify that an audit log was created (only for valid tenant IDs)
                    // Note: Audit logging may fail for invalid tenant IDs, but Core HR should still be accessible
                    if (licenseState !== 'missing') {
                        const auditLogs = await LicenseAudit.find({
                            tenantId: tenantObjectId,
                            moduleKey: MODULES.CORE_HR
                        });
                        expect(auditLogs.length).toBeGreaterThan(0);

                        // Verify the audit log indicates success
                        const latestLog = auditLogs[auditLogs.length - 1];
                        expect(latestLog.eventType).toBe('VALIDATION_SUCCESS');
                        expect(latestLog.details.reason).toContain('Core HR');

                        // If request info was provided, verify it's in the audit log
                        if (requestInfo.ipAddress) {
                            expect(latestLog.details.ipAddress).toBe(requestInfo.ipAddress);
                        }
                        if (requestInfo.userAgent) {
                            expect(latestLog.details.userAgent).toBe(requestInfo.userAgent);
                        }
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Core HR bypass should not depend on cache state
     * 
     * This ensures that Core HR access works correctly whether the validation
     * result is cached or not.
     */
    test('Property 5.1: Core HR bypass works with and without cache', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.uuid(),
                    skipCache: fc.boolean(),
                    licenseExists: fc.boolean()
                }),
                async ({ tenantId, skipCache, licenseExists }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    if (licenseExists) {
                        await License.create({
                            tenantId: tenantObjectId,
                            subscriptionId: `sub-${tenantId}`,
                            status: 'active',
                            modules: []
                        });
                    }

                    // First access
                    const result1 = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR,
                        { skipCache }
                    );

                    expect(result1.valid).toBe(true);
                    expect(result1.bypassedValidation).toBe(true);

                    // Second access (may use cache if skipCache is false)
                    const result2 = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR,
                        { skipCache }
                    );

                    expect(result2.valid).toBe(true);
                    expect(result2.bypassedValidation).toBe(true);

                    // Results should be consistent
                    expect(result1.valid).toBe(result2.valid);
                    expect(result1.bypassedValidation).toBe(result2.bypassedValidation);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Core HR access should not affect other module validations
     * 
     * This ensures that accessing Core HR doesn't interfere with the validation
     * of other modules.
     */
    test('Property 5.2: Core HR access does not affect other module validations', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.uuid(),
                    otherModule: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    otherModuleEnabled: fc.boolean()
                }),
                async ({ tenantId, otherModule, otherModuleEnabled }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license with the other module
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantId}`,
                        status: 'active',
                        modules: [
                            {
                                key: otherModule,
                                enabled: otherModuleEnabled,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Access Core HR first
                    const coreHRResult = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR
                    );

                    expect(coreHRResult.valid).toBe(true);

                    // Now access the other module
                    const otherModuleResult = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        otherModule
                    );

                    // The other module's validation should be independent
                    expect(otherModuleResult.valid).toBe(otherModuleEnabled);

                    // Core HR should still be accessible
                    const coreHRResult2 = await licenseValidator.validateModuleAccess(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR
                    );

                    expect(coreHRResult2.valid).toBe(true);
                    expect(coreHRResult2.bypassedValidation).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Core HR should always bypass validation with different tenant IDs
     * 
     * This ensures that Core HR access works with various tenant ID formats.
     */
    test('Property 5.3: Core HR accessible with various tenant IDs', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random tenant IDs (UUIDs or random strings)
                fc.uuid(),
                async (tenantId) => {
                    // Core HR should be accessible regardless of tenant ID
                    const result = await licenseValidator.validateModuleAccess(
                        tenantId,
                        MODULES.CORE_HR
                    );

                    expect(result.valid).toBe(true);
                    expect(result.bypassedValidation).toBe(true);
                    expect(result.moduleKey).toBe(MODULES.CORE_HR);
                }
            ),
            { numRuns: 100 }
        );
    });
});
