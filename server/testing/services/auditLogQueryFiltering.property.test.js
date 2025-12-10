// testing/services/auditLogQueryFiltering.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import auditLoggerService from '../../services/auditLogger.service.js';
import LicenseAudit, { EVENT_TYPES, SEVERITY_LEVELS } from '../../models/licenseAudit.model.js';
import { MODULES } from '../../models/license.model.js';

describe('Audit Log Query Filtering - Property-Based Tests', () => {
    beforeAll(async () => {
        // Clean up any existing data before all tests
        await LicenseAudit.deleteMany({});
    });

    beforeEach(async () => {
        // Minimal cleanup - only if needed
        const count = await LicenseAudit.countDocuments({});
        if (count > 1000) {
            await LicenseAudit.deleteMany({});
        }
    });

    afterEach(async () => {
        // Skip cleanup to improve performance
        // Tests use unique tenant IDs to avoid conflicts
    });

    afterAll(async () => {
        // Final cleanup after all tests
        await LicenseAudit.deleteMany({});
    });

    describe('Property 35: Audit Log Query Filtering', () => {
        /**
         * Feature: feature-productization, Property 35: Audit Log Query Filtering
         * Validates: Requirements 10.4
         * 
         * For any audit log query, the system should support filtering by tenant, module,
         * date range, and event type.
         */
        test('should filter audit logs by tenant ID', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        eventType: fc.constantFrom(...EVENT_TYPES),
                        logsPerTenant: fc.integer({ min: 2, max: 3 })
                    }),
                    async ({ moduleKey, eventType, logsPerTenant }) => {
                        // Generate unique IDs for this iteration
                        const targetTenantId = new mongoose.Types.ObjectId();
                        const otherTenantId = new mongoose.Types.ObjectId();
                        
                        // Setup: Create audit logs for target tenant
                        const targetLogs = [];
                        for (let i = 0; i < logsPerTenant; i++) {
                            const log = await auditLoggerService.createLog({
                                tenantId: targetTenantId,
                                moduleKey,
                                eventType,
                                details: { testIndex: i },
                                severity: 'info'
                            });
                            targetLogs.push(log);
                        }

                        // Setup: Create audit logs for other tenant
                        for (let i = 0; i < logsPerTenant; i++) {
                            await auditLoggerService.createLog({
                                tenantId: otherTenantId,
                                moduleKey,
                                eventType,
                                details: { testIndex: i },
                                severity: 'info'
                            });
                        }

                        // Action: Query logs filtered by target tenant
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId: targetTenantId,
                            limit: 100
                        });

                        // Assertion 1: Should return logs only for target tenant
                        expect(filteredLogs.length).toBe(logsPerTenant);

                        // Assertion 2: All returned logs should belong to target tenant
                        filteredLogs.forEach(log => {
                            expect(log.tenantId.toString()).toBe(targetTenantId.toString());
                        });

                        // Assertion 3: No logs from other tenant should be included
                        filteredLogs.forEach(log => {
                            expect(log.tenantId.toString()).not.toBe(otherTenantId.toString());
                        });
                        
                        // Cleanup: Remove only the logs we created
                        const createdLogIds = [...targetLogs.map(l => l._id)];
                        await LicenseAudit.deleteMany({ _id: { $in: createdLogIds } });
                        await LicenseAudit.deleteMany({ tenantId: otherTenantId });
                    }
                ),
                { numRuns: 20 }
            );
        });

        test('should filter audit logs by module key', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        eventType: fc.constantFrom(...EVENT_TYPES),
                        logsPerModule: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ eventType, logsPerModule }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();
                        const modules = Object.values(MODULES);
                        const targetModule = modules[0];
                        const otherModule = modules[1];

                        // Setup: Create audit logs for target module
                        for (let i = 0; i < logsPerModule; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey: targetModule,
                                eventType,
                                details: { testIndex: i },
                                severity: 'info'
                            });
                        }

                        // Setup: Create audit logs for other module
                        for (let i = 0; i < logsPerModule; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey: otherModule,
                                eventType,
                                details: { testIndex: i },
                                severity: 'info'
                            });
                        }

                        // Action: Query logs filtered by target module
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey: targetModule,
                            limit: 100
                        });

                        // Assertion 1: Should return logs only for target module
                        expect(filteredLogs.length).toBe(logsPerModule);

                        // Assertion 2: All returned logs should belong to target module
                        filteredLogs.forEach(log => {
                            expect(log.moduleKey).toBe(targetModule);
                        });

                        // Assertion 3: No logs from other module should be included
                        filteredLogs.forEach(log => {
                            expect(log.moduleKey).not.toBe(otherModule);
                        });
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should filter audit logs by event type', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        logsPerEventType: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, logsPerEventType }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();
                        const targetEventType = 'VALIDATION_SUCCESS';
                        const otherEventType = 'VALIDATION_FAILURE';

                        // Setup: Create audit logs for target event type
                        for (let i = 0; i < logsPerEventType; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType: targetEventType,
                                details: { testIndex: i },
                                severity: 'info'
                            });
                        }

                        // Setup: Create audit logs for other event type
                        for (let i = 0; i < logsPerEventType; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType: otherEventType,
                                details: { testIndex: i },
                                severity: 'warning'
                            });
                        }

                        // Action: Query logs filtered by target event type
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            eventType: targetEventType,
                            limit: 100
                        });

                        // Assertion 1: Should return logs only for target event type
                        expect(filteredLogs.length).toBe(logsPerEventType);

                        // Assertion 2: All returned logs should have target event type
                        filteredLogs.forEach(log => {
                            expect(log.eventType).toBe(targetEventType);
                        });

                        // Assertion 3: No logs with other event type should be included
                        filteredLogs.forEach(log => {
                            expect(log.eventType).not.toBe(otherEventType);
                        });
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should filter audit logs by severity level', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        logsPerSeverity: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, logsPerSeverity }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();
                        const targetSeverity = 'info';
                        const otherSeverity = 'warning';

                        // Setup: Create audit logs for target severity
                        for (let i = 0; i < logsPerSeverity; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType: 'VALIDATION_SUCCESS',
                                details: { testIndex: i },
                                severity: targetSeverity
                            });
                        }

                        // Setup: Create audit logs for other severity
                        for (let i = 0; i < logsPerSeverity; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType: 'VALIDATION_SUCCESS',
                                details: { testIndex: i },
                                severity: otherSeverity
                            });
                        }

                        // Action: Query logs filtered by target severity
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            severity: targetSeverity,
                            limit: 100
                        });

                        // Assertion 1: Should return logs only for target severity
                        expect(filteredLogs.length).toBe(logsPerSeverity);

                        // Assertion 2: All returned logs should have target severity
                        filteredLogs.forEach(log => {
                            expect(log.severity).toBe(targetSeverity);
                        });

                        // Assertion 3: No logs with other severity should be included
                        filteredLogs.forEach(log => {
                            expect(log.severity).not.toBe(otherSeverity);
                        });
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should filter audit logs by date range', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        eventType: fc.constantFrom(...EVENT_TYPES),
                        daysAgo: fc.integer({ min: 2, max: 10 })
                    }),
                    async ({ moduleKey, eventType, daysAgo }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();
                        const now = new Date();
                        const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                        const beforeTargetDate = new Date(targetDate.getTime() - 2 * 24 * 60 * 60 * 1000);
                        const afterTargetDate = new Date(targetDate.getTime() + 2 * 24 * 60 * 60 * 1000);

                        // Create log before target date
                        const logBefore = await LicenseAudit.create({
                            tenantId,
                            moduleKey,
                            eventType,
                            details: { position: 'before' },
                            severity: 'info',
                            timestamp: beforeTargetDate
                        });

                        // Create log on target date
                        const logOn = await LicenseAudit.create({
                            tenantId,
                            moduleKey,
                            eventType,
                            details: { position: 'on' },
                            severity: 'info',
                            timestamp: targetDate
                        });

                        // Create log after target date
                        const logAfter = await LicenseAudit.create({
                            tenantId,
                            moduleKey,
                            eventType,
                            details: { position: 'after' },
                            severity: 'info',
                            timestamp: afterTargetDate
                        });

                        // Action 1: Query logs from target date onwards
                        const logsFromDate = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            startDate: targetDate,
                            limit: 100
                        });

                        // Assertion 1: Should include logs on and after target date
                        expect(logsFromDate.length).toBeGreaterThanOrEqual(2);
                        const logsFromDateIds = logsFromDate.map(l => l._id.toString());
                        expect(logsFromDateIds).toContain(logOn._id.toString());
                        expect(logsFromDateIds).toContain(logAfter._id.toString());
                        expect(logsFromDateIds).not.toContain(logBefore._id.toString());

                        // Action 2: Query logs up to target date
                        const logsToDate = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            endDate: targetDate,
                            limit: 100
                        });

                        // Assertion 2: Should include logs on and before target date
                        expect(logsToDate.length).toBeGreaterThanOrEqual(2);
                        const logsToDateIds = logsToDate.map(l => l._id.toString());
                        expect(logsToDateIds).toContain(logBefore._id.toString());
                        expect(logsToDateIds).toContain(logOn._id.toString());
                        expect(logsToDateIds).not.toContain(logAfter._id.toString());

                        // Action 3: Query logs within date range
                        const logsInRange = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            startDate: beforeTargetDate,
                            endDate: targetDate,
                            limit: 100
                        });

                        // Assertion 3: Should include only logs within range
                        expect(logsInRange.length).toBe(2);
                        const logsInRangeIds = logsInRange.map(l => l._id.toString());
                        expect(logsInRangeIds).toContain(logBefore._id.toString());
                        expect(logsInRangeIds).toContain(logOn._id.toString());
                        expect(logsInRangeIds).not.toContain(logAfter._id.toString());
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should support combining multiple filters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        dummy: fc.constant(true)
                    }),
                    async () => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const targetTenantId = new mongoose.Types.ObjectId();
                        const otherTenantId = new mongoose.Types.ObjectId();
                        const targetModule = 'attendance';
                        const otherModule = 'leave';
                        const targetEventType = 'VALIDATION_SUCCESS';
                        const otherEventType = 'VALIDATION_FAILURE';
                        const targetSeverity = 'info';
                        const otherSeverity = 'warning';

                        // Setup: Create the exact log we're looking for
                        const targetLog = await auditLoggerService.createLog({
                            tenantId: targetTenantId,
                            moduleKey: targetModule,
                            eventType: targetEventType,
                            details: { target: true },
                            severity: targetSeverity
                        });

                        // Setup: Create logs with different combinations
                        await auditLoggerService.createLog({
                            tenantId: otherTenantId,
                            moduleKey: targetModule,
                            eventType: targetEventType,
                            details: { target: false },
                            severity: targetSeverity
                        });

                        await auditLoggerService.createLog({
                            tenantId: targetTenantId,
                            moduleKey: otherModule,
                            eventType: targetEventType,
                            details: { target: false },
                            severity: targetSeverity
                        });

                        await auditLoggerService.createLog({
                            tenantId: targetTenantId,
                            moduleKey: targetModule,
                            eventType: otherEventType,
                            details: { target: false },
                            severity: targetSeverity
                        });

                        await auditLoggerService.createLog({
                            tenantId: targetTenantId,
                            moduleKey: targetModule,
                            eventType: targetEventType,
                            details: { target: false },
                            severity: otherSeverity
                        });

                        // Action: Query with all filters combined
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId: targetTenantId,
                            moduleKey: targetModule,
                            eventType: targetEventType,
                            severity: targetSeverity,
                            limit: 100
                        });

                        // Assertion 1: Should return only the target log
                        expect(filteredLogs.length).toBe(1);

                        // Assertion 2: The returned log should match all criteria
                        const returnedLog = filteredLogs[0];
                        expect(returnedLog._id.toString()).toBe(targetLog._id.toString());
                        expect(returnedLog.tenantId.toString()).toBe(targetTenantId.toString());
                        expect(returnedLog.moduleKey).toBe(targetModule);
                        expect(returnedLog.eventType).toBe(targetEventType);
                        expect(returnedLog.severity).toBe(targetSeverity);
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should respect limit and skip parameters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        totalLogs: fc.integer({ min: 10, max: 20 }),
                        limit: fc.integer({ min: 3, max: 7 }),
                        skip: fc.integer({ min: 0, max: 5 })
                    }),
                    async ({ totalLogs, limit, skip }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();
                        const moduleKey = 'attendance';

                        // Setup: Create multiple audit logs
                        for (let i = 0; i < totalLogs; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType: 'VALIDATION_SUCCESS',
                                details: { index: i },
                                severity: 'info'
                            });
                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 5));
                        }

                        // Action: Query with limit and skip
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId,
                            moduleKey,
                            limit,
                            skip
                        });

                        // Assertion 1: Should respect limit parameter
                        const expectedCount = Math.min(limit, Math.max(0, totalLogs - skip));
                        expect(filteredLogs.length).toBeLessThanOrEqual(limit);
                        expect(filteredLogs.length).toBe(expectedCount);

                        // Assertion 2: Should skip the correct number of records
                        if (skip < totalLogs && filteredLogs.length > 0) {
                            // Logs are returned in descending timestamp order
                            const allLogs = await auditLoggerService.queryLogs({
                                tenantId,
                                moduleKey,
                                limit: totalLogs
                            });
                            
                            const skippedLogIds = allLogs.slice(0, skip).map(l => l._id.toString());
                            const returnedLogIds = filteredLogs.map(l => l._id.toString());
                            
                            // None of the returned logs should be in the skipped set
                            returnedLogIds.forEach(id => {
                                expect(skippedLogIds).not.toContain(id);
                            });
                        }
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should return empty array when no logs match filters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        eventType: fc.constantFrom(...EVENT_TYPES)
                    }),
                    async ({ moduleKey, eventType }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const existingTenantId = new mongoose.Types.ObjectId();
                        const nonExistentTenantId = new mongoose.Types.ObjectId();

                        // Setup: Create logs for existing tenant
                        await auditLoggerService.createLog({
                            tenantId: existingTenantId,
                            moduleKey,
                            eventType,
                            details: {},
                            severity: 'info'
                        });

                        // Action: Query with non-existent tenant ID
                        const filteredLogs = await auditLoggerService.queryLogs({
                            tenantId: nonExistentTenantId,
                            moduleKey,
                            eventType,
                            limit: 100
                        });

                        // Assertion 1: Should return empty array
                        expect(Array.isArray(filteredLogs)).toBe(true);
                        expect(filteredLogs.length).toBe(0);

                        // Assertion 2: Should not throw error
                        expect(filteredLogs).toBeDefined();
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should maintain filter consistency across multiple queries', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        moduleKey: fc.constantFrom(...Object.values(MODULES)),
                        eventType: fc.constantFrom(...EVENT_TYPES),
                        severity: fc.constantFrom(...SEVERITY_LEVELS),
                        queryCount: fc.integer({ min: 2, max: 5 })
                    }),
                    async ({ moduleKey, eventType, severity, queryCount }) => {
                        // Clean up before this iteration
                        await LicenseAudit.deleteMany({});
                        
                        const tenantId = new mongoose.Types.ObjectId();

                        // Setup: Create audit logs
                        const logCount = 5;
                        for (let i = 0; i < logCount; i++) {
                            await auditLoggerService.createLog({
                                tenantId,
                                moduleKey,
                                eventType,
                                details: { index: i },
                                severity
                            });
                        }

                        // Action: Perform multiple queries with same filters
                        const results = [];
                        for (let i = 0; i < queryCount; i++) {
                            const logs = await auditLoggerService.queryLogs({
                                tenantId,
                                moduleKey,
                                eventType,
                                severity,
                                limit: 100
                            });
                            results.push(logs);
                        }

                        // Assertion 1: All queries should return same count
                        const firstCount = results[0].length;
                        results.forEach(logs => {
                            expect(logs.length).toBe(firstCount);
                        });

                        // Assertion 2: All queries should return same log IDs
                        const firstLogIds = results[0].map(l => l._id.toString()).sort();
                        results.forEach(logs => {
                            const logIds = logs.map(l => l._id.toString()).sort();
                            expect(logIds).toEqual(firstLogIds);
                        });

                        // Assertion 3: All returned logs should match filters
                        results.forEach(logs => {
                            logs.forEach(log => {
                                expect(log.tenantId.toString()).toBe(tenantId.toString());
                                expect(log.moduleKey).toBe(moduleKey);
                                expect(log.eventType).toBe(eventType);
                                expect(log.severity).toBe(severity);
                            });
                        });
                        
                        // Cleanup after this iteration
                        await LicenseAudit.deleteMany({});
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
