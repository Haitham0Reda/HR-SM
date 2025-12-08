// testing/services/auditLogEntryCompleteness.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import licenseValidator from '../../services/licenseValidator.service.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';

describe('Audit Log Entry Completeness Property-Based Tests', () => {
    let testTenantId;
    let testLicense;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = new mongoose.Types.ObjectId();

        // Create a test license with multiple modules enabled
        testLicense = await License.create({
            tenantId: testTenantId,
            subscriptionId: 'test-subscription-audit-pbt',
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
        licenseValidator.clearCache();
    });

    describe('Property 32: Audit Log Entry Completeness', () => {
        /**
         * Feature: feature-productization, Property 32: Audit Log Entry Completeness
         * Validates: Requirements 10.1
         * 
         * For any license validation, the audit log entry should contain timestamp, tenant ID,
         * module key, result, and relevant details.
         */
        test('should create complete audit log entries for all validation attempts', async () => {
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
                        validationScenario: fc.constantFrom(
                            'valid-enabled',
                            'module-disabled',
                            'license-expired',
                            'module-not-in-license',
                            'no-license'
                        )
                    }),
                    async ({ moduleKey, validationScenario }) => {
                        // Clear audit logs before test
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup: Create different validation scenarios
                        if (validationScenario === 'valid-enabled') {
                            // Ensure module exists and is enabled
                            const license = await License.findOne({ tenantId: testTenantId });
                            const moduleExists = license && license.modules.some(m => m.key === moduleKey);
                            
                            if (moduleExists) {
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
                        } else if (validationScenario === 'module-disabled') {
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
                        } else if (validationScenario === 'license-expired') {
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
                        } else if (validationScenario === 'module-not-in-license') {
                            // Remove the module from license
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        } else if (validationScenario === 'no-license') {
                            // Delete the license entirely
                            await License.deleteMany({ tenantId: testTenantId });
                        }

                        // Action: Perform validation
                        const validationResult = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion 1: Validation result should be defined
                        expect(validationResult).toBeDefined();
                        expect(validationResult).not.toBeNull();

                        // Assertion 2: Audit log should be created
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();
                        expect(auditLog).not.toBeNull();

                        // Assertion 3: Audit log MUST contain timestamp
                        expect(auditLog.timestamp).toBeDefined();
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
                        expect(auditLog.timestamp.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds

                        // Assertion 4: Audit log MUST contain tenant ID
                        expect(auditLog.tenantId).toBeDefined();
                        expect(auditLog.tenantId).not.toBeNull();
                        expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());

                        // Assertion 5: Audit log MUST contain module key
                        expect(auditLog.moduleKey).toBeDefined();
                        expect(auditLog.moduleKey).not.toBeNull();
                        expect(auditLog.moduleKey).toBe(moduleKey);

                        // Assertion 6: Audit log MUST contain result (eventType)
                        expect(auditLog.eventType).toBeDefined();
                        expect(auditLog.eventType).not.toBeNull();
                        expect(typeof auditLog.eventType).toBe('string');
                        expect(auditLog.eventType.length).toBeGreaterThan(0);

                        // Assertion 7: Event type should match validation result
                        if (validationResult.valid) {
                            expect(auditLog.eventType).toBe('VALIDATION_SUCCESS');
                        } else {
                            expect(['VALIDATION_FAILURE', 'LICENSE_EXPIRED']).toContain(auditLog.eventType);
                        }

                        // Assertion 8: Audit log MUST contain details object
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.details).not.toBeNull();
                        expect(typeof auditLog.details).toBe('object');

                        // Assertion 9: For failures, details should contain reason
                        if (!validationResult.valid && auditLog.eventType === 'VALIDATION_FAILURE') {
                            expect(auditLog.details.reason).toBeDefined();
                            expect(typeof auditLog.details.reason).toBe('string');
                            expect(auditLog.details.reason.length).toBeGreaterThan(0);
                        }

                        // Assertion 10: Audit log MUST have severity level
                        expect(auditLog.severity).toBeDefined();
                        expect(auditLog.severity).not.toBeNull();
                        expect(['info', 'warning', 'error', 'critical']).toContain(auditLog.severity);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should include all required fields in audit logs for successful validations', async () => {
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
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup: Ensure module is enabled and valid
                        const license = await License.findOne({ tenantId: testTenantId });
                        const moduleExists = license && license.modules.some(m => m.key === moduleKey);
                        
                        if (moduleExists) {
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

                        // Action: Validate successfully
                        const validationResult = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion: Validation should succeed
                        expect(validationResult.valid).toBe(true);

                        // Assertion: Check audit log completeness
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_SUCCESS'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();

                        // All required fields must be present
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);
                        expect(auditLog.eventType).toBe('VALIDATION_SUCCESS');
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.severity).toBe('info');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should include all required fields in audit logs for failed validations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL,
                            MODULES.DOCUMENTS
                        ),
                        failureType: fc.constantFrom(
                            'disabled',
                            'expired',
                            'missing'
                        )
                    }),
                    async ({ moduleKey, failureType }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        // Setup: Create failure scenario
                        if (failureType === 'disabled') {
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
                        } else if (failureType === 'expired') {
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
                        } else if (failureType === 'missing') {
                            await License.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $pull: {
                                        modules: { key: moduleKey }
                                    }
                                }
                            );
                        }

                        // Action: Validate (should fail)
                        const validationResult = await licenseValidator.validateModuleAccess(
                            testTenantId.toString(),
                            moduleKey,
                            { skipCache: true }
                        );

                        // Assertion: Validation should fail
                        expect(validationResult.valid).toBe(false);

                        // Assertion: Check audit log completeness
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();

                        // All required fields must be present
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);
                        expect(auditLog.eventType).toBeDefined();
                        expect(['VALIDATION_FAILURE', 'LICENSE_EXPIRED']).toContain(auditLog.eventType);
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.severity).toBeDefined();
                        expect(['warning', 'error', 'critical']).toContain(auditLog.severity);

                        // For VALIDATION_FAILURE, reason must be present
                        if (auditLog.eventType === 'VALIDATION_FAILURE') {
                            expect(auditLog.details.reason).toBeDefined();
                            expect(typeof auditLog.details.reason).toBe('string');
                            expect(auditLog.details.reason.length).toBeGreaterThan(0);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should preserve audit log completeness across multiple validations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        validationCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, validationCount }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

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

                        // Action: Perform multiple validations
                        for (let i = 0; i < validationCount; i++) {
                            await licenseValidator.validateModuleAccess(
                                testTenantId.toString(),
                                moduleKey,
                                { skipCache: true }
                            );
                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // Assertion: All audit logs should be complete
                        const auditLogs = await LicenseAudit.find({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_SUCCESS'
                        }).sort({ timestamp: -1 });

                        expect(auditLogs.length).toBe(validationCount);

                        // Check each audit log for completeness
                        auditLogs.forEach(auditLog => {
                            expect(auditLog.timestamp).toBeInstanceOf(Date);
                            expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());
                            expect(auditLog.moduleKey).toBe(moduleKey);
                            expect(auditLog.eventType).toBe('VALIDATION_SUCCESS');
                            expect(auditLog.details).toBeDefined();
                            expect(auditLog.severity).toBe('info');
                        });

                        // Verify timestamps are unique and ordered
                        const timestamps = auditLogs.map(log => log.timestamp.getTime());
                        for (let i = 0; i < timestamps.length - 1; i++) {
                            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should include request information in audit logs when provided', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        ipAddress: fc.ipV4(),
                        userAgent: fc.constantFrom(
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                            'Chrome/91.0.4472.124',
                            'Safari/14.1.1'
                        )
                    }),
                    async ({ moduleKey, ipAddress, userAgent }) => {
                        // Clear audit logs
                        await LicenseAudit.deleteMany({
                            tenantId: testTenantId,
                            moduleKey
                        });

                        const userId = new mongoose.Types.ObjectId();

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

                        // Assertion: Audit log should contain all required fields plus request info
                        const auditLog = await LicenseAudit.findOne({
                            tenantId: testTenantId,
                            moduleKey,
                            eventType: 'VALIDATION_SUCCESS'
                        }).sort({ timestamp: -1 });

                        expect(auditLog).toBeDefined();

                        // Required fields
                        expect(auditLog.timestamp).toBeInstanceOf(Date);
                        expect(auditLog.tenantId.toString()).toBe(testTenantId.toString());
                        expect(auditLog.moduleKey).toBe(moduleKey);
                        expect(auditLog.eventType).toBe('VALIDATION_SUCCESS');
                        expect(auditLog.details).toBeDefined();
                        expect(auditLog.severity).toBe('info');

                        // Request information
                        expect(auditLog.details.userId).toBeDefined();
                        expect(auditLog.details.ipAddress).toBe(ipAddress);
                        expect(auditLog.details.userAgent).toBe(userAgent);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
