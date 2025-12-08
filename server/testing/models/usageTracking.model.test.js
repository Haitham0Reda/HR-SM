import mongoose from 'mongoose';
import UsageTracking from '../../models/usageTracking.model.js';

describe('UsageTracking Model', () => {
    describe('Schema Validation', () => {
        it('should create and save usage tracking successfully', async () => {
            const usageData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                period: '2025-11',
                usage: {
                    employees: 45,
                    storage: 8589934592,
                    apiCalls: 8500
                },
                limits: {
                    employees: 50,
                    storage: 10737418240,
                    apiCalls: 10000
                }
            };

            const usage = new UsageTracking(usageData);
            const savedUsage = await usage.save();

            expect(savedUsage._id).toBeDefined();
            expect(savedUsage.tenantId.toString()).toBe(usageData.tenantId.toString());
            expect(savedUsage.moduleKey).toBe(usageData.moduleKey);
            expect(savedUsage.period).toBe(usageData.period);
            expect(savedUsage.usage.employees).toBe(45);
        });

        it('should fail to create without required fields', async () => {
            const usage = new UsageTracking({});

            let err;
            try {
                await usage.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.errors.tenantId).toBeDefined();
            expect(err.errors.moduleKey).toBeDefined();
            expect(err.errors.period).toBeDefined();
        });

        it('should validate period format', async () => {
            const usageData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                period: 'invalid-format'
            };

            const usage = new UsageTracking(usageData);

            let err;
            try {
                await usage.save();
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
        });

        it('should set default values correctly', async () => {
            const usageData = {
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                period: '2025-11'
            };

            const usage = new UsageTracking(usageData);
            const savedUsage = await usage.save();

            expect(savedUsage.usage.employees).toBe(0);
            expect(savedUsage.usage.storage).toBe(0);
            expect(savedUsage.usage.apiCalls).toBe(0);
            expect(savedUsage.warnings).toEqual([]);
            expect(savedUsage.violations).toEqual([]);
        });
    });

    describe('Instance Methods', () => {
        let testUsage;

        beforeEach(async () => {
            testUsage = await UsageTracking.create({
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'attendance',
                period: '2025-11',
                usage: {
                    employees: 45,
                    storage: 8589934592,
                    apiCalls: 8500
                },
                limits: {
                    employees: 50,
                    storage: 10737418240,
                    apiCalls: 10000
                }
            });
        });

        it('should calculate usage percentage', () => {
            const employeePercentage = testUsage.getUsagePercentage('employees');
            expect(employeePercentage).toBe(90);

            const storagePercentage = testUsage.getUsagePercentage('storage');
            expect(storagePercentage).toBe(80);

            const apiCallsPercentage = testUsage.getUsagePercentage('apiCalls');
            expect(apiCallsPercentage).toBe(85);
        });

        it('should return null for percentage when no limit', () => {
            testUsage.limits.employees = null;
            const percentage = testUsage.getUsagePercentage('employees');
            expect(percentage).toBeNull();
        });

        it('should check if approaching limit', () => {
            expect(testUsage.isApproachingLimit('employees')).toBe(true);
            expect(testUsage.isApproachingLimit('storage')).toBe(true);
            expect(testUsage.isApproachingLimit('apiCalls')).toBe(true);

            testUsage.usage.employees = 30;
            expect(testUsage.isApproachingLimit('employees')).toBe(false);
        });

        it('should check if limit exceeded', () => {
            expect(testUsage.hasExceededLimit('employees')).toBe(false);

            testUsage.usage.employees = 55;
            expect(testUsage.hasExceededLimit('employees')).toBe(true);
        });

        it('should increment usage', async () => {
            const updatedUsage = await testUsage.incrementUsage('employees', 2);
            expect(updatedUsage.usage.employees).toBe(47);
        });

        it('should add warning when incrementing past 80%', async () => {
            // Create fresh usage at 70%
            const freshUsage = await UsageTracking.create({
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'leave',
                period: '2025-11',
                usage: { employees: 35 },
                limits: { employees: 50 }
            });

            const updatedUsage = await freshUsage.incrementUsage('employees', 10);
            expect(updatedUsage.warnings.length).toBeGreaterThan(0);
            expect(updatedUsage.warnings[0].limitType).toBe('employees');
        });

        it('should add violation when exceeding limit', async () => {
            // Create fresh usage at 96%
            const freshUsage = await UsageTracking.create({
                tenantId: new mongoose.Types.ObjectId(),
                moduleKey: 'payroll',
                period: '2025-11',
                usage: { employees: 48 },
                limits: { employees: 50 }
            });

            const updatedUsage = await freshUsage.incrementUsage('employees', 5);
            expect(updatedUsage.violations.length).toBeGreaterThan(0);
            expect(updatedUsage.violations[0].limitType).toBe('employees');
            expect(updatedUsage.violations[0].attemptedValue).toBe(53);
        });

        it('should set usage value', async () => {
            const updatedUsage = await testUsage.setUsage('employees', 100);
            expect(updatedUsage.usage.employees).toBe(100);
        });

        it('should get usage summary', () => {
            const summary = testUsage.getUsageSummary();

            expect(summary.employees).toBeDefined();
            expect(summary.employees.current).toBe(45);
            expect(summary.employees.limit).toBe(50);
            expect(summary.employees.percentage).toBe(90);
            expect(summary.employees.isApproachingLimit).toBe(true);
            expect(summary.employees.hasExceeded).toBe(false);

            expect(summary.storage).toBeDefined();
            expect(summary.apiCalls).toBeDefined();
        });
    });

    describe('Static Methods', () => {
        let tenantId1, tenantId2;
        const testPeriod = '2025-10'; // Use a different period to avoid conflicts

        beforeEach(async () => {
            tenantId1 = new mongoose.Types.ObjectId();
            tenantId2 = new mongoose.Types.ObjectId();

            await UsageTracking.create({
                tenantId: tenantId1,
                moduleKey: 'attendance',
                period: testPeriod,
                usage: { employees: 45 },
                limits: { employees: 50 }
            });

            await UsageTracking.create({
                tenantId: tenantId1,
                moduleKey: 'leave',
                period: testPeriod,
                usage: { employees: 30 },
                limits: { employees: 50 }
            });

            await UsageTracking.create({
                tenantId: tenantId2,
                moduleKey: 'attendance',
                period: testPeriod,
                usage: { employees: 100 },
                limits: { employees: 50 },
                violations: [{ limitType: 'employees', attemptedValue: 100, limit: 50 }]
            });

            await UsageTracking.create({
                tenantId: tenantId1,
                moduleKey: 'payroll',
                period: testPeriod,
                usage: { employees: 45 },
                limits: { employees: 50 },
                warnings: [{ limitType: 'employees', percentage: 90 }]
            });
        });

        it('should get current period', () => {
            const period = UsageTracking.getCurrentPeriod();
            expect(period).toMatch(/^\d{4}-\d{2}$/);
        });

        it('should find or create for current period', async () => {
            const newTenantId = new mongoose.Types.ObjectId();
            const usage = await UsageTracking.findOrCreateForCurrentPeriod(
                newTenantId,
                'documents',
                { employees: 100 }
            );

            expect(usage).toBeDefined();
            expect(usage.tenantId.toString()).toBe(newTenantId.toString());
            expect(usage.moduleKey).toBe('documents');
            expect(usage.limits.employees).toBe(100);
        });

        it('should return existing usage for current period', async () => {
            const currentPeriod = UsageTracking.getCurrentPeriod();

            // Create a usage record for current period
            await UsageTracking.create({
                tenantId: tenantId1,
                moduleKey: 'reporting',
                period: currentPeriod,
                usage: { employees: 25 },
                limits: { employees: 100 }
            });

            const usage = await UsageTracking.findOrCreateForCurrentPeriod(
                tenantId1,
                'reporting',
                { employees: 100 }
            );

            expect(usage).toBeDefined();
            expect(usage.usage.employees).toBe(25);
        });

        it('should get tenant usage', async () => {
            const usageRecords = await UsageTracking.getTenantUsage(tenantId1, testPeriod);
            expect(usageRecords.length).toBeGreaterThanOrEqual(2);
        });

        it('should get module usage', async () => {
            const usageRecords = await UsageTracking.getModuleUsage('attendance', testPeriod);
            expect(usageRecords.length).toBeGreaterThanOrEqual(2);
        });

        it('should find usage with warnings', async () => {
            const usageWithWarnings = await UsageTracking.findWithWarnings(testPeriod);
            expect(usageWithWarnings.length).toBeGreaterThan(0);
        });

        it('should find usage with violations', async () => {
            const usageWithViolations = await UsageTracking.findWithViolations(testPeriod);
            expect(usageWithViolations.length).toBeGreaterThan(0);
        });

        it('should aggregate usage across periods', async () => {
            const aggregated = await UsageTracking.aggregateUsage(tenantId1, 'attendance', 3);

            expect(aggregated.periods).toBeDefined();
            expect(aggregated.data).toBeDefined();
            expect(aggregated.summary).toBeDefined();
            expect(aggregated.summary.totalEmployees).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Indexes', () => {
        it('should have compound unique index', async () => {
            const tenantId = new mongoose.Types.ObjectId();

            await UsageTracking.create({
                tenantId,
                moduleKey: 'tasks',
                period: '2025-09'
            });

            let err;
            try {
                await UsageTracking.create({
                    tenantId,
                    moduleKey: 'tasks',
                    period: '2025-09'
                });
            } catch (error) {
                err = error;
            }

            expect(err).toBeDefined();
            expect(err.code).toBe(11000); // Duplicate key error
        });
    });
});
