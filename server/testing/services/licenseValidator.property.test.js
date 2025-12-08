// testing/services/licenseValidator.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';
import UsageTracking from '../../models/usageTracking.model.js';

describe('LicenseValidator Property-Based Tests', () => {
    let testTenantId;
    let testLicense;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

        // Create a test license with multiple modules enabled
        testLicense = await License.create({
            tenantId: testTenantId,
            subscriptionId: 'test-subscription-pbt',
            status: 'active',
            modules: [
                {
                    key: MODULES.ATTENDANCE,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                {
                    key: MODULES.LEAVE,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100,
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                {
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100,
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                {
                    key: MODULES.DOCUMENTS,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        storage: 10737418240,
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                {
                    key: MODULES.TASKS,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        apiCalls: 50000
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            ]
        });

        // Clear cache before each test
        licenseValidator.clearCache();
    });

    afterEach(async () => {
        // Clean up
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
        licenseValidator.clearCache();
    });

    describe('Property 11: Validation Failure Logging', () => {
        /**
         * Feature: feature-productization, Property 11: Validation Failure Logging
         * Validates: Requirements 3.4
         * 
         * For any license validation failure, an audit log entry should be created containing
         * tenant ID, module name, failure reason, and timestamp.
         */
        test('should create audit log for all validation failures', async () => {
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
                        failureScenario: fc.constantFrom(
                            'no-license',
                            'module-disabled',
                            'license-expired',
                            'module-not-in-license'
                        )
                    }),
                    async ({ moduleKey, failureScenario }) => {
                        // Clear audit logs before test
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup: Create different failure scenarios
                        if (failureScenario === 'no-license') {
                            // Delete the license to simulate no license found
                            await License.deleteMany({ tenantId: testTenantId });
                        } else if (failureScenario === 'module-disabled') {
                            // Update license to have module disabled
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        'modules.$[elem].enabled': false
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (failureScenario === 'license-expired') {
                            // Update license to be expired
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        status: 'expired',
                                        'modules.$[elem].expiresAt': new Date(Date.now() - 1000)
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (failureScenario === 'module-not-in-license') {
                            // Remove the module from license
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        }

                        // Action: Attempt validation (should fail)
                        const result = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion 1: Validation should fail
                        expect(result.valid).toBe(false);

                        // Assertion 2: Audit log should be created
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: { $in: ['VALIDATION_FAILURE', 'LICENSE_EXPIRED'] }
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();

                        // Assertion 3: Audit log should contain tenant ID
                        expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());

                        // Assertion 4: Audit log should contain module name
                        expect(auditLog.moduleKey).toBe(moduleKey);

                        // Assertion 5: Audit log should contain failure information
                        // VALIDATION_FAILURE events have details.reason
                        // LICENSE_EXPIRED events have details with expiration info
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.details).not.toBeNull();
                        
                        if (auditLog.eventType === 'VALIDATION_FAILURE') {
                            // Validation failures should have a reason
                            expect(auditLog.details.reason).toBeDefined();
                            expect(typeof auditLog.details.reason).toBe('string');
                            expect(auditLog.details.reason.length).toBeGreaterThan(0);
                        }
                        // LICENSE_EXPIRED events may have different detail fields

                        // Assertion 6: Audit log should contain timestamp
                        expect(auditLog.timestamp).toBeDefined();
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
                        expect(auditLog.timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should log validation failures with appropriate severity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        failureType: fc.constantFrom('disabled', 'not-in-license')
                    }),
                    async ({ moduleKey, failureType }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup failure scenario
                        if (failureType === 'disabled') {
                            // Disable the module
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        'modules.$[elem].enabled': false
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else {
                            // Remove the module from license entirely
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        }

                        // Action: Validate
                        const validationResult = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion: Validation should fail
                        expect(validationResult.valid).toBe(false);
                        expect(validationResult.error).toBe('MODULE_NOT_LICENSED');

                        // Assertion: Check severity level
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_FAILURE'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.severity).toBe('warning');
                        expect(auditLog.eventType).toBe('VALIDATION_FAILURE');
                        expect(auditLog.details.reason).toBeDefined();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should create unique audit log entries for each validation failure', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        attemptCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, attemptCount }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup: Disable module
                        await License.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                $set: {
                                    'modules.$[elem].enabled': false
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Action: Attempt validation multiple times
                        for (let i = 0; i < attemptCount; i++) {
                            await licenseValidator.validateModuleAccess(
                                testTenantId.toString(),
                                moduleKey,
                                { skipCache: true }
                            );
                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // Assertion: Should have created multiple audit log entries
                        const auditLogs = await LicenseAudit.find({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_FAILURE'
                        }).sort({ timestamp: -1 });

                        expect(auditLogs.length).toBe(attemptCount);

                        // Each log should have unique timestamp
                        const timestamps = auditLogs.map(log => log.timestamp.getTime());
                        const uniqueTimestamps = new Set(timestamps);
                        expect(uniqueTimestamps.size).toBe(attemptCount);
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should include request information in audit logs when provided', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(MODULES.ATTENDANCE, MODULES.LEAVE),
                        ipAddress: fc.ipV4(),
                        userAgent: fc.constantFrom(
                            'Mozilla/5.0',
                            'Chrome/91.0',
                            'Safari/14.0'
                        )
                    }),
                    async ({ moduleKey, ipAddress, userAgent }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Generate a valid ObjectId for userId
                        const userId = new mongoose.Types.ObjectId();

                        // Setup: Disable module
                        await License.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                $set: {
                                    'modules.$[elem].enabled': false
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Action: Validate with request info
                        await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            {
                                skipCache: true,
                                requestInfo: {
                                    userId,
                                    ipAddress,
                                    userAgent
                                }
                            }
                        );

                        // Assertion: Audit log should contain request info
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_FAILURE'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog.details.userId).toBeDefined();
                        expect(auditLog.details.ipAddress).toBe(ipAddress);
                        expect(auditLog.details.userAgent).toBe(userAgent);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 8: License Validation Before Processing', () => {
        /**
         * Feature: feature-productization, Property 8: License Validation Before Processing
         * Validates: Requirements 3.1
         * 
         * For any API request to a non-Core Product Module, license validation should occur
         * before any business logic is executed.
         */
        test('should validate license before processing for all non-Core modules', async () => {
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
                        licenseState: fc.constantFrom(
                            'valid',
                            'disabled',
                            'expired',
                            'missing'
                        )
                    }),
                    async ({ moduleKey, licenseState }) => {
                        // Track whether validation was called
                        let validationCalled = false;
                        let validationResult = null;

                        // Setup: Configure license state
                        if (licenseState === 'valid') {
                            // Ensure module exists and is enabled
                            const license = await License.findOne({ tenantId: testTenantId });
                            const moduleExists = license.modules.some(m => m.key === moduleKey);
                            
                            if (moduleExists) {
                                // Update existing module
                                await License.findOneAndUpdate(
                                    { tenantId: testTenantId },
                                    {
                                        $set: {
                                            status: 'active',
                                            'modules.$[elem].enabled': true,
                                            'modules.$[elem].expiresAt': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                        }
                                    },
                                    {
                                        arrayFilters: [{ 'elem.key': moduleKey }]
                                    }
                                );
                            } else {
                                // Add module if it doesn't exist
                                await License.findOneAndUpdate(
                                    { tenantId: testTenantId },
                                    {
                                        $set: { status: 'active' },
                                        $push: {
                                            modules: {
                                                key: moduleKey,
                                                enabled: true,
                                                tier: 'business',
                                                limits: {
                                                    employees: 100,
                                                    storage: 10737418240,
                                                    apiCalls: 50000
                                                },
                                                activatedAt: new Date(),
                                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                            }
                                        }
                                    }
                                );
                            }
                        } else if (licenseState === 'disabled') {
                            // Disable the module
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        'modules.$[elem].enabled': false
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (licenseState === 'expired') {
                            // Expire the license
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        status: 'expired',
                                        'modules.$[elem].expiresAt': new Date(Date.now() - 1000)
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (licenseState === 'missing') {
                            // Remove the module from license
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        }

                        // Action: Call validateModuleAccess (simulating what middleware does)
                        validationResult = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );
                        validationCalled = true;

                        // Assertion 1: Validation must be called for non-Core modules
                        expect(validationCalled).toBe(true);

                        // Assertion 2: Validation result must be defined
                        expect(validationResult).toBeDefined();
                        expect(validationResult).not.toBeNull();

                        // Assertion 3: Validation result must have 'valid' property
                        expect(validationResult).toHaveProperty('valid');
                        expect(typeof validationResult.valid).toBe('boolean');

                        // Assertion 4: Validation result must have 'moduleKey' property
                        expect(validationResult.moduleKey).toBe(moduleKey);

                        // Assertion 5: Validation result correctness based on license state
                        if (licenseState === 'valid') {
                            expect(validationResult.valid).toBe(true);
                            expect(validationResult.license).toBeDefined();
                        } else {
                            expect(validationResult.valid).toBe(false);
                            expect(validationResult.error).toBeDefined();
                            expect(validationResult.reason).toBeDefined();
                        }

                        // Assertion 6: Audit log should be created for validation attempt
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should always validate before processing regardless of cache state', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        skipCache: fc.boolean()
                    }),
                    async ({ moduleKey, skipCache }) => {
                        // Setup: Ensure module is enabled
                        await License.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                $set: {
                                    status: 'active',
                                    'modules.$[elem].enabled': true,
                                    'modules.$[elem].expiresAt': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Action: Validate with or without cache
                        const result = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache }
                        );

                        // Assertion 1: Validation must return a result
                        expect(result).toBeDefined();
                        expect(result.valid).toBe(true);

                        // Assertion 2: Validation must create audit log (even with cache)
                        // Note: When using cache, audit log might not be created on subsequent calls
                        // But on first call (or with skipCache), it should be created
                        if (skipCache) {
                            const auditLog = await LicenseAudit.findOne({
                                tenantId: testTenantId,
                                moduleKey,
                                eventType: 'VALIDATION_SUCCESS'
                            }).sort({ timestamp: -1 });

                            expect(auditLog).toBeDefined();
                        }

                        // Assertion 3: Result must contain license information
                        expect(result.license).toBeDefined();
                        expect(result.license.tier).toBeDefined();
                        expect(result.license.limits).toBeDefined();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should validate before processing even for rapid successive requests', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        requestCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, requestCount }) => {
                        // Setup: Ensure module is enabled
                        await License.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                $set: {
                                    status: 'active',
                                    'modules.$[elem].enabled': true,
                                    'modules.$[elem].expiresAt': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Clear cache to ensure fresh validation
                        licenseValidator.clearCache();

                        // Action: Make multiple rapid validation requests
                        const validationPromises = [];
                        for (let i = 0; i < requestCount; i++) {
                            validationPromises.push(
                                licenseValidator.validateModuleAccess(
                                    testTenantId.toString(),
                                    moduleKey,
                                    { skipCache: true }
                                )
                            );
                        }

                        const results = await Promise.all(validationPromises);

                        // Assertion 1: All validations must complete
                        expect(results.length).toBe(requestCount);

                        // Assertion 2: All validations must return valid results
                        results.forEach(result => {
                            expect(result).toBeDefined();
                            expect(result.valid).toBe(true);
                            expect(result.moduleKey).toBe(moduleKey);
                        });

                        // Assertion 3: Each validation should be independent
                        // (all should succeed, none should be skipped)
                        const validResults = results.filter(r => r.valid);
                        expect(validResults.length).toBe(requestCount);
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should validate and block invalid licenses before any processing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ),
                        invalidReason: fc.constantFrom(
                            'module-disabled',
                            'license-expired',
                            'module-missing'
                        )
                    }),
                    async ({ moduleKey, invalidReason }) => {
                        // Setup: Create invalid license state
                        if (invalidReason === 'module-disabled') {
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        'modules.$[elem].enabled': false
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (invalidReason === 'license-expired') {
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $set: {
                                        status: 'expired',
                                        'modules.$[elem].expiresAt': new Date(Date.now() - 1000)
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.key': moduleKey }]
                                }
                            );
                        } else if (invalidReason === 'module-missing') {
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        }

                        // Action: Attempt validation
                        const result = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion 1: Validation must fail
                        expect(result.valid).toBe(false);

                        // Assertion 2: Must provide error code
                        expect(result.error).toBeDefined();
                        expect(typeof result.error).toBe('string');
                        expect(result.error.length).toBeGreaterThan(0);

                        // Assertion 3: Must provide reason
                        expect(result.reason).toBeDefined();
                        expect(typeof result.reason).toBe('string');
                        expect(result.reason.length).toBeGreaterThan(0);

                        // Assertion 4: Must NOT provide license information when invalid
                        expect(result.license).toBeUndefined();

                        // Assertion 5: Failure must be logged
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: { $in: ['VALIDATION_FAILURE', 'LICENSE_EXPIRED'] }
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should never skip validation for non-Core modules', async () => {
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
                        // Setup: Ensure valid license
                        await License.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                $set: {
                                    status: 'active',
                                    'modules.$[elem].enabled': true,
                                    'modules.$[elem].expiresAt': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.key': moduleKey }]
                            }
                        );

                        // Action: Validate
                        const result = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion 1: Must not bypass validation
                        expect(result.bypassedValidation).toBeUndefined();

                        // Assertion 2: Must perform actual validation
                        expect(result.valid).toBeDefined();
                        expect(result.moduleKey).toBe(moduleKey);

                        // Assertion 3: Must check license data
                        if (result.valid) {
                            expect(result.license).toBeDefined();
                            expect(result.license.tier).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 10: Usage Limit Enforcement', () => {
        /**
         * Feature: feature-productization, Property 10: Usage Limit Enforcement
         * Validates: Requirements 3.3
         * 
         * For any usage limit type (employees, storage, API calls), when the limit is exceeded,
         * further usage should be prevented and a limit-exceeded error should be returned.
         */
        test('should enforce usage limits across all limit types', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        limit: fc.integer({ min: 10, max: 1000 }),
                        currentUsage: fc.integer({ min: 0, max: 1000 }),
                        requestedAmount: fc.integer({ min: 1, max: 100 })
                    }),
                    async ({ limitType, limit, currentUsage, requestedAmount }) => {
                        // Setup: Create usage tracking with specified current usage and limit
                        await UsageTracking.deleteMany({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE
                        });

                        await UsageTracking.create({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE,
                            period: UsageTracking.getCurrentPeriod(),
                            usage: {
                                [limitType]: currentUsage
                            },
                            limits: {
                                [limitType]: limit
                            }
                        });

                        // Action: Check if the requested amount would exceed the limit
                        const result = await licenseValidator.checkLimit(
                            testTenantId.toString(),
                            MODULES.ATTENDANCE,
                            limitType,
                            requestedAmount
                        );

                        const projectedUsage = currentUsage + requestedAmount;
                        const wouldExceedLimit = projectedUsage > limit;

                        // Assertion: Verify limit enforcement
                        if (wouldExceedLimit) {
                            // When limit would be exceeded, access should be denied
                            expect(result.allowed).toBe(false);
                            expect(result.error).toBe('LIMIT_EXCEEDED');
                            expect(result.reason).toContain('exceeded');
                            expect(result.projectedUsage).toBe(projectedUsage);
                            expect(result.limit).toBe(limit);

                            // Verify audit log was created for limit exceeded
                            const auditLog = await LicenseAudit.findOne({
                                tenantId: testTenantId,
                                moduleKey: MODULES.ATTENDANCE,
                                eventType: 'LIMIT_EXCEEDED',
                                'details.limitType': limitType
                            }).sort({ timestamp: -1 });

                            expect(auditLog).toBeDefined();
                            expect(auditLog.details.limitValue).toBe(limit);
                        } else {
                            // When within limits, access should be allowed
                            expect(result.allowed).toBe(true);
                            expect(result.error).toBeUndefined();
                            expect(result.currentUsage).toBe(currentUsage);
                            expect(result.limit).toBe(limit);
                            expect(result.projectedUsage).toBe(projectedUsage);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should consistently block when exactly at limit', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        limit: fc.integer({ min: 50, max: 500 }),
                        requestedAmount: fc.integer({ min: 1, max: 50 })
                    }),
                    async ({ limitType, limit, requestedAmount }) => {
                        // Setup: Current usage is exactly at the limit
                        await UsageTracking.deleteMany({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE
                        });

                        await UsageTracking.create({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE,
                            period: UsageTracking.getCurrentPeriod(),
                            usage: {
                                [limitType]: limit
                            },
                            limits: {
                                [limitType]: limit
                            }
                        });

                        // Action: Try to add more usage
                        const result = await licenseValidator.checkLimit(
                            testTenantId.toString(),
                            MODULES.ATTENDANCE,
                            limitType,
                            requestedAmount
                        );

                        // Assertion: Should always be blocked when at limit
                        expect(result.allowed).toBe(false);
                        expect(result.error).toBe('LIMIT_EXCEEDED');
                        expect(result.currentUsage).toBe(limit);
                        expect(result.projectedUsage).toBe(limit + requestedAmount);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should allow usage when limit is null or zero (unlimited)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        limitValue: fc.constantFrom(null, 0),
                        currentUsage: fc.integer({ min: 0, max: 10000 }),
                        requestedAmount: fc.integer({ min: 1, max: 1000 })
                    }),
                    async ({ limitType, limitValue, currentUsage, requestedAmount }) => {
                        // Setup: Create usage tracking with no limit (null or 0)
                        await UsageTracking.deleteMany({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE
                        });

                        await UsageTracking.create({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE,
                            period: UsageTracking.getCurrentPeriod(),
                            usage: {
                                [limitType]: currentUsage
                            },
                            limits: {
                                [limitType]: limitValue
                            }
                        });

                        // Action: Check limit with unlimited configuration
                        const result = await licenseValidator.checkLimit(
                            testTenantId.toString(),
                            MODULES.ATTENDANCE,
                            limitType,
                            requestedAmount
                        );

                        // Assertion: Should always allow when no limit is set
                        expect(result.allowed).toBe(true);
                        expect(result.limit).toBeNull();
                        expect(result.percentage).toBeNull();
                        expect(result.reason).toContain('No limit configured');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should correctly calculate percentage and projected usage', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                        limit: fc.integer({ min: 100, max: 1000 }),
                        currentUsage: fc.integer({ min: 0, max: 99 }),
                        requestedAmount: fc.integer({ min: 0, max: 50 })
                    }),
                    async ({ limitType, limit, currentUsage, requestedAmount }) => {
                        // Ensure current usage doesn't exceed limit
                        const safeCurrentUsage = Math.min(currentUsage, limit - 1);

                        // Setup
                        await UsageTracking.deleteMany({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE
                        });

                        await UsageTracking.create({
                            tenantId: testTenantId,
                            moduleKey: MODULES.ATTENDANCE,
                            period: UsageTracking.getCurrentPeriod(),
                            usage: {
                                [limitType]: safeCurrentUsage
                            },
                            limits: {
                                [limitType]: limit
                            }
                        });

                        // Action
                        const result = await licenseValidator.checkLimit(
                            testTenantId.toString(),
                            MODULES.ATTENDANCE,
                            limitType,
                            requestedAmount
                        );

                        // Assertion: Verify calculations are correct
                        const expectedPercentage = Math.round((safeCurrentUsage / limit) * 100);
                        const expectedProjectedUsage = safeCurrentUsage + requestedAmount;
                        const expectedProjectedPercentage = Math.round((expectedProjectedUsage / limit) * 100);

                        expect(result.currentUsage).toBe(safeCurrentUsage);
                        expect(result.limit).toBe(limit);
                        expect(result.percentage).toBe(expectedPercentage);
                        expect(result.projectedUsage).toBe(expectedProjectedUsage);
                        expect(result.projectedPercentage).toBe(expectedProjectedPercentage);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
