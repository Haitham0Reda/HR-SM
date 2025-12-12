// testing/services/licenseModificationChangeTracking.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import auditLoggerService from '../../services/auditLogger.service.js';
import License, { MODULES, PRICING_TIERS } from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';

describe('License Modification Change Tracking - Property-Based Tests', () => {
    beforeEach(async () => {
        // Clean up any existing data
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
    });

    describe('Property 36: License Modification Change Tracking', () => {
        /**
         * Feature: feature-productization, Property 36: License Modification Change Tracking
         * Validates: Requirements 10.5
         * 
         * For any license modification, an audit log entry should record both the previous
         * and new values.
         */
        test('should record previous and new values when license is modified', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS,
                            MODULES.TASKS
                        ),
                        initialTier: fc.constantFrom(...PRICING_TIERS),
                        newTier: fc.constantFrom(...PRICING_TIERS),
                        initialEnabled: fc.boolean(),
                        newEnabled: fc.boolean()
                    }),
                    async ({ moduleKey, initialTier, newTier, initialEnabled, newEnabled }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create initial license state
                        const initialLimits = {
                            employees: 100,
                            storage: 10737418240,
                            apiCalls: 50000
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: initialEnabled,
                                tier: initialTier,
                                limits: initialLimits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear any existing audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Capture previous state
                        const previousValue = {
                            enabled: initialEnabled,
                            tier: initialTier,
                            limits: initialLimits
                        };

                        // Action: Modify the license
                        const newLimits = {
                            employees: 200,
                            storage: 21474836480,
                            apiCalls: 100000
                        };

                        const newValue = {
                            enabled: newEnabled,
                            tier: newTier,
                            limits: newLimits
                        };

                        // Log the license modification
                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue
                        );

                        // Assertion 1: Audit log should be created
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();

                        // Assertion 2: Audit log MUST contain previousValue
                        expect(auditLog.details.previousValue).toBeDefined();
                        expect(auditLog.details.previousValue).not.toBeNull();
                        expect(typeof auditLog.details.previousValue).toBe('object');

                        // Assertion 3: Audit log MUST contain newValue
                        expect(auditLog.details.newValue).toBeDefined();
                        expect(auditLog.details.newValue).not.toBeNull();
                        expect(typeof auditLog.details.newValue).toBe('object');

                        // Assertion 4: previousValue should match initial state
                        expect(auditLog.details.previousValue.enabled).toBe(initialEnabled);
                        expect(auditLog.details.previousValue.tier).toBe(initialTier);
                        expect(auditLog.details.previousValue.limits).toEqual(initialLimits);

                        // Assertion 5: newValue should match modified state
                        expect(auditLog.details.newValue.enabled).toBe(newEnabled);
                        expect(auditLog.details.newValue.tier).toBe(newTier);
                        expect(auditLog.details.newValue.limits).toEqual(newLimits);

                        // Assertion 6: Audit log should contain all required fields
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(uniqueTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);
                        expect(auditLog.eventType).toBe('LICENSE_UPDATED');
                        expect(auditLog.severity).toBe('info');

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should track changes to module enabled status', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with module enabled
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Disable the module
                        const previousValue = { enabled: true };
                        const newValue = { enabled: false };

                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue
                        );

                        // Assertion: Audit log should track the change
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.details.previousValue.enabled).toBe(true);
                        expect(auditLog.details.newValue.enabled).toBe(false);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should track changes to pricing tier', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.DOCUMENTS,
                            MODULES.PAYROLL
                        ),
                        previousTier: fc.constantFrom(...PRICING_TIERS),
                        newTier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ moduleKey, previousTier, newTier }) => {
                        // Skip if tiers are the same (no change)
                        if (previousTier === newTier) {
                            return true;
                        }

                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with initial tier
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier: previousTier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Change the tier
                        const previousValue = { tier: previousTier };
                        const newValue = { tier: newTier };

                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue
                        );

                        // Assertion: Audit log should track the tier change
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.details.previousValue.tier).toBe(previousTier);
                        expect(auditLog.details.newValue.tier).toBe(newTier);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should track changes to usage limits', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.DOCUMENTS
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        previousEmployees: fc.integer({ min: 50, max: 100 }),
                        newEmployees: fc.integer({ min: 150, max: 300 }),
                        previousStorage: fc.integer({ min: 5368709120, max: 10737418240 }),
                        newStorage: fc.integer({ min: 21474836480, max: 53687091200 }),
                        previousApiCalls: fc.integer({ min: 10000, max: 50000 }),
                        newApiCalls: fc.integer({ min: 75000, max: 150000 })
                    }),
                    async ({ 
                        moduleKey, 
                        tier, 
                        previousEmployees, 
                        newEmployees,
                        previousStorage,
                        newStorage,
                        previousApiCalls,
                        newApiCalls
                    }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with initial limits
                        const previousLimits = {
                            employees: previousEmployees,
                            storage: previousStorage,
                            apiCalls: previousApiCalls
                        };

                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: previousLimits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Change the limits
                        const newLimits = {
                            employees: newEmployees,
                            storage: newStorage,
                            apiCalls: newApiCalls
                        };

                        const previousValue = { limits: previousLimits };
                        const newValue = { limits: newLimits };

                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue
                        );

                        // Assertion: Audit log should track all limit changes
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.details.previousValue.limits).toEqual(previousLimits);
                        expect(auditLog.details.newValue.limits).toEqual(newLimits);

                        // Verify each limit type is tracked
                        expect(auditLog.details.previousValue.limits.employees).toBe(previousEmployees);
                        expect(auditLog.details.newValue.limits.employees).toBe(newEmployees);
                        expect(auditLog.details.previousValue.limits.storage).toBe(previousStorage);
                        expect(auditLog.details.newValue.limits.storage).toBe(newStorage);
                        expect(auditLog.details.previousValue.limits.apiCalls).toBe(previousApiCalls);
                        expect(auditLog.details.newValue.limits.apiCalls).toBe(newApiCalls);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should track multiple modifications in sequence', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        modificationCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, tier, modificationCount }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create initial license
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Perform multiple modifications
                        let currentEmployees = 100;
                        for (let i = 0; i < modificationCount; i++) {
                            const previousValue = { limits: { employees: currentEmployees } };
                            currentEmployees += 50;
                            const newValue = { limits: { employees: currentEmployees } };

                            await auditLoggerService.logLicenseUpdated(
                                uniqueTenantId.toString(),
                                moduleKey,
                                previousValue,
                                newValue
                            );

                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // Assertion: All modifications should be tracked
                        const auditLogs = await LicenseAudit.find({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: 1 }); // Ascending order

                        expect(auditLogs.length).toBe(modificationCount);

                        // Verify each modification has previous and new values
                        let expectedEmployees = 100;
                        auditLogs.forEach((log, index) => {
                            expect(log.details.previousValue).toBeDefined();
                            expect(log.details.newValue).toBeDefined();
                            expect(log.details.previousValue.limits.employees).toBe(expectedEmployees);
                            expectedEmployees += 50;
                            expect(log.details.newValue.limits.employees).toBe(expectedEmployees);
                        });

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should track complex modifications with multiple field changes', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.DOCUMENTS,
                            MODULES.TASKS
                        ),
                        previousTier: fc.constantFrom(...PRICING_TIERS),
                        newTier: fc.constantFrom(...PRICING_TIERS),
                        previousEnabled: fc.boolean(),
                        newEnabled: fc.boolean(),
                        previousEmployees: fc.integer({ min: 50, max: 150 }),
                        newEmployees: fc.integer({ min: 200, max: 500 })
                    }),
                    async ({ 
                        moduleKey, 
                        previousTier, 
                        newTier,
                        previousEnabled,
                        newEnabled,
                        previousEmployees,
                        newEmployees
                    }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with initial state
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: previousEnabled,
                                tier: previousTier,
                                limits: {
                                    employees: previousEmployees,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Modify multiple fields at once
                        const previousValue = {
                            enabled: previousEnabled,
                            tier: previousTier,
                            limits: {
                                employees: previousEmployees,
                                storage: 10737418240,
                                apiCalls: 50000
                            }
                        };

                        const newValue = {
                            enabled: newEnabled,
                            tier: newTier,
                            limits: {
                                employees: newEmployees,
                                storage: 21474836480,
                                apiCalls: 100000
                            }
                        };

                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue
                        );

                        // Assertion: All changes should be tracked
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();

                        // Verify all previous values
                        expect(auditLog.details.previousValue.enabled).toBe(previousEnabled);
                        expect(auditLog.details.previousValue.tier).toBe(previousTier);
                        expect(auditLog.details.previousValue.limits.employees).toBe(previousEmployees);
                        expect(auditLog.details.previousValue.limits.storage).toBe(10737418240);
                        expect(auditLog.details.previousValue.limits.apiCalls).toBe(50000);

                        // Verify all new values
                        expect(auditLog.details.newValue.enabled).toBe(newEnabled);
                        expect(auditLog.details.newValue.tier).toBe(newTier);
                        expect(auditLog.details.newValue.limits.employees).toBe(newEmployees);
                        expect(auditLog.details.newValue.limits.storage).toBe(21474836480);
                        expect(auditLog.details.newValue.limits.apiCalls).toBe(100000);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should preserve change tracking across different modules', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        tier: fc.constantFrom(...PRICING_TIERS)
                    }),
                    async ({ tier }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create license with multiple modules
                        const modules = [MODULES.ATTENDANCE, MODULES.LEAVE, MODULES.PAYROLL];
                        
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: modules.map(key => ({
                                key,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }))
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId
                        });

                        // Action: Modify each module
                        for (const moduleKey of modules) {
                            const previousValue = { limits: { employees: 100 } };
                            const newValue = { limits: { employees: 200 } };

                            await auditLoggerService.logLicenseUpdated(
                                uniqueTenantId.toString(),
                                moduleKey,
                                previousValue,
                                newValue
                            );
                        }

                        // Assertion: Each module should have its own audit log
                        for (const moduleKey of modules) {
                            const auditLog = await LicenseAudit.findOne({
                                tenantId: uniqueTenantId,
                                moduleKey,
                                eventType: 'LICENSE_UPDATED'
                            }).sort({ timestamp: -1 });

                            expect(auditLog).toBeDefined();
                            expect(auditLog.details.previousValue.limits.employees).toBe(100);
                            expect(auditLog.details.newValue.limits.employees).toBe(200);
                            expect(auditLog.moduleKey).toBe(moduleKey);
                        }

                        // Verify total audit logs
                        const allAuditLogs = await LicenseAudit.find({
                            tenantId: uniqueTenantId,
                            eventType: 'LICENSE_UPDATED'
                        });

                        expect(allAuditLogs.length).toBe(modules.length);

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should include additional details alongside change tracking', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        tier: fc.constantFrom(...PRICING_TIERS),
                        reason: fc.constantFrom(
                            'Subscription upgrade',
                            'Manual adjustment',
                            'Trial conversion',
                            'Downgrade request'
                        )
                    }),
                    async ({ moduleKey, tier, reason }) => {
                        // Generate unique tenant ID for each iteration
                        const uniqueTenantId = new mongoose.Types.ObjectId();
                        const userId = new mongoose.Types.ObjectId();

                        // Setup: Create license
                        await License.create({
                            tenantId: uniqueTenantId,
                            subscriptionId: `test-sub-${uniqueTenantId}`,
                            status: 'active',
                            modules: [{
                                key: moduleKey,
                                enabled: true,
                                tier,
                                limits: {
                                    employees: 100,
                                    storage: 10737418240,
                                    apiCalls: 50000
                                },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }]
                        });

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: uniqueTenantId,
                            moduleKey
                        });

                        // Action: Modify with additional details
                        const previousValue = { limits: { employees: 100 } };
                        const newValue = { limits: { employees: 200 } };
                        const additionalDetails = {
                            reason,
                            userId,
                            ipAddress: '192.168.1.1',
                            userAgent: 'Mozilla/5.0'
                        };

                        await auditLoggerService.logLicenseUpdated(
                            uniqueTenantId.toString(),
                            moduleKey,
                            previousValue,
                            newValue,
                            additionalDetails
                        );

                        // Assertion: Audit log should contain both change tracking and additional details
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: uniqueTenantId,
                            moduleKey,
                            eventType: 'LICENSE_UPDATED'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();

                        // Change tracking
                        expect(auditLog.details.previousValue).toBeDefined();
                        expect(auditLog.details.newValue).toBeDefined();
                        expect(auditLog.details.previousValue.limits.employees).toBe(100);
                        expect(auditLog.details.newValue.limits.employees).toBe(200);

                        // Additional details
                        expect(auditLog.details.reason).toBe(reason);
                        expect(auditLog.details.userId.toString()).toBe(userId.toString());
                        expect(auditLog.details.ipAddress).toBe('192.168.1.1');
                        expect(auditLog.details.userAgent).toBe('Mozilla/5.0');

                        // Clean up
                        await License.deleteMany({ tenantId: uniqueTenantId });
                        await LicenseAudit.deleteMany({ tenantId: uniqueTenantId });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
